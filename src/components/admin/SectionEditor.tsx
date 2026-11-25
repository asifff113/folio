"use client";

import Link from "next/link";
import { useActionState, useId, useState, useTransition } from "react";
import { PICKABLE_LAYOUTS, type Section, type SectionItem, type SectionLayout } from "@/config/site";
import { saveSection, uploadFile } from "@/app/admin/actions";
import { ImageUpload } from "./ImageUpload";
import { moveItem, useDragReorder } from "./reorder";
import { SaveBar } from "./ui";

type FieldKey = "image" | "title" | "subtitle" | "date" | "body" | "details" | "tags" | "link1" | "link2" | "level" | "pdf";
type Field = { key: FieldKey; label: string; placeholder?: string; hint?: string };

/** Which fields each layout uses, with labels in that layout's words. */
const FIELDS: Record<SectionLayout, Field[]> = {
  cards: [
    { key: "image", label: "image" },
    { key: "title", label: "title" },
    { key: "date", label: "date or year", placeholder: "2026" },
    { key: "subtitle", label: "second line (optional)", placeholder: "e.g. where, or who for" },
    { key: "body", label: "short text (on the card)" },
    { key: "details", label: "more details (opens with “details”, optional)", hint: "Leave a blank line between paragraphs." },
    { key: "tags", label: "tags", placeholder: "nextjs, three.js", hint: "Comma separated, up to 8." },
    { key: "link1", label: "link 1" },
    { key: "link2", label: "link 2" },
  ],
  timeline: [
    { key: "date", label: "when", placeholder: "2024 — now", hint: "Write “now” or “present” to highlight the current one." },
    { key: "title", label: "role or what", placeholder: "Frontend developer" },
    { key: "subtitle", label: "place", placeholder: "Company or school" },
    { key: "body", label: "what you did (optional)" },
  ],
  skills: [
    { key: "title", label: "skill", placeholder: "TypeScript" },
    { key: "subtitle", label: "group (optional)", placeholder: "frontend", hint: "Skills with the same group are shown together." },
    { key: "level", label: "level (optional)" },
  ],
  gallery: [
    { key: "image", label: "photo" },
    { key: "title", label: "caption (optional)" },
    { key: "body", label: "description (optional)" },
  ],
  text: [
    { key: "title", label: "heading (optional)" },
    { key: "details", label: "text", hint: "Leave a blank line between paragraphs." },
  ],
  links: [
    { key: "title", label: "title" },
    { key: "subtitle", label: "description (optional)" },
    { key: "link1", label: "link" },
  ],
  file: [
    { key: "pdf", label: "resume (PDF)" },
    { key: "title", label: "button label", placeholder: "view resume" },
    { key: "body", label: "note above the button (optional)" },
  ],
  form: [],
};

/** What one entry is called in each layout. */
const NOUN: Record<SectionLayout, string> = {
  cards: "item",
  timeline: "entry",
  skills: "skill",
  gallery: "photo",
  text: "block",
  links: "link",
  file: "file",
  form: "item",
};

const LIMITS: Partial<Record<FieldKey, number>> = { title: 120, subtitle: 120, date: 40, body: 600, details: 4000 };

const blankItem = (): SectionItem => ({
  id: crypto.randomUUID(),
  title: "",
  subtitle: "",
  date: "",
  body: "",
  details: "",
  image: "",
  tags: [],
  link1Label: "",
  link1Url: "",
  link2Label: "",
  link2Url: "",
  level: 0,
  visible: true,
});

const itemName = (it: SectionItem, n: number, noun: string) => it.title || it.date || `${noun} ${n}`;

