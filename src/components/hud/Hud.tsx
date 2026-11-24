"use client";

import { useEffect, useRef, useState } from "react";
import { type ChapterKey, onJourneyFrame } from "@/lib/journey/store";

const pad = (n: number) => String(n).padStart(2, "0");

/** Fixed overlay: frame, live clock, current chapter and the progress rail. */
export function Hud({ handle, scanlines, chapters }: { handle: string; scanlines: boolean; chapters: ChapterKey[] }) {
  const [chapter, setChapter] = useState(0);
  const last = Math.max(1, chapters.length - 1);
  const fill = useRef<HTMLElement>(null);
  const clock = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const off = onJourneyFrame((s) => {
      if (fill.current) fill.current.style.height = `${(s / last) * 100}%`;
      setChapter(Math.round(s));
    });
    const tickClock = () => {
      if (clock.current) clock.current.textContent = new Date().toTimeString().slice(0, 8);
    };
    tickClock();
    const id = window.setInterval(tickClock, 1000);
    return () => {
      off();
      window.clearInterval(id);
    };
  }, [last]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[2]" aria-hidden="true">
      {scanlines ? <div className="hud-scanlines" /> : <div className="hud-vignette" />}
      <div className="hud-frame">
        <span className="hud-corner tl" />
        <span className="hud-corner tr" />
        <span className="hud-corner bl" />
        <span className="hud-corner br" />

        <div className="absolute inset-x-5 top-3.5 flex justify-between gap-2.5 font-mono text-[11px] font-medium tracking-[0.14em] text-holo">
          <span>SYS://{handle.toUpperCase()}</span>
          <span>
            <span className="blink">●</span> ONLINE <span ref={clock}>--:--:--</span>
          </span>
        </div>

        <div className="absolute bottom-4 left-5 flex items-center gap-3.5 font-mono text-[11px] font-medium tracking-[0.14em] text-holo">
          <b className="font-medium text-fg">
            {pad(chapter + 1)} / {pad(chapters.length)}
          </b>
          <span key={chapter} className="chapter-glitch">
            {chapters[chapter]}
          </span>
        </div>

        <div className="hud-rail max-[720px]:hidden">
          <i ref={fill} />
          {chapters.map((name, k) => (
            <span key={name} style={{ top: `${(k / last) * 100}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
