import { Suspense } from "react";
import { AdminContent, AdminLoading, EditorHeader } from "@/components/admin/AdminContent";
import { LookForm } from "@/components/admin/LookForm";

export default function Page() {
  return (
    <>
      <EditorHeader eyebrow="// look" title="Look">
        Colors, fonts, glow and the HUD frame. The preview updates as you change things.
      </EditorHeader>
      <Suspense fallback={<AdminLoading />}>
        <AdminContent>{(site) => <LookForm theme={site.theme} look={site.look} />}</AdminContent>
      </Suspense>
    </>
  );
}
