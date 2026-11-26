import { Suspense } from "react";
import { AdminContent, AdminLoading, EditorHeader } from "@/components/admin/AdminContent";
import { VisitorsView } from "@/components/admin/Visitors";

export default function Page({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  return (
    <>
      <EditorHeader eyebrow="// visitors" title="Visitors">
        Who came, where from, and how far they scrolled. No cookies, no IP addresses.
      </EditorHeader>
      <Suspense fallback={<AdminLoading />}>
        <AdminContent>{(site, db) => <VisitorsView db={db} site={site} params={searchParams} />}</AdminContent>
      </Suspense>
    </>
  );
}
