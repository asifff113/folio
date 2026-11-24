import { Suspense } from "react";
import { AdminContent, AdminLoading, EditorHeader } from "@/components/admin/AdminContent";
import { LinksForm } from "@/components/admin/LinksForm";

export default function Page() {
  return (
    <>
      <EditorHeader eyebrow="// links" title="Links">
        The platforms in the signal chapter. Visitors also pick from these when they leave a trace.
      </EditorHeader>
      <Suspense fallback={<AdminLoading />}>
        <AdminContent>{(site) => <LinksForm platforms={site.platforms} />}</AdminContent>
      </Suspense>
    </>
  );
}
