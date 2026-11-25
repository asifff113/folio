import type { SiteConfig } from "@/config/site";
import { defaultJourney } from "@/config/customize";
import { lookStyle } from "./lookStyle";

/** What visitors see while maintenance mode is on: a short message and your links. */
export function Maintenance({ site }: { site: SiteConfig }) {
  const links = site.platforms.filter((p) => p.visible && p.url);
  const { maintenanceTitle } = site.journey;
  // The default line points at your links; without any, say something that stands on its own.
  const maintenanceText =
    links.length === 0 && site.journey.maintenanceText === defaultJourney.maintenanceText
      ? "I'm rebuilding a few things. Check back soon."
      : site.journey.maintenanceText;
  return (
    <div style={lookStyle(site)} className="site maintenance">
      <div className="hud-scanlines" aria-hidden="true" />
      <span className="maintenance-frame" aria-hidden="true" />
      <p className="absolute top-[max(28px,4vh)] left-[max(28px,3vw)] font-mono text-[12px] tracking-[0.14em] text-[#ffb23b]">
        SYS://{site.handle.toUpperCase()} · MAINTENANCE
      </p>

      <main className="relative z-[1] flex min-h-svh flex-col items-center justify-center gap-10 px-5 py-24 text-center">
        <div className="maintenance-orb" aria-hidden="true">
          <i />
        </div>
        <div className="panel flex flex-col items-center gap-4" style={{ borderColor: "rgba(255,178,59,.45)" }}>
          <h1 className="font-display text-[clamp(40px,6vw,72px)] leading-none font-extrabold">{maintenanceTitle}</h1>
          {maintenanceText && <p className="panel-text m-0 text-[#e2d3b4]">{maintenanceText}</p>}
          {links.length > 0 && (
            <ul className="mt-2 flex flex-wrap justify-center gap-2.5">
              {links.map((p) => (
                <li key={p.id}>
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="btn flex items-center gap-2 no-underline">
                    <i className="size-2.5 rounded-full" style={{ background: p.color }} aria-hidden="true" />
                    {p.label.toLowerCase()} ↗
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
