"use client";

import { useActionState, useState } from "react";
import type { Platform, QrMode } from "@/config/site";
import { savePlatforms } from "@/app/admin/actions";
import { ImageUpload } from "./ImageUpload";
import { SaveBar } from "./ui";

const QR_OPTIONS: { id: QrMode; label: string }[] = [
  { id: "none", label: "no QR" },
  { id: "generated", label: "make from link" },
  { id: "image", label: "upload my own" },
];

type Row = Platform & { key: string };

const slug = (label: string) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "link";

export function LinksForm({ platforms }: { platforms: Platform[] }) {
  const [state, action] = useActionState(savePlatforms, null);
  const [rows, setRows] = useState<Row[]>(() =>
    platforms.map((p) => ({ ...p, key: p.id })),
  );
  const [newLabel, setNewLabel] = useState("");
  const [details, setDetails] = useState<string | null>(null);

  const update = (key: string, patch: Partial<Platform>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const move = (index: number, by: number) =>
    setRows((rs) => {
      const next = [...rs];
      const [item] = next.splice(index, 1);
      next.splice(Math.max(0, Math.min(next.length, index + by)), 0, item);
      return next;
    });
  const add = () => {
    const label = newLabel.trim();
    if (!label) return;
    let id = slug(label);
    const taken = new Set(rows.map((r) => r.id));
    for (let n = 2; taken.has(id); n++) id = `${slug(label).slice(0, 28)}-${n}`;
    setRows((rs) => [
      ...rs,
      {
        id,
        key: id,
        label,
        url: "",
        color: "#2fe3ff",
        visible: true,
        handle: "",
        note: "",
        qr: "none",
        qrImage: "",
      },
    ]);
    setDetails(id);
    setNewLabel("");
  };

  const payload = JSON.stringify(
    rows.map(
      ({ id, label, url, color, visible, handle, note, qr, qrImage }) => ({
        id,
        label,
        url,
        color,
        visible,
        handle,
        note,
        qr,
        qrImage,
      }),
    ),
  );

  return (
    <form action={action} className="panel max-w-none">
      <input type="hidden" name="platforms" value={payload} />
      <p className="eyebrow">{"// 04 signal"}</p>

      <ul className="space-y-2.5">
        {rows.map((r, i) => (
          <li
            key={r.key}
            className="border border-holo/15 bg-[rgba(2,10,16,.5)] p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="color"
                aria-label={`${r.label} color`}
                value={r.color}
                onChange={(e) => update(r.key, { color: e.target.value })}
                className="h-8 w-9 cursor-pointer border border-holo-dim bg-transparent p-0.5"
              />
              <input
                aria-label="Name"
                value={r.label}
                maxLength={32}
                onChange={(e) => update(r.key, { label: e.target.value })}
                className="text-input w-32 flex-none"
              />
              <input
                aria-label={`${r.label} link`}
                value={r.url}
                maxLength={300}
                placeholder="https://..."
                onChange={(e) => update(r.key, { url: e.target.value })}
                className="text-input min-w-0 flex-1 basis-56"
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted">
              <label className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={r.visible}
                  onChange={(e) => update(r.key, { visible: e.target.checked })}
                  className="accent-[var(--holo)]"
                />
                visible
              </label>
              <button
                type="button"
                className="ghost-btn"
                aria-expanded={details === r.key}
                onClick={() => setDetails(details === r.key ? null : r.key)}
              >
                {details === r.key ? "hide visitor card" : "visitor card · QR"}
              </button>
              <span className="flex-1" />
              <button
                type="button"
                className="ghost-btn"
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                ↑ up
              </button>
              <button
                type="button"
                className="ghost-btn"
                disabled={i === rows.length - 1}
                onClick={() => move(i, 1)}
              >
                ↓ down
              </button>
              <button
                type="button"
                className="ghost-btn hover:border-pink hover:text-pink"
                onClick={() =>
                  setRows((rs) => rs.filter((x) => x.key !== r.key))
                }
              >
                remove
              </button>
            </div>

            {details === r.key && (
              <div className="mt-3 border-t border-holo/15 pt-1">
                <p className="mt-2 font-mono text-[12px] text-muted">
                  What a visitor sees after clicking {r.label} in &quot;Connect
                  with me&quot;.
                </p>
                <div className="grid gap-x-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="field-label">username / handle</span>
                    <input
                      className="text-input"
                      maxLength={60}
                      value={r.handle}
                      placeholder="@yourname"
                      onChange={(e) =>
                        update(r.key, { handle: e.target.value })
                      }
                    />
                  </label>
                  <label className="block">
                    <span className="field-label">note</span>
                    <input
                      className="text-input"
                      maxLength={200}
                      value={r.note}
                      placeholder="DM me and say you came from the site"
                      onChange={(e) => update(r.key, { note: e.target.value })}
                    />
                  </label>
                </div>
                <span className="field-label" id={`qr-${r.key}`}>
                  qr code
                </span>
                <div
                  role="radiogroup"
                  aria-labelledby={`qr-${r.key}`}
                  className="flex flex-wrap gap-1.5"
                >
                  {QR_OPTIONS.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      role="radio"
                      aria-checked={r.qr === o.id}
                      className="chip"
                      onClick={() => update(r.key, { qr: o.id })}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                {r.qr === "generated" && (
                  <p className="mt-2 font-mono text-[12px] text-muted">
                    {r.url
                      ? "A QR code for the link above is made automatically."
                      : "Add a link above first."}
                  </p>
                )}
                {r.qr === "image" && (
                  <div className="mt-3">
                    <ImageUpload
                      folder="qr"
                      label={`Upload ${r.label} QR code`}
                      value={r.qrImage}
                      onChange={(url) => update(r.key, { qrImage: url })}
                    />
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          aria-label="New link name"
          value={newLabel}
          maxLength={32}
          placeholder="add a platform, e.g. YouTube"
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className="text-input min-w-0 flex-1"
        />
        <button type="button" className="chip" onClick={add}>
          + add
        </button>
      </div>
      <p className="mt-2 font-mono text-[11px] text-muted">
        Visitors only see links that have a URL or a username. Hidden links stay
        saved but are not shown.
      </p>

      <SaveBar state={state} />
    </form>
  );
}
