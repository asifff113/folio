import {
  type HelpItem,
  type HelpSettings,
  PICKABLE_LAYOUTS,
  type Platform,
  type SectionItem,
  type SectionLayout,
  type Theme,
  type TraceSettings,
} from "@/config/site";
import {
  isNavUrl,
  NAV_LINKS_MAX,
  normalizeJourney,
  normalizeLook,
  normalizeScene,
  normalizeSeo,
  normalizeVisitors,
} from "@/config/customize";

/** Validation for everything the admin panel saves. Limits match supabase/schema.sql. */
type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const HEX = /^#[0-9a-f]{6}$/i;
const SLUG = /^[a-z0-9_-]{1,32}$/;

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

function tooLong(label: string, value: string, max: number) {
  return value.length > max ? `${label} can be at most ${max} characters.` : null;
}

export function parseProfile(form: FormData): Result<{
  name: string;
  avatar_url: string;
  handle: string;
  tagline: string;
  about_heading: string;
  about_body: string;
  interests_heading: string;
  interests_tags: string[];
}> {
  const name = text(form, "name");
  const avatar = text(form, "avatar_url");
  const handle = text(form, "handle");
  const tagline = text(form, "tagline");
  const aboutHeading = text(form, "about_heading");
  const aboutBody = text(form, "about_body");
  const interestsHeading = text(form, "interests_heading");
  const tags = text(form, "interests_tags")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  if (!name) return { ok: false, error: "Name is required." };
  if (!isOwnImage(avatar)) return { ok: false, error: "Upload the profile picture here instead of linking it." };
  if (!handle) return { ok: false, error: "Handle is required." };
  if (!/^[A-Za-z0-9_.-]+$/.test(handle))
    return { ok: false, error: "Handle can only use letters, numbers, dots, dashes and underscores." };
  if (tags.length > 24) return { ok: false, error: "Use at most 24 interest tags." };
  const longTag = tags.find((t) => t.length > 24);
  if (longTag) return { ok: false, error: `The tag "${longTag.slice(0, 30)}" is longer than 24 characters.` };

  const error =
    tooLong("Name", name, 40) ??
    tooLong("Handle", handle, 32) ??
    tooLong("Tagline", tagline, 140) ??
    tooLong("About heading", aboutHeading, 120) ??
    tooLong("About text", aboutBody, 1200) ??
    tooLong("Interests heading", interestsHeading, 120);
  if (error) return { ok: false, error };

  return {
    ok: true,
    data: {
      name,
      avatar_url: avatar,
      handle,
      tagline,
      about_heading: aboutHeading,
      about_body: aboutBody,
      interests_heading: interestsHeading,
      interests_tags: tags,
    },
  };
}

function parseJson(form: FormData, key: string): unknown {
  try {
    return JSON.parse(String(form.get(key) ?? ""));
  } catch {
    return null;
  }
}

/** True for an image uploaded to this project's own "media" bucket (or empty). */
export function isOwnImage(url: string) {
  if (url === "") return true;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !!base && url.length <= 400 && url.startsWith(`${base}/storage/v1/object/public/media/`);
}

const QR_MODES = new Set(["none", "generated", "image"]);

