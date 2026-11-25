"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { LookSettings, SceneSettings } from "@/config/customize";
import type { Theme } from "@/config/site";
import type { ChapterKey } from "@/lib/journey/store";

// three.js needs the browser, so the scene is only loaded on the client.
const Scene = dynamic(() => import("./Scene"), { ssr: false });

type Props = { theme: Theme; chapters: ChapterKey[]; look: LookSettings; scene: SceneSettings };

/**
 * The 3D world behind the page. It starts once the page itself has shown
 * (so text appears first and fast), and pauses while the tab is hidden to
 * save battery.
 */
export function JourneyCanvas(props: Props) {
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let idle = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const start = () => {
      // Wait for a quiet moment after load, but never longer than a second (Safari has no idle callback).
      if (typeof window.requestIdleCallback === "function")
        idle = window.requestIdleCallback(() => setReady(true), { timeout: 1000 });
      else timer = setTimeout(() => setReady(true), 200);
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => {
      window.removeEventListener("load", start);
      if (idle) window.cancelIdleCallback(idle);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const update = () => setVisible(document.visibilityState === "visible");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  return (
    <div className="journey-canvas fixed inset-0 z-0" data-ready={ready ? "1" : "0"} aria-hidden="true">
      {ready && <Scene {...props} paused={!visible} />}
    </div>
  );
}
