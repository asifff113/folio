"use client";

import { useEffect, useState } from "react";
import { useTraces } from "@/lib/traces/store";

/** Types the boot log line by line. */
export function BootLog({ platformCount }: { platformCount: number }) {
  const traces = useTraces();
  const [shown, setShown] = useState(0);

  const lines: [string, string][] = [
    ["init hologram", "ok"],
    ["load profile", "ok"],
    ["link platforms", `${platformCount} found`],
    ["read traces", `${traces.length} signals`],
  ];

  useEffect(() => {
    const step = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 380;
    const ids = [1, 2, 3, 4].map((n) => window.setTimeout(() => setShown(n), step * n));
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, []);

  return (
    <p className="mb-4 min-h-[7.2em] font-mono text-[14px] leading-[1.8] text-[#9fe2f2]">
      {lines.slice(0, shown).map(([label, status]) => (
        <span key={label} className="block">
          &gt; {label} {".".repeat(Math.max(3, 22 - label.length))} <span className="text-holo">{status}</span>
        </span>
      ))}
    </p>
  );
}