function isSafeUrl(url: string) {
  if (url === "") return true;
  if (url.length > 300 || !/^(https?:\/\/|mailto:)/i.test(url)) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function parsePlatforms(form: FormData): Result<Platform[]> {
  const raw = parseJson(form, "platforms");
  if (!Array.isArray(raw)) return { ok: false, error: "Could not read the links. Reload and try again." };
  if (raw.length > 20) return { ok: false, error: "Use at most 20 links." };

  const seen = new Set<string>();
  const out: Platform[] = [];
  for (const item of raw) {
    const p = item as Partial<Platform>;
    const id = String(p.id ?? "");
    const label = String(p.label ?? "").trim();
    const url = String(p.url ?? "").trim();
    const color = String(p.color ?? "");
    const handle = String(p.handle ?? "").trim();
    const note = String(p.note ?? "").trim();
    const qr = String(p.qr ?? "none");
    const qrImage = String(p.qrImage ?? "");
    if (!SLUG.test(id)) return { ok: false, error: `"${label || id}" has an invalid id.` };
    if (seen.has(id)) return { ok: false, error: `Two links share the id "${id}".` };
    if (!label || label.length > 32) return { ok: false, error: "Every link needs a name of 1 to 32 characters." };
    if (!isSafeUrl(url))
      return { ok: false, error: `The ${label} link must start with https://, http:// or mailto:.` };
    if (!HEX.test(color)) return { ok: false, error: `The ${label} color must look like #2fe3ff.` };
    if (handle.length > 60) return { ok: false, error: `The ${label} username can be at most 60 characters.` };
    if (note.length > 200) return { ok: false, error: `The ${label} note can be at most 200 characters.` };
    if (!QR_MODES.has(qr)) return { ok: false, error: `The ${label} QR setting is invalid.` };
    if (!isOwnImage(qrImage)) return { ok: false, error: `The ${label} QR image must be uploaded here.` };
    if (qr === "generated" && !url) return { ok: false, error: `${label} needs a link to make a QR code from.` };
    if (qr === "image" && !qrImage) return { ok: false, error: `Upload a QR image for ${label}, or pick another QR option.` };
    seen.add(id);
    out.push({
      id,
      label,
      url,
      color: color.toLowerCase(),
      visible: p.visible !== false,
      handle,
      note,
      qr: qr as Platform["qr"],
      qrImage,
    });
  }
  return { ok: true, data: out };
}

/* ---------- sections ---------- */

const SECTION_KEY = /^[a-z0-9_-]{1,32}$/;
const PICKABLE = new Set<string>(PICKABLE_LAYOUTS.map((l) => l.id));

export type SectionListEntry = { key: string; title: string; enabled: boolean };

/** The sections list: order, titles and on/off. */
export function parseSectionList(form: FormData): Result<SectionListEntry[]> {
  const raw = parseJson(form, "sections");
  if (!Array.isArray(raw) || raw.length > 60) return { ok: false, error: "Could not read the sections. Reload and try again." };

  const seen = new Set<string>();
  const out: SectionListEntry[] = [];
  for (const item of raw) {
    const s = item as Partial<SectionListEntry>;
    const key = String(s.key ?? "");
    const title = String(s.title ?? "").trim();
    if (!SECTION_KEY.test(key) || seen.has(key)) return { ok: false, error: "Unknown section in the list." };
    if (!title || title.length > 40) return { ok: false, error: "Every section needs a title of 1 to 40 characters." };
    seen.add(key);
    out.push({ key, title, enabled: s.enabled === true });
  }
  return { ok: true, data: out };
}

/** "+ new section": a title and a layout. */
export function parseNewSection(form: FormData): Result<{ title: string; layout: SectionLayout }> {
  const title = text(form, "title");
  const layout = text(form, "layout");
  if (!title || title.length > 40) return { ok: false, error: "Give the section a title of 1 to 40 characters." };
  if (!PICKABLE.has(layout)) return { ok: false, error: "Pick a layout." };
  return { ok: true, data: { title, layout: layout as SectionLayout } };
}

/** A URL key for a new section, from its title ("Talks & panels" → "talks-panels"). */
export function sectionKeyFrom(title: string) {
  return (
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 28) || "section"
  );
}

export function isOwnFile(url: string) {
  return isOwnImage(url) && /\.pdf$/i.test(url);
}

export type SectionEdit = {
  key: string;
  title: string;
  intro: string;
  layout: SectionLayout;
  enabled: boolean;
  items: SectionItem[];
};

const MAX_ITEMS = 60;

