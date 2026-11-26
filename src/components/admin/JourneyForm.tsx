"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { INTRO_STYLES, type JourneySettings, type MovableChapter } from "@/config/customize";
import { saveJourney } from "@/app/admin/actions";
import { Check, Group, Slider } from "./controls";
import { type NavChapterInfo, NavGroup } from "./NavGroup";
import { moveItem, useDragReorder } from "./reorder";
import { SaveBar } from "./ui";

const INTRO_NAMES: Record<(typeof INTRO_STYLES)[number], string> = {
  boot: "boot lines",
  wave: "wave name",
  none: "none",
};

/** Chapter order and text, intro, maintenance mode. */
export function JourneyForm({
  journey: initial,
  labels,
  navInfo,
}: {
  journey: JourneySettings;
  /** Name and note for each movable chapter. */
  labels: Record<MovableChapter, { name: string; note: string }>;
  /** What is on the page now, for the nav bar list. */
  navInfo: NavChapterInfo;
}) {
  const [state, action] = useActionState(saveJourney, null);
  const [journey, setJourney] = useState(initial);
  const set = <K extends keyof JourneySettings>(key: K, value: JourneySettings[K]) =>
    setJourney((j) => ({ ...j, [key]: value }));
  const setOrder = (update: (order: MovableChapter[]) => MovableChapter[]) =>
    setJourney((j) => ({ ...j, order: update(j.order) }));
  const drag = useDragReorder<MovableChapter>((next) =>
    setOrder((order) => (typeof next === "function" ? next(order) : next)),
  );

  return (
    <form action={action} className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <input type="hidden" name="journey" value={JSON.stringify(journey)} />

      <div className="flex flex-col gap-4">
        <Group title="chapter order">
          <ol className="flex flex-col gap-1.5">
            <PinnedRow name="start" note="your name and photo, always first" />
            {journey.order.map((key, i) => (
              <li
                key={key}
                {...drag.row(i)}
                className={`flex items-center gap-3 border px-3 py-2 ${
                  drag.over === i ? "border-holo bg-holo/10" : "border-holo/15 bg-[rgba(2,10,16,.5)]"
                }`}
              >
                <span
                  {...drag.handle(i)}
                  aria-hidden="true"
                  title="Drag to reorder"
                  className="cursor-grab px-1 font-mono text-[15px] text-[#7fa6b8] select-none"
                >
                  ⋮⋮
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-mono text-[14px] text-fg">{labels[key].name}</span>
                  <span className="truncate text-[12px] text-muted">{labels[key].note}</span>
                </span>
                <button
                  type="button"
                  className="ghost-btn"
                  aria-label={`Move ${labels[key].name} up`}
                  disabled={i === 0}
                  onClick={() => setOrder((o) => moveItem(o, i, i - 1))}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  aria-label={`Move ${labels[key].name} down`}
                  disabled={i === journey.order.length - 1}
                  onClick={() => setOrder((o) => moveItem(o, i, i + 1))}
                >
                  ↓
                </button>
              </li>
            ))}
            <PinnedRow name="end" note="the goodbye box, always last" />
          </ol>
          <p className="text-[13px] text-muted">
            Your sections move as one block; their own order is set on the sections page. Chapters that are switched off
            or empty are skipped.
          </p>
        </Group>

        <NavGroup nav={journey.nav} order={journey.order} info={navInfo} onChange={(nav) => set("nav", nav)} />

        <Group title="chapter text">
          <TextField label="connect · heading" value={journey.connectTitle} max={80} onChange={(v) => set("connectTitle", v)} />
          <TextField label="traces · heading" value={journey.tracesTitle} max={80} onChange={(v) => set("tracesTitle", v)} />
          <TextField label="traces · line under it" value={journey.tracesText} max={240} onChange={(v) => set("tracesText", v)} />
          <TextField label="end · heading" value={journey.endTitle} max={80} onChange={(v) => set("endTitle", v)} />
          <TextField label="end · line under it" value={journey.endText} max={240} onChange={(v) => set("endText", v)} />
          <p className="text-[13px] text-muted">
            About and interests are edited on the <Link href="/admin">profile</Link> page, help on the{" "}
            <Link href="/admin/help">help</Link> page, sections on their own pages.
          </p>
        </Group>
      </div>

      <div className="flex flex-col gap-4">
        <Group title="intro">
          <div role="radiogroup" aria-label="Intro style" className="flex flex-wrap gap-2">
            {INTRO_STYLES.map((style) => (
              <button
                key={style}
                type="button"
                role="radio"
                aria-checked={journey.intro === style}
                onClick={() => set("intro", style)}
                className="chip"
              >
                {INTRO_NAMES[style]}
              </button>
            ))}
          </div>
          {journey.intro !== "none" && (
            <>
              <Slider
                label="Length"
                min={1}
                max={6}
                value={journey.introSeconds}
                onChange={(v) => set("introSeconds", v)}
                show={`${journey.introSeconds} s`}
              />
              <Check
                label="Only on the first visit"
                hint="Returning visitors go straight to the site."
                checked={journey.introFirstOnly}
                onChange={(v) => set("introFirstOnly", v)}
              />
              {journey.intro === "boot" && (
                <label className="flex flex-col gap-1.5">
                  <span className="field-label m-0">boot lines (one per line, up to 6)</span>
                  <textarea
                    rows={4}
                    value={journey.introLines}
                    onChange={(e) => set("introLines", e.target.value)}
                    className="text-input resize-y font-mono text-[14px]!"
                  />
                </label>
              )}
              <p className="text-[13px] text-muted">Visitors can always skip it.</p>
            </>
          )}
        </Group>

        <Group title="maintenance mode" tone="warn">
          <Check
            label={journey.maintenance ? "On: visitors see the maintenance screen" : "Off"}
            checked={journey.maintenance}
            onChange={(v) => set("maintenance", v)}
          />
          <TextField
            label="heading"
            value={journey.maintenanceTitle}
            max={80}
            onChange={(v) => set("maintenanceTitle", v)}
          />
          <TextField
            label="message"
            value={journey.maintenanceText}
            max={240}
            onChange={(v) => set("maintenanceText", v)}
          />
          <p className="text-[13px] text-muted">
            Visitors see only this message and your links. You can still see the full site at{" "}
            <Link href="/preview">/preview</Link> while signed in.
          </p>
        </Group>
      </div>

      <div className="panel max-w-none py-4 xl:col-span-2">
        <SaveBar state={state} />
      </div>
    </form>
  );
}

function PinnedRow({ name, note }: { name: string; note: string }) {
  return (
    <li className="flex items-center gap-3 border border-[#ffb23b]/30 px-3 py-2">
      <span aria-hidden="true" className="px-1 font-mono text-[14px] text-[#ffb23b]">
        ⊙
      </span>
      <span className="flex flex-col">
        <span className="font-mono text-[14px] text-fg">{name}</span>
        <span className="text-[12px] text-muted">{note}</span>
      </span>
    </li>
  );
}

function TextField({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: string;
  max: number;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="field-label m-0">{label}</span>
      <input value={value} maxLength={max} onChange={(e) => onChange(e.target.value)} className="text-input" />
    </label>
  );
}
