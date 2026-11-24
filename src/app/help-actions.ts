"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { CONTACT_PLATFORMS } from "@/config/site";
import { createPublicClient } from "@/lib/supabase/clients";

export type ResponseState = { ok: boolean; message: string; at: number } | null;

const fail = (message: string): ResponseState => ({ ok: false, message, at: Date.now() });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PLATFORMS = new Set<string>(CONTACT_PLATFORMS.map((p) => p.id));

const MESSAGES: Record<string, string> = {
  closed: "Responses are switched off right now.",
  not_found: "This item was just removed. Reload the page.",
  solved: "This one is already solved. Thank you anyway!",
  invalid: "Check the fields and try again.",
  rate_limited: "You've sent a few notes already. Try again in an hour.",
  busy: "Lots of notes right now. Try again a little later.",
};

/** A visitor's note about a help item. Lands in the admin inbox. */
export async function sendHelpResponse(_prev: ResponseState, form: FormData): Promise<ResponseState> {
  // Bots fill every field; people never see this one.
  if (String(form.get("website") ?? "") !== "") return { ok: true, message: "Sent.", at: Date.now() };

  const item = String(form.get("item") ?? "");
  const name = String(form.get("name") ?? "").trim();
  const platform = String(form.get("platform") ?? "");
  const contact = String(form.get("contact") ?? "").trim();
  const note = String(form.get("note") ?? "").trim();
  const source = String(form.get("source") ?? "direct").slice(0, 40);

  if (!UUID.test(item)) return fail("This item is no longer available. Reload the page.");
  if (!name || name.length > 40) return fail("Add your name (up to 40 characters).");
  if (!PLATFORMS.has(platform)) return fail("Pick how I can reach you.");
  if (!contact || contact.length > 120) return fail("Add your contact (up to 120 characters).");
  if (platform === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) return fail("That email address looks off.");
  if (!note || note.length > 800) return fail("Write a short note (up to 800 characters).");

  const supabase = createPublicClient();
  if (!supabase) return fail("The site isn't connected to its database yet.");

  // Only a hash of the address is stored, and only to limit how often one visitor can send.
  const h = await headers();
  const address = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const fingerprint = createHash("sha256").update(`folio:${address}`).digest("hex").slice(0, 32);

  const { error } = await supabase.rpc("submit_help_response", {
    p_item: item,
    p_name: name,
    p_platform: platform,
    p_contact: contact,
    p_note: note,
    p_source: source,
    p_fingerprint: fingerprint,
  });
  if (error) {
    const known = MESSAGES[error.message];
    if (!known) console.error("[help] submit failed:", error.message);
    return fail(known ?? "Couldn't send right now. Try again in a moment.");
  }
  return { ok: true, message: "Sent.", at: Date.now() };
}
