import {
  defaultJourney,
  defaultLook,
  defaultScene,
  defaultSeo,
  type JourneySettings,
  type LookSettings,
  type SceneSettings,
  type SeoSettings,
} from "./customize";

/**
 * Default site content.
 *
 * These are placeholders only. Every value here is edited in the admin panel
 * and stored in Supabase; this file is the fallback used when Supabase is not
 * set up yet or cannot be reached.
 */
export type QrMode = "none" | "generated" | "image";

export type Platform = {
  id: string;
  label: string;
  url: string;
  color: string;
  visible: boolean;
  /** Shown when a visitor opens the platform, e.g. "@name" or "name#1234". */
  handle: string;
  /** Short line on how to reach you there, e.g. "DM me and mention the site". */
  note: string;
  /** QR code shown in the opened platform: none, made from the link, or an uploaded image. */
  qr: QrMode;
  qrImage: string;
};

export type Theme = {
  /** Main hologram color (HUD, links, most particles). */
  primary: string;
  /** Accent color (glitch edges, some particles, the outer shell). */
  secondary: string;
  scanlines: boolean;
};

/** How a section's items are shown. "file" (resume) and "form" (contact) are fixed to their built-in section. */
export type SectionLayout = "cards" | "timeline" | "skills" | "gallery" | "text" | "links" | "file" | "form";

/** Layouts you can pick for a section (the other two belong to resume and contact). */
export const PICKABLE_LAYOUTS: { id: SectionLayout; name: string; desc: string; icon: string }[] = [
  { id: "cards", name: "Cards", desc: "image, title, text, tags, links", icon: "▦" },
  { id: "timeline", name: "Timeline", desc: "dates, role, place, text", icon: "┃" },
  { id: "skills", name: "Skills", desc: "groups of tags, optional level", icon: "≡" },
  { id: "gallery", name: "Gallery", desc: "photos with captions", icon: "▣" },
  { id: "text", name: "Text", desc: "a heading and a few paragraphs", icon: "¶" },
  { id: "links", name: "Links", desc: "a list of titled links", icon: "↗" },
];

/**
 * One entry in a section. Every layout uses the same fields and ignores the
 * ones it doesn't need (see supabase/phase6_sections.sql for which is which).
 */
export type SectionItem = {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  body: string;
  details: string;
  image: string;
  tags: string[];
  link1Label: string;
  link1Url: string;
  link2Label: string;
  link2Url: string;
  /** Skills only: 0 = no level shown, 1–5 = bars. */
  level: number;
  visible: boolean;
};

export type Section = {
  key: string;
  title: string;
  enabled: boolean;
  layout: SectionLayout;
  /** Optional line under the title. */
  intro: string;
  /** Made in the admin panel (can be deleted), as opposed to built in. */
  custom: boolean;
  items: SectionItem[];
};

/** Layout each built-in section starts with. */
export const BUILTIN_LAYOUTS: Record<string, SectionLayout> = {
  now: "text",
  skills: "skills",
  gallery: "gallery",
  experience: "timeline",
  education: "timeline",
  resume: "file",
  music: "links",
  contact: "form",
};

export type HelpKind = "need" | "offer";
export type HelpUrgency = "low" | "medium" | "urgent";
export type HelpStatus = "open" | "in_progress" | "solved";

/** One entry in "I need help with" (need) or "I can provide" (offer). */
export type HelpItem = {
  id: string;
  kind: HelpKind;
  title: string;
  details: string;
  tags: string[];
  urgency: HelpUrgency;
  status: HelpStatus;
  visible: boolean;
};

export type HelpSettings = {
  /** Show the chapter at all (it also stays hidden while no item is visible). */
  enabled: boolean;
  heading: string;
  intro: string;
  /** Visitors can send notes about items. */
  accept: boolean;
  /** Keep solved items on the site, dimmed. */
  showSolved: boolean;
};

export type TraceSettings = {
  /** Show the traces chapter. */
  enabled: boolean;
  /** New traces wait in the admin panel until approved. */
  approval: boolean;
  /** Visitors can add a short "say hi" next to their signature. */
  allowMessage: boolean;
  /** How many of the newest traces become stars on the wall. */
  wallLimit: number;
};

