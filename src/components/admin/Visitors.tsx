import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeVisitors } from "@/config/customize";
import type { SiteConfig } from "@/config/site";
import { navDefaultLabel, siteChapters } from "@/lib/journey/nav";
import { type Bar, ResetVisits, VisitorSettingsForm, VisitorsChart } from "./VisitorsClient";

type Stats = {
  visitors: number;
  visits: number;
  phone: number;
  ended: number;
  live: number;
  series: [string, number][];
  sources: [string, number][];
  countries: [string, number][];
  reached: Record<string, number>;
};

const RANGES = [
  { id: "7", label: "7 days", days: 7, title: "LAST 7 DAYS" },
  { id: "30", label: "30 days", days: 30, title: "LAST 30 DAYS" },
  { id: "all", label: "all time", days: 0, title: "BY MONTH" },
] as const;

const SOURCE_NAMES: Record<string, string> = {
  direct: "Direct link",
  linkedin: "LinkedIn",
  github: "GitHub",
  google: "Google",
  x: "X (Twitter)",
  facebook: "Facebook",
  instagram: "Instagram",
  reddit: "Reddit",
  youtube: "YouTube",
  bing: "Bing",
  duckduckgo: "DuckDuckGo",
  discord: "Discord",
  telegram: "Telegram",
};

const pct = (n: number, of: number) => (of > 0 ? Math.round((n / of) * 100) : 0);
const fmt = (n: number) => n.toLocaleString("en-US");

