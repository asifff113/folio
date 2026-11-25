import * as THREE from "three";
import type { ShapeName } from "@/config/customize";
import { type ChapterKey, type FixedChapter, isSectionChapter } from "@/lib/journey/store";

/** Small seeded PRNG so the particle layout is the same on every visit. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type ParticleData = {
  count: number;
  /** One target layout per chapter, each `count * 3` floats. */
  shapes: Float32Array[];
  positions: Float32Array;
  colors: Float32Array;
  /** 0–1 per particle: staggers the morph and sizes the burst. */
  seed: Float32Array;
  /** Random unit direction per particle, used for the mid-morph burst. */
  dir: Float32Array;
};

/** The usual shape of each chapter, when none is chosen in /admin/3d. */
const DEFAULT_SHAPES: Partial<Record<FixedChapter, ShapeName>> = {
  BOOT: "sphere",
  ABOUT: "galaxy",
  INTERESTS: "helix",
  HELP: "exchange",
  END: "sphere",
};
const SECTION_CYCLE: ShapeName[] = ["lattice", "torus", "waves", "orbits", "vortex"];

/** Where each chapter's shape sits along the journey (z). Sections sit at the origin. */
const ANCHOR_Z: Partial<Record<FixedChapter, number>> = { HELP: -46, END: -70 };

/**
 * Builds one particle shape per chapter, in the order given. Each chapter gets
 * its chosen shape (or its usual one) at its place in the world; the connect
 * chapter is always the tunnel and the traces chapter the wall.
 */
