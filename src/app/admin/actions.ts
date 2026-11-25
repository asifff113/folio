"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { SITE_TAG } from "@/lib/content";
import { getAdminSession } from "@/lib/admin/session";
import { parseHelp, parsePlatforms, parseProfile, parseSections, parseTheme, parseTraceSettings } from "@/lib/admin/validate";
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

export async function saveSections(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = parseSections(form);
  if (!parsed.ok) return fail(parsed.error);

  return asAdmin(async (supabase) => {
    const rows = parsed.data.map((s, sort) => ({ ...s, sort }));
    const { error } = await supabase.from("sections").upsert(rows);
    return error ? `Could not save: ${error.message}` : null;
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

/* ---------- image uploads (profile picture, QR images) ---------- */

export type UploadResult = { ok: true; url: string } | { ok: false; message: string };

const IMAGE_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

/** Uploads one image to the public "media" bucket and returns its URL. Saving the form stores the URL. */
export async function uploadImage(form: FormData): Promise<UploadResult> {
  const file = form.get("file");
  const folder = String(form.get("folder") ?? "");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Pick an image first." };
  if (!["avatar", "qr"].includes(folder)) return { ok: false, message: "Unknown upload." };
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
