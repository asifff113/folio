"use client";

import { type ReactNode, useEffect, useRef } from "react";

/** A centred pop-up over the page (card details, gallery photos). Closes on Esc, the × or a click outside. */
export function Modal({
  label,
  onClose,
  wide = false,
  children,
}: {
  label: string;
  onClose: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    d.showModal();
    const close = () => onClose();
    d.addEventListener("close", close);
    return () => d.removeEventListener("close", close);
  }, [onClose]);

  return (
    <dialog
      ref={dialog}
      aria-label={label}
      data-lenis-prevent
      onClick={(e) => {
        if (e.target === dialog.current) dialog.current?.close();
      }}
      className={`m-auto max-h-[calc(100svh-24px)] overflow-y-auto border border-holo bg-[rgba(4,14,22,.96)] p-0 text-fg backdrop:bg-[rgba(2,5,9,.78)] backdrop:backdrop-blur-[3px] ${
        wide ? "w-[min(1100px,calc(100vw-24px))]" : "w-[min(680px,calc(100vw-24px))]"
      }`}
    >
      <div className="relative">
        <button
          type="button"
          aria-label="Close"
          onClick={() => dialog.current?.close()}
          className="absolute top-3 right-3 z-[1] grid size-11 cursor-pointer place-items-center border border-holo/30 bg-[rgba(4,14,22,.8)] text-[#9fc3d3] hover:text-fg"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M3 3l10 10M13 3L3 13" />
          </svg>
        </button>
        {children}
      </div>
    </dialog>
  );
}
