import type { NavSettings } from "@/config/customize";
import type { SiteConfig } from "@/config/site";
import { sectionHasContent } from "@/lib/sections";
import { type ChapterKey, type FixedChapter, isSectionChapter, journeyChapters } from "./store";

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

/** The chapters on the page right now (same rules as the site) and the titles of the sections among them. */
export function siteChapters(site: SiteConfig) {
  const sections = site.sections.filter((s) => s.enabled && sectionHasContent(s));
  const { items, ...help } = site.help;
  const optional = {
    help: help.enabled && items.some((i) => i.visible && (help.showSolved || i.status !== "solved")),
    traces: site.traces.enabled,
    sections: sections.map((s) => s.key),
  };
  return {
    ...optional,
    chapters: journeyChapters({ ...optional, order: site.journey.order }),
    sectionTitles: Object.fromEntries(sections.map((s) => [s.key, s.title])) as Record<string, string>,
  };
}
