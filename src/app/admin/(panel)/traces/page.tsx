import { Suspense } from "react";
import { AdminContent, AdminLoading, EditorHeader } from "@/components/admin/AdminContent";
import { TracesView } from "@/components/admin/Traces";

export default function Page({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  return (
    <>
      <EditorHeader eyebrow="// traces" title="Traces">
        Signatures visitors left on your wall, and where they came from. Visitors never see where anyone came from.
      </EditorHeader>
      <Suspense fallback={<AdminLoading />}>
        <AdminContent>{(site, db) => <TracesView db={db} settings={site.traces} params={searchParams} />}</AdminContent>
      </Suspense>
    </>
  );
}
