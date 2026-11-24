import { Suspense } from "react";
import { AdminContent, AdminLoading, EditorHeader } from "@/components/admin/AdminContent";
import { ThemeForm } from "@/components/admin/ThemeForm";

export default function Page() {
  return (
    <>
      <EditorHeader eyebrow="// theme" title="Theme">
        Colors for the HUD and the 3D world.
      </EditorHeader>
      <Suspense fallback={<AdminLoading />}>
        <AdminContent>{(site) => <ThemeForm theme={site.theme} />}</AdminContent>
      </Suspense>
    </>
  );
}
