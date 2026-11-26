"use client";

import { NAV_LABEL_MAX, NAV_LINKS_MAX, type NavSettings } from "@/config/customize";
import { type ChapterKey, journeyChapters } from "@/lib/journey/store";
import type { MovableChapter } from "@/config/customize";
import { Check, Group } from "./controls";

/** What is on the page right now, so the nav list matches it. */
export type NavChapterInfo = {
  help: boolean;
  traces: boolean;
  /** Section keys shown on the page, in their order. */
  sections: string[];
  /** The usual nav name of every chapter that can be on the page. */
  names: Record<string, string>;
};

const NOTES: Partial<Record<ChapterKey, string>> = {
  BOOT: "start: your name and photo",
  END: "the goodbye box",
  SIGNAL: "connect: your links",
};

/** The top nav bar box on the journey page. Every chapter on the page is listed, ticked unless you hid it. */
export function NavGroup({
  nav,
  order,
  info,
  onChange,
}: {
  nav: NavSettings;
  order: MovableChapter[];
  info: NavChapterInfo;
  onChange: (nav: NavSettings) => void;
}) {
  const chapters = journeyChapters({ help: info.help, traces: info.traces, sections: info.sections, order });
  const set = <K extends keyof NavSettings>(key: K, value: NavSettings[K]) => onChange({ ...nav, [key]: value });
  const show = (key: string, on: boolean) =>
    set("hidden", on ? nav.hidden.filter((k) => k !== key) : [...nav.hidden, key]);
  const rename = (key: string, label: string) => {
    const labels = { ...nav.labels };
    if (label) labels[key] = label;
    else delete labels[key];
    set("labels", labels);
  };
  const setLink = (i: number, patch: Partial<NavSettings["links"][number]>) =>
    set(
      "links",
      nav.links.map((l, k) => (k === i ? { ...l, ...patch } : l)),
    );

  return (
    <Group title="top navigation">
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <Check
          label="Show the nav bar"
          hint="Off = the site works like it did before."
          checked={nav.enabled}
          onChange={(v) => set("enabled", v)}
        />
        <Check
          label="Hide it while scrolling down"
          hint="It comes back when you scroll up."
          checked={nav.autoHide}
          onChange={(v) => set("autoHide", v)}
        />
      </div>

      {nav.enabled && (
        <>
          <div className="flex flex-col gap-1.5">
            <div className="grid grid-cols-[52px_minmax(0,1fr)_minmax(0,1fr)] gap-3 px-3 font-mono text-[12px] tracking-[0.12em] text-muted">
              <span>IN NAV</span>
              <span>CHAPTER</span>
              <span>NAME IN THE NAV</span>
            </div>
            <ul className="flex flex-col gap-1.5">
              {chapters.map((key) => {
                const shown = !nav.hidden.includes(key);
                const name = info.names[key] ?? key;
                return (
                  <li
                    key={key}
                    className={`grid grid-cols-[52px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 border px-3 py-2 ${
                      shown ? "border-holo/15 bg-[rgba(2,10,16,.5)]" : "border-holo/10 opacity-60"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={shown}
                      onChange={(e) => show(key, e.target.checked)}
                      aria-label={`Show ${name} in the nav`}
                      className="ml-1 size-5 accent-[var(--holo)]"
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-mono text-[14px] text-fg">{name}</span>
                      <span className="truncate text-[12px] text-muted">
                        {key.startsWith("S:") ? "section" : (NOTES[key] ?? "chapter")}
                      </span>
                    </span>
                    <input
                      value={nav.labels[key] ?? ""}
                      placeholder={name}
                      maxLength={NAV_LABEL_MAX}
                      onChange={(e) => rename(key, e.target.value)}
                      aria-label={`Name for ${name} in the nav`}
                      className="text-input"
                    />
                  </li>
                );
              })}
            </ul>
            <p className="text-[13px] text-muted">
              Every chapter and section on your page is listed here, ticked, so all of them are in the nav. A section you
              switch on later joins it by itself. The order follows the chapter order. Unticking only hides the link: the
              chapter stays on the page. Leave a name empty to use the usual one.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 border-t border-holo/12 pt-3.5">
            <span className="field-label m-0">extra links (optional, up to {NAV_LINKS_MAX})</span>
            {nav.links.map((link, i) => (
              <div key={i} className="grid grid-cols-[minmax(0,.7fr)_minmax(0,1.5fr)_auto] items-center gap-2.5">
                <input
                  value={link.label}
                  placeholder="Resume"
                  maxLength={NAV_LABEL_MAX}
                  onChange={(e) => setLink(i, { label: e.target.value })}
                  aria-label={`Extra link ${i + 1}: name`}
                  className="text-input"
                />
                <input
                  value={link.url}
                  placeholder="https://…"
                  maxLength={300}
                  inputMode="url"
                  onChange={(e) => setLink(i, { url: e.target.value })}
                  aria-label={`Extra link ${i + 1}: address`}
                  className="text-input font-mono"
                />
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => set("links", nav.links.filter((_, k) => k !== i))}
                >
                  remove
                </button>
              </div>
            ))}
            {nav.links.length < NAV_LINKS_MAX && (
              <button
                type="button"
                className="ghost-btn self-start"
                onClick={() => set("links", [...nav.links, { label: "", url: "" }])}
              >
                + add a link
              </button>
            )}
            <p className="text-[13px] text-muted">
              For your resume, a blog or any other site. Addresses start with https:// (or mailto: for email). They open in
              a new tab.
            </p>
          </div>
        </>
      )}
    </Group>
  );
}
