"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";
import type { Theme } from "@/config/site";
import {
  bloomFrom,
  fogFrom,
  type LookSettings,
  type SceneSettings,
  type ShapeName,
  sceneNumbers,
} from "@/config/customize";
import { type ChapterKey, type FixedChapter, clamp, isSectionChapter, journey, ramp, smooth } from "@/lib/journey/store";
import { useTraces } from "@/lib/traces/store";
import { buildParticles, glowTexture, hashRandom } from "./shapes";

type SceneProps = {
  theme: Theme;
  /** Chapters present, in scroll order. */
  chapters: ChapterKey[];
  look: LookSettings;
  scene: SceneSettings;
};

/** The whole WebGL world. Every part reads `journey.current` each frame. */
export default function Scene({ theme, chapters, look, scene }: SceneProps) {
  const last = chapters.length - 1;
  const at = (key: ChapterKey) => chapters.indexOf(key);
  const n = sceneNumbers(scene);
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
      <fogExp2 attach="fog" args={["#05070c", fogFrom(look)]} />
      <CameraRig chapters={chapters} sway={n.sway} />
      <Particles
        primary={theme.primary}
        secondary={theme.secondary}
        chapters={chapters}
        signal={at("SIGNAL")}
        count={n.count}
        size={n.size}
        accent={n.accent}
        spinSpeed={n.spin}
        burst={n.burst}
        shapes={scene.shapes}
      />
      {scene.hologram && (
        <Hologram primary={theme.primary} secondary={theme.secondary} signal={at("SIGNAL")} last={last} />
      )}
      {scene.grid && <GridFloor primary={theme.primary} />}
      {scene.rings && at("SIGNAL") >= 0 && <TunnelRings primary={theme.primary} signal={at("SIGNAL")} />}
      {scene.stars && <BackgroundStars primary={theme.primary} />}
      {scene.shooting && <ShootingStars primary={theme.primary} />}
      {scene.beams && <LightBeams primary={theme.primary} secondary={theme.secondary} signal={at("SIGNAL")} />}
      {at("TRACES") >= 0 && (
        <TraceStars palette={[theme.primary, theme.secondary, "#bff6ff", "#a58bff"]} traces={at("TRACES")} />
      )}
      <EffectComposer>
        <Bloom mipmapBlur intensity={bloomFrom(look)} luminanceThreshold={0.25} luminanceSmoothing={0.3} />
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

function CameraRig({ chapters, sway }: { chapters: ChapterKey[]; sway: number }) {
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
    cam.position.set(pos.x + p.x * sway, pos.y + p.y * sway * 0.67, pos.z);
    cam.lookAt(look);
  });

  return null;
}

/* ---------- particles: morph between chapter shapes ---------- */

type Colors = { primary: string; secondary: string };

type ParticleProps = Colors & {
  chapters: ChapterKey[];
  signal: number;
  count: number;
  size: number;
  accent: number;
  spinSpeed: number;
  burst: number;
  shapes: Record<string, ShapeName>;
};

