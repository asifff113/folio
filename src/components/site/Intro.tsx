"use client";

import { useEffect, useState } from "react";
import type { JourneySettings } from "@/config/customize";
import { journey } from "@/lib/journey/store";

const SEEN = "folio:intro-seen";

/**
 * The opening intro over the page: terminal boot lines or the name in a wave.
 * Rendered by the server so it shows from the first paint; a tiny inline
 * script hides it before paint for returning visitors when it is set to
 * "first visit only". Skippable, and skipped for reduced motion.
 */
export function Intro({ settings, name }: { settings: JourneySettings; name: string }) {
  const lines = settings.introLines.split("\n").filter(Boolean);
  const count = lines.length;
  const total = settings.introSeconds * 1000;
  const [shown, setShown] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (root.dataset.introSeen === "1" || reduced) {
      const t = window.setTimeout(() => setGone(true), 0);
      return () => window.clearTimeout(t);
    }
    journey.lenis?.stop();
    const step = total / Math.max(1, count + 1);
    const timers = Array.from({ length: count }, (_, i) => window.setTimeout(() => setShown(i + 1), step * (i + 0.5)));
    timers.push(window.setTimeout(() => setLeaving(true), total));
    timers.push(window.setTimeout(() => setGone(true), total + 600));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [count, total]);

  useEffect(() => {
    if (!gone) return;
    journey.lenis?.start();
    try {
      if (settings.introFirstOnly) localStorage.setItem(SEEN, "1");
    } catch {
      // Private mode: the intro just shows again next time.
    }
  }, [gone, settings.introFirstOnly]);

  if (gone) return null;

  const skip = () => {
    setLeaving(true);
    window.setTimeout(() => setGone(true), 400);
  };

  return (
    <div className={`intro-overlay ${leaving ? "leaving" : ""}`} role="dialog" aria-label="Intro">
      {settings.introFirstOnly && (
        <script
          // Runs before paint: hide the intro for visitors who have seen it.
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("${SEEN}")==="1")document.documentElement.dataset.introSeen="1"}catch(e){}`,
          }}
        />
      )}
      {settings.intro === "boot" ? (
        <div className="flex w-[min(560px,86vw)] flex-col gap-3.5 font-mono text-[clamp(14px,1.4vw,18px)]">
          {lines.map((line, i) => (
            <p key={i} className={i < shown ? (i === lines.length - 1 ? "text-fg" : "text-[#9fc3d3]") : "invisible"}>
              &gt; {line}
              {i === shown - 1 && <span className="intro-caret" aria-hidden="true" />}
            </p>
          ))}
          <div aria-hidden="true" className="h-[3px] bg-holo/15">
            <div className="intro-bar h-[3px] bg-holo" style={{ animationDuration: `${total}ms` }} />
          </div>
        </div>
      ) : (
        <p className="name-wave font-display text-[clamp(48px,9vw,120px)] font-extrabold tracking-[-0.03em] text-[#dffaff]">
          {Array.from(name).map((ch, i) => (
            <span key={i} style={{ "--i": i } as React.CSSProperties}>
              {ch === " " ? " " : ch}
            </span>
          ))}
        </p>
      )}
      <button type="button" onClick={skip} className="btn absolute right-[max(28px,4vw)] bottom-[max(28px,5vh)]">
        skip ▸
      </button>
    </div>
  );
}