/** One section's editor: its settings and all its items. */
export function parseSection(form: FormData): Result<SectionEdit> {
  const raw = parseJson(form, "section") as (Partial<SectionEdit> & { items?: unknown }) | null;
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.items))
    return { ok: false, error: "Could not read the section. Reload and try again." };

  const key = String(raw.key ?? "");
  const title = String(raw.title ?? "").trim();
  const intro = String(raw.intro ?? "").trim();
  const layout = String(raw.layout ?? "") as SectionLayout;
  if (!SECTION_KEY.test(key)) return { ok: false, error: "Unknown section." };
  if (!title || title.length > 40) return { ok: false, error: "The title needs 1 to 40 characters." };
  if (intro.length > 240) return { ok: false, error: "The intro line can be at most 240 characters." };
  if (!PICKABLE.has(layout) && layout !== "file" && layout !== "form") return { ok: false, error: "Pick a layout." };
  if (raw.items.length > MAX_ITEMS) return { ok: false, error: `A section can hold at most ${MAX_ITEMS} items.` };

  const seen = new Set<string>();
  const items: SectionItem[] = [];
  for (const [index, entry] of raw.items.entries()) {
    const it = entry as Partial<SectionItem>;
    const n = index + 1;
    const str = (v: unknown) => String(v ?? "").trim();
    const item: SectionItem = {
      id: str(it.id),
      title: str(it.title),
      subtitle: str(it.subtitle),
      date: str(it.date),
      body: str(it.body),
      details: String(it.details ?? "").replace(/\r\n/g, "\n").trim(),
      image: str(it.image),
      tags: Array.isArray(it.tags)
        ? [...new Set(it.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean))]
        : [],
      link1Label: str(it.link1Label),
      link1Url: str(it.link1Url),
      link2Label: str(it.link2Label),
      link2Url: str(it.link2Url),
      level: Number(it.level ?? 0),
      visible: it.visible !== false,
    };
    if (!UUID.test(item.id) || seen.has(item.id)) return { ok: false, error: "Item list is damaged. Reload and try again." };
    seen.add(item.id);
    const problem =
      tooLong(`Item ${n} title`, item.title, 120) ??
      tooLong(`Item ${n} second line`, item.subtitle, 120) ??
      tooLong(`Item ${n} date`, item.date, 40) ??
      tooLong(`Item ${n} short text`, item.body, 600) ??
      tooLong(`Item ${n} details`, item.details, 4000) ??
      tooLong(`Item ${n} link label`, item.link1Label, 24) ??
      tooLong(`Item ${n} link label`, item.link2Label, 24);
    if (problem) return { ok: false, error: problem };
    if (item.tags.length > 8 || item.tags.some((t) => t.length > 24))
      return { ok: false, error: `Item ${n}: use at most 8 tags of up to 24 characters.` };
    if (!Number.isInteger(item.level) || item.level < 0 || item.level > 5)
      return { ok: false, error: `Item ${n}: the level must be 0 to 5.` };
    if (!isOwnImage(item.image)) return { ok: false, error: `Item ${n}: images must be uploaded here.` };
    if (layout === "file") {
      if (item.link1Url && !isOwnFile(item.link1Url)) return { ok: false, error: "Upload the resume as a PDF here." };
    } else if (!isSafeUrl(item.link1Url) || !isSafeUrl(item.link2Url)) {
      return { ok: false, error: `Item ${n}: links must start with https://, http:// or mailto:.` };
    }
    if (layout === "gallery" && !item.image) return { ok: false, error: `Photo ${n} has no image yet. Upload one or remove it.` };
    if (layout === "skills" && !item.title) return { ok: false, error: `Skill ${n} needs a name.` };
    if (layout === "links" && !item.link1Url) return { ok: false, error: `Link ${n} needs a URL.` };
    if ((layout === "cards" || layout === "timeline") && !item.title)
      return { ok: false, error: `Item ${n} needs a title.` };
    items.push(item);
  }
  return { ok: true, data: { key, title, intro, layout, enabled: raw.enabled === true, items } };
}

export function parseTheme(form: FormData): Result<Theme> {
  const primary = text(form, "primary");
  const secondary = text(form, "secondary");
  if (!HEX.test(primary) || !HEX.test(secondary)) return { ok: false, error: "Colors must look like #2fe3ff." };
  return {
    ok: true,
    data: {
      primary: primary.toLowerCase(),
      secondary: secondary.toLowerCase(),
      scanlines: form.get("scanlines") === "on",
    },
  };
}

/* ---------- help ---------- */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KINDS = new Set(["need", "offer"]);
const URGENCIES = new Set(["low", "medium", "urgent"]);
const STATUSES = new Set(["open", "in_progress", "solved"]);

