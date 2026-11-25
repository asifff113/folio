"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";
import type { Theme } from "@/config/site";
import { type ChapterKey, type FixedChapter, clamp, isSectionChapter, journey, ramp, smooth } from "@/lib/journey/store";
import { useTraces } from "@/lib/traces/store";
import { buildParticles, glowTexture, hashRandom } from "./shapes";

type SceneProps = {
  theme: Theme;
  /** Chapters present, in scroll order. */
  chapters: ChapterKey[];
};

/** The whole WebGL world. Every part reads `journey.current` each frame. */
export default function Scene({ theme, chapters }: SceneProps) {
  const last = chapters.length - 1;
  const at = (key: ChapterKey) => chapters.indexOf(key);
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true }}
      camera={{ fov: 55, near: 0.1, far: 300, position: [0, 0.4, 9.5] }}
      fallback={
        <p className="grid h-full place-items-center p-6 text-center text-muted">
          WebGL is not available in this browser, so the 3D world is off. The chapters still scroll.
        </p>
      }
    >
      <color attach="background" args={["#05070c"]} />
      <fogExp2 attach="fog" args={["#05070c", 0.028]} />
      <CameraRig chapters={chapters} />
      <Particles primary={theme.primary} secondary={theme.secondary} chapters={chapters} signal={at("SIGNAL")} />
      <Hologram primary={theme.primary} secondary={theme.secondary} signal={at("SIGNAL")} last={last} />
      <GridFloor primary={theme.primary} />
      <TunnelRings primary={theme.primary} signal={at("SIGNAL")} />
      {at("TRACES") >= 0 && (
        <TraceStars palette={[theme.primary, theme.secondary, "#bff6ff", "#a58bff"]} traces={at("TRACES")} />
      )}
      <EffectComposer>
        <Bloom mipmapBlur intensity={0.55} luminanceThreshold={0.25} luminanceSmoothing={0.3} />
      </EffectComposer>
    </Canvas>
  );
}

/* ---------- camera: one keyframe per chapter ---------- */

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
/** Where the camera sits and what it looks at, per chapter. */
const KEYFRAMES: Record<FixedChapter, { pos: THREE.Vector3; look: THREE.Vector3 }> = {
  BOOT: { pos: V(0, 0.4, 9.5), look: V(0, 0, 0) },
  ABOUT: { pos: V(0, 8.5, 6), look: V(0, 0, 0) },
  INTERESTS: { pos: V(6, 0.6, 5.5), look: V(0, 0, 0) },
  SIGNAL: { pos: V(0, 0, -20), look: V(0, 0, -60) },
  HELP: { pos: V(0, 0.8, -36.5), look: V(0, 0, -46) },
  TRACES: { pos: V(0, 0, -55.5), look: V(0, 0, -70) },
  END: { pos: V(0, 1, -61.5), look: V(0, 0, -70) },
};

/**
 * Camera stops for every chapter. Sections orbit the origin after INTERESTS,
 * a little further round each time, alternating above and below.
 */
function keyframes(chapters: ChapterKey[]) {
  let section = 0;
  return chapters.map((key) => {
    if (!isSectionChapter(key)) return KEYFRAMES[key];
    const angle = 0.83 + 0.95 * (section + 1);
    const y = section % 2 ? -1.3 : 1.7;
    section += 1;
    return { pos: V(Math.sin(angle) * 9.5, y, Math.cos(angle) * 9.5), look: V(0, 0, 0) };
  });
}

function CameraRig({ chapters }: { chapters: ChapterKey[] }) {
  const width = useThree((s) => s.size.width);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const paths = useMemo(
    () => {
      const frames = keyframes(chapters);
      return {
        camera: new THREE.CatmullRomCurve3(frames.map((f) => f.pos), false, "centripetal"),
        look: new THREE.CatmullRomCurve3(frames.map((f) => f.look), false, "centripetal"),
      };
    },
    [chapters],
  );
  const last = chapters.length - 1;

  useFrame(({ camera }) => {
    const cam = camera as THREE.PerspectiveCamera;
    const fov = width < 720 ? 68 : 55;
    if (cam.fov !== fov) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    const s = clamp(journey.current, 0, last);
    const k = Math.min(last - 1, Math.floor(s));
    const u = (k + smooth(s - k)) / last;
    paths.camera.getPoint(u, pos);
    paths.look.getPoint(u, look);
    const p = journey.pointer;
    cam.position.set(pos.x + p.x * 1.2, pos.y + p.y * 0.8, pos.z);
    cam.lookAt(look);
  });

  return null;
}

