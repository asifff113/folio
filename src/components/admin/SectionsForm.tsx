"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { PICKABLE_LAYOUTS, type Section, type SectionLayout } from "@/config/site";
import { createSection, deleteSection, saveSectionList } from "@/app/admin/actions";
import { sectionHasContent } from "@/lib/sections";
import { moveItem, useDragReorder } from "./reorder";
import { SaveBar } from "./ui";

type Row = Section;

const LAYOUT_NAME: Record<SectionLayout, string> = {
  cards: "cards",
  timeline: "timeline",
  skills: "skills",
  gallery: "gallery",
  text: "text",
  links: "links",
  file: "file",
  form: "form",
};

/** Count shown in the list: how many items the section holds (and how many are hidden). */
function contentLabel(s: Section) {
  if (s.layout === "form") return "ready";
  if (!sectionHasContent(s)) return "empty";
  const hidden = s.items.filter((i) => !i.visible).length;
  const n = s.items.length - hidden;
  return `${n} item${n === 1 ? "" : "s"}${hidden ? ` · ${hidden} hidden` : ""}`;
}

export function SectionsForm({ sections }: { sections: Section[] }) {
  const [state, action] = useActionState(saveSectionList, null);
  const [rows, setRows] = useState<Row[]>(sections);
  const drag = useDragReorder(setRows);
  const [creating, setCreating] = useState(false);

  const update = (key: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const on = rows.filter((r) => r.enabled).length;
  const list = rows.map(({ key, title, enabled }) => ({ key, title, enabled }));

  return (
    <div className="flex flex-col gap-5">
      <form action={action} className="panel max-w-none">
        <input type="hidden" name="sections" value={JSON.stringify(list)} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="eyebrow m-0">
            {"// sections · "}
            {on} on
          </p>
          <button type="button" className="btn btn-solid" onClick={() => setCreating((c) => !c)} aria-expanded={creating}>
            + new section
          </button>
        </div>

        <ul className="mt-3 flex flex-col border border-holo/15">
          {rows.map((r, i) => {
            const label = contentLabel(r);
            return (
              <li
                key={r.key}
                {...drag.row(i)}
                className={`flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-holo/10 px-3 py-2.5 last:border-b-0 ${
                  drag.over === i ? "bg-holo/10" : r.enabled ? "bg-holo/[.03]" : ""
                }`}
              >
                <span
                  {...drag.handle(i)}
                  aria-hidden="true"
                  title="Drag to reorder"
                  className="cursor-grab px-1 font-mono text-[16px] text-[#7fa6b8] select-none"
                >
                  ⋮⋮
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={r.enabled}
                  aria-label={`Show ${r.title}`}
                  onClick={() => update(r.key, { enabled: !r.enabled })}
                  className={`min-h-9 w-[64px] flex-none cursor-pointer border font-mono text-[11px] font-bold tracking-[0.12em] ${
                    r.enabled ? "border-holo bg-holo/15 text-[#c9f7ff]" : "border-holo/25 text-muted"
                  }`}
                >
                  {r.enabled ? "ON" : "OFF"}
                </button>
                <input
                  aria-label={`${r.key} title`}
                  value={r.title}
                  maxLength={40}
                  onChange={(e) => update(r.key, { title: e.target.value })}
                  className="text-input min-w-0 flex-1 basis-44"
                />
                <span className="w-[76px] border border-holo/30 px-2 py-1 text-center font-mono text-[12px] text-[#c9f7ff]">
                  {LAYOUT_NAME[r.layout]}
                </span>
                <span
                  className={`w-[120px] font-mono text-[12px] ${label === "empty" ? "text-[#ffb23b]" : "text-[#b4dbe8]"}`}
                >
                  {label}
                  {r.custom && <span className="block text-muted">your own</span>}
                </span>
                <span className="flex gap-1">
                  <button
                    type="button"
                    className="ghost-btn"
                    aria-label={`Move ${r.title} up`}
                    disabled={i === 0}
                    onClick={() => setRows((rs) => moveItem(rs, i, i - 1))}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="ghost-btn"
                    aria-label={`Move ${r.title} down`}
                    disabled={i === rows.length - 1}
                    onClick={() => setRows((rs) => moveItem(rs, i, i + 1))}
                  >
                    ↓
                  </button>
                </span>
                <Link href={`/admin/sections/${r.key}`} className="btn no-underline">
                  edit
                </Link>
                {r.custom && <DeleteSectionButton sectionKey={r.key} title={r.title} />}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[13px] text-muted">
          Sections that are on and have content appear after &quot;Interests&quot;, in this order. Empty ones stay hidden.
          Save here after switching, renaming or reordering; open &quot;edit&quot; to fill a section in.
        </p>
        <SaveBar state={state} />
      </form>

      {creating && <NewSection />}
    </div>
  );
}

function DeleteSectionButton({ sectionKey, title }: { sectionKey: string; title: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="chip text-[#ff9be9] hover:border-pink"
      onClick={() => {
        if (window.confirm(`Delete "${title}" and everything in it? This can't be undone.`))
          start(() => deleteSection(sectionKey));
      }}
    >
      {pending ? "deleting..." : "delete"}
    </button>
  );
}

function NewSection() {
  const [state, action, pending] = useActionState(createSection, null);
  const [layout, setLayout] = useState<SectionLayout>("cards");
  return (
    <form action={action} className="panel max-w-none border-dashed" style={{ borderColor: "var(--pink)" }}>
      <input type="hidden" name="layout" value={layout} />
      <p className="eyebrow" style={{ color: "var(--pink)" }}>
        {"// new section · pick a layout"}
      </p>
      <div role="radiogroup" aria-label="Layout" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {PICKABLE_LAYOUTS.map((l) => (
          <button
            key={l.id}
            type="button"
            role="radio"
            aria-checked={layout === l.id}
            onClick={() => setLayout(l.id)}
            className={`flex min-h-[112px] cursor-pointer flex-col items-start gap-1.5 border p-3 text-left ${
              layout === l.id ? "border-pink bg-pink/10" : "border-holo/25 bg-[rgba(2,10,16,.5)] hover:border-holo/60"
            }`}
          >
            <span aria-hidden="true" className="font-mono text-[18px] text-holo">
              {l.icon}
            </span>
            <b className="text-[15px] font-semibold">{l.name}</b>
            <span className="text-[12px] leading-snug text-muted">{l.desc}</span>
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex min-w-[220px] flex-1 flex-col gap-1.5">
          <span className="field-label m-0">title</span>
          <input name="title" required maxLength={40} placeholder="e.g. Talks" className="text-input" />
        </label>
        <button type="submit" disabled={pending} className="btn btn-solid disabled:opacity-60">
          {pending ? "creating..." : "> create()"}
        </button>
      </div>
      {state && !state.ok && (
        <p role="alert" className="mt-3 font-mono text-[13px] text-pink">
          {state.message}
        </p>
      )}
    </form>
  );
}
