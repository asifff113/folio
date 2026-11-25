"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { journey, onJourneyFrame, ramp } from "@/lib/journey/store";

/**
 * "Hologram materialize": the chapter's box rises out of the 3D depth as the
 * journey reaches it (tilted, small, faded → sharp), and sinks back as the
 * journey moves on. Arriving also sets `data-on`, which plays the one-off
 * effects in CSS: corner brackets drawing out, a scan line sweep, and the
 * contents flickering in line by line.
 */
export function ChapterFx({ index, children }: { index: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Boxes taller than the screen only fade a little, so they stay readable while scrolling through them.
    let tall = false;
    const resize = new ResizeObserver(() => {
      tall = el.offsetHeight > window.innerHeight * 0.92;
    });
    resize.observe(el);

    let on: boolean | null = null;
    const off = onJourneyFrame((s) => {
      const d = s - index;
      const a = Math.abs(d);
      const now = a < 0.38;
      if (now !== on) {
        on = now;
        el.dataset.on = now ? "1" : "0";
      }
      if (journey.reducedMotion) {
        el.style.transform = "";
        el.style.opacity = "";
        return;
      }
      const far = ramp(a, tall ? 0.35 : 0.12, tall ? 0.6 : 0.62);
      const opacity = tall ? 1 - far * 0.6 : 1 - far * 0.97;
      // Opacity below 1 stops the glass blur from seeing the 3D behind it, so clear it when fully shown.
      el.style.opacity = opacity > 0.995 ? "" : opacity.toFixed(3);
      el.style.transform = tall
        ? `translate3d(0, ${(d * 24).toFixed(1)}px, 0)`
        : `perspective(1400px) translate3d(0, ${(d * 70).toFixed(1)}px, ${(-far * 320).toFixed(0)}px) rotateX(${(
            Math.sign(d) * far * 16
          ).toFixed(2)}deg)`;
    });

    return () => {
      off();
      resize.disconnect();
    };
  }, [index]);

  return (
    <div ref={ref} className="chapter-fx" data-on="0">
      {children}
    </div>
  );
}
