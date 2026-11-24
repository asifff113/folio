"use client";

import { useActionState, useState } from "react";
import { defaultSite, type Theme } from "@/config/site";
import { saveTheme } from "@/app/admin/actions";
import { Field, SaveBar } from "./ui";

const PRESETS: { name: string; primary: string; secondary: string }[] = [
  { name: "hologram", primary: "#2fe3ff", secondary: "#ff4fd8" },
  { name: "acid", primary: "#b6ff3b", secondary: "#3bffd0" },
  { name: "ember", primary: "#ffb23b", secondary: "#ff3b6b" },
  { name: "violet", primary: "#a58bff", secondary: "#3bd5ff" },
  { name: "mono", primary: "#e4f6ff", secondary: "#7fa6b8" },
];

export function ThemeForm({ theme }: { theme: Theme }) {
  const [state, action] = useActionState(saveTheme, null);
  const [primary, setPrimary] = useState(theme.primary);
  const [secondary, setSecondary] = useState(theme.secondary);

  return (
    <form action={action} className="panel max-w-none">
      <p className="eyebrow">{"// colors"}</p>

      <div className="mb-5 flex flex-wrap gap-2">
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

      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label="primary" htmlFor="primary" hint="HUD, links and most particles.">
          <ColorInput id="primary" value={primary} onChange={setPrimary} />
        </Field>
        <Field label="accent" htmlFor="secondary" hint="Glitch edges, outer shell, some particles.">
          <ColorInput id="secondary" value={secondary} onChange={setSecondary} />
        </Field>
      </div>

      {/* Live preview of the HUD in the chosen colors. */}
      <div
        className="relative mt-1 overflow-hidden border p-5"
        style={{ borderColor: `${primary}55`, background: "#05070c" }}
        aria-hidden="true"
      >
        <p className="font-mono text-[11px] tracking-[0.14em]" style={{ color: primary }}>
          SYS://PREVIEW <span className="blink">●</span>
        </p>
        <p
          className="mt-2 font-display text-4xl font-extrabold tracking-tight text-[#dffaff]"
          style={{ textShadow: `3px 0 ${secondary}, -3px 0 ${primary}` }}
        >
          NAME
        </p>
        <div className="mt-3 flex gap-1.5">
          {Array.from({ length: 24 }, (_, i) => (
            <span
              key={i}
              className="size-1.5 rounded-full"
              style={{ background: i % 6 === 0 ? secondary : primary, boxShadow: `0 0 6px ${primary}` }}
            />
          ))}
        </div>
      </div>

      <p className="eyebrow mt-6">{"// effects"}</p>
      <label className="flex cursor-pointer items-center gap-2 font-mono text-xs text-fg">
        <input
          type="checkbox"
          name="scanlines"
          defaultChecked={theme.scanlines}
          className="accent-[var(--holo)]"
        />
        CRT scanlines over the page
      </label>

      <button
        type="button"
        className="ghost-btn mt-4"
        onClick={() => {
          setPrimary(defaultSite.theme.primary);
          setSecondary(defaultSite.theme.secondary);
        }}
      >
        reset colors
      </button>

      <SaveBar state={state} />
    </form>
  );
}

function ColorInput({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2">
      <input
        type="color"
        aria-label={`${id} color picker`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-[38px] w-11 flex-none cursor-pointer border border-holo-dim bg-transparent p-0.5"
      />
      <input
        id={id}
        name={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        pattern="#[0-9a-fA-F]{6}"
        required
        className="text-input"
      />
    </div>
  );
}