export function SectionEditor({ section }: { section: Section }) {
  const [state, action] = useActionState(saveSection, null);
  const [title, setTitle] = useState(section.title);
  const [intro, setIntro] = useState(section.intro);
  const [layout, setLayout] = useState<SectionLayout>(section.layout);
  const [enabled, setEnabled] = useState(section.enabled);
  const [items, setItems] = useState<SectionItem[]>(section.items);
  const [selected, setSelected] = useState<string | null>(section.items[0]?.id ?? null);
  const drag = useDragReorder(setItems);

  const fixed = section.layout === "file" || section.layout === "form";
  const noun = NOUN[layout];
  const current = items.find((i) => i.id === selected) ?? null;
  const single = layout === "file";

  const patch = (id: string, change: Partial<SectionItem>) =>
    setItems((list) => list.map((it) => (it.id === id ? { ...it, ...change } : it)));
  const add = () => {
    const item = blankItem();
    setItems((list) => [...list, item]);
    setSelected(item.id);
  };
  const remove = (id: string) => {
    const index = items.findIndex((i) => i.id === id);
    const rest = items.filter((i) => i.id !== id);
    setItems(rest);
    setSelected(rest[Math.min(index, rest.length - 1)]?.id ?? null);
  };

  const payload = { key: section.key, title, intro, layout, enabled, items };

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="section" value={JSON.stringify(payload)} />

      <Link href="/admin/sections" className="self-start font-mono text-[13px]">
        ← all sections
      </Link>

      <div className="panel max-w-none">
        <p className="eyebrow">{`// ${section.key} · settings`}</p>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_170px_110px] md:items-end">
          <label className="flex flex-col gap-1.5">
            <span className="field-label m-0">title</span>
            <input value={title} maxLength={40} required onChange={(e) => setTitle(e.target.value)} className="text-input" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="field-label m-0">intro line (optional)</span>
            <input
              value={intro}
              maxLength={240}
              placeholder="one line under the title"
              onChange={(e) => setIntro(e.target.value)}
              className="text-input"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="field-label m-0">layout</span>
            {fixed ? (
              <span className="text-input flex items-center text-muted">{layout === "file" ? "file (PDF)" : "contact form"}</span>
            ) : (
              <select
                value={layout}
                onChange={(e) => setLayout(e.target.value as SectionLayout)}
                className="text-input cursor-pointer"
              >
                {PICKABLE_LAYOUTS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name.toLowerCase()}
                  </option>
                ))}
              </select>
            )}
          </label>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="Show this section"
            onClick={() => setEnabled(!enabled)}
            className={`min-h-11 cursor-pointer border font-mono text-[12px] font-bold tracking-[0.12em] ${
              enabled ? "border-holo bg-holo/15 text-[#c9f7ff]" : "border-holo/25 text-muted"
            }`}
          >
            {enabled ? "ON" : "OFF"}
          </button>
        </div>
        {layout === "form" && (
          <p className="panel-text mt-4">
            Visitors see a contact form here (name, how to reach them, message). Messages go to your inbox; nothing is
            shown on the site.
          </p>
        )}
      </div>

      {layout !== "form" && (
        <div className="grid items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="flex flex-col gap-2">
            {items.length === 0 ? (
              <p className="border border-dashed border-holo/25 px-4 py-6 text-center text-[15px] text-muted">
                Nothing here yet.
              </p>
            ) : (
              <ul aria-label="Items" className="flex flex-col gap-2">
                {items.map((it, i) => {
                  const active = it.id === selected;
                  return (
                    <li
                      key={it.id}
                      {...drag.row(i)}
                      className={`flex items-center gap-2 border px-2 py-2 ${
                        active ? "border-holo bg-holo/[.08]" : "border-holo/15 bg-[rgba(2,10,16,.5)]"
                      } ${drag.over === i ? "outline outline-1 outline-holo" : ""} ${it.visible ? "" : "opacity-55"}`}
                    >
                      <span
                        {...drag.handle(i)}
                        aria-hidden="true"
                        title="Drag to reorder"
                        className="cursor-grab px-1 font-mono text-[15px] text-[#7fa6b8] select-none"
                      >
                        ⋮⋮
                      </span>
                      {it.image ? (
                        // eslint-disable-next-line @next/next/no-img-element -- uploaded image preview
                        <img src={it.image} alt="" className="h-9 w-12 flex-none object-cover" />
                      ) : null}
                      <button
                        type="button"
                        aria-current={active ? "true" : undefined}
                        onClick={() => setSelected(it.id)}
                        className="flex min-w-0 flex-1 cursor-pointer flex-col items-start text-left"
                      >
                        <span className="w-full truncate text-[15px] font-semibold">{itemName(it, i + 1, noun)}</span>
                        <span className="font-mono text-[11px] text-muted">{it.visible ? "visible" : "hidden"}</span>
                      </button>
                      <span className="flex flex-col">
                        <button
                          type="button"
                          className="px-1.5 text-[13px] text-muted hover:text-fg disabled:opacity-30"
                          aria-label={`Move ${itemName(it, i + 1, noun)} up`}
                          disabled={i === 0}
                          onClick={() => setItems((list) => moveItem(list, i, i - 1))}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="px-1.5 text-[13px] text-muted hover:text-fg disabled:opacity-30"
                          aria-label={`Move ${itemName(it, i + 1, noun)} down`}
                          disabled={i === items.length - 1}
                          onClick={() => setItems((list) => moveItem(list, i, i + 1))}
                        >
                          ↓
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            {!(single && items.length > 0) && (
              <button type="button" onClick={add} className="min-h-11 cursor-pointer border border-dashed border-holo/45 font-mono text-[14px] text-[#c9f7ff] hover:border-holo">
                + add {noun}
              </button>
            )}
          </div>

          {current ? (
            <ItemForm
              key={current.id}
              item={current}
              fields={FIELDS[layout]}
              noun={noun}
              onChange={(change) => patch(current.id, change)}
              onRemove={() => remove(current.id)}
            />
          ) : (
            <p className="border border-holo/15 px-5 py-10 text-center text-[15px] text-muted">
              Add a {noun} to start, then save.
            </p>
          )}
        </div>
      )}

      <div className="panel max-w-none py-4">
        <SaveBar state={state} />
      </div>
    </form>
  );
}

function ItemForm({
  item,
  fields,
  noun,
  onChange,
  onRemove,
}: {
  item: SectionItem;
  fields: Field[];
  noun: string;
  onChange: (change: Partial<SectionItem>) => void;
  onRemove: () => void;
}) {
  const id = useId();
  const [tags, setTags] = useState(item.tags.join(", "));

  const text = (f: Field, key: "title" | "subtitle" | "date" | "body" | "details") => {
    const long = key === "body" || key === "details";
    const props = {
      id: `${id}-${key}`,
      value: item[key],
      maxLength: LIMITS[key],
      placeholder: f.placeholder,
      className: long ? "text-input resize-y leading-relaxed" : "text-input",
    };
    return long ? (
      <textarea {...props} rows={key === "details" ? 6 : 3} onChange={(e) => onChange({ [key]: e.target.value })} />
    ) : (
      <input {...props} onChange={(e) => onChange({ [key]: e.target.value })} />
    );
  };

  return (
    <section aria-label={`Edit ${noun}`} className="flex flex-col gap-4 border border-holo bg-holo/[.03] p-5">
      {fields.map((f) => (
        <div key={f.key} className="flex flex-col gap-1.5">
          {f.key === "link1" || f.key === "link2" ? (
            <LinkFields field={f} item={item} onChange={onChange} />
          ) : (
            <>
              <label htmlFor={`${id}-${f.key}`} className="field-label m-0">
                {f.label}
              </label>
              {f.key === "image" && (
                <ImageUpload folder="section" label={f.label} value={item.image} onChange={(url) => onChange({ image: url })} />
              )}
              {f.key === "pdf" && <PdfUpload value={item.link1Url} onChange={(url) => onChange({ link1Url: url })} />}
              {(f.key === "title" || f.key === "subtitle" || f.key === "date" || f.key === "body" || f.key === "details") &&
                text(f, f.key)}
              {f.key === "tags" && (
                <input
                  id={`${id}-tags`}
                  value={tags}
                  placeholder={f.placeholder}
                  className="text-input"
                  onChange={(e) => {
                    setTags(e.target.value);
                    onChange({
                      tags: e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean)
                        .slice(0, 8),
                    });
                  }}
                />
              )}
              {f.key === "level" && (
                <div role="radiogroup" aria-label="Level" className="flex flex-wrap gap-1.5">
                  {[0, 1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={item.level === n}
                      onClick={() => onChange({ level: n })}
                      className="chip min-w-11 justify-center"
                    >
                      {n === 0 ? "none" : n}
                    </button>
                  ))}
                </div>
              )}
              {f.hint && <span className="text-[12px] text-muted">{f.hint}</span>}
            </>
          )}
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-holo/15 pt-4">
        <label className="flex cursor-pointer items-center gap-2.5 text-[15px]">
          <input
            type="checkbox"
            checked={item.visible}
            onChange={(e) => onChange({ visible: e.target.checked })}
            className="size-[18px] accent-[var(--holo)]"
          />
          Visible on the site
        </label>
        <button type="button" className="chip text-[#ff9be9] hover:border-pink" onClick={onRemove}>
          remove {noun}
        </button>
      </div>
    </section>
  );
}

function LinkFields({
  field,
  item,
  onChange,
}: {
  field: Field;
  item: SectionItem;
  onChange: (change: Partial<SectionItem>) => void;
}) {
  const id = useId();
  const second = field.key === "link2";
  const label = second ? item.link2Label : item.link1Label;
  const url = second ? item.link2Url : item.link1Url;
  const withLabel = field.label !== "link";
  return (
    <div className={`grid gap-3 ${withLabel ? "sm:grid-cols-[150px_minmax(0,1fr)]" : ""}`}>
      {withLabel && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-label`} className="field-label m-0">
            {field.label} · button text
          </label>
          <input
            id={`${id}-label`}
            value={label}
            maxLength={24}
            placeholder={second ? "code" : "live"}
            className="text-input"
            onChange={(e) => onChange(second ? { link2Label: e.target.value } : { link1Label: e.target.value })}
          />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-url`} className="field-label m-0">
          {withLabel ? `${field.label} · address` : field.label}
        </label>
        <input
          id={`${id}-url`}
          type="url"
          value={url}
          maxLength={300}
          placeholder="https://"
          className="text-input"
          onChange={(e) => onChange(second ? { link2Url: e.target.value } : { link1Url: e.target.value })}
        />
      </div>
    </div>
  );
}

/** Uploads the resume PDF right away; saving the section stores its address. */
function PdfUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const id = useId();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {value ? (
          <a href={value} target="_blank" rel="noopener noreferrer" className="font-mono text-[13px]">
            current PDF ↗
          </a>
        ) : (
          <span className="font-mono text-[13px] text-muted">no PDF yet</span>
        )}
        <label htmlFor={id} className={`btn cursor-pointer ${pending ? "opacity-60" : ""}`}>
          {pending ? "uploading..." : value ? "replace PDF" : "upload PDF"}
        </label>
        <input
          id={id}
          type="file"
          accept="application/pdf"
          aria-label="Resume PDF"
          className="sr-only"
          disabled={pending}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setError("");
            const data = new FormData();
            data.set("file", file);
            start(async () => {
              const result = await uploadFile(data);
              if (result.ok) onChange(result.url);
              else setError(result.message);
            });
          }}
        />
        {value && (
          <button type="button" className="ghost-btn" onClick={() => onChange("")}>
            remove
          </button>
        )}
      </div>
      <p className={`font-mono text-[12px] ${error ? "text-pink" : "text-muted"}`} role={error ? "alert" : undefined}>
        {error || "PDF, up to 5 MB. Save the section to apply it."}
      </p>
    </div>
  );
}