/** Ways a visitor can leave their contact in a help response. */
export const CONTACT_PLATFORMS = [
  { id: "discord", label: "Discord", placeholder: "@username" },
  { id: "telegram", label: "Telegram", placeholder: "@username" },
  { id: "instagram", label: "Instagram", placeholder: "@username" },
  { id: "email", label: "Email", placeholder: "you@example.com" },
  { id: "other", label: "Other", placeholder: "where can I reach you?" },
] as const;
export type ContactPlatform = (typeof CONTACT_PLATFORMS)[number]["id"];

export type SiteConfig = {
  name: string;
  /** Profile picture URL; empty shows the built-in placeholder. */
  avatar: string;
  handle: string;
  tagline: string;
  about: { heading: string; body: string };
  interests: { heading: string; tags: string[] };
  platforms: Platform[];
  sections: Section[];
  theme: Theme;
  help: HelpSettings & { items: HelpItem[] };
  traces: TraceSettings;
  look: LookSettings;
  scene: SceneSettings;
  journey: JourneySettings;
  seo: SeoSettings;
};

export const defaultSite: SiteConfig = {
  name: "NAME",
  avatar: "",
  handle: "your_name",
  tagline: "Developer · designer · always learning",
  about: {
    heading: "I like turning ideas into things people can touch.",
    body: "Developer and designer working at the edge of code and visuals. Lately that means 3D on the web, small useful tools, and learning in public.",
  },
  interests: {
    heading: "Things I'm into right now.",
    tags: ["ai", "music", "photography", "open source", "gaming", "design"],
  },
  platforms: [
    { id: "discord", label: "Discord", url: "", color: "#5865F2", visible: true, handle: "", note: "", qr: "none", qrImage: "" },
    { id: "telegram", label: "Telegram", url: "", color: "#2AABEE", visible: true, handle: "", note: "", qr: "none", qrImage: "" },
    { id: "instagram", label: "Instagram", url: "", color: "#E1306C", visible: true, handle: "", note: "", qr: "none", qrImage: "" },
    { id: "github", label: "GitHub", url: "", color: "#d0d7de", visible: true, handle: "", note: "", qr: "none", qrImage: "" },
    { id: "linkedin", label: "LinkedIn", url: "", color: "#3d8fe0", visible: true, handle: "", note: "", qr: "none", qrImage: "" },
    { id: "x", label: "X", url: "", color: "#f2f2f2", visible: true, handle: "", note: "", qr: "none", qrImage: "" },
  ],
  sections: [
    ["now", "Now"],
    ["skills", "Skills"],
    ["projects", "Projects"],
    ["research", "Research papers"],
    ["gallery", "Gallery"],
    ["certificates", "Certificates"],
    ["experience", "Experience"],
    ["education", "Education"],
    ["achievements", "Achievements"],
    ["blog", "Blog"],
    ["testimonials", "Testimonials"],
    ["resume", "Resume"],
    ["music", "Music"],
    ["contact", "Contact form"],
  ].map(([key, title]) => ({
    key,
    title,
    enabled: false,
    layout: BUILTIN_LAYOUTS[key] ?? "cards",
    intro: "",
    custom: false,
    items: [],
  })),
  theme: { primary: "#2fe3ff", secondary: "#ff4fd8", scanlines: true },
  help: {
    enabled: true,
    heading: "Ready to help me?",
    intro: "Things I'm stuck on, and things I can do for you. Pick one and send me a note.",
    accept: true,
    showSolved: true,
    items: [],
  },
  traces: { enabled: true, approval: false, allowMessage: true, wallLimit: 300 },
  look: defaultLook,
  scene: defaultScene,
  journey: defaultJourney,
  seo: defaultSeo,
};

/** Visitors who arrive from somewhere not in the list pick this one. */
export const otherPlatform: Platform = {
  id: "other",
  label: "Other",
  url: "",
  color: "#a58bff",
  visible: true,
  handle: "",
  note: "",
  qr: "none",
  qrImage: "",
};
