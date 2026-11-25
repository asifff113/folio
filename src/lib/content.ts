import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { defaultSite, type HelpItem, type HelpSettings, type Platform, type SiteConfig, type Theme } from "@/config/site";
import { createPublicClient } from "@/lib/supabase/clients";

/** Cache tag for everything the public site reads. Admin saves expire it. */
export const SITE_TAG = "site";

type ProfileRow = {
  name: string;
  avatar_url: string | null;
  handle: string;
  tagline: string;
  about_heading: string;
  about_body: string;
  interests_heading: string;
  interests_tags: string[];
  theme: Partial<Theme> | null;
  help: Partial<HelpSettings> | null;
};

type PlatformRow = {
  id: string;
  label: string;
  url: string;
  color: string;
  visible: boolean;
  handle: string;
  note: string;
  qr: Platform["qr"];
  qr_image: string;
};
type SectionRow = { key: string; title: string; enabled: boolean };

/**
 * Help items in display order. Public reads only get visible items (row level
 * security); the admin client gets all of them.
 */
const HELP_COLUMNS = "id,kind,title,details,tags,urgency,status,visible";

/** Reads all site content with the given client. Returns null on any error. */
export async function readSiteContent(supabase: SupabaseClient): Promise<SiteConfig | null> {
  const [profile, platforms, sections, help] = await Promise.all([
    supabase.from("profile").select("*").eq("id", 1).maybeSingle<ProfileRow>(),
    supabase
      .from("platforms")
      .select("id,label,url,color,visible,handle,note,qr,qr_image")
      .order("sort")
      .returns<PlatformRow[]>(),
    supabase.from("sections").select("key,title,enabled").order("sort").returns<SectionRow[]>(),
    supabase.from("help_items").select(HELP_COLUMNS).order("sort").returns<HelpItem[]>(),
  ]);

  const error = profile.error ?? platforms.error ?? sections.error ?? help.error;
  if (error) {
    console.error("[content] Supabase read failed:", error.message);
    return null;
  }

  const p = profile.data;
  return {
    name: p?.name || defaultSite.name,
    avatar: p?.avatar_url ?? "",
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
    platforms: platforms.data
      ? platforms.data.map(({ qr_image, ...rest }) => ({ ...rest, qrImage: qr_image }))
      : defaultSite.platforms,
    sections: sections.data ?? defaultSite.sections,
    theme: { ...defaultSite.theme, ...(p?.theme ?? {}) },
    help: { ...defaultSite.help, ...(p?.help ?? {}), items: help.data ?? [] },
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
