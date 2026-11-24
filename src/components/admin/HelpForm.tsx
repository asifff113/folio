"use client";

import { useActionState, useState } from "react";
import type { HelpItem, HelpKind, HelpSettings, HelpStatus, HelpUrgency } from "@/config/site";
import { saveHelp } from "@/app/admin/actions";
import { SaveBar } from "./ui";

const URGENCIES: HelpUrgency[] = ["low", "medium", "urgent"];
const STATUSES: { id: HelpStatus; need: string; offer: string }[] = [
  { id: "open", need: "open", offer: "available" },
  { id: "in_progress", need: "in progress", offer: "limited" },
  { id: "solved", need: "solved", offer: "paused" },
];
const URGENCY_COLOR: Record<HelpUrgency, string> = { urgent: "var(--pink)", medium: "#ffb23b", low: "#9fc3d3" };
const STATUS_COLOR: Record<HelpStatus, string> = { open: "var(--holo)", in_progress: "#ffb23b", solved: "#7fa6b8" };

type Props = { settings: HelpSettings; items: HelpItem[]; responses: Record<string, number> };

export function HelpForm({ settings: initialSettings, items: initialItems, responses }: Props) {
  const [state, action] = useActionState(saveHelp, null);
  const [settings, setSettings] = useState(initialSettings);
  const [items, setItems] = useState(initialItems);
  const [tab, setTab] = useState<HelpKind>("need");
  const [editing, setEditing] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");

  const rows = items.filter((i) => i.kind === tab);
  const count = (kind: HelpKind) => items.filter((i) => i.kind === kind).length;
  const update = (id: string, patch: Partial<HelpItem>) =>
    setItems((all) => all.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const move = (id: string, by: -1 | 1) =>
    setItems((all) => {
      const same = all.filter((i) => i.kind === tab);
      const at = same.findIndex((i) => i.id === id);
      const other = same[at + by];
      if (!other) return all;
      const a = all.findIndex((i) => i.id === id);
      const b = all.findIndex((i) => i.id === other.id);
      const next = [...all];
      [next[a], next[b]] = [next[b], next[a]];
      return next;
    });
  const add = () => {
    const title = newTitle.trim().slice(0, 80);
    if (!title) return;
    const id = crypto.randomUUID();
    setItems((all) => [
      ...all,
      { id, kind: tab, title, details: "", tags: [], urgency: "medium", status: "open", visible: true },
    ]);
    setEditing(id);
    setNewTitle("");
  };

  const payload = JSON.stringify({ settings, items });

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="help" value={payload} />

      <section className="panel max-w-none">
        <p className="eyebrow">{"// chapter"}</p>
        <div className="grid gap-x-5 md:grid-cols-2">
          <label className="block">
            <span className="field-label">heading</span>
            <input
              className="text-input"
              maxLength={80}
              value={settings.heading}
              onChange={(e) => setSettings({ ...settings, heading: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="field-label">intro line</span>
            <input
              className="text-input"
              maxLength={240}
              value={settings.intro}
              onChange={(e) => setSettings({ ...settings, intro: e.target.value })}
            />
          </label>
        </div>
        <div className="mt-5 grid gap-3 text-[15px] text-[#c3dde8] md:grid-cols-3">
          {(
            [
              ["enabled", "Show this chapter"],
              ["accept", "Accept notes from visitors"],
              ["showSolved", "Keep solved items (dimmed)"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={settings[key]}
                onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })}
                className="size-[18px] accent-[var(--holo)]"
              />
              {label}
            </label>
          ))}
        </div>
        <p className="mt-3 font-mono text-[12px] text-muted">
          The chapter stays hidden while it has no visible items, even when switched on.
        </p>
      </section>

      <div role="tablist" aria-label="Lists" className="flex border-b border-holo/20">
        {(
          [
            ["need", "I need help with"],
            ["offer", "I can provide"],
          ] as const
        ).map(([kind, label]) => (
          <button
            key={kind}
            type="button"
            role="tab"
            aria-selected={tab === kind}
            onClick={() => {
              setTab(kind);
              setEditing(null);
            }}
            className={`-mb-px min-h-11 cursor-pointer border-b-2 px-4 font-mono text-[13px] tracking-[0.06em] uppercase ${
              tab === kind ? (kind === "need" ? "border-pink text-fg" : "border-holo text-fg") : "border-transparent text-muted"
            }`}
          >
            {label} ({count(kind)})
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-2.5">
        {rows.length === 0 && (
          <li className="border border-dashed border-holo/25 px-4 py-6 text-center text-[15px] text-muted">
            Nothing here yet. Add the first one below.
          </li>
        )}
        {rows.map((item, i) => {
          const open = editing === item.id;
          const replies = responses[item.id] ?? 0;
          return (
            <li
              key={item.id}
              className={`border ${open ? "border-holo bg-holo/[.05]" : "border-holo/15 bg-[rgba(2,10,16,.5)]"}`}
            >
              <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="font-mono text-[11px] text-muted">{String(i + 1).padStart(2, "0")}</span>
                {tab === "need" && (
                  <span
                    className="border px-[7px] py-[3px] font-mono text-[10px] font-bold uppercase"
                    style={{ color: URGENCY_COLOR[item.urgency], borderColor: URGENCY_COLOR[item.urgency] }}
                  >
                    {item.urgency}
                  </span>
                )}
                <span className={`min-w-0 flex-1 text-[15px] font-semibold ${item.visible ? "" : "text-muted line-through"}`}>
                  {item.title}
                </span>
                {replies > 0 && <span className="font-mono text-[11px] text-pink">{replies} notes</span>}
                <span className="font-mono text-[11px]" style={{ color: STATUS_COLOR[item.status] }}>
                  ● {STATUSES.find((s) => s.id === item.status)?.[tab]}
                </span>
                <span className="flex gap-1.5">
                  <button type="button" className="ghost-btn" disabled={i === 0} onClick={() => move(item.id, -1)} aria-label="Move up">
                    ↑
                  </button>
                  <button
                    type="button"
                    className="ghost-btn"
                    disabled={i === rows.length - 1}
                    onClick={() => move(item.id, 1)}
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                  <button type="button" className="ghost-btn" aria-expanded={open} onClick={() => setEditing(open ? null : item.id)}>
                    {open ? "done" : "edit"}
                  </button>
                </span>
              </div>

              {open && (
                <div className="border-t border-holo/15 px-4 pt-1 pb-4">
                  <label className="block">
                    <span className="field-label">title</span>
                    <input
                      className="text-input"
                      maxLength={80}
                      value={item.title}
                      onChange={(e) => update(item.id, { title: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className="field-label">details (shown when a visitor opens the item)</span>
                    <textarea
                      className="text-input resize-y leading-relaxed"
                      rows={3}
                      maxLength={600}
                      value={item.details}
                      onChange={(e) => update(item.id, { details: e.target.value })}
                    />
                  </label>
                  <div className="grid gap-x-5 md:grid-cols-3">
                    <label className="block">
                      <span className="field-label">tags, comma separated</span>
                      <input
                        className="text-input"
                        defaultValue={item.tags.join(", ")}
                        placeholder="webgl, design"
                        onChange={(e) =>
                          update(item.id, {
                            tags: e.target.value
                              .split(",")
                              .map((t) => t.trim().replace(/^#+/, "").toLowerCase())
                              .filter(Boolean),
                          })
                        }
                      />
                    </label>
                    {tab === "need" && (
                      <Segmented
                        label="urgency"
                        value={item.urgency}
                        options={URGENCIES.map((u) => ({ id: u, label: u }))}
                        onChange={(urgency) => update(item.id, { urgency })}
                      />
                    )}
                    <Segmented
                      label="status"
                      value={item.status}
                      options={STATUSES.map((s) => ({ id: s.id, label: s[tab] }))}
                      onChange={(status) => update(item.id, { status })}
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    <label className="flex cursor-pointer items-center gap-2.5 text-[15px] text-[#c3dde8]">
                      <input
                        type="checkbox"
                        checked={item.visible}
                        onChange={(e) => update(item.id, { visible: e.target.checked })}
                        className="size-[18px] accent-[var(--holo)]"
                      />
                      Visible on the site
                    </label>
                    <span className="flex-1" />
                    <button
                      type="button"
                      className="ghost-btn hover:border-pink hover:text-pink"
                      onClick={() => {
                        setItems((all) => all.filter((x) => x.id !== item.id));
                        setEditing(null);
                      }}
                    >
                      remove
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex gap-2.5">
        <input
          aria-label="New item title"
          className="text-input min-w-0 flex-1"
          maxLength={80}
          value={newTitle}
          placeholder={tab === "need" ? "add something you need help with…" : "add something you can offer…"}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="btn" onClick={add}>
          + add
        </button>
      </div>

      <SaveBar state={state} />
    </form>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <span className="field-label" id={`seg-${label}`}>
        {label}
      </span>
      <div role="radiogroup" aria-labelledby={`seg-${label}`} className="flex">
        {options.map((o, i) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            onClick={() => onChange(o.id)}
            className={`min-h-11 flex-1 cursor-pointer border px-2 font-mono text-[12px] ${i ? "-ml-px" : ""} ${
              value === o.id ? "relative z-[1] border-holo bg-holo/15 font-bold text-fg" : "border-holo/30 text-muted"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
