import type Lenis from "lenis";

/** Chapter names, in scroll order. The 3D scene has one shape per chapter. */
export const CHAPTERS = ["BOOT", "ABOUT", "INTERESTS", "SIGNAL", "TRACES", "END"] as const;
export const LAST_CHAPTER = CHAPTERS.length - 1;

/**
 * Shared, mutable journey state. It changes every frame, so it lives outside
 * React: the scroll driver writes it, the 3D scene and the HUD read it.
 *
 * `target` is the scroll position as a chapter float (0 = boot, 1 = about, ...),
 * `current` follows it smoothly.
 */
export const journey = {
  target: 0,
  current: 0,
  pointer: { x: 0, y: 0, tx: 0, ty: 0 },
  reducedMotion: false,
  lenis: null as Lenis | null,
};

type FrameListener = (s: number) => void;
const listeners = new Set<FrameListener>();

/** Runs `fn` once per animation frame with the smoothed chapter float. */
export function onJourneyFrame(fn: FrameListener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function emitJourneyFrame() {
  for (const fn of listeners) fn(journey.current);
}

export function scrollToTop() {
  if (journey.lenis) journey.lenis.scrollTo(0);
  else window.scrollTo({ top: 0, behavior: journey.reducedMotion ? "auto" : "smooth" });
}

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const smooth = (t: number) => t * t * (3 - 2 * t);
/** 0 → 1 as `s` moves from `from` to `from + span`, eased. */
export const ramp = (s: number, from: number, span: number) => smooth(clamp((s - from) / span, 0, 1));
