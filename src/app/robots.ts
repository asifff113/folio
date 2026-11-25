import type { MetadataRoute } from "next";
import { getSiteContent } from "@/lib/content";
import { indexable, siteUrl } from "@/lib/seo";

/** Lets search engines in (or keeps them out, as set in /admin/seo and during maintenance). Admin pages are never listed. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const site = await getSiteContent();
  const base = siteUrl(site);
  if (!indexable(site)) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/preview"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
