"use client";

import { useEffect, useRef, useState } from "react";
import type { LookSettings } from "@/config/customize";
import { type ChapterKey, chapterLabel, onJourneyFrame } from "@/lib/journey/store";

const pad = (n: number) => String(n).padStart(2, "0");

type HudLook = Pick<LookSettings, "hud" | "hudClock" | "hudCounter" | "hudRail" | "hudOnline">;

/**
 * Fixed overlay: frame, live clock, current chapter and the progress rail.
 * Style "full" shows the frame and top bar, "minimal" only the counter and
 * rail, "off" nothing but the scanlines or vignette.
 */
export function Hud({
  handle,
  scanlines,
  chapters,
  look,
}: {
  handle: string;
  scanlines: boolean;
  chapters: ChapterKey[];
  look: HudLook;
}) {
  const [chapter, setChapter] = useState(0);
  const last = Math.max(1, chapters.length - 1);
  const fill = useRef<HTMLElement>(null);
  const clock = useRef<HTMLSpanElement>(null);
  const full = look.hud === "full";
  const showCounter = look.hud !== "off" && look.hudCounter;
  const showRail = look.hud !== "off" && look.hudRail;

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
      {look.hud !== "off" && (
        <div className={full ? "hud-frame" : "hud-frame border-transparent"}>
          {full && (
            <>
              <span className="hud-corner tl" />
              <span className="hud-corner tr" />
              <span className="hud-corner bl" />
              <span className="hud-corner br" />

              <div className="absolute inset-x-5 top-3.5 flex justify-between gap-2.5 font-mono text-[11px] font-medium tracking-[0.14em] text-holo">
                <span>SYS://{handle.toUpperCase()}</span>
                {(look.hudOnline || look.hudClock) && (
                  <span>
                    {look.hudOnline && (
                      <>
                        <span className="blink">●</span> ONLINE{" "}
                      </>
                    )}
                    {look.hudClock && <span ref={clock}>--:--:--</span>}
                  </span>
                )}
              </div>
            </>
          )}

          {showCounter && (
            <div className="absolute bottom-4 left-5 flex items-center gap-3.5 font-mono text-[11px] font-medium tracking-[0.14em] text-holo">
              <b className="font-medium text-fg">
                {pad(chapter + 1)} / {pad(chapters.length)}
              </b>
              <span key={chapter} className="chapter-glitch">
                {chapterLabel(chapters[chapter])}
              </span>
            </div>
          )}

          {showRail && (
            <div className="hud-rail max-[720px]:hidden">
              <i ref={fill} />
              {chapters.map((name, k) => (
                <span key={name} style={{ top: `${(k / last) * 100}%` }} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
