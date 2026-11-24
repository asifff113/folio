import { Suspense } from "react";
import { AdminContent, AdminLoading, EditorHeader } from "@/components/admin/AdminContent";
import { SectionsForm } from "@/components/admin/SectionsForm";

export default function Page() {
  return (
    <>
      <EditorHeader eyebrow="// sections" title="Sections">
        Optional sections. Each one you switch on becomes its own chapter of the journey once its content editor is built (phase 5).
      </EditorHeader>
      <Suspense fallback={<AdminLoading />}>
        <AdminContent>{(site) => <SectionsForm sections={site.sections} />}</AdminContent>
      </Suspense>
    </>
  );
}
