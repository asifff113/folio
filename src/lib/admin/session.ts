import "server-only";
import { createAuthClient } from "@/lib/supabase/clients";

/**
 * Who is using the admin panel right now. Every admin page and every save
 * action calls this; the proxy redirect alone is not trusted.
 */
export async function getAdminSession() {
  const supabase = await createAuthClient();
  if (!supabase) return { state: "unconfigured" } as const;

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return { state: "signed-out" } as const;

  const email = typeof claims.email === "string" ? claims.email : "";
  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error || isAdmin !== true) return { state: "not-admin", email } as const;

  return { state: "admin", email, supabase } as const;
}
