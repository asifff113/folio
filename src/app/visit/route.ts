import { createHash } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createPublicClient, supabaseEnv } from "@/lib/supabase/clients";

/**
 * Counts one visit. The browser posts here once per visit (with where it came
 * from); the address and browser are hashed here and never stored. Bots and
 * the signed-in admin are not counted. Answers with the visit id (for the
 * "still here" updates) and the public counter.
 */
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|headless|lighthouse|pagespeed|screenshot|curl|wget|python|axios|node-fetch|go-http/i;
const SOURCE = /^[a-z0-9._-]{1,40}$/;

const noStore = (body: unknown) => NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });

function device(agent: string): "phone" | "tablet" | "desktop" {
  if (/iPad|Tablet|PlayBook|Silk|Android(?!.*Mobile)/i.test(agent)) return "tablet";
  if (/Mobi|iPhone|iPod|Android/i.test(agent)) return "phone";
  return "desktop";
}

async function signedIn(request: NextRequest) {
  const env = supabaseEnv();
  if (!env || !request.cookies.getAll().some((c) => c.name.startsWith("sb-"))) return false;
  const supabase = createServerClient(env.url, env.key, {
    cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} },
  });
  const { data } = await supabase.auth.getClaims();
  return Boolean(data?.claims);
}

export async function POST(request: NextRequest) {
  const db = createPublicClient();
  if (!db) return noStore({ id: null, counter: null });

  const agent = request.headers.get("user-agent") ?? "";
  const counterOnly = async () => noStore({ id: null, counter: (await db.rpc("visit_counter")).data ?? null });
  if (!agent || BOT.test(agent) || (await signedIn(request))) return counterOnly();

  let source = "direct";
  try {
    const body = (await request.json()) as { source?: unknown };
    if (typeof body.source === "string" && SOURCE.test(body.source)) source = body.source;
  } catch {
    // No body: counted as a direct visit.
  }

  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "";
  const country = (request.headers.get("x-vercel-ip-country") ?? "").toUpperCase();
  const hash = createHash("sha256").update(`visit:${address}:${agent}`).digest("hex");

  const { data, error } = await db.rpc("record_visit", {
    p_hash: hash,
    p_country: /^[A-Z]{2}$/.test(country) ? country : "",
    p_source: source,
    p_device: device(agent),
  });
  if (error) {
    if (error.message !== "busy") console.error("[visits] record failed:", error.message);
    return counterOnly();
  }
  return noStore(data);
}
