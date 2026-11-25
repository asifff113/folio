import { Suspense } from "react";
import Link from "next/link";
import { AdminContent, AdminLoading } from "@/components/admin/AdminContent";
import { SectionEditor } from "@/components/admin/SectionEditor";

export default function Page({ params }: { params: Promise<{ key: string }> }) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminContent>{(site) => <Editor params={params} sections={site.sections} />}</AdminContent>
    </Suspense>
  );
}

async function Editor({
  params,
  sections,
}: {
  params: Promise<{ key: string }>;
  sections: Parameters<typeof SectionEditor>[0]["section"][];
}) {
  const { key } = await params;
  const section = sections.find((s) => s.key === key);
  if (!section) {
    return (
      <div className="panel max-w-none">
        <p className="eyebrow">{"// not found"}</p>
        <p className="panel-text">This section doesn&apos;t exist (it may have been deleted).</p>
        <Link href="/admin/sections" className="btn mt-4 self-start no-underline">
          ← all sections
        </Link>
      </div>
    );
  }
  return (
    <>
      <div className="mb-5">
        <p className="eyebrow">{"// sections"}</p>
        <h1 className="panel-title">{section.title}</h1>
      </div>
      <SectionEditor key={`${section.key}:${section.items.map((i) => i.id).join()}`} section={section} />
    </>
  );
}
