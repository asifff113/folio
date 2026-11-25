"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { SITE_TAG } from "@/lib/content";
import { getAdminSession } from "@/lib/admin/session";
import {
  parseHelp,
  parseNewSection,
  parsePlatforms,
  parseProfile,
  parseSection,
  parseSectionList,
  parseTheme,
  parseTraceSettings,
  sectionKeyFrom,
} from "@/lib/admin/validate";
import { createAuthClient } from "@/lib/supabase/clients";

export type FormState = { ok: boolean; message: string; at: number } | null;

const fail = (message: string): FormState => ({ ok: false, message, at: Date.now() });

/* ---------- sign in / out ---------- */

export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  const supabase = await createAuthClient();
  if (!supabase) return fail("Supabase is not set up yet.");

  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return fail("Enter your email and password.");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "invalid_credentials") return fail("Wrong email or password.");
    if (error.status === 429) return fail("Too many attempts. Wait a minute and try again.");
    if (error.code === "email_not_confirmed") return fail("Confirm this email address in Supabase first.");
    return fail(`Sign-in failed: ${error.message}`);
  }
  redirect("/admin");
}

export async function signOut() {
  const supabase = await createAuthClient();
  await supabase?.auth.signOut();
  redirect("/admin/login");
}

/* ---------- saves ---------- */

/** Runs a save as the signed-in admin, then refreshes the public site. */
async function asAdmin(
  write: (supabase: NonNullable<Awaited<ReturnType<typeof createAuthClient>>>) => Promise<string | null>,
): Promise<FormState> {
  const session = await getAdminSession();
  if (session.state === "unconfigured") return fail("Supabase is not connected yet, so nothing can be saved.");
  if (session.state !== "admin") return fail("Your session ended or this account is not an admin. Sign in again.");

  const error = await write(session.supabase);
  if (error) return fail(error);

  updateTag(SITE_TAG);
  return { ok: true, message: "Saved. The site is updated.", at: Date.now() };
}

export async function saveProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = parseProfile(form);
  if (!parsed.ok) return fail(parsed.error);

  return asAdmin(async (supabase) => {
    const { error } = await supabase
      .from("profile")
      .upsert({ id: 1, ...parsed.data, updated_at: new Date().toISOString() });
    return error ? `Could not save: ${error.message}` : null;
  });
}

export async function savePlatforms(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = parsePlatforms(form);
  if (!parsed.ok) return fail(parsed.error);

  return asAdmin(async (supabase) => {
    const rows = parsed.data.map(({ qrImage, ...p }, sort) => ({ ...p, qr_image: qrImage, sort }));
    if (rows.length) {
      const { error } = await supabase.from("platforms").upsert(rows);
      if (error) return `Could not save: ${error.message}`;
    }
    // Remove links that were deleted in the editor. Ids are validated slugs.
    const keep = rows.map((r) => r.id);
    const remove = supabase.from("platforms").delete();
    const { error } = keep.length ? await remove.not("id", "in", `(${keep.join(",")})`) : await remove.neq("id", "");
    return error ? `Could not remove deleted links: ${error.message}` : null;
  });
}

/* ---------- sections ---------- */

/** The sections list: order, titles, on/off. */
export async function saveSectionList(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = parseSectionList(form);
  if (!parsed.ok) return fail(parsed.error);

  return asAdmin(async (supabase) => {
    // Update only: a key that isn't in the table is ignored, never created.
    const results = await Promise.all(
      parsed.data.map((s, sort) =>
        supabase.from("sections").update({ title: s.title, enabled: s.enabled, sort }).eq("key", s.key),
      ),
    );
    const error = results.find((r) => r.error)?.error;
    return error ? `Could not save: ${error.message}` : null;
  });
}

/** "+ new section": creates it (off, at the end) and opens its editor. */
export async function createSection(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = parseNewSection(form);
  if (!parsed.ok) return fail(parsed.error);
  const session = await getAdminSession();
  if (session.state !== "admin") return fail("Your session ended or this account is not an admin. Sign in again.");

  const { data: existing, error: readError } = await session.supabase
    .from("sections")
    .select("key,sort")
    .returns<{ key: string; sort: number }[]>();
  if (readError) return fail(`Could not create it: ${readError.message}`);

  const taken = new Set((existing ?? []).map((r) => r.key));
  const base = sectionKeyFrom(parsed.data.title);
  let key = base;
  for (let n = 2; taken.has(key); n++) key = `${base}-${n}`;
  const sort = Math.max(-1, ...(existing ?? []).map((r) => r.sort)) + 1;

  const { error } = await session.supabase
    .from("sections")
    .insert({ key, title: parsed.data.title, layout: parsed.data.layout, custom: true, enabled: false, sort });
  if (error) return fail(`Could not create it: ${error.message}`);
  updateTag(SITE_TAG);
  redirect(`/admin/sections/${key}`);
}

