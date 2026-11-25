import { Suspense } from "react";
import { AdminContent, AdminLoading, EditorHeader } from "@/components/admin/AdminContent";
import { SeoForm } from "@/components/admin/SeoForm";
import { siteUrl } from "@/lib/seo";

export default function Page() {
  return (
    <>
      <EditorHeader eyebrow="// seo" title="SEO & sharing">
        How your site shows up in search results and when someone shares the link.
      </EditorHeader>
      <Suspense fallback={<AdminLoading />}>
        <AdminContent>
          {(site) => (
            <SeoForm
              seo={site.seo}
              fallback={{
                title: site.name,
                description: site.tagline,
                siteUrl: siteUrl({ ...site, seo: { ...site.seo, siteUrl: "" } }),
                avatar: site.avatar,
                letter: (site.name.trim()[0] ?? "N").toUpperCase(),
              }}
            />
          )}
        </AdminContent>
      </Suspense>
    </>
  );
}
