import { Suspense } from "react";
import { AdminContent, AdminLoading, EditorHeader } from "@/components/admin/AdminContent";
import { ProfileForm } from "@/components/admin/ProfileForm";

export default function Page() {
  return (
    <>
      <EditorHeader eyebrow="// profile" title="Profile">
        Your name, intro, about text and interests. Changes go live as soon as you save.
      </EditorHeader>
      <Suspense fallback={<AdminLoading />}>
        <AdminContent>{(site) => <ProfileForm site={site} />}</AdminContent>
      </Suspense>
    </>
  );
}