/* ---------- particles: morph between chapter shapes ---------- */

type Colors = { primary: string; secondary: string };

function Particles({ primary, secondary, chapters, signal }: Colors & { chapters: ChapterKey[]; signal: number }) {
  const data = useMemo(
    () => buildParticles(window.innerWidth < 720 ? 3200 : 5000, primary, secondary, chapters),
    [primary, secondary, chapters],
  );
  const last = chapters.length - 1;
  const points = useRef<THREE.Points>(null);
  const spin = useRef(0);

  useFrame(({ clock }, dt) => {
    const obj = points.current;
    if (!obj) return;
    const t = clock.elapsedTime;
    const s = clamp(journey.current, 0, last);
    const k = Math.min(last - 1, Math.floor(s));
    const f = s - k;
    const A = data.shapes[k];
    const B = data.shapes[k + 1];
    const wobble = journey.reducedMotion ? 0 : 0.05;
    const attr = obj.geometry.getAttribute("position") as THREE.BufferAttribute;
    const pos = attr.array as Float32Array;

    for (let i = 0; i < data.count; i++) {
      const i3 = i * 3;
      const sd = data.seed[i];
      // Staggered per particle; mid-morph each particle bursts outwards.
      const e = smooth(clamp((f - 0.12 - sd * 0.3) / 0.45, 0, 1));
      const burst = Math.sin(Math.PI * e) * (1.2 + sd * 2.2);
      pos[i3] = A[i3] + (B[i3] - A[i3]) * e + data.dir[i3] * burst + Math.sin(t * 1.3 + sd * 40) * wobble;
      pos[i3 + 1] = A[i3 + 1] + (B[i3 + 1] - A[i3 + 1]) * e + data.dir[i3 + 1] * burst + Math.cos(t * 1.1 + sd * 30) * wobble;
      pos[i3 + 2] = A[i3 + 2] + (B[i3 + 2] - A[i3 + 2]) * e + data.dir[i3 + 2] * burst;
    }
    attr.needsUpdate = true;

    // The shapes around the origin (galaxy, helix, sections) turn slowly; before the
    // tunnel the cloud eases back to a whole turn so the far shapes sit straight.
    if (journey.reducedMotion) spin.current = 0;
    else if (s > 0.5 && s < signal - 0.9) spin.current += Math.min(dt, 0.1) * 0.12;
    else {
      const rest = Math.round(spin.current / (Math.PI * 2)) * Math.PI * 2;
      spin.current += (rest - spin.current) * Math.min(1, dt * 3);
    }
    obj.rotation.y = spin.current;
  });

  return (
    <points ref={points} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[data.colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.13}
        map={glowTexture()}
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ---------- hologram: wireframe core at boot and end ---------- */

function Hologram({ primary, secondary, signal, last }: Colors & { signal: number; last: number }) {
  const group = useRef<THREE.Group>(null);
  const shell = useRef<THREE.LineSegments>(null);
  const icoMat = useRef<THREE.MeshBasicMaterial>(null);
  const dodMat = useRef<THREE.LineBasicMaterial>(null);
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.DodecahedronGeometry(2.2)), []);

  useFrame(({ clock }, dt) => {
    const g = group.current;
    if (!g || !icoMat.current || !dodMat.current || !shell.current) return;
    const t = clock.elapsedTime;
    const s = journey.current;
    const visible = Math.max(1 - s * 2.2, ramp(s, last - 0.55, 0.55));
    g.visible = visible > 0.01;
    g.position.z = s < signal - 0.5 ? 0 : -70;
    icoMat.current.opacity = 0.8 * visible;
    dodMat.current.opacity = 0.45 * visible;
    g.rotation.y += dt * 0.45;
    g.rotation.x = Math.sin(t * 0.5) * 0.18;
    shell.current.rotation.z += dt * 0.15;
    // Occasional sideways glitch.
    if (!journey.reducedMotion && Math.random() < 0.006 && visible > 0.5) g.position.x = (Math.random() - 0.5) * 0.3;
    else g.position.x *= 0.6;
  });

  return (
    <group ref={group}>
      <mesh>
        <icosahedronGeometry args={[1.6, 1]} />
        <meshBasicMaterial ref={icoMat} color={primary} wireframe transparent opacity={0.8} depthWrite={false} />
      </mesh>
      <lineSegments ref={shell} geometry={edges}>
        <lineBasicMaterial ref={dodMat} color={secondary} transparent opacity={0.45} depthWrite={false} />
      </lineSegments>
    </group>
  );
}

