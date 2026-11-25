import type { Section } from "@/config/site";
import { CardsLayout } from "./CardsLayout";
import { ContactLayout } from "./ContactLayout";
import { GalleryLayout } from "./GalleryLayout";
import { FileLayout, LinksLayout, SkillsLayout, TextLayout, TimelineLayout } from "./SimpleLayouts";

/** One section as a chapter box, in its chosen layout. */
export function SectionPanel({ section }: { section: Section }) {
  const items = section.items.filter((i) => i.visible);
  const wide = section.layout === "cards" || section.layout === "gallery";
  return (
    <div className={wide ? "panel panel-wide" : "panel"}>
      <p className="eyebrow">{`// ${section.key}`}</p>
      <h2 className="panel-title">{section.title}</h2>
      {section.intro && <p className="panel-text">{section.intro}</p>}
      {section.layout === "cards" && <CardsLayout items={items} />}
      {section.layout === "timeline" && <TimelineLayout items={items} />}
      {section.layout === "skills" && <SkillsLayout items={items} />}
      {section.layout === "gallery" && <GalleryLayout items={items} />}
      {section.layout === "text" && <TextLayout items={items} />}
      {section.layout === "links" && <LinksLayout items={items} />}
      {section.layout === "file" && <FileLayout items={items} />}
      {section.layout === "form" && <ContactLayout />}
    </div>
  );
}
