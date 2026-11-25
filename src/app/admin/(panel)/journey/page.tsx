import { Suspense } from "react";
import type { MovableChapter } from "@/config/customize";
import type { SiteConfig } from "@/config/site";
import { AdminContent, AdminLoading, EditorHeader } from "@/components/admin/AdminContent";
import { JourneyForm } from "@/components/admin/JourneyForm";

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

export default function Page() {
  return (
    <>
      <EditorHeader eyebrow="// journey" title="Journey">
        The order of the chapters, their words, the intro, and a switch to take the site offline for a while.
      </EditorHeader>
      <Suspense fallback={<AdminLoading />}>
        <AdminContent>{(site) => <JourneyForm journey={site.journey} labels={labels(site)} />}</AdminContent>
      </Suspense>
    </>
  );
}
