import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TraceSettings } from "@/config/site";
import { getAdminSession } from "@/lib/admin/session";
import { LocalTime } from "./InboxClient";
import { TraceActions, TraceSettingsForm } from "./TracesClient";

type Stat = { id: string; platform: string; detected: string; status: Status; created_at: string };
type Row = Stat & { name: string; message: string; signature: string };
type Status = "live" | "pending" | "hidden";

const FILTERS = [
  { id: "all", label: "all", status: null },
  { id: "waiting", label: "waiting", status: "pending" },
  { id: "live", label: "on the wall", status: "live" },
  { id: "hidden", label: "hidden", status: "hidden" },
] as const;

const STATUS_LABEL: Record<Status, { text: string; className: string }> = {
  pending: { text: "waiting", className: "text-[#ffb23b]" },
  live: { text: "on the wall", className: "text-[#5dffb0]" },
  hidden: { text: "hidden", className: "text-muted" },
};

/** Admin pages render per request, so reading the clock here is fine. */
function sevenDaysAgo() {
  return Date.now() - 7 * 86400_000;
}

/** Where a visitor came from: what they picked, else what the site detected. */
const sourceOf = (t: Stat) => t.platform || t.detected || "direct";

export async function TracesView({
  db,
  settings,
  params,
}: {
  db: SupabaseClient;
  settings: TraceSettings;
  params: Promise<{ filter?: string }>;
}) {
  const { filter: filterParam } = await params;
  const filter = FILTERS.find((f) => f.id === filterParam) ?? FILTERS[0];

  let list = db
    .from("traces")
    .select("id,name,message,signature,platform,detected,status,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (filter.status) list = list.eq("status", filter.status);

  const [stats, rows] = await Promise.all([
    db
      .from("traces")
      .select("id,platform,detected,status,created_at")
      .order("created_at", { ascending: false })
      .limit(10000)
      .returns<Stat[]>(),
    list.returns<Row[]>(),
  ]);

  const error = stats.error ?? rows.error;
  if (error) {
    return (
      <div className="panel max-w-none">
        <p className="eyebrow">{"// read error"}</p>
        <p className="panel-text">
          Could not load the traces: {error.message}. Check that <code className="text-fg">supabase/phase5_traces.sql</code>{" "}
          was run.
        </p>
      </div>
    );
  }

  const all = stats.data ?? [];
  const weekAgo = sevenDaysAgo();
  const count = (status: Status) => all.filter((t) => t.status === status).length;
  const bySource = new Map<string, number>();
  for (const t of all) bySource.set(sourceOf(t), (bySource.get(sourceOf(t)) ?? 0) + 1);
  const sources = [...bySource.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const top = sources[0];
  const max = top?.[1] ?? 1;

  const tiles = [
    { label: "on the wall", value: String(count("live")), sub: `${all.length} received in total`, className: "text-fg" },
    {
      label: "this week",
      value: String(all.filter((t) => Date.parse(t.created_at) > weekAgo).length),
      sub: "in the last 7 days",
      className: "text-[#5dffb0]",
    },
    {
      label: "waiting",
      value: String(count("pending")),
      sub: settings.approval ? "need your approval" : "approval is off",
      className: "text-[#ffb23b]",
    },
    {
      label: "top source",
      value: top ? top[0] : "—",
      sub: top ? `${Math.round((top[1] / all.length) * 100)}% of traces` : "no traces yet",
      className: "text-pink",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="flex flex-col gap-1 border border-holo/20 bg-[rgba(4,14,22,.72)] px-4 py-3.5">
            <span className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">{t.label}</span>
            <span className={`truncate font-display text-[26px] font-bold ${t.className}`}>{t.value}</span>
            <span className="text-[13px] text-muted">{t.sub}</span>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section aria-labelledby="sources-title" className="border border-holo/20 bg-[rgba(4,14,22,.72)] px-5 py-4">
          <h2 id="sources-title" className="mb-1 font-mono text-[13px] font-bold tracking-[0.14em] text-holo">
            &gt; WHERE THEY CAME FROM
          </h2>
          <p className="mb-3 text-[13px] text-muted">
            What each visitor picked, or what the site detected when they didn&apos;t pick. Only you see this.
          </p>
          {sources.length === 0 ? (
            <p className="font-mono text-[13px] text-muted">No traces yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {sources.map(([source, n]) => (
                <li
                  key={source}
                  className="grid grid-cols-[96px_minmax(0,1fr)_40px] items-center gap-3 font-mono text-[13px]"
                >
                  <span className="truncate text-[#d6f6ff]">{source}</span>
                  <span className="h-3 bg-holo/10">
                    <span className="block h-3 bg-holo" style={{ width: `${Math.max(4, (n / max) * 100)}%` }} />
                  </span>
                  <span className="text-right text-[#b4dbe8]">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <TraceSettingsForm settings={settings} />
      </div>

      <nav aria-label="Filter" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const n = f.status ? count(f.status) : all.length;
          const active = f.id === filter.id;
          return (
            <Link
              key={f.id}
              href={`/admin/traces?filter=${f.id}`}
              aria-current={active ? "page" : undefined}
              className={`chip ${active ? "border-holo bg-holo/15 font-bold text-fg" : "text-muted"}`}
            >
              {f.label} · {n}
            </Link>
          );
        })}
      </nav>

      {(rows.data ?? []).length === 0 ? (
        <div className="border border-dashed border-holo/25 px-5 py-10 text-center text-[16px] text-muted">
          {all.length === 0 ? "No traces yet. When visitors sign your wall, they show up here." : "Nothing in this view."}
        </div>
      ) : (
        <ul aria-label="Traces" className="flex flex-col border border-holo/20">
          {(rows.data ?? []).map((t) => {
            const status = STATUS_LABEL[t.status];
            return (
              <li
                key={t.id}
                className={`grid items-center gap-x-4 gap-y-2 border-b border-holo/10 px-4 py-3 last:border-b-0 sm:grid-cols-[130px_minmax(0,1.2fr)_minmax(0,1fr)_auto] ${
                  t.status === "pending" ? "bg-[rgba(255,178,59,.05)]" : ""
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- data URL signature */}
                <img alt="Signature" src={t.signature} className="h-[40px] w-[110px] bg-[rgba(2,10,16,.7)] object-contain" />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold">
                    {t.name || <span className="font-normal text-muted">no name</span>}
                  </p>
                  <p className="truncate text-[13px] text-muted">{t.message || "—"}</p>
                </div>
                <div className="flex min-w-0 flex-col gap-0.5 font-mono text-[12px]">
                  <span className="text-[#d6f6ff]">{t.platform ? `picked ${t.platform}` : "didn't pick"}</span>
                  <span className={t.platform && t.platform === t.detected ? "text-[#5dffb0]" : "text-muted"}>
                    detected {t.detected}
                    {t.platform && t.platform === t.detected ? " ✓" : ""}
                  </span>
                  <span className="text-muted">
                    <LocalTime iso={t.created_at} short />
                    {" · "}
                    <b className={`font-bold tracking-[0.08em] ${status.className}`}>{status.text}</b>
                  </span>
                </div>
                <TraceActions id={t.id} status={t.status} />
              </li>
            );
          })}
        </ul>
      )}
      {(rows.data ?? []).length === 100 && <p className="font-mono text-[12px] text-muted">Showing the newest 100.</p>}
    </div>
  );
}

/** Count of traces waiting for approval, for the admin menu. */
export async function WaitingBadge() {
  const session = await getAdminSession();
  if (session.state !== "admin") return null;
  const { count } = await session.supabase
    .from("traces")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (!count) return null;
  return <span className="bg-[#ffb23b] px-1.5 font-mono text-[11px] font-bold text-[#1a0f00]">{count}</span>;
}
