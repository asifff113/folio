import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";

/**
 * A hash of the visitor's network address. Only stored to limit how often one
 * visitor can send notes or traces; the address itself is never kept.
 */
export async function visitorFingerprint() {
  const h = await headers();
  const address = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`folio:${address}`).digest("hex").slice(0, 32);
}
