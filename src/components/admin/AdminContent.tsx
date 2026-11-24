import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import type { SiteConfig } from "@/config/site";
import { signOut } from "@/app/admin/actions";
import { getAdminSession } from "@/lib/admin/session";
import { readSiteContent } from "@/lib/content";
import { SetupSteps } from "./SetupSteps";

/**
 * Checks the admin session, loads fresh (uncached) content, and renders the
 * editor. Signed-out visitors go to the login page.
 */
export async function AdminContent({ children }: { children: (site: SiteConfig) => ReactNode }) {
  const session = await getAdminSession();
  if (session.state === "unconfigured") return <SetupSteps />;
  if (session.state === "signed-out") redirect("/admin/login");
  if (session.state === "not-admin") {
    return (
      <div className="panel max-w-none">
        <p className="eyebrow">{"// access denied"}</p>
        <h1 className="panel-title">This account is not an admin</h1>
        <p className="panel-text">
          {session.email || "This user"} is signed in but is not listed in the admins table. Run the last statement in{" "}
          <code className="text-fg">supabase/schema.sql</code> with this email, then reload.
        </p>
        <form action={signOut}>
          <button type="submit" className="btn">
            &gt; sign_out()
          </button>
        </form>
      </div>
    );
  }

  const site = await readSiteContent(session.supabase);
  if (!site) {
    return (
      <div className="panel max-w-none">
        <p className="eyebrow">{"// read error"}</p>
        <h1 className="panel-title">Could not load the content</h1>
        <p className="panel-text">
          Supabase answered with an error. Check that <code className="text-fg">supabase/schema.sql</code> was run in
          this project, then reload.
        </p>
      </div>
    );
  }
  return children(site);
}

/** Signed-in email and a sign-out button, for the admin header. */
export async function AccountBadge() {
  const session = await getAdminSession();
  if (session.state !== "admin" && session.state !== "not-admin") return null;
  return (
    <form action={signOut} className="flex items-center gap-3">
      <span className="hidden text-muted normal-case sm:inline">{session.email}</span>
      <button type="submit" className="cursor-pointer hover:underline">
        sign out
      </button>
    </form>
  );
}

/** Loading state while the session is checked. */
export function AdminLoading() {
  return <p className="font-mono text-xs text-holo">&gt; authenticating ......</p>;
}

export function EditorHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-5">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="panel-title">{title}</h1>
      {children && <p className="panel-text">{children}</p>}
    </div>
  );
}