function dayLabel(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}
function monthLabel(ym: string) {
  return new Date(`${ym}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
}

type Row = { name: string; value: string; width: number };

function ListBox({ title, note, rows, empty }: { title: string; note: string; rows: Row[]; empty: string }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3 border border-holo/20 bg-[rgba(4,14,22,.72)] px-5 py-4">
      <div>
        <h2 className="font-mono text-[13px] font-bold tracking-[0.14em] text-holo">&gt; {title.toUpperCase()}</h2>
        <p className="mt-1 text-[13px] text-muted">{note}</p>
      </div>
      {rows.length === 0 ? (
        <p className="font-mono text-[13px] text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {rows.map((r) => (
            <li key={r.name} className="flex flex-col gap-1.5">
              <span className="flex justify-between gap-3 text-[14px]">
                <span className="truncate text-fg">{r.name}</span>
                <span className="font-mono whitespace-nowrap text-[#c6dde8]">{r.value}</span>
              </span>
              <span aria-hidden="true" className="block h-2 rounded-r bg-holo/10">
                <i className="block h-2 rounded-r bg-holo" style={{ width: `${r.width}%` }} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Admin › Visitors: who came, from where, how far they scrolled, and the public counter. */
export async function VisitorsView({
  db,
  site,
  params,
}: {
  db: SupabaseClient;
  site: SiteConfig;
  params: Promise<{ range?: string }>;
}) {
  const { range: rangeParam } = await params;
  const range = RANGES.find((r) => r.id === rangeParam) ?? RANGES[1];

  const [stats, allTime, profile] = await Promise.all([
    db.rpc("visitor_stats", { p_days: range.days }),
    range.days === 0 ? null : db.rpc("visitor_stats", { p_days: 0 }),
    db.from("profile").select("visitors").eq("id", 1).maybeSingle<{ visitors: unknown }>(),
  ]);
  const error = stats.error ?? allTime?.error ?? profile.error;
  if (error || !stats.data) {
    return (
      <div className="panel max-w-none">
        <p className="eyebrow">{"// read error"}</p>
        <p className="panel-text">
          Could not load the visitor numbers: {error?.message ?? "no answer"}. Check that{" "}
          <code className="text-fg">supabase/phase9_visitors.sql</code> was run.
        </p>
      </div>
    );
  }

  const s = stats.data as Stats;
  const all = (allTime?.data ?? stats.data) as Stats;
  const settings = normalizeVisitors(profile.data?.visitors);
  const regions = new Intl.DisplayNames(["en"], { type: "region" });

  const bars: Bar[] = s.series.map(([at, n]) => ({
    label: range.days === 0 ? monthLabel(at) : dayLabel(at),
    value: Number(n),
  }));

  const topSource = s.sources[0]?.[1] ?? 1;
  const sources: Row[] = s.sources.map(([key, n]) => ({
    name: SOURCE_NAMES[key] ?? key,
    value: `${pct(n, s.visits)}% · ${fmt(n)}`,
    width: pct(n, topSource),
  }));
  const topCountry = s.countries[0]?.[1] ?? 1;
  const countries: Row[] = s.countries.map(([code, n]) => {
    let name = "Unknown";
    try {
      if (code) name = regions.of(code) ?? code;
    } catch {
      name = code;
    }
    return { name, value: `${pct(n, s.visits)}% · ${fmt(n)}`, width: pct(n, topCountry) };
  });
  const { chapters, sectionTitles } = siteChapters(site);
  const reached: Row[] = s.visits
    ? chapters.map((key) => {
        const share = pct(s.reached[key] ?? 0, s.visits);
        return { name: site.journey.nav.labels[key] || navDefaultLabel(key, sectionTitles), value: `${share}%`, width: share };
      })
    : [];

  const tiles = [
    { label: "visitors", value: fmt(s.visitors), sub: "different people (each counted once a day)" },
    { label: "visits", value: fmt(s.visits), sub: "including people who came back" },
    { label: "reached the end", value: `${pct(s.ended, s.visits)}%`, sub: "scrolled all the way down" },
    { label: "on phones", value: `${pct(s.phone, s.visits)}%`, sub: "the rest on laptops and tablets" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex h-10 items-center gap-2 border border-holo/35 px-3.5 font-mono text-[13px] text-fg">
          <i aria-hidden="true" className="size-2 rounded-full bg-holo shadow-[0_0_8px_var(--holo)]" />
          {s.live} on the site right now
        </span>
        <nav aria-label="Time range" className="flex flex-wrap gap-1.5">
          {RANGES.map((r) => (
            <Link
              key={r.id}
              href={r.id === "30" ? "/admin/visitors" : `/admin/visitors?range=${r.id}`}
              aria-current={r.id === range.id ? "page" : undefined}
              className={`flex h-11 items-center border px-4 font-mono text-[13px] no-underline ${
                r.id === range.id ? "border-holo bg-holo text-void" : "border-holo/35 text-[#c6eef9]"
              }`}
            >
              {r.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="flex flex-col gap-1 border border-holo/20 bg-[rgba(4,14,22,.72)] px-4 py-3.5">
            <span className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">{t.label}</span>
            <span className="truncate font-display text-[28px] font-bold text-fg">{t.value}</span>
            <span className="text-[13px] text-muted">{t.sub}</span>
          </div>
        ))}
      </div>

      <VisitorsChart bars={bars} unit={range.days === 0 ? "month" : "day"} title={range.title} />

      <div className="grid items-start gap-3 lg:grid-cols-3">
        <ListBox title="Where they came from" note="share of visits, by the site or app that sent them" rows={sources} empty="No visits yet." />
        <ListBox title="Countries" note="share of visits; found by the server, not stored from their IP" rows={countries} empty="No visits yet." />
        <ListBox
          title="How far they got"
          note="share of visits that reached each chapter"
          rows={reached}
          empty="No visits yet."
        />
      </div>

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <VisitorSettingsForm settings={settings} totals={{ people: all.visitors, visits: all.visits }} />
        <section aria-label="What is kept" className="flex flex-col gap-3 border border-holo/20 bg-[rgba(4,14,22,.72)] px-5 py-4">
          <h2 className="font-mono text-[13px] font-bold tracking-[0.14em] text-holo">&gt; WHAT IS KEPT</h2>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-[14px] leading-relaxed text-[#c6dde8]">
            <li>Day, country, the site that sent them, phone or laptop, and which chapters they reached.</li>
            <li>No cookies and no IP addresses. The same person counts once a day and can&apos;t be followed across days.</li>
            <li>Bots and your own visits (while signed in here) are not counted.</li>
            <li>
              Add <code className="text-fg">?ref=cv</code> (or any word) to a link you share and those visits show up under
              that name.
            </li>
          </ul>
          <ResetVisits />
        </section>
      </div>
    </div>
  );
}