export function parseHelp(form: FormData): Result<{ settings: HelpSettings; items: HelpItem[] }> {
  const raw = parseJson(form, "help") as { settings?: Partial<HelpSettings>; items?: unknown } | null;
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.items))
    return { ok: false, error: "Could not read the help section. Reload and try again." };

  const s = raw.settings ?? {};
  const heading = String(s.heading ?? "").trim();
  const intro = String(s.intro ?? "").trim();
  if (!heading || heading.length > 80) return { ok: false, error: "The chapter heading needs 1 to 80 characters." };
  if (intro.length > 240) return { ok: false, error: "The intro line can be at most 240 characters." };
  if (raw.items.length > 40) return { ok: false, error: "Use at most 40 items in total." };

  const seen = new Set<string>();
  const items: HelpItem[] = [];
  for (const entry of raw.items) {
    const i = entry as Partial<HelpItem>;
    const id = String(i.id ?? "");
    const title = String(i.title ?? "").trim();
    const details = String(i.details ?? "").trim();
    const tags = Array.isArray(i.tags)
      ? i.tags.map((t) => String(t).trim().replace(/^#+/, "").toLowerCase()).filter(Boolean)
      : [];
    if (!UUID.test(id) || seen.has(id)) return { ok: false, error: "An item has an invalid id. Reload and try again." };
    if (!KINDS.has(String(i.kind)) || !URGENCIES.has(String(i.urgency)) || !STATUSES.has(String(i.status)))
      return { ok: false, error: `"${title || "An item"}" has an invalid setting. Reload and try again.` };
    if (!title || title.length > 80) return { ok: false, error: "Every item needs a title of 1 to 80 characters." };
    if (details.length > 600) return { ok: false, error: `The details of "${title}" can be at most 600 characters.` };
    if (tags.length > 6) return { ok: false, error: `"${title}" can have at most 6 tags.` };
    const longTag = tags.find((t) => t.length > 24);
    if (longTag) return { ok: false, error: `The tag "${longTag.slice(0, 30)}" is longer than 24 characters.` };
    seen.add(id);
    items.push({
      id,
      kind: i.kind as HelpItem["kind"],
      title,
      details,
      tags: [...new Set(tags)],
      urgency: i.urgency as HelpItem["urgency"],
      status: i.status as HelpItem["status"],
      visible: i.visible !== false,
    });
  }

  return {
    ok: true,
    data: {
      settings: {
        enabled: s.enabled !== false,
        heading,
        intro,
        accept: s.accept !== false,
        showSolved: s.showSolved !== false,
      },
      items,
    },
  };
}

/* ---------- traces ---------- */

export function parseTraceSettings(form: FormData): Result<TraceSettings> {
  const wallLimit = Number(text(form, "wallLimit"));
  if (!Number.isInteger(wallLimit) || wallLimit < 10 || wallLimit > 1000)
    return { ok: false, error: "Stars on the wall must be a whole number from 10 to 1000." };
  return {
    ok: true,
    data: {
      enabled: form.get("enabled") === "on",
      approval: form.get("approval") === "on",
      allowMessage: form.get("allowMessage") === "on",
      wallLimit,
    },
  };
}

/* ---------- customization (look, 3D, journey) ---------- */

/** The settings come as one JSON field and are cleaned by the same rules the site reads them with. */
function parseSettings<T>(form: FormData, key: string, normalize: (raw: unknown) => T, label: string): Result<T> {
  const raw = parseJson(form, key);
  if (!raw || typeof raw !== "object") return { ok: false, error: `Could not read the ${label} settings. Reload and try again.` };
  return { ok: true, data: normalize(raw) };
}

export const parseLook = (form: FormData) => parseSettings(form, "look", normalizeLook, "look");
export const parseScene = (form: FormData) => parseSettings(form, "scene", normalizeScene, "3D");
/** Journey, including the nav bar. A nav link with a name needs a usable address, and the other way round. */
export function parseJourney(form: FormData): Result<ReturnType<typeof normalizeJourney>> {
  const parsed = parseSettings(form, "journey", normalizeJourney, "journey");
  if (!parsed.ok) return parsed;
  const raw = parseJson(form, "journey") as { nav?: { links?: unknown } } | null;
  const links = Array.isArray(raw?.nav?.links) ? (raw.nav.links as { label?: unknown; url?: unknown }[]) : [];
  for (const link of links) {
    const label = typeof link?.label === "string" ? link.label.trim() : "";
    const url = typeof link?.url === "string" ? link.url.trim() : "";
    if (!label && !url) continue;
    if (!label) return { ok: false, error: "Give each nav link a name, or remove it." };
    if (!isNavUrl(url))
      return { ok: false, error: `The nav link "${label}" needs an address starting with https:// or mailto:.` };
  }
  if (links.filter((l) => l?.label || l?.url).length > NAV_LINKS_MAX)
    return { ok: false, error: `Up to ${NAV_LINKS_MAX} extra nav links.` };
  return parsed;
}

export const parseVisitors = (form: FormData) => parseSettings(form, "visitors", normalizeVisitors, "visitor");

/** SEO & sharing. An uploaded share image must come from this site's storage. */
export function parseSeo(form: FormData): Result<ReturnType<typeof normalizeSeo>> {
  const parsed = parseSettings(form, "seo", normalizeSeo, "SEO");
  if (!parsed.ok) return parsed;
  const raw = parseJson(form, "seo") as { siteUrl?: unknown } | null;
  if (typeof raw?.siteUrl === "string" && raw.siteUrl.trim() && !parsed.data.siteUrl)
    return { ok: false, error: "The site address must start with https:// (or leave it empty)." };
  if (!isOwnImage(parsed.data.shareImageUrl)) return { ok: false, error: "Upload the share image here instead of linking it." };
  if (parsed.data.shareImage === "upload" && !parsed.data.shareImageUrl)
    return { ok: false, error: "Upload a share image, or pick \"made for me\"." };
  return parsed;
}