/** Deletes one of your own sections and everything in it. Built-in sections can't be deleted. */
export async function deleteSection(key: string) {
  if (!/^[a-z0-9_-]{1,32}$/.test(key)) return;
  const session = await getAdminSession();
  if (session.state !== "admin") return;
  const { error } = await session.supabase.from("sections").delete().eq("key", key).eq("custom", true);
  if (error) console.error("[sections] delete failed:", error.message);
  updateTag(SITE_TAG);
  refresh();
}

/** One section's editor: settings plus all its items (added, changed, reordered, removed). */
export async function saveSection(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = parseSection(form);
  if (!parsed.ok) return fail(parsed.error);
  const { key, title, intro, layout, enabled, items } = parsed.data;

  return asAdmin(async (supabase) => {
    const { data: current, error: readError } = await supabase
      .from("sections")
      .select("layout")
      .eq("key", key)
      .maybeSingle<{ layout: string }>();
    if (readError) return `Could not save: ${readError.message}`;
    if (!current) return "This section no longer exists. Go back to the list.";
    // Resume and contact keep their own layouts; nothing else can switch to them.
    const fixed = current.layout === "file" || current.layout === "form";
    if (fixed ? layout !== current.layout : layout === "file" || layout === "form")
      return "This section's layout can't be changed to that.";

    const section = await supabase.from("sections").update({ title, intro, layout, enabled }).eq("key", key);
    if (section.error) return `Could not save: ${section.error.message}`;

    const rows = items.map((it, sort) => ({
      id: it.id,
      section_key: key,
      title: it.title,
      subtitle: it.subtitle,
      date_text: it.date,
      body: it.body,
      details: it.details,
      image_url: it.image,
      tags: it.tags,
      link1_label: it.link1Label,
      link1_url: it.link1Url,
      link2_label: it.link2Label,
      link2_url: it.link2Url,
      level: it.level,
      visible: it.visible,
      sort,
    }));
    if (rows.length) {
      const { error } = await supabase.from("section_items").upsert(rows);
      if (error) return `Could not save the items: ${error.message}`;
    }
    // Remove items deleted in the editor. Ids are validated UUIDs.
    const remove = supabase.from("section_items").delete().eq("section_key", key);
    const keep = rows.map((r) => r.id);
    const { error } = keep.length ? await remove.not("id", "in", `(${keep.join(",")})`) : await remove;
    return error ? `Could not remove deleted items: ${error.message}` : null;
  });
}

export async function saveTheme(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = parseTheme(form);
  if (!parsed.ok) return fail(parsed.error);

  return asAdmin(async (supabase) => {
    const { error } = await supabase
      .from("profile")
      .upsert({ id: 1, theme: parsed.data, updated_at: new Date().toISOString() });
    return error ? `Could not save: ${error.message}` : null;
  });
}

export async function saveHelp(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = parseHelp(form);
  if (!parsed.ok) return fail(parsed.error);
  const { settings, items } = parsed.data;

  return asAdmin(async (supabase) => {
    const profile = await supabase
      .from("profile")
      .upsert({ id: 1, help: settings, updated_at: new Date().toISOString() });
    if (profile.error) return `Could not save: ${profile.error.message}`;

    const rows = items.map((item, sort) => ({ ...item, sort }));
    if (rows.length) {
      const { error } = await supabase.from("help_items").upsert(rows);
      if (error) return `Could not save the items: ${error.message}`;
    }
    // Remove items deleted in the editor. Ids are validated UUIDs.
    const keep = rows.map((r) => r.id);
    const remove = supabase.from("help_items").delete();
    const { error } = keep.length
      ? await remove.not("id", "in", `(${keep.join(",")})`)
      : await remove.not("id", "is", null);
    return error ? `Could not remove deleted items: ${error.message}` : null;
  });
}

