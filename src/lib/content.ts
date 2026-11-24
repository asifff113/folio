import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { defaultSite, type SiteConfig, type Theme } from "@/config/site";
import { createPublicClient } from "@/lib/supabase/clients";

/** Cache tag for everything the public site reads. Admin saves expire it. */
export const SITE_TAG = "site";

type ProfileRow = {
  name: string;
  handle: string;
  tagline: string;
  about_heading: string;
  about_body: string;
  interests_heading: string;
  interests_tags: string[];
  theme: Partial<Theme> | null;
};

type PlatformRow = { id: string; label: string; url: string; color: string; visible: boolean };
type SectionRow = { key: string; title: string; enabled: boolean };

/** Reads all site content with the given client. Returns null on any error. */
export async function readSiteContent(supabase: SupabaseClient): Promise<SiteConfig | null> {
  const [profile, platforms, sections] = await Promise.all([
    supabase.from("profile").select("*").eq("id", 1).maybeSingle<ProfileRow>(),
    supabase.from("platforms").select("id,label,url,color,visible").order("sort").returns<PlatformRow[]>(),
    supabase.from("sections").select("key,title,enabled").order("sort").returns<SectionRow[]>(),
  ]);

  const error = profile.error ?? platforms.error ?? sections.error;
  if (error) {
    console.error("[content] Supabase read failed:", error.message);
    return null;
  }

  const p = profile.data;
  return {
    name: p?.name || defaultSite.name,
    handle: p?.handle || defaultSite.handle,
    tagline: p?.tagline ?? defaultSite.tagline,
    about: {
      heading: p?.about_heading ?? defaultSite.about.heading,
      body: p?.about_body ?? defaultSite.about.body,
    },
    interests: {
      heading: p?.interests_heading ?? defaultSite.interests.heading,
      tags: p?.interests_tags ?? defaultSite.interests.tags,
    },
    platforms: platforms.data ?? defaultSite.platforms,
    sections: sections.data ?? defaultSite.sections,
    theme: { ...defaultSite.theme, ...(p?.theme ?? {}) },
  };
}

/**
 * Site content for the public pages. Cached and shared by all visitors until
 * the admin saves something; falls back to the placeholders when Supabase is
 * not set up or a read fails.
 */
export async function getSiteContent(): Promise<SiteConfig> {
  "use cache";
  cacheTag(SITE_TAG);

  const supabase = createPublicClient();
  if (!supabase) {
    cacheLife("max");
    return defaultSite;
  }

  const content = await readSiteContent(supabase);
  if (!content) {
    // Retry soon instead of keeping the fallback for long.
    cacheLife("minutes");
    return defaultSite;
  }

  cacheLife("max");
  return content;
}
