/**
 * Customization settings (Phase 7): look, 3D & motion, journey.
 *
 * Stored as three JSON columns on the profile row. `normalize*` turns whatever
 * is stored (or sent from the admin panel) into a complete, safe settings
 * object, so the site never breaks on a missing or odd value. The defaults
 * reproduce the site as it looked before these settings existed.
 */

/* ---------- helpers ---------- */

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : {});
const num = (v: unknown, fallback: number, min: number, max: number) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.round(Math.min(max, Math.max(min, n))) : fallback;
};
const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
const pick = <T extends string>(v: unknown, options: readonly T[], fallback: T): T =>
  options.includes(v as T) ? (v as T) : fallback;
const str = (v: unknown, fallback: string, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : fallback;

/** Maps a 0–100 slider onto a range. */
export const lerp = (slider: number, from: number, to: number) => from + ((to - from) * slider) / 100;

/* ---------- look ---------- */

export const FONT_PAIRS = [
  { id: "hologram", name: "hologram", display: "--font-unbounded", body: "--font-manrope" },
  { id: "terminal", name: "terminal", display: "--font-spacemono", body: "--font-plexsans" },
  { id: "neon", name: "neon", display: "--font-orbitron", body: "--font-exo" },
  { id: "editorial", name: "editorial", display: "--font-syne", body: "--font-inter" },
  { id: "clean", name: "clean", display: "--font-spacegrotesk", body: "--font-inter" },
] as const;
export type FontPair = (typeof FONT_PAIRS)[number]["id"];

export const HUD_STYLES = ["full", "minimal", "off"] as const;
export type HudStyle = (typeof HUD_STYLES)[number];

export type LookSettings = {
  font: FontPair;
  /** Text size inside the boxes, in percent (90–120). */
  textScale: number;
  /** 0–100 sliders. */
  glow: number;
  haze: number;
  blur: number;
  boxOpacity: number;
  grain: boolean;
  vignette: boolean;
  /** Pink/cyan color fringe on the name. */
  fringe: boolean;
  hud: HudStyle;
  hudClock: boolean;
  hudCounter: boolean;
  hudRail: boolean;
  hudOnline: boolean;
};

export const defaultLook: LookSettings = {
  font: "hologram",
  textScale: 100,
  glow: 46,
  haze: 42,
  // Off by default: blurring the moving 3D behind the boxes costs ~20 fps (measured), and the site's
  // shipped look never had a visible blur (an ancestor's will-change: opacity had disabled it).
  blur: 0,
  boxOpacity: 50,
  grain: false,
  vignette: false,
  fringe: true,
  hud: "full",
  hudClock: true,
  hudCounter: true,
  hudRail: true,
  hudOnline: true,
};

export function normalizeLook(raw: unknown): LookSettings {
  const r = obj(raw);
  const d = defaultLook;
  return {
    font: pick(r.font, FONT_PAIRS.map((f) => f.id), d.font),
    textScale: num(r.textScale, d.textScale, 90, 120),
    glow: num(r.glow, d.glow, 0, 100),
    haze: num(r.haze, d.haze, 0, 100),
    blur: num(r.blur, d.blur, 0, 100),
    boxOpacity: num(r.boxOpacity, d.boxOpacity, 0, 100),
    grain: bool(r.grain, d.grain),
    vignette: bool(r.vignette, d.vignette),
    fringe: bool(r.fringe, d.fringe),
    hud: pick(r.hud, HUD_STYLES, d.hud),
    hudClock: bool(r.hudClock, d.hudClock),
    hudCounter: bool(r.hudCounter, d.hudCounter),
    hudRail: bool(r.hudRail, d.hudRail),
    hudOnline: bool(r.hudOnline, d.hudOnline),
  };
}

/** Bloom strength for the 3D world (0.55 at the default). */
export const bloomFrom = (look: LookSettings) => lerp(look.glow, 0, 1.2);
/** Fog density (0.028 at the default). */
export const fogFrom = (look: LookSettings) => lerp(look.haze, 0.008, 0.056);

/* ---------- 3D & motion ---------- */

export const SHAPES = ["sphere", "galaxy", "helix", "lattice", "torus", "waves", "orbits", "vortex", "exchange"] as const;
export type ShapeName = (typeof SHAPES)[number];

export type SceneSettings = {
  /** Chosen shape per chapter key (BOOT, ABOUT, INTERESTS, HELP, END, S:<section>). Missing = the usual one. */
  shapes: Record<string, ShapeName>;
  /** 0–100 sliders. */
  amount: number;
  size: number;
  accent: number;
  smooth: number;
  spin: number;
  sway: number;
  burst: number;
  grid: boolean;
  hologram: boolean;
  rings: boolean;
  stars: boolean;
  shooting: boolean;
  beams: boolean;
};

export const defaultScene: SceneSettings = {
  shapes: {},
  amount: 43,
  size: 39,
  accent: 30,
  smooth: 50,
  spin: 40,
  sway: 50,
  burst: 50,
  grid: true,
  hologram: true,
  rings: true,
  stars: false,
  shooting: false,
  beams: false,
};

/** Chapters whose shape can be chosen. The tunnel (connect) and the wall (traces) stay fixed. */
export const SHAPE_CHAPTER = /^(BOOT|ABOUT|INTERESTS|HELP|END|S:[a-z0-9_-]{1,32})$/;

export function normalizeScene(raw: unknown): SceneSettings {
  const r = obj(raw);
  const d = defaultScene;
  const shapes: Record<string, ShapeName> = {};
  for (const [key, value] of Object.entries(obj(r.shapes)).slice(0, 80)) {
    if (SHAPE_CHAPTER.test(key) && SHAPES.includes(value as ShapeName)) shapes[key] = value as ShapeName;
  }
  return {
    shapes,
    amount: num(r.amount, d.amount, 0, 100),
    size: num(r.size, d.size, 0, 100),
    accent: num(r.accent, d.accent, 0, 100),
    smooth: num(r.smooth, d.smooth, 0, 100),
    spin: num(r.spin, d.spin, 0, 100),
    sway: num(r.sway, d.sway, 0, 100),
    burst: num(r.burst, d.burst, 0, 100),
    grid: bool(r.grid, d.grid),
    hologram: bool(r.hologram, d.hologram),
    rings: bool(r.rings, d.rings),
    stars: bool(r.stars, d.stars),
    shooting: bool(r.shooting, d.shooting),
    beams: bool(r.beams, d.beams),
  };
}

/** Values the 3D scene uses, from the sliders. */
export function sceneNumbers(scene: SceneSettings) {
  return {
    /** Particles on a big screen; phones get about two thirds. */
    count: Math.round(lerp(scene.amount, 2000, 9000)),
    size: lerp(scene.size, 0.06, 0.24),
    accent: lerp(scene.accent, 0, 0.4),
    /** Scroll easing per frame (0.075 at the default). */
    ease: lerp(scene.smooth, 0.12, 0.03),
    spin: lerp(scene.spin, 0, 0.3),
    sway: lerp(scene.sway, 0, 2.4),
    burst: lerp(scene.burst, 0, 2),
  };
}

/* ---------- journey ---------- */

/** Chapters that can be reordered. SECTIONS is your sections, as one block in their own order. */
export const MOVABLE_CHAPTERS = ["ABOUT", "INTERESTS", "SECTIONS", "SIGNAL", "HELP", "TRACES"] as const;
export type MovableChapter = (typeof MOVABLE_CHAPTERS)[number];

export const INTRO_STYLES = ["boot", "wave", "none"] as const;
export type IntroStyle = (typeof INTRO_STYLES)[number];

/** An extra link at the end of the nav bar, like a resume or another site. */
export type NavLink = { label: string; url: string };

/**
 * The top nav bar. Every chapter on the page is in it unless listed in
 * `hidden`, so a section you switch on later shows up by itself.
 */
export type NavSettings = {
  enabled: boolean;
  /** Slide away while scrolling down, come back on scrolling up. */
  autoHide: boolean;
  /** Chapter keys left out of the nav (BOOT, ABOUT, S:projects, ...). */
  hidden: string[];
  /** Your own name for a chapter in the nav. Missing or empty = the usual name. */
  labels: Record<string, string>;
  links: NavLink[];
};

export const NAV_LABEL_MAX = 24;
export const NAV_LINKS_MAX = 4;
const NAV_KEY = /^(BOOT|ABOUT|INTERESTS|SIGNAL|HELP|TRACES|END|S:[a-z0-9_-]{1,40})$/;
const NAV_URL = /^(https?:\/\/[^\s/$.?#][^\s]*|mailto:[^\s@]+@[^\s@]+)$/i;

export const defaultNav: NavSettings = { enabled: true, autoHide: true, hidden: [], labels: {}, links: [] };

/** Whether a nav link address is one the site will use (https://, http:// or mailto:). */
export const isNavUrl = (url: string) => url.length <= 300 && NAV_URL.test(url);

export function normalizeNav(raw: unknown): NavSettings {
  const r = obj(raw);
  const d = defaultNav;
  const hidden = (Array.isArray(r.hidden) ? r.hidden : [])
    .filter((k): k is string => typeof k === "string" && NAV_KEY.test(k))
    .filter((k, i, all) => all.indexOf(k) === i)
    .slice(0, 60);
  const labels: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj(r.labels))) {
    const label = str(value, "", NAV_LABEL_MAX);
    if (NAV_KEY.test(key) && label && Object.keys(labels).length < 60) labels[key] = label;
  }
  const links = (Array.isArray(r.links) ? r.links : [])
    .map((l) => ({ label: str(obj(l).label, "", NAV_LABEL_MAX), url: str(obj(l).url, "", 300) }))
    .filter((l) => l.label && isNavUrl(l.url))
    .slice(0, NAV_LINKS_MAX);
  return { enabled: bool(r.enabled, d.enabled), autoHide: bool(r.autoHide, d.autoHide), hidden, labels, links };
}

export type JourneySettings = {
  order: MovableChapter[];
  nav: NavSettings;
  connectTitle: string;
  tracesTitle: string;
  tracesText: string;
  endTitle: string;
  endText: string;
  intro: IntroStyle;
  introSeconds: number;
  introFirstOnly: boolean;
  introLines: string;
  maintenance: boolean;
  maintenanceTitle: string;
  maintenanceText: string;
};

export const defaultJourney: JourneySettings = {
  order: [...MOVABLE_CHAPTERS],
  nav: defaultNav,
  connectTitle: "Connect with me.",
  tracesTitle: "Leave your trace.",
  tracesText: "Sign the wall. Every signature becomes a star behind this box. A name is optional.",
  endTitle: "Thanks for stopping by.",
  endText: "Leave a trace on your way out, or come back any time. The signal stays on.",
  intro: "none",
  introSeconds: 3,
  introFirstOnly: true,
  introLines: "initializing hologram…\nloading signal…\nwelcome.",
  maintenance: false,
  maintenanceTitle: "Back soon.",
  maintenanceText: "I'm rebuilding a few things. Meanwhile, find me here:",
};

export function normalizeJourney(raw: unknown): JourneySettings {
  const r = obj(raw);
  const d = defaultJourney;
  // Keep the stored order, drop unknowns and repeats, then add anything missing in its usual place.
  const stored = Array.isArray(r.order) ? r.order : [];
  const order: MovableChapter[] = [];
  for (const key of stored) if (MOVABLE_CHAPTERS.includes(key) && !order.includes(key)) order.push(key);
  for (const key of MOVABLE_CHAPTERS) {
    if (order.includes(key)) continue;
    const before = MOVABLE_CHAPTERS.indexOf(key);
    const after = order.findIndex((k) => MOVABLE_CHAPTERS.indexOf(k) > before);
    order.splice(after === -1 ? order.length : after, 0, key);
  }
  const lines = str(r.introLines, d.introLines, 400)
    .split("\n")
    .map((l) => l.trim().slice(0, 60))
    .filter(Boolean)
    .slice(0, 6)
    .join("\n");
  return {
    order,
    nav: normalizeNav(r.nav),
    connectTitle: str(r.connectTitle, d.connectTitle, 80) || d.connectTitle,
    tracesTitle: str(r.tracesTitle, d.tracesTitle, 80) || d.tracesTitle,
    tracesText: str(r.tracesText, d.tracesText, 240),
    endTitle: str(r.endTitle, d.endTitle, 80) || d.endTitle,
    endText: str(r.endText, d.endText, 240),
    intro: pick(r.intro, INTRO_STYLES, d.intro),
    introSeconds: num(r.introSeconds, d.introSeconds, 1, 6),
    introFirstOnly: bool(r.introFirstOnly, d.introFirstOnly),
    introLines: lines || d.introLines,
    maintenance: bool(r.maintenance, d.maintenance),
    maintenanceTitle: str(r.maintenanceTitle, d.maintenanceTitle, 80) || d.maintenanceTitle,
    maintenanceText: str(r.maintenanceText, d.maintenanceText, 240),
  };
}

/* ---------- SEO & sharing ---------- */

export type SeoSettings = {
  /** Browser tab and search result title. Empty = your name. */
  title: string;
  /** Search result and link preview text. Empty = your tagline. */
  description: string;
  /** The site's public address (https://…). Empty = the Vercel address, found automatically. */
  siteUrl: string;
  /** Let search engines list the site (always off during maintenance). */
  indexable: boolean;
  /** "auto": made from your name, tagline, picture and colors. "upload": your own image. */
  shareImage: "auto" | "upload";
  shareImageUrl: string;
  /** Browser tab icon: first letter of your name, or your profile picture. */
  icon: "letter" | "avatar";
};

export const defaultSeo: SeoSettings = {
  title: "",
  description: "",
  siteUrl: "",
  indexable: true,
  shareImage: "auto",
  shareImageUrl: "",
  icon: "letter",
};

export function normalizeSeo(raw: unknown): SeoSettings {
  const r = obj(raw);
  const d = defaultSeo;
  const url = str(r.siteUrl, d.siteUrl, 200).replace(/\/+$/, "");
  return {
    title: str(r.title, d.title, 70),
    description: str(r.description, d.description, 160),
    siteUrl: /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(url) ? url : "",
    indexable: bool(r.indexable, d.indexable),
    shareImage: pick(r.shareImage, ["auto", "upload"] as const, d.shareImage),
    shareImageUrl: str(r.shareImageUrl, d.shareImageUrl, 400),
    icon: pick(r.icon, ["letter", "avatar"] as const, d.icon),
  };
}
