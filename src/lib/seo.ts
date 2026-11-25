import type { SiteConfig } from "@/config/site";

/**
 * The site's public address: the one set in /admin/seo, else the Vercel
 * production address (set automatically on Vercel), else localhost.
 */
export function siteUrl(site: SiteConfig) {
  if (site.seo.siteUrl) return site.seo.siteUrl;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export const seoTitle = (site: SiteConfig) => site.seo.title || site.name;
export const seoDescription = (site: SiteConfig) => site.seo.description || site.tagline || site.about.body.slice(0, 160);

/** Search engines may list the site: switched on, and not in maintenance mode. */
export const indexable = (site: SiteConfig) => site.seo.indexable && !site.journey.maintenance;

/** The share image: your uploaded one, or the one made for you at /og. */
export const shareImage = (site: SiteConfig) =>
  site.seo.shareImage === "upload" && site.seo.shareImageUrl ? site.seo.shareImageUrl : "/og";

/** Structured data so search engines know who the site is about and which profiles are yours. */
export function personJsonLd(site: SiteConfig) {
  const url = siteUrl(site);
  const sameAs = site.platforms.filter((p) => p.visible && /^https?:\/\//.test(p.url)).map((p) => p.url);
  const data = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: site.name,
    url,
    description: seoDescription(site),
    ...(site.avatar ? { image: site.avatar } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
  // Escape "<" so the JSON can't close the script tag it sits in.
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
