import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { getAdminSession } from "@/lib/admin/session";
import { readSiteContent } from "@/lib/content";
import { SiteJourney } from "@/components/site/SiteJourney";

export const metadata: Metadata = { title: "Preview", robots: { index: false, follow: false } };

/**
 * The full site with your latest saved settings, for you only (signed in as
 * admin). Useful while maintenance mode hides the site from visitors.
 */
export default function PreviewPage() {
  return (
    <Suspense fallback={<p className="p-6 font-mono text-xs text-holo">&gt; loading preview ......</p>}>
      <Preview />
    </Suspense>
  );
}

async function Preview() {
  const session = await getAdminSession();
  if (session.state !== "admin") redirect("/");
  const site = await readSiteContent(session.supabase);
  if (!site) redirect("/");

  return (
    <SiteJourney
      site={site}
      banner={
        <p className="fixed top-[calc(80px+env(safe-area-inset-top,0px))] left-1/2 z-[6] flex -translate-x-1/2 flex-wrap items-center gap-3 border border-[#ffb23b] bg-[rgba(20,14,4,.92)] px-4 py-2 font-mono text-[12px] text-[#ffd79a]">
          private preview
          {site.journey.maintenance ? " · visitors see the maintenance screen" : ""}
          <Link href="/admin/journey" className="text-holo">
            back to admin
          </Link>
        </p>
      }
    />
  );
}
