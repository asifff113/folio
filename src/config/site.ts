/**
 * Default site content.
 *
 * These are placeholders only. From Phase 3 on, every value here is edited in
 * the admin panel and stored in the database; this file stays as the fallback
 * used before anything has been saved.
 */
export type Platform = {
  id: string;
  label: string;
  url: string;
  color: string;
  visible: boolean;
};

export type SiteConfig = {
  name: string;
  handle: string;
  tagline: string;
  about: { heading: string; body: string };
  interests: { heading: string; tags: string[] };
  platforms: Platform[];
};

export const defaultSite: SiteConfig = {
  name: "NAME",
  handle: "your_name",
  tagline: "one-line intro, set in the admin panel",
  about: {
    heading: "A short line about who you are.",
    body: "This paragraph is written in the admin panel. Two or three sentences is plenty.",
  },
  interests: {
    heading: "Things I'm into right now.",
    tags: ["ai", "music", "photography", "open source", "gaming", "design"],
  },
  platforms: [
    { id: "discord", label: "Discord", url: "", color: "#5865F2", visible: true },
    { id: "telegram", label: "Telegram", url: "", color: "#2AABEE", visible: true },
    { id: "instagram", label: "Instagram", url: "", color: "#E1306C", visible: true },
    { id: "github", label: "GitHub", url: "", color: "#d0d7de", visible: true },
    { id: "linkedin", label: "LinkedIn", url: "", color: "#3d8fe0", visible: true },
    { id: "x", label: "X", url: "", color: "#f2f2f2", visible: true },
  ],
};

/** Visitors who arrive from somewhere not in the list pick this one. */
export const otherPlatform: Platform = {
  id: "other",
  label: "Other",
  url: "",
  color: "#a58bff",
  visible: true,
};

/** Optional sections that become new chapters once switched on (Phase 5). */
export const optionalSections = ["skills", "projects", "research", "gallery", "certificates", "blog"];
