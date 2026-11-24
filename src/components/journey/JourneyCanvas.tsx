"use client";

import dynamic from "next/dynamic";

// three.js needs the browser, so the scene is only loaded on the client.
const Scene = dynamic(() => import("./Scene"), { ssr: false });

export function JourneyCanvas() {
  return (
    <div className="fixed inset-0 z-0" aria-hidden="true">
      <Scene />
    </div>
  );
}
