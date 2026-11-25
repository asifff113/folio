"use server";

import { CONTACT_PLATFORMS } from "@/config/site";
import { visitorFingerprint } from "@/lib/fingerprint";
import { createPublicClient } from "@/lib/supabase/clients";
import type { ResponseState } from "./help-actions";

const PLATFORMS = new Set<string>(CONTACT_PLATFORMS.map((p) => p.id));

const MESSAGES: Record<string, string> = {
  closed: "The contact form is switched off right now.",
  invalid: "Check the fields and try again.",
  rate_limited: "You've sent a few notes already. Try again in an hour.",
  busy: "Lots of notes right now. Try again a little later.",
};

const fail = (message: string): ResponseState => ({ ok: false, message, at: Date.now() });

/** The contact form. Lands in the admin inbox as a "contact" note. */
export async function sendContact(_prev: ResponseState, form: FormData): Promise<ResponseState> {
  // Bots fill every field; people never see this one.
  if (String(form.get("website") ?? "") !== "") return { ok: true, message: "Sent.", at: Date.now() };

  const name = String(form.get("name") ?? "").trim();
  const platform = String(form.get("platform") ?? "");
  const contact = String(form.get("contact") ?? "").trim();
  const note = String(form.get("note") ?? "").trim();
  const source = String(form.get("source") ?? "direct").slice(0, 40);

  if (!name || name.length > 40) return fail("Add your name (up to 40 characters).");
  if (!PLATFORMS.has(platform)) return fail("Pick how I can reach you.");
  if (!contact || contact.length > 120) return fail("Add your contact (up to 120 characters).");
  if (platform === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) return fail("That email address looks off.");
  if (!note || note.length > 800) return fail("Write a message (up to 800 characters).");

  const supabase = createPublicClient();
  if (!supabase) return fail("The site isn't connected to its database yet.");

  const { error } = await supabase.rpc("submit_contact", {
    p_name: name,
    p_platform: platform,
    p_contact: contact,
    p_note: note,
    p_source: source,
    p_fingerprint: await visitorFingerprint(),
  });
  if (error) {
    const known = MESSAGES[error.message];
    if (!known) console.error("[contact] submit failed:", error.message);
    return fail(known ?? "Couldn't send right now. Try again in a moment.");
  }
  return { ok: true, message: "Sent.", at: Date.now() };
}
