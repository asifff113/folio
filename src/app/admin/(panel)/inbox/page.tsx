import { Suspense } from "react";
import { AdminContent, AdminLoading, EditorHeader } from "@/components/admin/AdminContent";
import { InboxView } from "@/components/admin/Inbox";

export default function Page({ searchParams }: { searchParams: Promise<{ filter?: string; m?: string }> }) {
  return (
    <>
      <EditorHeader eyebrow="// inbox" title="Inbox">
        Notes visitors sent from your help section and contact form. Only you can see these.
      </EditorHeader>
      <Suspense fallback={<AdminLoading />}>
        <AdminContent>{(_site, db) => <InboxView db={db} params={searchParams} />}</AdminContent>
      </Suspense>
    </>
  );
}
