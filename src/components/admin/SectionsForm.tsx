"use client";

import { useActionState, useState } from "react";
import type { Section } from "@/config/site";
import { saveSections } from "@/app/admin/actions";
import { SaveBar } from "./ui";

export function SectionsForm({ sections }: { sections: Section[] }) {
  const [state, action] = useActionState(saveSections, null);
  const [rows, setRows] = useState(sections);

  const update = (key: string, patch: Partial<Section>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const move = (index: number, by: number) =>
    setRows((rs) => {
      const next = [...rs];
      const [item] = next.splice(index, 1);
      next.splice(Math.max(0, Math.min(next.length, index + by)), 0, item);
      return next;
    });

  const enabled = rows.filter((r) => r.enabled).length;

  return (
    <form action={action} className="panel max-w-none">
      <input type="hidden" name="sections" value={JSON.stringify(rows)} />
      <p className="eyebrow">
        {"// optional chapters · "}
        {enabled} online
      </p>

      <ul className="divide-y divide-holo/10">
        {rows.map((r, i) => (
          <li key={r.key} className="flex flex-wrap items-center gap-2 py-2">
            <button
              type="button"
              role="switch"
              aria-checked={r.enabled}
              aria-label={`Show ${r.title}`}
              onClick={() => update(r.key, { enabled: !r.enabled })}
              className={`w-[76px] flex-none cursor-pointer border px-2 py-1 font-mono text-[10px] tracking-widest ${
                r.enabled ? "border-holo bg-holo/15 text-holo" : "border-holo-dim text-[#ff7ad9]"
              }`}
            >
              {r.enabled ? "ONLINE" : "OFFLINE"}
            </button>
            <input
              aria-label={`${r.key} title`}
              value={r.title}
              maxLength={40}
              onChange={(e) => update(r.key, { title: e.target.value })}
              className="text-input min-w-0 flex-1 basis-40 py-1.5"
            />
            <span className="w-24 font-mono text-[10px] text-muted">{r.key}</span>
            <button type="button" className="ghost-btn" disabled={i === 0} onClick={() => move(i, -1)}>
              ↑
            </button>
            <button type="button" className="ghost-btn" disabled={i === rows.length - 1} onClick={() => move(i, 1)}>
              ↓
            </button>
          </li>
        ))}
      </ul>

      <SaveBar state={state} />
    </form>
  );
}