export function buildParticles(
  count: number,
  primary: string,
  secondary: string,
  chapters: readonly ChapterKey[],
  options: { accent?: number; shapes?: Record<string, ShapeName> } = {},
): ParticleData {
  const rnd = mulberry32(1337);
  const gauss = () => {
    let u = 0;
    let v = 0;
    while (!u) u = rnd();
    while (!v) v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const shape = (fn: (i: number) => [number, number, number]) => {
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const p = fn(i);
      a[i * 3] = p[0];
      a[i * 3 + 1] = p[1];
      a[i * 3 + 2] = p[2];
    }
    return a;
  };
  const golden = Math.PI * (3 - Math.sqrt(5));

  /* Every shape is built around the origin; `place` moves it to its chapter. */
  const generators: Record<ShapeName, () => Float32Array> = {
    sphere: () =>
      shape((i) => {
        const y = 1 - (i / (count - 1)) * 2;
        const r = Math.sqrt(1 - y * y);
        const th = golden * i;
        const R = 2.6 + gauss() * 0.03;
        return [Math.cos(th) * r * R, y * R, Math.sin(th) * r * R];
      }),
    galaxy: () =>
      shape((i) => {
        const arm = i % 3;
        const r = 0.6 + Math.pow(rnd(), 0.7) * 7;
        const a = r * 0.85 + (arm * 2 * Math.PI) / 3 + gauss() * 0.3;
        return [Math.cos(a) * r, gauss() * 0.14 * (1 - r / 9), Math.sin(a) * r];
      }),
    helix: () =>
      shape((i) => {
        if (i % 7 === 0) {
          // rungs between the two strands
          const t = Math.floor(rnd() * 28) / 28;
          const a = t * Math.PI * 6;
          const f = rnd();
          const x1 = Math.cos(a) * 1.7;
          const z1 = Math.sin(a) * 1.7;
          return [x1 - 2 * x1 * f, -4.6 + t * 9.2, z1 - 2 * z1 * f];
        }
        const strand = i % 2;
        const t = rnd();
        const a = t * Math.PI * 6 + strand * Math.PI;
        const R = 1.7 + gauss() * 0.05;
        return [Math.cos(a) * R, -4.6 + t * 9.2, Math.sin(a) * R];
      }),
    lattice: () =>
      shape(() => {
        const n = 9;
        const pick = () => (Math.floor(rnd() * n) / (n - 1) - 0.5) * 6.4;
        const p: [number, number, number] = [pick(), pick(), pick()];
        // Points run along the lattice lines, so the cube reads as a wireframe.
        p[Math.floor(rnd() * 3)] = (rnd() - 0.5) * 6.4;
        return p;
      }),
    torus: () =>
      shape(() => {
        const u = rnd() * Math.PI * 2;
        const v = rnd() * Math.PI * 2;
        const r = 1.15 + gauss() * 0.04;
        const R = 3.6;
        return [(R + r * Math.cos(v)) * Math.cos(u), r * Math.sin(v), (R + r * Math.cos(v)) * Math.sin(u)];
      }),
    waves: () =>
      shape(() => {
        const x = (rnd() - 0.5) * 13;
        const z = (rnd() - 0.5) * 13;
        const d = Math.hypot(x, z);
        return [x, Math.sin(d * 1.3) * 0.9 * Math.exp(-d * 0.12) - 0.5, z];
      }),
    orbits: () =>
      shape((i) => {
        const ring = i % 4;
        if (ring === 3) {
          const y = 1 - 2 * rnd();
          const r = Math.sqrt(1 - y * y);
          const th = rnd() * Math.PI * 2;
          const R = 0.9 + gauss() * 0.05;
          return [Math.cos(th) * r * R, y * R, Math.sin(th) * r * R];
        }
        const a = rnd() * Math.PI * 2;
        const R = 2.4 + ring * 1.15 + gauss() * 0.03;
        const tilt = (ring - 1) * 0.55;
        const x = Math.cos(a) * R;
        const z = Math.sin(a) * R;
        return [x, z * Math.sin(tilt), z * Math.cos(tilt)];
      }),
    vortex: () =>
      shape(() => {
        const t = rnd();
        const a = t * Math.PI * 10 + gauss() * 0.15;
        const R = 0.4 + t * 4.2;
        return [Math.cos(a) * R, 3.6 - t * 7.2, Math.sin(a) * R];
      }),
    // Two orbs (what I need, what I give) joined by two counter-flowing streams.
    exchange: () =>
      shape((i) => {
        const part = i % 5;
        if (part < 2) {
          const side = part === 0 ? -1 : 1;
          const y = 1 - 2 * rnd();
          const r = Math.sqrt(1 - y * y);
          const th = rnd() * Math.PI * 2;
          const R = 1.35 + gauss() * 0.05;
          return [side * 3.4 + Math.cos(th) * r * R, y * R, Math.sin(th) * r * R];
        }
        if (part < 4) {
          const t = rnd();
          const x = -3.4 + t * 6.8;
          const phase = part === 2 ? 0 : Math.PI;
          const amp = Math.sin(t * Math.PI) * 0.9;
          return [x, Math.sin(t * Math.PI * 3 + phase) * amp + gauss() * 0.03, Math.cos(t * Math.PI * 3 + phase) * amp];
        }
        // Loose sparks around the whole exchange.
        return [gauss() * 3.2, gauss() * 1.4, gauss() * 1.2];
      }),
  };

  const built = new Map<ShapeName, Float32Array>();
  const get = (name: ShapeName) => {
    let a = built.get(name);
    if (!a) {
      a = generators[name]();
      built.set(name, a);
    }
    return a;
  };
  const place = (a: Float32Array, z: number) => {
    if (!z) return a;
    const out = new Float32Array(a);
    for (let i = 2; i < out.length; i += 3) out[i] += z;
    return out;
  };

  const tunnel = () =>
    shape((i) => {
      const ring = i % 2 === 0;
      const z = ring ? 2 - Math.floor(rnd() * 34) * 2 : 4 - rnd() * 70;
      const a = ring ? rnd() * Math.PI * 2 : (Math.floor(rnd() * 24) / 24) * Math.PI * 2;
      const R = 3.2 + gauss() * 0.04;
      return [Math.cos(a) * R, Math.sin(a) * R, z];
    });

  const wall = () => {
    const cols = 100;
    const rows = Math.ceil(count / cols);
    return shape((i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const x = -10 + c * (20 / (cols - 1));
      const y = -5.5 + r * (11 / Math.max(1, rows - 1));
      return [x, y, -70 + 0.35 * Math.sin(x * 0.6) * Math.cos(y * 0.5)];
    });
  };

  const chosen = options.shapes ?? {};
  let section = 0;
  const shapes = chapters.map((key) => {
    if (key === "SIGNAL") return tunnel();
    if (key === "TRACES") return wall();
    const name: ShapeName =
      chosen[key] ??
      (isSectionChapter(key) ? SECTION_CYCLE[section % SECTION_CYCLE.length] : (DEFAULT_SHAPES[key] ?? "sphere"));
    if (isSectionChapter(key)) section += 1;
    return place(get(name), isSectionChapter(key) ? 0 : (ANCHOR_Z[key] ?? 0));
  });

  const share = options.accent ?? 0.12;
  const colors = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  const dir = new Float32Array(count * 3);
  const main = new THREE.Color(primary);
  const accent = new THREE.Color(secondary);
  const pale = main.clone().lerp(new THREE.Color("#ffffff"), 0.65);
  for (let i = 0; i < count; i++) {
    seed[i] = rnd();
    const c = seed[i] < share ? accent : seed[i] < share + 0.18 ? pale : main;
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
    const th = rnd() * Math.PI * 2;
    const ph = Math.acos(2 * rnd() - 1);
    dir[i * 3] = Math.sin(ph) * Math.cos(th);
    dir[i * 3 + 1] = Math.cos(ph);
    dir[i * 3 + 2] = Math.sin(ph) * Math.sin(th);
  }

  return { count, shapes, positions: new Float32Array(shapes[0]), colors, seed, dir };
}

/** Soft round sprite used by the particles and the trace stars. */
let glow: THREE.CanvasTexture | null = null;
export function glowTexture() {
  if (glow) return glow;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.25, "rgba(255,255,255,.6)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  glow = new THREE.CanvasTexture(c);
  return glow;
}

/** Deterministic 0–1 values from a string, for placing trace stars. */
export function hashRandom(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return mulberry32(h >>> 0);
}
