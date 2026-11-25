import type { ReactNode } from "react";
import { ChapterFx } from "./ChapterFx";

/**
 * One full-height scroll chapter, its content centred on screen.
 * The scroll driver reads `data-chapter`; ChapterFx animates the content in and out.
 */
export function Chapter({ index, children }: { index: number; children: ReactNode }) {
  return (
    <section
      data-chapter={index}
      className="flex min-h-svh items-center justify-center px-6 py-[84px] max-[720px]:px-3.5 max-[720px]:py-16"
    >
      <ChapterFx index={index}>{children}</ChapterFx>
    </section>
  );
}

export function Panel({ eyebrow, wide = false, children }: { eyebrow: ReactNode; wide?: boolean; children: ReactNode }) {
  return (
    <div className={wide ? "panel panel-wide" : "panel"}>
      <p className="eyebrow">{eyebrow}</p>
      {children}
    </div>
  );
}
