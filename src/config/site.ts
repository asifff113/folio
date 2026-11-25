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

export type Section = {
  key: string;
  title: string;
  enabled: boolean;
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
  ].map(([key, title]) => ({ key, title, enabled: false })),
  theme: { primary: "#2fe3ff", secondary: "#ff4fd8", scanlines: true },
  help: {
    enabled: true,
    heading: "Ready to help me?",
    intro: "Things I'm stuck on, and things I can do for you. Pick one and send me a note.",
    accept: true,
    showSolved: true,
    items: [],
  },
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
