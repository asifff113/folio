"use client";

import { type ReactNode, useId } from "react";

/** A labelled 0–100 (or custom range) slider with its value shown. */
export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  show,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  /** Text shown next to the slider; defaults to the number. */
  show?: string;
}) {
  const id = useId();
  return (
    <div className="grid grid-cols-[minmax(110px,140px)_minmax(0,1fr)_64px] items-center gap-3">
      <label htmlFor={id} className="text-[14px]">
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer accent-[var(--holo)]"
      />
      <span className="font-mono text-[12px] text-muted">{show ?? value}</span>
    </div>
  );
}

/** A checkbox with a label and an optional hint underneath. */
export function Check({
  label,
  hint,
  checked,
  onChange,
}: {
  label: ReactNode;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-[15px]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-[18px] flex-none accent-[var(--holo)]"
      />
      <span>
        {label}
        {hint && <span className="block text-[13px] text-muted">{hint}</span>}
      </span>
    </label>
  );
}

/** A titled box inside an admin form. */
export function Group({ title, children, tone }: { title: string; children: ReactNode; tone?: "warn" }) {
  return (
    <section
      aria-label={title}
      className={`flex flex-col gap-3.5 border px-5 py-4 ${
        tone === "warn" ? "border-[#ffb23b] bg-[rgba(255,178,59,.05)]" : "border-holo/20 bg-[rgba(4,14,22,.72)]"
      }`}
    >
      <h2 className={`font-mono text-[13px] font-bold tracking-[0.14em] ${tone === "warn" ? "text-[#ffb23b]" : "text-holo"}`}>
        &gt; {title.toUpperCase()}
      </h2>
      {children}
    </section>
  );
}
