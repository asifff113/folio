"use client";

import { type CSSProperties, useActionState, useState } from "react";
import { FONT_PAIRS, HUD_STYLES, lerp, type LookSettings } from "@/config/customize";
import { defaultSite, type Theme } from "@/config/site";
import { saveLook } from "@/app/admin/actions";
import { Check, Group, Slider } from "./controls";
import { SaveBar } from "./ui";

const PRESETS: { name: string; primary: string; secondary: string }[] = [
  { name: "hologram", primary: "#2fe3ff", secondary: "#ff4fd8" },
  { name: "acid", primary: "#b6ff3b", secondary: "#3bffd0" },
  { name: "ember", primary: "#ffb23b", secondary: "#ff3b6b" },
  { name: "violet", primary: "#a58bff", secondary: "#3bd5ff" },
  { name: "mono", primary: "#e4f6ff", secondary: "#7fa6b8" },
];

const HUD_NAMES: Record<(typeof HUD_STYLES)[number], string> = {
  full: "Full frame",
  minimal: "Minimal",
  off: "Off",
};

/** Colors, fonts, glow, glass, effects and the HUD, with a live preview. */
export function LookForm({ theme, look: initial }: { theme: Theme; look: LookSettings }) {
  const [state, action] = useActionState(saveLook, null);
  const [primary, setPrimary] = useState(theme.primary);
  const [secondary, setSecondary] = useState(theme.secondary);
  const [scanlines, setScanlines] = useState(theme.scanlines);
  const [look, setLook] = useState(initial);
  const set = <K extends keyof LookSettings>(key: K, value: LookSettings[K]) => setLook((l) => ({ ...l, [key]: value }));
  const fonts = FONT_PAIRS.find((f) => f.id === look.font) ?? FONT_PAIRS[0];

  return (
    <form action={action} className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <input type="hidden" name="look" value={JSON.stringify(look)} />
      <input type="hidden" name="primary" value={primary} />
      <input type="hidden" name="secondary" value={secondary} />
      {scanlines && <input type="hidden" name="scanlines" value="on" />}

      <div className="flex flex-col gap-4">
        <Group title="colors">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                className="chip"
                aria-pressed={p.primary === primary && p.secondary === secondary}
                onClick={() => {
                  setPrimary(p.primary);
                  setSecondary(p.secondary);
                }}
              >
                <i style={{ background: p.primary }} />
                <i style={{ background: p.secondary }} />
                {p.name}
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ColorInput label="primary" value={primary} onChange={setPrimary} />
            <ColorInput label="accent" value={secondary} onChange={setSecondary} />
          </div>
          <button
            type="button"
            className="ghost-btn self-start"
            onClick={() => {
              setPrimary(defaultSite.theme.primary);
              setSecondary(defaultSite.theme.secondary);
            }}
          >
            reset colors
          </button>
        </Group>

        <Group title="fonts">
          <div role="radiogroup" aria-label="Font pair" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            {FONT_PAIRS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={look.font === f.id}
                onClick={() => set("font", f.id)}
                className={`flex min-h-[120px] cursor-pointer flex-col items-start gap-2 border p-3 text-left ${
                  look.font === f.id ? "border-pink bg-pink/10" : "border-holo/25 bg-[rgba(2,10,16,.5)] hover:border-holo/60"
                }`}
              >
                <span className="max-w-full overflow-hidden text-[20px] leading-none font-extrabold" style={{ fontFamily: `var(${f.display})` }}>
                  NAME
                </span>
                <span className="text-[13px] leading-snug text-[#b9d6e2]" style={{ fontFamily: `var(${f.body})` }}>
                  Readable body text for the boxes.
                </span>
                <span className="mt-auto font-mono text-[11px] text-muted">{f.name}</span>
              </button>
            ))}
          </div>
          <Slider
            label="Text size"
            min={90}
            max={120}
            value={look.textScale}
            onChange={(v) => set("textScale", v)}
            show={`${look.textScale}%`}
          />
        </Group>

        <Group title="glow & atmosphere">
          <div className="grid gap-x-8 gap-y-3 2xl:grid-cols-2">
            <Slider label="Glow strength" value={look.glow} onChange={(v) => set("glow", v)} />
            <Slider label="Haze / fog" value={look.haze} onChange={(v) => set("haze", v)} />
            <Slider label="Glass blur" value={look.blur} onChange={(v) => set("blur", v)} />
            <Slider label="Box opacity" value={look.boxOpacity} onChange={(v) => set("boxOpacity", v)} />
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2.5">
            <Check label="Scanlines" checked={scanlines} onChange={setScanlines} />
            <Check label="Film grain" checked={look.grain} onChange={(v) => set("grain", v)} />
            <Check label="Vignette" checked={look.vignette} onChange={(v) => set("vignette", v)} />
            <Check label="Color fringe on the name" checked={look.fringe} onChange={(v) => set("fringe", v)} />
          </div>
        </Group>

        <Group title="HUD frame">
          <div role="radiogroup" aria-label="HUD style" className="grid gap-2.5 sm:grid-cols-3">
            {HUD_STYLES.map((h) => (
              <button
                key={h}
                type="button"
                role="radio"
                aria-checked={look.hud === h}
                onClick={() => set("hud", h)}
                className={`flex min-h-[86px] cursor-pointer flex-col gap-2 border p-2.5 text-left ${
                  look.hud === h ? "border-pink bg-pink/10" : "border-holo/25 bg-[rgba(2,10,16,.5)] hover:border-holo/60"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`relative h-10 border bg-void ${h === "full" ? "border-holo" : "border-holo/10"}`}
                >
                  <span className="absolute top-1 left-1.5 font-mono text-[8px] text-holo">
                    {h === "full" ? "SYS://NAME   ● 23:41" : h === "minimal" ? "" : ""}
                  </span>
                  {h !== "off" && <span className="absolute bottom-1 left-1.5 font-mono text-[8px] text-holo">04 / 10</span>}
                </span>
                <b className="text-[14px] font-semibold">{HUD_NAMES[h]}</b>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2.5">
            <Check label="Clock" checked={look.hudClock} onChange={(v) => set("hudClock", v)} />
            <Check label='"Online" dot' checked={look.hudOnline} onChange={(v) => set("hudOnline", v)} />
            <Check label="Chapter counter" checked={look.hudCounter} onChange={(v) => set("hudCounter", v)} />
            <Check label="Progress rail" checked={look.hudRail} onChange={(v) => set("hudRail", v)} />
          </div>
          <p className="text-[13px] text-muted">Clock and &quot;online&quot; dot show in the full frame only.</p>
        </Group>

        <div className="panel max-w-none py-4">
          <SaveBar state={state} />
        </div>
      </div>

      <Preview primary={primary} secondary={secondary} look={look} fonts={fonts} scanlines={scanlines} />
    </form>
  );
}

function Preview({
  primary,
  secondary,
  look,
  fonts,
  scanlines,
}: {
  primary: string;
  secondary: string;
  look: LookSettings;
  fonts: (typeof FONT_PAIRS)[number];
  scanlines: boolean;
}) {
  const alpha = lerp(look.boxOpacity, 0.15, 1.9);
  const glow = lerp(look.glow, 0, 2.2);
  const style = {
    "--holo": primary,
    "--pink": secondary,
    fontFamily: `var(${fonts.body})`,
  } as CSSProperties;
  return (
    <aside aria-label="Preview" className="sticky top-6 flex flex-col gap-2">
      <p className="font-mono text-[11px] tracking-[0.14em] text-muted">LIVE PREVIEW</p>
      <div
        style={style}
        className="relative h-[460px] overflow-hidden border border-holo/35 bg-[radial-gradient(ellipse_at_50%_40%,#0e2b38_0%,#05070c_70%)]"
      >
        {scanlines && <div className="hud-scanlines absolute!" aria-hidden="true" />}
        {look.vignette && <div className="look-vignette absolute!" aria-hidden="true" />}
        {look.hud === "full" && <span aria-hidden="true" className="absolute inset-1.5 border border-holo/25" />}
        {look.hud === "full" && (
          <span className="absolute top-2.5 left-3 font-mono text-[10px] tracking-[0.14em] text-holo">SYS://YOUR_NAME</span>
        )}
        {look.hud === "full" && (look.hudClock || look.hudOnline) && (
          <span className="absolute top-2.5 right-3 font-mono text-[10px] text-holo">
            {look.hudOnline ? "● " : ""}
            {look.hudClock ? "23:41" : ""}
          </span>
        )}
        <div
          aria-hidden="true"
          className="absolute top-[70px] left-1/2 size-[150px] -translate-x-1/2 rounded-full"
          style={{
            background: `radial-gradient(circle, color-mix(in srgb, ${primary} 55%, transparent) 0%, color-mix(in srgb, ${primary} 12%, transparent) 45%, transparent 70%)`,
            boxShadow: `0 0 ${Math.round(80 * glow)}px color-mix(in srgb, ${primary} ${Math.round(18 * glow)}%, transparent)`,
          }}
        />
        <div
          className="absolute inset-x-4 bottom-5 flex flex-col gap-2 border p-4"
          style={{
            borderColor: `color-mix(in srgb, ${primary} 35%, transparent)`,
            background: `linear-gradient(150deg, rgba(12,34,46,${(0.5 * alpha).toFixed(2)}), rgba(3,10,16,${(0.36 * alpha).toFixed(2)}))`,
            backdropFilter: `blur(${Math.round(lerp(look.blur, 0, 28))}px)`,
            zoom: look.textScale / 100,
          }}
        >
          <span className="font-mono text-[10px] tracking-[0.16em] text-holo">{"// ABOUT"}</span>
          <span
            className="text-[22px] leading-tight font-bold"
            style={{
              fontFamily: `var(${fonts.display})`,
              textShadow: look.fringe ? `2px 0 ${secondary}, -2px 0 ${primary}` : undefined,
            }}
          >
            Live preview
          </span>
          <span className="text-[13px] leading-relaxed text-[#b9d6e2]">Your fonts, glow and box style, before you save.</span>
        </div>
        {look.hud !== "off" && look.hudCounter && (
          <span className="absolute bottom-1.5 left-3 font-mono text-[9px] text-holo">02 / 08 ABOUT</span>
        )}
      </div>
      <p className="text-[12px] text-muted">The 3D glow and haze also change in the real site.</p>
    </aside>
  );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="field-label m-0">{label}</span>
      <div className="flex gap-2">
        <input
          type="color"
          aria-label={`${label} color picker`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-[44px] w-12 flex-none cursor-pointer border border-holo-dim bg-transparent p-0.5"
        />
        <input
          aria-label={`${label} color`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          pattern="#[0-9a-fA-F]{6}"
          required
          className="text-input"
        />
      </div>
    </div>
  );
}
