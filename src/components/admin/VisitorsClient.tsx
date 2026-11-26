"use client";

import { useActionState, useState, useTransition } from "react";
import { COUNTER_KINDS, type VisitorSettings } from "@/config/customize";
import { type FormState, resetVisits, saveVisitors } from "@/app/admin/actions";
import { counterDigits } from "@/lib/visits/counter";
import { SaveBar } from "./ui";

export type Bar = { label: string; value: number };

const H = 196;

/** Visitors per day (or month) as bars, with the busiest one labelled and a table view. */
export function VisitorsChart({ bars, unit, title }: { bars: Bar[]; unit: string; title: string }) {
  const [table, setTable] = useState(false);
  const top = Math.max(0, ...bars.map((b) => b.value));
  const max = Math.max(10, Math.ceil(top / 10) * 10);
  const peak = top > 0 ? bars.findIndex((b) => b.value === top) : -1;
  const axis = bars.length > 10 ? [bars[0], bars[Math.floor(bars.length / 2)], bars[bars.length - 1]] : bars;
  const ticks = [0, max / 2, max];
  const alt =
    top > 0
      ? `Bar chart of visitors per ${unit}. Busiest: ${top} on ${bars[peak].label}.`
      : `Bar chart of visitors per ${unit}. No visitors yet.`;

  return (
    <section aria-labelledby="chart-title" className="border border-holo/20 bg-[rgba(4,14,22,.72)] px-5 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="chart-title" className="font-mono text-[13px] font-bold tracking-[0.14em] text-holo">
          &gt; VISITORS · {title}
        </h2>
        <button type="button" className="chip" onClick={() => setTable((t) => !t)}>
          {table ? "show chart" : "show as table"}
        </button>
      </div>
      {table ? (
        <div className="max-h-[260px] overflow-y-auto border border-holo/15">
          <table className="w-full border-collapse font-mono text-[13px]">
            <thead>
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-medium text-[#9fc3d3]">
                  {unit === "month" ? "Month" : "Day"}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium text-[#9fc3d3]">
                  Visitors
                </th>
              </tr>
            </thead>
            <tbody>
              {bars.map((b) => (
                <tr key={b.label} className="border-t border-holo/10">
                  <td className="px-3 py-1.5">{b.label}</td>
                  <td className="px-3 py-1.5 text-right">{b.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex gap-3">
          <div aria-hidden="true" className="relative h-[220px] w-8 font-mono text-[11px] text-muted">
            {ticks.map((t) => (
              <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: 220 - (t / max) * H }}>
                {t}
              </span>
            ))}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="relative h-[220px]">
              {ticks.map((t) => (
                <i
                  key={t}
                  aria-hidden="true"
                  className="absolute inset-x-0 h-px bg-holo/[.08]"
                  style={{ top: 220 - (t / max) * H }}
                />
              ))}
              <div
                role="img"
                aria-label={alt}
                className="absolute inset-0 flex items-end"
                style={{ gap: bars.length > 10 ? 4 : 14 }}
              >
                {bars.map((b, i) => (
                  <div
                    key={b.label}
                    title={`${b.label}: ${b.value} ${b.value === 1 ? "visitor" : "visitors"}`}
                    className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5"
                  >
                    {i === peak && (
                      // Near an edge the label leans inward so it never leaves the chart.
                      <span
                        className={`absolute font-mono text-[12px] whitespace-nowrap text-fg ${
                          i > bars.length * 0.66 ? "right-0" : i < bars.length * 0.33 ? "left-0" : "left-1/2 -translate-x-1/2"
                        }`}
                        style={{ bottom: Math.max(2, Math.round((b.value / max) * H)) + 6 }}
                      >
                        {b.value} · {b.label}
                      </span>
                    )}
                    <i
                      className="block w-full rounded-t-[4px] bg-holo"
                      style={{ height: Math.max(2, Math.round((b.value / max) * H)), opacity: i === peak ? 1 : 0.72 }}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div aria-hidden="true" className="flex justify-between font-mono text-[11px] text-muted">
              {axis.map((b) => (
                <span key={b.label}>{b.label}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

const KIND_LABEL: Record<(typeof COUNTER_KINDS)[number], string> = {
  people: "people, all time",
  visits: "visits, all time",
};

/** Whether the public counter shows, and what it counts. */
export function VisitorSettingsForm({
  settings: initial,
  totals,
}: {
  settings: VisitorSettings;
  totals: { people: number; visits: number };
}) {
  const [state, action] = useActionState(saveVisitors, null);
  const [settings, setSettings] = useState(initial);
  const value = settings.counterKind === "visits" ? totals.visits : totals.people;

  return (
    <form action={action} aria-labelledby="counter-title" className="border border-holo/45 bg-[rgba(4,14,22,.72)] px-5 py-4">
      <input type="hidden" name="visitors" value={JSON.stringify(settings)} />
      <h2 id="counter-title" className="mb-3 font-mono text-[13px] font-bold tracking-[0.14em] text-holo">
        &gt; PUBLIC COUNTER
      </h2>
      <div className="flex flex-col gap-3.5 text-[15px]">
        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={settings.counter}
            onChange={(e) => setSettings((s) => ({ ...s, counter: e.target.checked }))}
            className="mt-0.5 size-[18px] flex-none accent-[var(--holo)]"
          />
          <span>
            Show a visitor counter on the site
            <span className="block text-[13px] text-muted">
              In the top strip on laptops, at the bottom of the menu on phones.
            </span>
          </span>
        </label>
        <div role="radiogroup" aria-label="What the counter shows" className="flex flex-wrap gap-2">
          {COUNTER_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              role="radio"
              aria-checked={settings.counterKind === kind}
              onClick={() => setSettings((s) => ({ ...s, counterKind: kind }))}
              className="chip"
            >
              {KIND_LABEL[kind]}
            </button>
          ))}
        </div>
        <div
          className={`flex items-center gap-3.5 border border-dashed border-holo/25 bg-[#03050a] px-4 py-3 ${
            settings.counter ? "" : "opacity-40"
          }`}
        >
          <span className="font-mono text-[11px] tracking-[0.12em] text-muted">PREVIEW</span>
          <span className="font-mono text-[12px] font-medium tracking-[0.14em] text-holo">
            {settings.counterKind === "visits" ? "VISITS" : "VISITORS"}{" "}
            <b className="font-medium text-fg">{counterDigits(value)}</b>
          </span>
        </div>
      </div>
      <SaveBar state={state} />
    </form>
  );
}

/** Deletes every counted visit, after asking. */
export function ResetVisits() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<FormState>(null);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pending}
        className="chip border-[#ff7878]/50 text-[#ffb3b3] disabled:opacity-50"
        onClick={() => {
          if (!window.confirm("Delete every counted visit and start from zero? This cannot be undone.")) return;
          start(async () => setResult(await resetVisits()));
        }}
      >
        {pending ? "resetting..." : "reset all counts"}
      </button>
      <p role="status" className={`font-mono text-xs ${result ? (result.ok ? "text-holo" : "text-pink") : ""}`}>
        {result?.message}
      </p>
    </div>
  );
}
