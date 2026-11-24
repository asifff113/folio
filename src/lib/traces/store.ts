import { useSyncExternalStore } from "react";

/**
 * Visitor traces. Phase 2 keeps them in memory with demo entries so the wall
 * and the log have something to show; Phase 4 swaps this for the database.
 */
export type Trace = {
  id: string;
  name: string;
  platform: string;
  /** PNG data URL of the drawn signature. */
  signature: string;
  createdAt: number;
};

const EMPTY: Trace[] = [];
let traces: Trace[] = EMPTY;
let seeded = false;
const subscribers = new Set<() => void>();

function seedDemo() {
  if (seeded || typeof document === "undefined") return;
  seeded = true;
  traces = makeDemoTraces();
}

function subscribe(fn: () => void) {
  seedDemo();
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

function getSnapshot() {
  seedDemo();
  return traces;
}

export function useTraces() {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

/** Adds a trace and returns its id. */
export function addTrace(trace: Omit<Trace, "id" | "createdAt">) {
  const id = crypto.randomUUID();
  traces = [...traces, { ...trace, id, createdAt: Date.now() }];
  for (const fn of subscribers) fn();
  return id;
}

/* ---------- demo data ---------- */

const DEMO_PLATFORMS = ["discord", "telegram", "instagram", "github", "linkedin", "x", "other"];
const DEMO_NAMES = ["rafi", "nova_", "mehz", "kai.dev", "sadia", "tanvir", "ori", "zayn_x", "lumen", "priya", "hex", "ayaan"];

/** Seeded random scribble so demo signatures look hand-drawn. */
function scribble(seed: number) {
  let s = seed * 9301 + 49297;
  const r = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const c = document.createElement("canvas");
  c.width = 220;
  c.height = 80;
  const g = c.getContext("2d");
  if (!g) return "";
  g.strokeStyle = "#eef6ff";
  g.lineWidth = 2.4;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.beginPath();
  let x = 12;
  g.moveTo(x, 48 + r() * 12);
  for (let k = 0, n = 5 + Math.floor(r() * 4); k < n; k++) {
    const nx = x + 18 + r() * 22;
    const ny = 20 + r() * 45;
    g.quadraticCurveTo(x + (nx - x) * 0.5 + (r() - 0.5) * 30, ny + (r() - 0.5) * 50, nx, ny);
    x = nx;
  }
  g.stroke();
  return c.toDataURL();
}

function makeDemoTraces(): Trace[] {
  const now = Date.now();
  return DEMO_NAMES.map((name, i) => ({
    id: `demo-${i}`,
    name,
    platform: DEMO_PLATFORMS[i % DEMO_PLATFORMS.length],
    signature: scribble(i + 3),
    createdAt: now - (DEMO_NAMES.length - i) * 6.1 * 60_000,
  }));
}
