"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { SITE_TAG } from "@/lib/content";
import { getAdminSession } from "@/lib/admin/session";
import { parsePlatforms, parseProfile, parseSections, parseTheme } from "@/lib/admin/validate";
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
    const rows = parsed.data.map((p, sort) => ({ ...p, sort }));
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
