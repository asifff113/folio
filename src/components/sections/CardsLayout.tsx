"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SectionItem } from "@/config/site";
import { paragraphs } from "@/lib/text";
import { Modal } from "./Modal";

/** Cards in a row that pages sideways with ‹ ›; "details" opens the longer text. */
export function CardsLayout({ items }: { items: SectionItem[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState({ at: 1, of: 1 });
  const [open, setOpen] = useState<SectionItem | null>(null);
  const close = useCallback(() => setOpen(null), [setOpen]);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const update = () => {
      // A partly filled last page still counts as a page.
      const max = el.scrollWidth - el.clientWidth;
      const of = max > 2 ? Math.ceil((el.scrollWidth - 2) / el.clientWidth) : 1;
      const at = of === 1 ? 1 : Math.round((el.scrollLeft / max) * (of - 1)) + 1;
      setPage((p) => (p.at === at && p.of === of ? p : { at, of }));
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [items.length]);

  const go = (by: number) => {
    const el = track.current;
    if (el) el.scrollBy({ left: by * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="mt-2">
      {page.of > 1 && (
        <div className="mb-3 flex items-center justify-end gap-2.5 font-mono text-[14px] text-[#9fc3d3]">
          <span aria-live="polite">
            {page.at} / {page.of}
          </span>
          <button type="button" aria-label="Previous" className="pager-btn" disabled={page.at <= 1} onClick={() => go(-1)}>
            ‹
          </button>
          <button
            type="button"
            aria-label="Next"
            className="pager-btn"
            disabled={page.at >= page.of}
            onClick={() => go(1)}
          >
            ›
          </button>
        </div>
      )}

      <div ref={track} className="card-track" data-lenis-prevent>
        {items.map((item) => (
          <article key={item.id} className="card-tile">
            {item.image && (
              <div className="relative aspect-[16/9] overflow-hidden border-b border-holo/15 bg-[rgba(2,10,16,.7)]">
                <Image
                  src={item.image}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 90vw, (max-width: 1000px) 45vw, 420px"
                  className="object-cover"
                />
                {item.date && <span className="card-date">{item.date}</span>}
              </div>
            )}
            <div className="flex flex-1 flex-col gap-2.5 p-[18px]">
              {!item.image && item.date && <span className="font-mono text-[13px] text-[#9fc3d3]">{item.date}</span>}
              <h3 className="text-[20px] leading-snug font-semibold text-fg">{item.title}</h3>
              {item.subtitle && <p className="text-[15px] text-[#9fc3d3]">{item.subtitle}</p>}
              {item.body && <p className="flex-1 text-[15px] leading-relaxed text-[#b9d6e2]">{item.body}</p>}
              {item.tags.length > 0 && (
                <ul className="flex flex-wrap gap-1.5">
                  {item.tags.map((t) => (
                    <li key={t} className="border border-holo/30 px-2 py-0.5 font-mono text-[12px] text-[#c6eef9]">
                      {t}
                    </li>
                  ))}
                </ul>
              )}
              <CardLinks item={item} onDetails={item.details ? () => setOpen(item) : undefined} />
            </div>
          </article>
        ))}
      </div>

      {open && (
        <Modal label={open.title} onClose={close}>
          {open.image && (
            // eslint-disable-next-line @next/next/no-img-element -- uploaded image from storage
            <img src={open.image} alt="" className="aspect-[16/9] w-full border-b border-holo/20 object-cover" />
          )}
          <div className="flex flex-col gap-3 p-6 sm:p-8">
            {open.date && <span className="font-mono text-[13px] text-[#9fc3d3]">{open.date}</span>}
            <h3 className="pr-12 font-display text-[28px] leading-tight font-bold">{open.title}</h3>
            {open.subtitle && <p className="text-[16px] text-[#9fc3d3]">{open.subtitle}</p>}
            <div className="flex flex-col gap-3 text-[17px] leading-relaxed text-[#c3dde8]">
              {paragraphs(open.details).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <CardLinks item={open} />
          </div>
        </Modal>
      )}
    </div>
  );
}

function CardLinks({ item, onDetails }: { item: SectionItem; onDetails?: () => void }) {
  if (!onDetails && !item.link1Url && !item.link2Url) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-2">
      {onDetails && (
        <button type="button" className="btn" onClick={onDetails}>
          details
        </button>
      )}
      {item.link1Url && (
        <a href={item.link1Url} target="_blank" rel="noopener noreferrer" className="btn no-underline">
          {item.link1Label || "open"} ↗
        </a>
      )}
      {item.link2Url && (
        <a href={item.link2Url} target="_blank" rel="noopener noreferrer" className="btn no-underline">
          {item.link2Label || "link"} ↗
        </a>
      )}
    </div>
  );
}
