import { Suspense } from "react";
import type { SiteConfig } from "@/config/site";
import { AdminContent, AdminLoading, EditorHeader } from "@/components/admin/AdminContent";
import { SceneForm } from "@/components/admin/SceneForm";

const SECTION_CYCLE = ["lattice", "torus", "waves", "orbits", "vortex"] as const;

/** Every chapter that can be on the page, with its usual shape. */
function shapeChapters(site: SiteConfig) {
  const sections = site.sections.filter((s) => s.enabled);
  return [
    { key: "BOOT", name: "start", usual: "sphere" as const },
    { key: "ABOUT", name: "about", usual: "galaxy" as const },
    { key: "INTERESTS", name: "interests", usual: "helix" as const },
    ...sections.map((s, i) => ({ key: `S:${s.key}`, name: s.title.toLowerCase(), usual: SECTION_CYCLE[i % 5] })),
    { key: "SIGNAL", name: "connect", usual: "tunnel" as const, fixed: true },
    { key: "HELP", name: "help", usual: "exchange" as const },
    { key: "TRACES", name: "traces", usual: "wall" as const, fixed: true },
    { key: "END", name: "end", usual: "sphere" as const },
  ];
}

export default function Page() {
  return (
    <>
      <EditorHeader eyebrow="// 3d" title="3D & motion">
        The particle world behind your boxes: what shape each chapter makes, how dense it is, and how it moves.
      </EditorHeader>
      <Suspense fallback={<AdminLoading />}>
        <AdminContent>{(site) => <SceneForm scene={site.scene} chapters={shapeChapters(site)} />}</AdminContent>
      </Suspense>
    </>
  );
}
