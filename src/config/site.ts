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
  platforms: Platform[];
};

export const defaultSite: SiteConfig = {
  name: "NAME",
  handle: "your_name",
  tagline: "one-line intro, set in the admin panel",
  platforms: [
    { id: "discord", label: "Discord", url: "", color: "#5865F2", visible: true },
    { id: "telegram", label: "Telegram", url: "", color: "#2AABEE", visible: true },
    { id: "instagram", label: "Instagram", url: "", color: "#E1306C", visible: true },
    { id: "github", label: "GitHub", url: "", color: "#d0d7de", visible: true },
    { id: "linkedin", label: "LinkedIn", url: "", color: "#3d8fe0", visible: true },
    { id: "x", label: "X", url: "", color: "#f2f2f2", visible: true },
  ],
};
