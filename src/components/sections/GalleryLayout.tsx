"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import type { SectionItem } from "@/config/site";
import { Modal } from "./Modal";

/** Photo grid; clicking one opens it large with its caption, with ‹ › to move through them. */
export function GalleryLayout({ items }: { items: SectionItem[] }) {
  const photos = items.filter((i) => i.image);
  const [open, setOpen] = useState<number | null>(null);
  const close = useCallback(() => setOpen(null), [setOpen]);
  const shown = open === null ? null : photos[open];

  return (
    <>
      <ul className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((p, i) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              className="group relative block aspect-square w-full cursor-zoom-in overflow-hidden border border-holo/20 bg-[rgba(2,10,16,.7)] hover:border-holo"
            >
              <Image
                src={p.image}
                alt={p.title}
                fill
                sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 300px"
                className="object-cover transition-transform group-hover:scale-[1.04]"
              />
              {p.title && (
                <span className="absolute inset-x-0 bottom-0 truncate bg-[rgba(4,10,16,.78)] px-2.5 py-1.5 text-left font-mono text-[12px] text-[#d6f6ff]">
                  {p.title}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {shown && open !== null && (
        <Modal label={shown.title || "Photo"} onClose={close} wide>
          {/* eslint-disable-next-line @next/next/no-img-element -- uploaded image from storage */}
          <img src={shown.image} alt={shown.title} className="max-h-[72svh] w-full bg-black object-contain" />
          <div className="flex flex-wrap items-center gap-3 p-5">
            <div className="min-w-0 flex-1">
              {shown.title && <p className="text-[17px] font-semibold">{shown.title}</p>}
              {shown.body && <p className="text-[15px] text-[#b9d6e2]">{shown.body}</p>}
            </div>
            {photos.length > 1 && (
              <div className="flex items-center gap-2 font-mono text-[14px] text-[#9fc3d3]">
                <span>
                  {open + 1} / {photos.length}
                </span>
                <button
                  type="button"
                  aria-label="Previous photo"
                  className="pager-btn"
                  onClick={() => setOpen((open - 1 + photos.length) % photos.length)}
                >
                  ‹
                </button>
                <button
                  type="button"
                  aria-label="Next photo"
                  className="pager-btn"
                  onClick={() => setOpen((open + 1) % photos.length)}
                >
                  ›
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
