import type { NavSettings } from "@/config/customize";
import { type ChapterKey, type FixedChapter, isSectionChapter } from "./store";

/** The usual nav name of each fixed chapter. Sections use their own title. */
const DEFAULT_NAMES: Record<FixedChapter, string> = {
  BOOT: "Home",
  ABOUT: "About",
  INTERESTS: "Interests",
  SIGNAL: "Contact",
  HELP: "Help",
  TRACES: "Traces",
  END: "End",
};

export type NavItem = { index: number; key: ChapterKey; label: string };

export const navDefaultLabel = (key: ChapterKey, sectionTitles: Record<string, string>) =>
  isSectionChapter(key) ? sectionTitles[key.slice(2)] || key.slice(2) : DEFAULT_NAMES[key];

/** The chapters shown in the nav, in page order, with your names for them. */
export function navItems(chapters: ChapterKey[], nav: NavSettings, sectionTitles: Record<string, string>): NavItem[] {
  return chapters
    .map((key, index) => ({ index, key, label: nav.labels[key] || navDefaultLabel(key, sectionTitles) }))
    .filter((item) => !nav.hidden.includes(item.key));
}
