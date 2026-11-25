"use client";

import { useActionState, useState } from "react";
import { type SceneSettings, SHAPES, type ShapeName, sceneNumbers } from "@/config/customize";
import { saveScene } from "@/app/admin/actions";
import { Check, Group, Slider } from "./controls";
import { SaveBar } from "./ui";

type ChapterRow = { key: string; name: string; usual: ShapeName | "tunnel" | "wall"; fixed?: boolean };

/** Particle shape per chapter, particles, motion and scene extras. */
export function SceneForm({ scene: initial, chapters }: { scene: SceneSettings; chapters: ChapterRow[] }) {
  const [state, action] = useActionState(saveScene, null);
  const [scene, setScene] = useState(initial);
  const set = <K extends keyof SceneSettings>(key: K, value: SceneSettings[K]) =>
    setScene((s) => ({ ...s, [key]: value }));
  const n = sceneNumbers(scene);

  const setShape = (key: string, value: string) =>
    setScene((s) => {
      const shapes = { ...s.shapes };
      if (value === "") delete shapes[key];
      else shapes[key] = value as ShapeName;
      return { ...s, shapes };
    });

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="scene" value={JSON.stringify(scene)} />

      <Group title="shape per chapter">
        <div className="grid gap-x-8 gap-y-2.5 lg:grid-cols-2">
          {chapters.map((c) => (
            <label key={c.key} className="grid grid-cols-[130px_minmax(0,1fr)] items-center gap-3">
              <span className="truncate font-mono text-[13px] text-[#d6f6ff]">{c.name}</span>
              {c.fixed ? (
                <span className="text-input flex items-center text-muted">{c.usual} (always)</span>
              ) : (
                <select
                  value={scene.shapes[c.key] ?? ""}
                  onChange={(e) => setShape(c.key, e.target.value)}
                  className="text-input cursor-pointer"
                  aria-label={`${c.name} shape`}
                >
                  <option value="">usual ({c.usual})</option>
                  {SHAPES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              )}
            </label>
          ))}
        </div>
        <p className="text-[13px] text-muted">
          The connect chapter is always the tunnel and traces the star wall, because the camera travels through them.
          Sections you switch on later start with their usual shape.
        </p>
      </Group>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Group title="particles">
          <Slider label="Amount" value={scene.amount} onChange={(v) => set("amount", v)} show={n.count.toLocaleString("en")} />
          <Slider label="Size" value={scene.size} onChange={(v) => set("size", v)} show={`${(n.size / 0.13).toFixed(1)}×`} />
          <Slider
            label="Accent share"
            value={scene.accent}
            onChange={(v) => set("accent", v)}
            show={`${Math.round(n.accent * 100)}%`}
          />
          <p className="text-[13px] text-muted">Phones get about two thirds of the particles so they stay smooth.</p>
        </Group>

        <Group title="motion & camera">
          <Slider label="Scroll smoothness" value={scene.smooth} onChange={(v) => set("smooth", v)} />
          <Slider label="Idle spin" value={scene.spin} onChange={(v) => set("spin", v)} />
          <Slider label="Mouse sway" value={scene.sway} onChange={(v) => set("sway", v)} />
          <Slider label="Morph burst" value={scene.burst} onChange={(v) => set("burst", v)} />
          <p className="text-[13px] text-muted">Visitors who ask their device for reduced motion always get calm motion.</p>
        </Group>
      </div>

      <Group title="scene extras">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Check label="Grid floor" hint="the moving neon floor" checked={scene.grid} onChange={(v) => set("grid", v)} />
          <Check
            label="Hologram core"
            hint="wireframe at the start and end"
            checked={scene.hologram}
            onChange={(v) => set("hologram", v)}
          />
          <Check label="Tunnel rings" hint="in the connect chapter" checked={scene.rings} onChange={(v) => set("rings", v)} />
          <Check label="Background stars" hint="faint far-away stars" checked={scene.stars} onChange={(v) => set("stars", v)} />
          <Check
            label="Shooting stars"
            hint="now and then, across the sky"
            checked={scene.shooting}
            onChange={(v) => set("shooting", v)}
          />
          <Check
            label="Light beams"
            hint="soft beams behind the first chapters"
            checked={scene.beams}
            onChange={(v) => set("beams", v)}
          />
        </div>
      </Group>

      <div className="panel max-w-none py-4">
        <SaveBar state={state} />
      </div>
    </form>
  );
}
