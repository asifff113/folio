"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  CONTACT_PLATFORMS,
  type ContactPlatform,
  type HelpItem,
  type HelpSettings,
  type HelpStatus,
  type HelpUrgency,
} from "@/config/site";
import { sendHelpResponse } from "@/app/help-actions";
import { visitSource } from "@/lib/source";

const URGENCY: Record<HelpUrgency, { label: string; color: string }> = {
  urgent: { label: "URGENT", color: "var(--pink)" },
  medium: { label: "MEDIUM", color: "#ffb23b" },
  low: { label: "LOW", color: "#9fc3d3" },
};

const NEED_STATUS: Record<HelpStatus, { label: string; color: string }> = {
  open: { label: "OPEN", color: "var(--holo)" },
  in_progress: { label: "IN PROGRESS", color: "#ffb23b" },
  solved: { label: "SOLVED", color: "#7fa6b8" },
};

const OFFER_STATUS: Record<HelpStatus, { label: string; color: string }> = {
  open: { label: "AVAILABLE", color: "#5dffb0" },
  in_progress: { label: "LIMITED", color: "#ffb23b" },
  solved: { label: "PAUSED", color: "#7fa6b8" },
};

type Props = { settings: HelpSettings; items: HelpItem[] };

/** The "Ready to help me?" chapter: two lists and the response dialog. */
export function HelpPanel({ settings, items }: Props) {
  const shown = items.filter((i) => i.visible && (settings.showSolved || i.status !== "solved"));
  const needs = shown.filter((i) => i.kind === "need");
  const offers = shown.filter((i) => i.kind === "offer");
  const [open, setOpen] = useState<string | null>(needs[0]?.id ?? offers[0]?.id ?? null);
  const [responding, setResponding] = useState<HelpItem | null>(null);
  const openNeeds = needs.filter((i) => i.status !== "solved").length;
  const solvedNeeds = needs.length - openNeeds;

  const list = (kind: "need" | "offer", rows: HelpItem[]) => (
    <ul className="flex flex-col gap-2.5">
      {rows.map((item) => {
        const solved = item.status === "solved";
        const expanded = open === item.id;
        const status = (kind === "need" ? NEED_STATUS : OFFER_STATUS)[item.status];
        return (
          <li
            key={item.id}
            className={`border px-4 py-3.5 transition-colors ${
              expanded ? "border-holo/55 bg-holo/[.06]" : "border-holo/15 bg-[rgba(2,10,16,.55)]"
            } ${solved ? "opacity-55" : ""}`}
          >
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setOpen(expanded ? null : item.id)}
              className="flex w-full cursor-pointer items-center gap-3 text-left"
            >
              {kind === "need" && (
                <span
                  className="flex-none border px-[7px] py-[3px] font-mono text-[10px] font-bold tracking-[0.12em]"
                  style={{ color: URGENCY[item.urgency].color, borderColor: URGENCY[item.urgency].color }}
                >
                  {URGENCY[item.urgency].label}
                </span>
              )}
              <span className={`min-w-0 flex-1 text-[17px] leading-snug font-semibold ${solved ? "line-through" : ""}`}>
                {item.title}
              </span>
              <span className="flex-none font-mono text-[10px] tracking-[0.12em]" style={{ color: status.color }}>
                ● {status.label}
              </span>
            </button>

            {expanded && item.details && (
              <p className="mt-2.5 text-[16px] leading-relaxed whitespace-pre-line text-[#c3dde8]">{item.details}</p>
            )}

            {(item.tags.length > 0 || (settings.accept && !solved)) && (
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {item.tags.map((tag) => (
                  <span key={tag} className="font-mono text-[13px] text-[#9fc3d3]">
                    #{tag}
                  </span>
                ))}
                <span className="flex-1" />
                {settings.accept && !solved && (
                  <button
                    type="button"
                    onClick={() => setResponding(item)}
                    className={`min-h-10 cursor-pointer border px-4 font-mono text-[13px] font-bold tracking-[0.06em] ${
                      kind === "need"
                        ? "border-pink bg-pink/10 text-[#ffd6f6] hover:bg-pink/20"
                        : "border-holo bg-holo/[.08] text-[#c9f7ff] hover:bg-holo/20"
                    }`}
                  >
                    {kind === "need" ? "I can help ▸" : "Ask me ▸"}
                  </button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="panel panel-wide">
      <p className="eyebrow">{"// help_exchange"}</p>
      <h2 className="panel-title">{settings.heading}</h2>
      {settings.intro && <p className="panel-text max-w-[680px]">{settings.intro}</p>}

      <div className="mt-5 grid gap-6 md:grid-cols-2">
        {needs.length > 0 && (
          <section aria-label="I need help with" className={offers.length ? "" : "md:col-span-2"}>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h3 className="font-mono text-[13px] font-bold tracking-[0.16em] text-pink">&gt; I NEED HELP WITH</h3>
              <span className="font-mono text-[12px] text-[#9fc3d3]">
                {openNeeds} open{solvedNeeds ? ` · ${solvedNeeds} solved` : ""}
              </span>
            </div>
            {list("need", needs)}
          </section>
        )}
        {offers.length > 0 && (
          <section aria-label="I can provide" className={needs.length ? "" : "md:col-span-2"}>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h3 className="font-mono text-[13px] font-bold tracking-[0.16em] text-holo">&gt; I CAN PROVIDE</h3>
              <span className="font-mono text-[12px] text-[#9fc3d3]">
                {offers.length} {offers.length === 1 ? "offer" : "offers"}
              </span>
            </div>
            {list("offer", offers)}
          </section>
        )}
      </div>

      <p className="mt-5 font-mono text-[12px] text-[#7fa6b8]">
        {settings.accept
          ? "// tap an item to expand it · notes go to my private inbox · your contact is never shown on the site"
          : "// tap an item to expand it"}
      </p>

      {responding && <RespondDialog item={responding} onClose={() => setResponding(null)} />}
    </div>
  );
}

function RespondDialog({ item, onClose }: { item: HelpItem; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(sendHelpResponse, null);
  const [platform, setPlatform] = useState<ContactPlatform>("discord");
  const [note, setNote] = useState("");
  const [name, setName] = useState("");
  const [source] = useState(() => (typeof window === "undefined" ? "direct" : visitSource()));
  const placeholder = CONTACT_PLATFORMS.find((p) => p.id === platform)?.placeholder ?? "";
  const need = item.kind === "need";

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    d.showModal();
    const close = () => onClose();
    d.addEventListener("close", close);
    return () => d.removeEventListener("close", close);
  }, [onClose]);

  const sent = state?.ok === true;

  return (
    <dialog
      ref={dialog}
      aria-labelledby="respond-title"
      data-lenis-prevent
      onClick={(e) => {
        if (e.target === dialog.current) dialog.current?.close();
      }}
      className="m-auto w-[min(560px,calc(100vw-24px))] max-h-[calc(100svh-24px)] overflow-y-auto border bg-[rgba(4,14,22,.96)] p-0 text-fg backdrop:bg-[rgba(2,5,9,.72)] backdrop:backdrop-blur-[3px]"
      style={{ borderColor: need ? "var(--pink)" : "var(--holo)" }}
    >
      <div className="flex flex-col gap-[18px] p-6 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <p
            id="respond-title"
            className="font-mono text-[12px] font-bold tracking-[0.14em]"
            style={{ color: need ? "var(--pink)" : "var(--holo)" }}
          >
            &gt; {need ? "OFFER_HELP" : "ASK_FOR_THIS"}
          </p>
          <button
            type="button"
            aria-label="Close"
            onClick={() => dialog.current?.close()}
            className="grid size-11 cursor-pointer place-items-center border border-holo/30 text-[#9fc3d3] hover:text-fg"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>

        <div
          className="flex flex-col gap-1 border-l-2 py-1 pl-3.5"
          style={{ borderColor: need ? "var(--pink)" : "var(--holo)" }}
        >
          <span className="text-[17px] font-semibold">{item.title}</span>
          {item.tags.length > 0 && (
            <span className="font-mono text-[12px] text-[#9fc3d3]">{item.tags.map((t) => `#${t}`).join(" ")}</span>
          )}
        </div>

        {sent ? (
          <div role="status" className="flex flex-col gap-4">
            <p className="flex items-center gap-3 border border-[#5dffb0]/50 bg-[#5dffb0]/[.07] px-4 py-3.5 text-[16px] text-[#d6ffeb]">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#5dffb0" strokeWidth="1.8" aria-hidden="true">
                <path d="M3 9.5l4 4 8-9" />
              </svg>
              Sent. Thanks{name ? ` ${name}` : ""}, I&apos;ll reach out.
            </p>
            <button type="button" className="btn self-start" onClick={() => dialog.current?.close()}>
              &gt; close()
            </button>
          </div>
        ) : (
          <form action={action} className="flex flex-col gap-[18px]">
            <input type="hidden" name="item" value={item.id} />
            <input type="hidden" name="platform" value={platform} />
            <input type="hidden" name="source" value={source} />
            {/* Spam trap: hidden from people, bots fill it in. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
              <label>
                Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
              </label>
            </div>

            <label className="flex flex-col gap-[7px]">
              <span className="field-label m-0">your name</span>
              <input
                name="name"
                required
                maxLength={40}
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-input"
              />
            </label>

            <div className="flex flex-col gap-[7px]">
              <span className="field-label m-0" id="reach-label">
                how can i reach you?
              </span>
              <div role="radiogroup" aria-labelledby="reach-label" className="flex flex-wrap gap-1.5">
                {CONTACT_PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={platform === p.id}
                    onClick={() => setPlatform(p.id)}
                    className="chip"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <input
                name="contact"
                required
                maxLength={120}
                aria-label="Your contact"
                placeholder={placeholder}
                type={platform === "email" ? "email" : "text"}
                autoComplete={platform === "email" ? "email" : "off"}
                className="text-input"
              />
            </div>

            <label className="flex flex-col gap-[7px]">
              <span className="field-label m-0">note</span>
              <textarea
                name="note"
                required
                maxLength={800}
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={need ? "How could you help?" : "What do you need?"}
                className="text-input resize-y leading-relaxed"
              />
              <span className="self-end font-mono text-[11px] text-[#7fa6b8]">{note.length} / 800</span>
            </label>

            <div className="flex flex-wrap items-center gap-3.5">
              <p className="min-w-[180px] flex-1 text-[14px] leading-snug text-[#9fc3d3]">
                Only I see this. Your contact is never shown on the site.
              </p>
              <button type="submit" disabled={pending} className="btn btn-solid disabled:opacity-60">
                {pending ? "sending..." : "SEND ▸"}
              </button>
            </div>
            {state && !state.ok && (
              <p role="alert" className="font-mono text-[13px] text-pink">
                {state.message}
              </p>
            )}
          </form>
        )}
      </div>
    </dialog>
  );
}
