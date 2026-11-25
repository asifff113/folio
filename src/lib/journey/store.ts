import type Lenis from "lenis";

/**
 * The fixed chapters, in scroll order. Optional ones (HELP, TRACES) are left
 * out when switched off, and the sections you turn on in the admin panel are
 * inserted after INTERESTS as `S:<key>`. The 3D scene builds one shape and one
 * camera keyframe per chapter that is present.
 */
export const ALL_CHAPTERS = ["BOOT", "ABOUT", "INTERESTS", "SIGNAL", "HELP", "TRACES", "END"] as const;
export type FixedChapter = (typeof ALL_CHAPTERS)[number];
export type SectionChapter = `S:${string}`;
export type ChapterKey = FixedChapter | SectionChapter;

export const isSectionChapter = (key: ChapterKey): key is SectionChapter => key.startsWith("S:");

/**
 * The chapters shown, in order: BOOT first and END last, the rest in the
 * admin's order (`SECTIONS` stands for all shown sections, in their own order).
 */
export function journeyChapters(optional: {
  help: boolean;
  traces: boolean;
  sections: string[];
  order?: readonly string[];
}): ChapterKey[] {
  const order = optional.order ?? ["ABOUT", "INTERESTS", "SECTIONS", "SIGNAL", "HELP", "TRACES"];
  const out: ChapterKey[] = ["BOOT"];
  for (const key of order) {
    if (key === "SECTIONS") for (const s of optional.sections) out.push(`S:${s}`);
    else if (key === "HELP") {
      if (optional.help) out.push("HELP");
    } else if (key === "TRACES") {
      if (optional.traces) out.push("TRACES");
    } else if (key === "ABOUT" || key === "INTERESTS" || key === "SIGNAL") out.push(key);
  }
  out.push("END");
  return out;
}

/** Short name for the HUD. */
export const chapterLabel = (key: ChapterKey) => (isSectionChapter(key) ? key.slice(2) : key).toUpperCase();

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