function Particles({ primary, secondary, chapters, signal, count, size, accent, spinSpeed, burst: burstK, shapes }: ParticleProps) {
  const data = useMemo(
    // Phones get about two thirds of the particles so they stay smooth.
    () =>
      buildParticles(window.innerWidth < 720 ? Math.round(count * 0.64) : count, primary, secondary, chapters, {
        accent,
        shapes,
      }),
    [primary, secondary, chapters, count, accent, shapes],
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
      const burst = Math.sin(Math.PI * e) * (1.2 + sd * 2.2) * burstK;
      pos[i3] = A[i3] + (B[i3] - A[i3]) * e + data.dir[i3] * burst + Math.sin(t * 1.3 + sd * 40) * wobble;
      pos[i3 + 1] = A[i3 + 1] + (B[i3 + 1] - A[i3 + 1]) * e + data.dir[i3 + 1] * burst + Math.cos(t * 1.1 + sd * 30) * wobble;
      pos[i3 + 2] = A[i3 + 2] + (B[i3 + 2] - A[i3 + 2]) * e + data.dir[i3 + 2] * burst;
    }
    attr.needsUpdate = true;

    // The shapes around the origin (galaxy, helix, sections) turn slowly; before the
    // tunnel the cloud eases back to a whole turn so the far shapes sit straight.
    if (journey.reducedMotion) spin.current = 0;
    else if (s > 0.5 && (signal < 0 || s < signal - 0.9)) spin.current += Math.min(dt, 0.1) * spinSpeed;
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
        size={size}
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

/* ---------- optional extras (3D settings) ---------- */

/** Faint far-away stars all around, untouched by the fog. */
function BackgroundStars({ primary }: { primary: string }) {
  const points = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const n = 1400;
    const pos = new Float32Array(n * 3);
    const rnd = hashRandom("background-stars");
    for (let i = 0; i < n; i++) {
      const th = rnd() * Math.PI * 2;
      const ph = Math.acos(2 * rnd() - 1);
      const R = 110 + rnd() * 40;
      pos[i * 3] = Math.sin(ph) * Math.cos(th) * R;
      pos[i * 3 + 1] = Math.abs(Math.cos(ph)) * R * 0.8 - 10;
      pos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * R - 35;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  const color = useMemo(() => new THREE.Color(primary).lerp(new THREE.Color("#ffffff"), 0.7), [primary]);

  useFrame(({ clock }) => {
    if (!points.current) return;
    const m = points.current.material as THREE.PointsMaterial;
    m.opacity = 0.55 + Math.sin(clock.elapsedTime * 0.7) * 0.15;
    points.current.rotation.y = clock.elapsedTime * 0.004;
  });

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        size={0.55}
        map={glowTexture()}
        color={color}
        transparent
        opacity={0.6}
        depthWrite={false}
        fog={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/** Now and then a streak crosses the sky. */
function ShootingStars({ primary }: { primary: string }) {
  const mesh = useRef<THREE.Mesh>(null);
  const state = useRef({ next: 3, t: -1, from: new THREE.Vector3(), dir: new THREE.Vector3() });

  useFrame(({ clock, camera }, dt) => {
    const m = mesh.current;
    if (!m) return;
    const st = state.current;
    const now = clock.elapsedTime;
    if (st.t < 0 && now > st.next && !journey.reducedMotion) {
      // Start somewhere ahead of the camera, up in the sky.
      const ahead = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      st.from
        .copy(camera.position)
        .addScaledVector(ahead, 40)
        .add(new THREE.Vector3((Math.random() - 0.5) * 40, 10 + Math.random() * 8, 0));
      st.dir.set(-0.8 - Math.random() * 0.4, -0.45, (Math.random() - 0.5) * 0.3).normalize();
      st.t = 0;
    }
    if (st.t >= 0) {
      st.t += dt;
      const life = 1.1;
      const k = st.t / life;
      m.visible = k < 1;
      m.position.copy(st.from).addScaledVector(st.dir, st.t * 38);
      m.lookAt(m.position.clone().add(st.dir));
      m.rotateY(Math.PI / 2);
      (m.material as THREE.MeshBasicMaterial).opacity = Math.sin(Math.PI * Math.min(1, k)) * 0.9;
      if (k >= 1) {
        st.t = -1;
        st.next = now + 5 + Math.random() * 9;
      }
    } else m.visible = false;
  });

  return (
    <mesh ref={mesh} visible={false}>
      <planeGeometry args={[4.5, 0.05]} />
      <meshBasicMaterial
        color={primary}
        transparent
        opacity={0}
        depthWrite={false}
        fog={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

/** Soft beams of light turning slowly behind the first chapters. */
function LightBeams({ primary, secondary, signal }: Colors & { signal: number }) {
  const group = useRef<THREE.Group>(null);
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 4;
    c.height = 128;
    const g = c.getContext("2d")!;
    const gr = g.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, "rgba(255,255,255,0)");
    gr.addColorStop(0.5, "rgba(255,255,255,1)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 4, 128);
    return new THREE.CanvasTexture(c);
  }, []);
  const beams = [
    { color: primary, x: -5, rot: 0.35, w: 2.2 },
    { color: secondary, x: 1.5, rot: -0.2, w: 1.4 },
    { color: primary, x: 6, rot: 0.15, w: 3 },
  ];

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const s = journey.current;
    const fade = signal < 0 ? 1 : 1 - ramp(s, signal - 1, 0.8);
    g.visible = fade > 0.01;
    g.rotation.y = Math.sin(clock.elapsedTime * 0.08) * 0.5;
    g.children.forEach((child, i) => {
      const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      mat.opacity = (0.07 + Math.sin(clock.elapsedTime * 0.5 + i * 2) * 0.03) * fade;
    });
  });

  return (
    <group ref={group} position={[0, 0, -9]}>
      {beams.map((b, i) => (
        <mesh key={i} position={[b.x, 2, 0]} rotation={[0, 0, b.rot]}>
          <planeGeometry args={[b.w, 26]} />
          <meshBasicMaterial
            map={texture}
            color={b.color}
            transparent
            opacity={0.08}
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}
