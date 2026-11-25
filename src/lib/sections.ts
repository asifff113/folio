import type { Section } from "@/config/site";

/** Whether a section has anything to show. Empty sections stay off the page. */
export function sectionHasContent(section: Section) {
  if (section.layout === "form") return true;
  const items = section.items.filter((i) => i.visible);
  if (section.layout === "gallery") return items.some((i) => i.image);
  if (section.layout === "links" || section.layout === "file") return items.some((i) => i.link1Url);
  return items.length > 0;
}
