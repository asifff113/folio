import type { ReactNode } from "react";

type ChapterProps = {
  index: number;
  /** Which side the panel sits on, so the 3D stays visible on the other side. */
  align?: "left" | "right" | "boot";
  children: ReactNode;
};

/** One full-height scroll chapter. The scroll driver reads `data-chapter`. */
export function Chapter({ index, align = "left", children }: ChapterProps) {
  const layout =
    align === "boot"
      ? "items-end pb-[12vh]"
      : align === "right"
        ? "items-center justify-end max-[720px]:items-end max-[720px]:justify-start max-[720px]:pb-16"
        : "items-center max-[720px]:items-end max-[720px]:pb-16";

  return (
    <section data-chapter={index} className={`flex min-h-svh px-7 py-[72px] ${layout}`}>
      {children}
    </section>
  );
}

export function Panel({ eyebrow, children }: { eyebrow: ReactNode; children: ReactNode }) {
  return (
    <div className="panel">
      <p className="eyebrow">{eyebrow}</p>
      {children}
    </div>
  );
}
