"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { clamp, emitJourneyFrame, journey } from "@/lib/journey/store";

/**
 * Turns the page scroll into a chapter float and smooths it.
 *
 * Each `[data-chapter]` section has an anchor: the scroll position where the
 * section is centred in the viewport. Between two anchors the float goes from
 * k to k + 1. One animation loop drives Lenis, the smoothing and the listeners.
 */
export function ScrollDriver() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    journey.reducedMotion = reduced;
    const lenis = reduced ? null : new Lenis({ lerp: 0.1 });
    journey.lenis = lenis;

    let anchors: number[] = [];
    const measure = () => {
      const sections = document.querySelectorAll<HTMLElement>("[data-chapter]");
      const max = document.documentElement.scrollHeight - window.innerHeight;
      anchors = Array.from(sections, (el) => {
        const top = el.getBoundingClientRect().top + window.scrollY;
        return clamp(top + el.offsetHeight / 2 - window.innerHeight / 2, 0, max);
      });
    };

    const read = () => {
      const y = window.scrollY;
      if (!anchors.length || y <= anchors[0]) {
        journey.target = 0;
        return;
      }
      for (let k = 0; k < anchors.length - 1; k++) {
        if (y <= anchors[k + 1]) {
          journey.target = k + (y - anchors[k]) / Math.max(1, anchors[k + 1] - anchors[k]);
          return;
        }
      }
      journey.target = anchors.length - 1;
    };

    const onPointer = (e: PointerEvent) => {
      journey.pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      journey.pointer.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    };

    measure();
    read();
    journey.current = journey.target;

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(document.body);
    window.addEventListener("pointermove", onPointer, { passive: true });

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      lenis?.raf(now);
      read();

      // Frame-rate independent easing (the factors are tuned for 60 fps).
      const ease = 1 - Math.pow(1 - (reduced ? 0.25 : 0.075), dt * 60);
      journey.current += (journey.target - journey.current) * ease;
      if (Math.abs(journey.target - journey.current) < 0.0005) journey.current = journey.target;

      const p = journey.pointer;
      const follow = 1 - Math.pow(0.95, dt * 60);
      p.x += (p.tx - p.x) * follow;
      p.y += (p.ty - p.y) * follow;

      emitJourneyFrame();
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", onPointer);
      lenis?.destroy();
      journey.lenis = null;
    };
  }, []);

  return null;
}
