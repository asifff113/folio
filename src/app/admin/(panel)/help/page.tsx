import { Suspense } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SiteConfig } from "@/config/site";
import { AdminContent, AdminLoading, EditorHeader } from "@/components/admin/AdminContent";
import { HelpForm } from "@/components/admin/HelpForm";

export default function Page() {
  return (
    <>
      <EditorHeader eyebrow="// help" title="Ready to help me?">
        What you need help with, what you can offer, and whether visitors can send you notes. Changes go live when you
        save.
      </EditorHeader>
      <Suspense fallback={<AdminLoading />}>
        <AdminContent>{(site, db) => <HelpEditor site={site} db={db} />}</AdminContent>
      </Suspense>
    </>
  );
}

/** The editor plus how many inbox notes each item has received. */
async function HelpEditor({ site, db }: { site: SiteConfig; db: SupabaseClient }) {
  const { data } = await db.from("inbox").select("item_id").returns<{ item_id: string | null }[]>();
  const responses: Record<string, number> = {};
  for (const row of data ?? []) if (row.item_id) responses[row.item_id] = (responses[row.item_id] ?? 0) + 1;

  const { items, ...settings } = site.help;
  return <HelpForm settings={settings} items={items} responses={responses} />;
}
