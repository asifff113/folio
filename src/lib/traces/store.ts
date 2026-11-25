import { useSyncExternalStore } from "react";
import { browserClient } from "@/lib/supabase/browser";

/**
 * The traces wall as visitors see it: name, "say hi", signature and time.
 * Where people came from is never sent to the browser.
 *
 * Loaded once from `get_traces()`, then kept current through the public
 * realtime topic "traces" (new, approved, hidden and deleted traces).
 */
export type Trace = {
  id: string;
  name: string;
  message: string;
  /** PNG data URL of the drawn signature. Only the newest few carry it. */
  signature: string | null;
  createdAt: number;
};

export type TraceWall = {
  /** False until the first load finished (or failed). */
  ready: boolean;
  /** Live traces in total; the wall may show fewer. */
  total: number;
  /** Newest first. */
  traces: Trace[];
};

/** How many of the newest traces keep their signature image (the log). */
const WITH_SIGNATURE = 6;

const EMPTY: TraceWall = { ready: false, total: 0, traces: [] };
let wall: TraceWall = EMPTY;
let started = false;
let limit = 300;
const subscribers = new Set<() => void>();

type Row = { id: string; name: string; message: string; signature: string | null; created_at: string };

const toTrace = (r: Row): Trace => ({
  id: r.id,
  name: r.name ?? "",
  message: r.message ?? "",
  signature: r.signature ?? null,
  createdAt: Date.parse(r.created_at) || Date.now(),
});

function set(next: TraceWall) {
  wall = next;
  for (const fn of subscribers) fn();
}

function add(trace: Trace) {
  if (wall.traces.some((t) => t.id === trace.id)) return;
  const traces = [trace, ...wall.traces]
    .slice(0, limit)
    .map((t, i) => (i < WITH_SIGNATURE ? t : { ...t, signature: null }));
  set({ ...wall, total: wall.total + 1, traces });
}

function remove(id: string) {
  if (!wall.traces.some((t) => t.id === id)) return;
  set({ ...wall, total: Math.max(0, wall.total - 1), traces: wall.traces.filter((t) => t.id !== id) });
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  const db = browserClient();
  if (!db) {
    set({ ...EMPTY, ready: true });
    return;
  }

  // Listen first, so nothing sent while the wall loads is missed.
  db.channel("traces")
    .on("broadcast", { event: "add" }, ({ payload }) => add(toTrace(payload as Row)))
    .on("broadcast", { event: "remove" }, ({ payload }) => remove(String((payload as { id: string }).id)))
    .subscribe();

  db.rpc("get_traces").then(({ data, error }) => {
    if (error || !data) {
      console.error("[traces] load failed:", error?.message);
      set({ ...wall, ready: true });
      return;
    }
    const loaded = (data as { total: number; traces: Row[] }).traces.map(toTrace);
    // Keep anything that arrived live while loading.
    const extra = wall.traces.filter((t) => !loaded.some((l) => l.id === t.id));
    set({ ready: true, total: Number((data as { total: number }).total) + extra.length, traces: [...extra, ...loaded] });
  });
}

function subscribe(fn: () => void) {
  start();
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

export function useTraces() {
  return useSyncExternalStore(subscribe, () => wall, () => EMPTY);
}

/** Sets how many stars the wall keeps (the admin's "newest N"). */
export function setWallLimit(n: number) {
  limit = n;
}

/** Puts the visitor's own trace on the wall right away (the broadcast of it is then ignored). */
export function addOwnTrace(trace: Trace) {
  add(trace);
}
