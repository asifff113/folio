"use client";

import dynamic from "next/dynamic";
import type { LookSettings, SceneSettings } from "@/config/customize";
import type { Theme } from "@/config/site";
import type { ChapterKey } from "@/lib/journey/store";

// three.js needs the browser, so the scene is only loaded on the client.
const Scene = dynamic(() => import("./Scene"), { ssr: false });

export function JourneyCanvas(props: { theme: Theme; chapters: ChapterKey[]; look: LookSettings; scene: SceneSettings }) {
  return (
    <div className="fixed inset-0 z-0" aria-hidden="true">
      <Scene {...props} />
    </div>
  );
}