/* ---------- grid floor ---------- */

function GridFloor({ primary }: { primary: string }) {
  const grid = useMemo(() => {
    const lines = new THREE.Color(primary).multiplyScalar(0.22);
    const g = new THREE.GridHelper(240, 120, primary, lines);
    const mat = g.material as THREE.Material;
    mat.transparent = true;
    mat.opacity = 0.45;
    return g;
  }, [primary]);

  useFrame(({ clock }) => {
    grid.position.set(0, -5.5, -40 + ((clock.elapsedTime * 0.8) % 2));
  });

  return <primitive object={grid} />;
}

/* ---------- tunnel rings for the signal chapter ---------- */

const RING_COUNT = 34;

function TunnelRings({ primary, signal }: { primary: string; signal: number }) {
  const ringGeometry = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k < 64; k++) {
      const a = (k / 64) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * 3.35, Math.sin(a) * 3.35, 0));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    const s = journey.current;
    const visible = ramp(s, signal - 0.6, 0.6) * (1 - ramp(s, signal + 0.55, 0.5));
    group.current.visible = visible > 0.01;
    group.current.children.forEach((child, j) => {
      const ring = child as THREE.LineLoop<THREE.BufferGeometry, THREE.LineBasicMaterial>;
      ring.material.opacity = 0.4 * visible;
      ring.rotation.z = t * 0.2 * (j % 2 ? 1 : -1);
      ring.scale.setScalar(1 + 0.04 * Math.sin(t * 3 - j * 0.5));
    });
  });

  return (
    <group ref={group}>
      {Array.from({ length: RING_COUNT }, (_, j) => (
        <lineLoop key={j} geometry={ringGeometry} position={[0, 0, 2 - j * 2]}>
          <lineBasicMaterial color={primary} transparent opacity={0} depthWrite={false} />
        </lineLoop>
      ))}
    </group>
  );
}

/* ---------- traces: one glowing star per visitor on the wall ---------- */

/** Star colours come from the theme, not from where people came from (that stays private). */
function TraceStars({ palette, traces: chapter }: { palette: string[]; traces: number }) {
  const { traces } = useTraces();
  const group = useRef<THREE.Group>(null);

  const stars = useMemo(
    () =>
      traces.map((t) => {
        const r = hashRandom(t.id);
        return {
          id: t.id,
          color: palette[Math.floor(r() * palette.length) % palette.length],
          createdAt: t.createdAt,
          position: [(r() * 2 - 1) * 8.5, (r() * 2 - 1) * 4.5, -69.6] as [number, number, number],
          base: 0.7 + r() * 0.4,
          phase: r() * 6.3,
        };
      }),
    [traces, palette],
  );

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    const s = journey.current;
    const wall = ramp(s, chapter - 0.65, 0.55) * (1 - ramp(s, chapter + 0.45, 0.4));
    const now = Date.now();
    group.current.children.forEach((child, i) => {
      const star = stars[i];
      if (!star) return;
      const sprite = child as THREE.Sprite;
      const age = (now - star.createdAt) / 1000;
      // A freshly sent trace pops in and stays lit for a few seconds.
      const pop = age < 1.5 ? (1 - age / 1.5) * 3 : 0;
      sprite.material.opacity = Math.min(1, wall + (age < 4 ? 1 : 0));
      sprite.scale.setScalar(star.base * (0.8 + 0.3 * Math.sin(t * 2 + star.phase)) + pop);
    });
  });

  return (
    <group ref={group}>
      {stars.map((star) => (
        <sprite key={star.id} position={star.position}>
          <spriteMaterial
            map={glowTexture()}
            color={star.color}
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      ))}
    </group>
  );
}