/* ---------- inbox ---------- */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Runs an inbox or traces change as the admin and refreshes the admin pages (badges included). */
async function inboxChange(id: string, change: (supabase: AdminClient) => PromiseLike<{ error: { message: string } | null }>) {
  if (!UUID.test(id)) return;
  const session = await getAdminSession();
  if (session.state !== "admin") return;
  const { error } = await change(session.supabase);
  if (error) console.error("[inbox] change failed:", error.message);
  refresh();
}

type AdminClient = NonNullable<Awaited<ReturnType<typeof createAuthClient>>>;

export async function setMessageRead(id: string, isRead: boolean) {
  await inboxChange(id, (db) => db.from("inbox").update({ is_read: isRead }).eq("id", id));
}

export async function setMessageArchived(id: string, archived: boolean) {
  await inboxChange(id, (db) => db.from("inbox").update({ archived, is_read: true }).eq("id", id));
}

export async function deleteMessage(id: string) {
  await inboxChange(id, (db) => db.from("inbox").delete().eq("id", id));
}

/** Sets a help item's status from the inbox ("mark in progress", "mark solved"). */
export async function setItemStatus(itemId: string, status: "open" | "in_progress" | "solved") {
  if (!["open", "in_progress", "solved"].includes(status)) return;
  await inboxChange(itemId, (db) => db.from("help_items").update({ status }).eq("id", itemId));
  updateTag(SITE_TAG);
}

/* ---------- traces ---------- */

export async function saveTraceSettings(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = parseTraceSettings(form);
  if (!parsed.ok) return fail(parsed.error);

  return asAdmin(async (supabase) => {
    const { error } = await supabase
      .from("profile")
      .upsert({ id: 1, traces: parsed.data, updated_at: new Date().toISOString() });
    return error ? `Could not save: ${error.message}` : null;
  });
}

/** Approve, hide or show a trace. Open pages update live (database broadcast). */
export async function setTraceStatus(id: string, status: "live" | "hidden") {
  if (status !== "live" && status !== "hidden") return;
  await inboxChange(id, (db) => db.from("traces").update({ status }).eq("id", id));
}

export async function deleteTrace(id: string) {
  await inboxChange(id, (db) => db.from("traces").delete().eq("id", id));
}

/* ---------- uploads (profile picture, QR images, section images, resume PDF) ---------- */

export type UploadResult = { ok: true; url: string } | { ok: false; message: string };

const IMAGE_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

/** Uploads one image to the public "media" bucket and returns its URL. Saving the form stores the URL. */
export async function uploadImage(form: FormData): Promise<UploadResult> {
  const file = form.get("file");
  const folder = String(form.get("folder") ?? "");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Pick an image first." };
  if (!["avatar", "qr", "section"].includes(folder)) return { ok: false, message: "Unknown upload." };
  const ext = IMAGE_TYPES[file.type];
  if (!ext) return { ok: false, message: "Use a PNG, JPG or WebP image." };
  if (file.size > 2 * 1024 * 1024) return { ok: false, message: "Images can be at most 2 MB." };

  const session = await getAdminSession();
  if (session.state !== "admin") return { ok: false, message: "Your session ended. Sign in again." };

  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await session.supabase.storage
    .from("media")
    .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
  if (error) return { ok: false, message: `Upload failed: ${error.message}` };
  const { data } = session.supabase.storage.from("media").getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}

/** Uploads the resume PDF (up to 5 MB) and returns its URL. Saving the section stores it. */
export async function uploadFile(form: FormData): Promise<UploadResult> {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Pick a PDF first." };
  if (file.type !== "application/pdf") return { ok: false, message: "Use a PDF file." };
  if (file.size > 5 * 1024 * 1024) return { ok: false, message: "The PDF can be at most 5 MB." };

  const session = await getAdminSession();
  if (session.state !== "admin") return { ok: false, message: "Your session ended. Sign in again." };

  const path = `files/${crypto.randomUUID()}.pdf`;
  const { error } = await session.supabase.storage
    .from("media")
    .upload(path, file, { contentType: "application/pdf", cacheControl: "31536000", upsert: false });
  if (error) return { ok: false, message: `Upload failed: ${error.message}` };
  const { data } = session.supabase.storage.from("media").getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}
