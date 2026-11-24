import * as THREE from "three";
import type { ChapterKey } from "@/lib/journey/store";

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

/**
 * Builds one particle shape per chapter, in the order given:
 * boot sphere, galaxy, double helix, tunnel, exchange (help), trace wall, end sphere.
 */
export function buildParticles(
  count: number,
  primary: string,
  secondary: string,
  chapters: readonly ChapterKey[],
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

  const sphere = (z0: number) =>
    shape((i) => {
      const y = 1 - (i / (count - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = golden * i;
      const R = 2.6 + gauss() * 0.03;
      return [Math.cos(th) * r * R, y * R, Math.sin(th) * r * R + z0];
    });

  const galaxy = shape((i) => {
    const arm = i % 3;
    const r = 0.6 + Math.pow(rnd(), 0.7) * 7;
    const a = r * 0.85 + (arm * 2 * Math.PI) / 3 + gauss() * 0.3;
    return [Math.cos(a) * r, gauss() * 0.14 * (1 - r / 9), Math.sin(a) * r];
  });

  const helix = shape((i) => {
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
  });

  const tunnel = shape((i) => {
    const ring = i % 2 === 0;
    const z = ring ? 2 - Math.floor(rnd() * 34) * 2 : 4 - rnd() * 70;
    const a = ring ? rnd() * Math.PI * 2 : (Math.floor(rnd() * 24) / 24) * Math.PI * 2;
    const R = 3.2 + gauss() * 0.04;
    return [Math.cos(a) * R, Math.sin(a) * R, z];
  });

  // Two orbs (what I need, what I give) joined by two counter-flowing streams.
  const exchange = shape((i) => {
    const z0 = -46;
    const part = i % 5;
    if (part < 2) {
      const side = part === 0 ? -1 : 1;
      const y = 1 - 2 * rnd();
      const r = Math.sqrt(1 - y * y);
      const th = rnd() * Math.PI * 2;
      const R = 1.35 + gauss() * 0.05;
      return [side * 3.4 + Math.cos(th) * r * R, y * R, z0 + Math.sin(th) * r * R];
    }
    if (part < 4) {
      const t = rnd();
      const x = -3.4 + t * 6.8;
      const phase = part === 2 ? 0 : Math.PI;
      const amp = Math.sin(t * Math.PI) * 0.9;
      return [x, Math.sin(t * Math.PI * 3 + phase) * amp + gauss() * 0.03, z0 + Math.cos(t * Math.PI * 3 + phase) * amp];
    }
    // Loose sparks around the whole exchange.
    return [gauss() * 3.2, gauss() * 1.4, z0 + gauss() * 1.2];
  });

  const cols = 100;
  const rows = Math.ceil(count / cols);
  const wall = shape((i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const x = -10 + c * (20 / (cols - 1));
    const y = -5.5 + r * (11 / Math.max(1, rows - 1));
    return [x, y, -70 + 0.35 * Math.sin(x * 0.6) * Math.cos(y * 0.5)];
  });

  const byChapter: Record<ChapterKey, Float32Array> = {
    BOOT: sphere(0),
    ABOUT: galaxy,
    INTERESTS: helix,
    SIGNAL: tunnel,
    HELP: exchange,
    TRACES: wall,
    END: sphere(-70),
  };
  const shapes = chapters.map((key) => byChapter[key]);

  const colors = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  const dir = new Float32Array(count * 3);
  const main = new THREE.Color(primary);
  const accent = new THREE.Color(secondary);
  const pale = main.clone().lerp(new THREE.Color("#ffffff"), 0.65);
  for (let i = 0; i < count; i++) {
    seed[i] = rnd();
    const c = seed[i] < 0.12 ? accent : seed[i] < 0.3 ? pale : main;
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
