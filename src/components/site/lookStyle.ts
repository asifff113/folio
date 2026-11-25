import type { CSSProperties } from "react";
import { FONT_PAIRS, lerp } from "@/config/customize";
import type { SiteConfig } from "@/config/site";

/** CSS variables for the page from the theme colors and the Look settings. */
export function lookStyle(site: SiteConfig): CSSProperties {
  const { look, theme } = site;
  const fonts = FONT_PAIRS.find((f) => f.id === look.font) ?? FONT_PAIRS[0];
  return {
    "--holo": theme.primary,
    "--pink": theme.secondary,
    "--holo-dim": `color-mix(in srgb, ${theme.primary} 20%, transparent)`,
    "--fp-display": `var(${fonts.display})`,
    "--fp-body": `var(${fonts.body})`,
    "--text-scale": String(look.textScale / 100),
    "--glass-blur": `${Math.round(lerp(look.blur, 0, 28))}px`,
    "--box-alpha": lerp(look.boxOpacity, 0.15, 1.9).toFixed(2),
    "--glow-k": lerp(look.glow, 0, 2.2).toFixed(2),
  } as CSSProperties;
}
