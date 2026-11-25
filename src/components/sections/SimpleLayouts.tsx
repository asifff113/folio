import type { SectionItem } from "@/config/site";
import { paragraphs } from "@/lib/text";

/** "now", "present" or "current" in the date marks the entry that is still going. */
const isCurrent = (date: string) => /\b(now|present|current)\b/i.test(date);

export function TimelineLayout({ items }: { items: SectionItem[] }) {
  return (
    <ol className="mt-4 flex flex-col">
      {items.map((it, i) => {
        const now = isCurrent(it.date);
        return (
          <li key={it.id} className="grid grid-cols-[18px_minmax(0,1fr)] gap-x-4 sm:grid-cols-[150px_18px_minmax(0,1fr)]">
            <span
              className={`col-span-2 pl-[34px] font-mono text-[14px] sm:col-span-1 sm:pt-[3px] sm:pl-0 ${
                now ? "text-[#5dffb0]" : "text-[#9fc3d3]"
              }`}
            >
              {it.date}
            </span>
            <span aria-hidden="true" className="relative flex justify-center">
              <i
                className={`relative z-[1] mt-[6px] size-3 rounded-full border-2 ${
                  now ? "border-[#5dffb0] bg-[#5dffb0] shadow-[0_0_10px_#5dffb0]" : "border-holo shadow-[0_0_10px_var(--holo)]"
                }`}
              />
              {i < items.length - 1 && <i className="absolute top-[18px] bottom-0 w-px bg-holo/30" />}
            </span>
            <div className="flex flex-col gap-1.5 pb-6">
              <h3 className="text-[20px] leading-snug font-semibold text-fg">
                {it.title}
                {it.subtitle && <span className="font-medium text-[#9fc3d3]"> · {it.subtitle}</span>}
              </h3>
              {it.body && <p className="text-[16px] leading-relaxed text-[#b9d6e2]">{it.body}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Skills grouped by their group name, each with an optional 1–5 level. */
export function SkillsLayout({ items }: { items: SectionItem[] }) {
  const groups = new Map<string, SectionItem[]>();
  for (const it of items) {
    const g = it.subtitle || "";
    groups.set(g, [...(groups.get(g) ?? []), it]);
  }
  return (
    <div className="mt-3 flex flex-col gap-5">
      {[...groups.entries()].map(([group, list]) => (
        <div key={group || "_"}>
          {group && <h3 className="mb-2.5 font-mono text-[13px] tracking-[0.14em] text-holo uppercase">{group}</h3>}
          <ul className="flex flex-wrap gap-2.5">
            {list.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 border border-holo/35 bg-holo/[.07] px-3.5 py-2 font-mono text-[15px] text-[#d6f6ff]"
              >
                {s.title}
                {s.level > 0 && (
                  <span className="flex gap-[3px]" role="img" aria-label={`level ${s.level} of 5`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <i key={n} className={`h-2.5 w-[5px] ${n <= s.level ? "bg-holo shadow-[0_0_6px_var(--holo)]" : "bg-holo/20"}`} />
                    ))}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function TextLayout({ items }: { items: SectionItem[] }) {
  return (
    <div className="mt-2 flex flex-col gap-5">
      {items.map((it) => (
        <div key={it.id} className="flex flex-col gap-3">
          {it.title && <h3 className="text-[20px] font-semibold text-fg">{it.title}</h3>}
          {paragraphs(it.details).map((p, i) => (
            <p key={i} className="panel-text">
              {p}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}

export function LinksLayout({ items }: { items: SectionItem[] }) {
  return (
    <ul className="mt-3 flex flex-col">
      {items
        .filter((it) => it.link1Url)
        .map((it) => (
          <li key={it.id} className="border-b border-holo/10 last:border-b-0">
            <a
              href={it.link1Url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 px-1 py-3.5 no-underline hover:bg-holo/[.05]"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[17px] font-semibold text-fg">{it.title || it.link1Url}</span>
                {it.subtitle && <span className="text-[14px] text-[#9fc3d3]">{it.subtitle}</span>}
              </span>
              <span className="font-mono text-[14px] text-holo">open ↗</span>
            </a>
          </li>
        ))}
    </ul>
  );
}

/** The resume: one file with a download button. */
export function FileLayout({ items }: { items: SectionItem[] }) {
  const file = items.find((it) => it.link1Url);
  if (!file) return null;
  return (
    <div className="mt-4 flex flex-col items-start gap-4">
      {file.body && <p className="panel-text">{file.body}</p>}
      <div className="flex flex-wrap gap-3">
        <a href={file.link1Url} target="_blank" rel="noopener noreferrer" className="btn btn-solid no-underline">
          {file.title || "view resume"} ↗
        </a>
        {/* Storage sends the file as a download, under this name, when asked with ?download=<name> */}
        <a href={`${file.link1Url}?download=resume.pdf`} className="btn no-underline">
          download PDF
        </a>
      </div>
    </div>
  );
}
