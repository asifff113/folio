import { Suspense } from "react";
import { AdminContent, AdminLoading, EditorHeader } from "@/components/admin/AdminContent";
import { SectionsForm } from "@/components/admin/SectionsForm";

export default function Page() {
  return (
    <>
      <EditorHeader eyebrow="// sections" title="Sections">
        Each section you switch on becomes its own chapter of the journey. Build your own with &quot;+ new section&quot;.
      </EditorHeader>
      <Suspense fallback={<AdminLoading />}>
        <AdminContent>{(site) => <SectionsForm key={site.sections.map((s) => s.key).join()} sections={site.sections} />}</AdminContent>
      </Suspense>
    </>
  );
}
