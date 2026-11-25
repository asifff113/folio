"use server";

import { visitorFingerprint } from "@/lib/fingerprint";
import { createPublicClient } from "@/lib/supabase/clients";

export type TraceInput = {
  name: string;
  message: string;
  /** PNG data URL of the drawn signature. */
  signature: string;
  /** Where the visitor says they found you; may be empty. */
  platform: string;
  /** Where the site detected they came from. */
  detected: string;
};

export type TraceResult =
  | { ok: true; id: string; status: "live" | "pending"; createdAt: string }
  | { ok: false; message: string };

const MESSAGES: Record<string, string> = {
  closed: "Traces are switched off right now.",
  invalid: "Something in the form looks off. Draw your signature again and retry.",
  rate_limited: "You already left a trace. Try again in an hour.",
  busy: "Lots of traces right now. Try again a little later.",
};

const SLUG = /^[a-z0-9._-]*$/;
const SIGNATURE = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;

/** A visitor's signature for the traces wall. Their platform is only stored for the admin. */
export async function sendTrace(input: TraceInput): Promise<TraceResult> {
  const name = String(input?.name ?? "").trim();
  const message = String(input?.message ?? "").trim();
  const signature = String(input?.signature ?? "");
  const platform = String(input?.platform ?? "").toLowerCase();
  const detected = String(input?.detected ?? "direct").toLowerCase().slice(0, 40);

  if (name.length > 24) return { ok: false, message: "Keep the name to 24 characters." };
  if (message.length > 60) return { ok: false, message: "Keep the note to 60 characters." };
  if (!SLUG.test(platform) || platform.length > 24 || !SLUG.test(detected)) return { ok: false, message: MESSAGES.invalid };
  if (signature.length < 100 || signature.length > 60000 || !SIGNATURE.test(signature)) {
    return { ok: false, message: "Draw a signature first." };
  }

  const supabase = createPublicClient();
  if (!supabase) return { ok: false, message: "The site isn't connected to its database yet." };

  const fingerprint = await visitorFingerprint();

  const { data, error } = await supabase.rpc("submit_trace", {
    p_name: name,
    p_message: message,
    p_signature: signature,
    p_platform: platform,
    p_detected: detected || "direct",
    p_fingerprint: fingerprint,
  });
  if (error || !data) {
    const known = error ? MESSAGES[error.message] : undefined;
    if (!known) console.error("[traces] submit failed:", error?.message);
    return { ok: false, message: known ?? "Couldn't send right now. Try again in a moment." };
  }
  const row = data as { id: string; status: "live" | "pending"; created_at: string };
  return { ok: true, id: row.id, status: row.status, createdAt: row.created_at };
}
