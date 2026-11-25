import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { defaultSite, type HelpItem, type HelpSettings, type Platform, type Section, type SectionItem, type SiteConfig, type Theme, type TraceSettings } from "@/config/site";
import { normalizeJourney, normalizeLook, normalizeScene } from "@/config/customize";
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
  traces: Partial<TraceSettings> | null;
  look: unknown;
  scene: unknown;
  journey: unknown;
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
type SectionRow = Omit<Section, "items">;
type ItemRow = {
  id: string;
  section_key: string;
  title: string;
  subtitle: string;
  date_text: string;
  body: string;
  details: string;
  image_url: string;
  tags: string[];
  link1_label: string;
  link1_url: string;
  link2_label: string;
  link2_url: string;
  level: number;
  visible: boolean;
};

const ITEM_COLUMNS =
  "id,section_key,title,subtitle,date_text,body,details,image_url,tags,link1_label,link1_url,link2_label,link2_url,level,visible";

const toItem = (r: ItemRow): SectionItem => ({
  id: r.id,
  title: r.title,
  subtitle: r.subtitle,
  date: r.date_text,
  body: r.body,
  details: r.details,
  image: r.image_url,
  tags: r.tags ?? [],
  link1Label: r.link1_label,
  link1Url: r.link1_url,
  link2Label: r.link2_label,
  link2Url: r.link2_url,
  level: r.level,
  visible: r.visible,
});

/**
 * Help items in display order. Public reads only get visible items (row level
 * security); the admin client gets all of them.
 */
const HELP_COLUMNS = "id,kind,title,details,tags,urgency,status,visible";

/** Reads all site content with the given client. Returns null on any error. */
export async function readSiteContent(supabase: SupabaseClient): Promise<SiteConfig | null> {
  const [profile, platforms, sections, help, items] = await Promise.all([
    supabase.from("profile").select("*").eq("id", 1).maybeSingle<ProfileRow>(),
    supabase
      .from("platforms")
      .select("id,label,url,color,visible,handle,note,qr,qr_image")
      .order("sort")
      .returns<PlatformRow[]>(),
    supabase.from("sections").select("key,title,enabled,layout,intro,custom").order("sort").returns<SectionRow[]>(),
    supabase.from("help_items").select(HELP_COLUMNS).order("sort").returns<HelpItem[]>(),
    supabase.from("section_items").select(ITEM_COLUMNS).order("sort").returns<ItemRow[]>(),
  ]);

  const error = profile.error ?? platforms.error ?? sections.error ?? help.error ?? items.error;
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
    sections: sections.data
      ? sections.data.map((sec) => ({
          ...sec,
          items: (items.data ?? []).filter((i) => i.section_key === sec.key).map(toItem),
        }))
      : defaultSite.sections,
    theme: { ...defaultSite.theme, ...(p?.theme ?? {}) },
    help: { ...defaultSite.help, ...(p?.help ?? {}), items: help.data ?? [] },
    traces: { ...defaultSite.traces, ...(p?.traces ?? {}) },
    look: normalizeLook(p?.look),
    scene: normalizeScene(p?.scene),
    journey: normalizeJourney(p?.journey),
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
