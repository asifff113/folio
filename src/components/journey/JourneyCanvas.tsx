"use client";

import dynamic from "next/dynamic";
import type { Theme } from "@/config/site";

// three.js needs the browser, so the scene is only loaded on the client.
const Scene = dynamic(() => import("./Scene"), { ssr: false });

export function JourneyCanvas(props: { theme: Theme; traceColors: Record<string, string> }) {
  return (
    <div className="fixed inset-0 z-0" aria-hidden="true">
      <Scene {...props} />
    </div>
  );
}
