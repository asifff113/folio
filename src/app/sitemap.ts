import type { MetadataRoute } from "next";
import { getSiteContent } from "@/lib/content";
import { siteUrl } from "@/lib/seo";

/** The site is one page, so the sitemap lists just that. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = await getSiteContent();
  return [{ url: siteUrl(site), changeFrequency: "monthly", priority: 1 }];
}
