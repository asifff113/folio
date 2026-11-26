import { Suspense } from "react";
import type { MovableChapter } from "@/config/customize";
import type { SiteConfig } from "@/config/site";
import { AdminContent, AdminLoading, EditorHeader } from "@/components/admin/AdminContent";
import { JourneyForm } from "@/components/admin/JourneyForm";
import type { NavChapterInfo } from "@/components/admin/NavGroup";
import { navDefaultLabel, siteChapters } from "@/lib/journey/nav";
import { ALL_CHAPTERS } from "@/lib/journey/store";

function labels(site: SiteConfig): Record<MovableChapter, { name: string; note: string }> {
  const on = site.sections.filter((s) => s.enabled).map((s) => s.title.toLowerCase());
  return {
    ABOUT: { name: "about", note: site.about.heading },
    INTERESTS: { name: "interests", note: site.interests.heading },
    SECTIONS: { name: "your sections", note: on.length ? on.join(", ") : "none switched on yet" },
    SIGNAL: { name: "connect", note: site.journey.connectTitle },
    HELP: { name: "help", note: site.help.enabled ? site.help.heading : "switched off" },
    TRACES: { name: "traces", note: site.traces.enabled ? site.journey.tracesTitle : "switched off" },
  };
}

/** The chapters on the page now (same rules as the site), and their usual nav names. */
function navInfo(site: SiteConfig): NavChapterInfo {
  const { help, traces, sections, sectionTitles } = siteChapters(site);
  const names: Record<string, string> = {};
  for (const key of ALL_CHAPTERS) names[key] = navDefaultLabel(key, sectionTitles);
  for (const key of sections) names[`S:${key}`] = sectionTitles[key];
  return { help, traces, sections, names };
}

export default function Page() {
  return (
    <>
      <EditorHeader eyebrow="// journey" title="Journey">
        The order of the chapters, the top nav bar, their words, the intro, and a switch to take the site offline for a while.
      </EditorHeader>
      <Suspense fallback={<AdminLoading />}>
        <AdminContent>{(site) => <JourneyForm journey={site.journey} labels={labels(site)} navInfo={navInfo(site)} />}</AdminContent>
      </Suspense>
    </>
  );
}
