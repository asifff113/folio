import { defaultSite, type HelpItem, type HelpSettings, type Platform, type Section, type Theme } from "@/config/site";

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
  handle: string;
  tagline: string;
  about_heading: string;
  about_body: string;
  interests_heading: string;
  interests_tags: string[];
}> {
  const name = text(form, "name");
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
    if (!SLUG.test(id)) return { ok: false, error: `"${label || id}" has an invalid id.` };
    if (seen.has(id)) return { ok: false, error: `Two links share the id "${id}".` };
    if (!label || label.length > 32) return { ok: false, error: "Every link needs a name of 1 to 32 characters." };
    if (!isSafeUrl(url))
      return { ok: false, error: `The ${label} link must start with https://, http:// or mailto:.` };
    if (!HEX.test(color)) return { ok: false, error: `The ${label} color must look like #2fe3ff.` };
    seen.add(id);
    out.push({ id, label, url, color: color.toLowerCase(), visible: p.visible !== false });
  }
  return { ok: true, data: out };
}

const SECTION_KEYS = new Set(defaultSite.sections.map((s) => s.key));

export function parseSections(form: FormData): Result<Section[]> {
  const raw = parseJson(form, "sections");
  if (!Array.isArray(raw)) return { ok: false, error: "Could not read the sections. Reload and try again." };

  const seen = new Set<string>();
  const out: Section[] = [];
  for (const item of raw) {
    const s = item as Partial<Section>;
    const key = String(s.key ?? "");
    const title = String(s.title ?? "").trim();
    if (!SECTION_KEYS.has(key) || seen.has(key)) return { ok: false, error: "Unknown section in the list." };
    if (!title || title.length > 40) return { ok: false, error: "Every section needs a title of 1 to 40 characters." };
    seen.add(key);
    out.push({ key, title, enabled: s.enabled === true });
  }
  return { ok: true, data: out };
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
