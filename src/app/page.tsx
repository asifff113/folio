import type { CSSProperties } from "react";
import { otherPlatform } from "@/config/site";
import { getSiteContent } from "@/lib/content";
import { BackToTop } from "@/components/chapters/BackToTop";
import { BootLog } from "@/components/chapters/BootLog";
import { Chapter, Panel } from "@/components/chapters/Chapter";
import { HelpPanel } from "@/components/chapters/HelpPanel";
import { TracePanel } from "@/components/chapters/TracePanel";
import { Hud } from "@/components/hud/Hud";
import { JourneyCanvas } from "@/components/journey/JourneyCanvas";
import { ScrollDriver } from "@/components/journey/ScrollDriver";
import { journeyChapters } from "@/lib/journey/store";

/**
 * The scroll-driven 3D journey: one fixed WebGL world behind the chapters.
 * Scrolling between chapters morphs the particles and moves the camera.
 * Optional chapters (help) only appear when switched on and filled in.
 */
export default async function Home() {
  const site = await getSiteContent();
  const platforms = site.platforms.filter((p) => p.visible);
  const themeVars = {
    "--holo": site.theme.primary,
    "--pink": site.theme.secondary,
    "--holo-dim": `color-mix(in srgb, ${site.theme.primary} 20%, transparent)`,
  } as CSSProperties;
  const traceColors = Object.fromEntries([...platforms, otherPlatform].map((p) => [p.id, p.color]));
  const { items: helpItems, ...helpSettings } = site.help;
  const showHelp =
    helpSettings.enabled &&
    helpItems.some((i) => i.visible && (helpSettings.showSolved || i.status !== "solved"));
  const chapters = journeyChapters({ help: showHelp });
  const at = (key: (typeof chapters)[number]) => chapters.indexOf(key);

  return (
    <div style={themeVars}>
      <ScrollDriver />
      <JourneyCanvas theme={site.theme} traceColors={traceColors} chapters={chapters} />
      <Hud handle={site.handle} scanlines={site.theme.scanlines} chapters={chapters} />

      <main className="relative z-[3]">
        <Chapter index={at("BOOT")} align="boot">
          <div>
            <BootLog platformCount={platforms.length} />
            <h1 className="glitch font-display text-[clamp(56px,10vw,128px)] leading-[0.9] font-extrabold tracking-[-0.03em] text-[#dffaff]">
              {site.name}
            </h1>
            <p className="mt-4 mb-[26px] font-mono text-[16px] text-[#a9e3f2]">
              {"// "}
              {site.tagline}
            </p>
            <p className="scroll-cue">
              <i />
              SCROLL TO ENTER
            </p>
          </div>
        </Chapter>

        <Chapter index={at("ABOUT")}>
          <Panel eyebrow="// about">
            <h2 className="panel-title">{site.about.heading}</h2>
            <p className="panel-text">{site.about.body}</p>
          </Panel>
        </Chapter>

        <Chapter index={at("INTERESTS")} align="right">
          <Panel eyebrow="// interests">
            <h2 className="panel-title">{site.interests.heading}</h2>
            <ul className="mt-2 flex flex-wrap gap-2.5">
              {site.interests.tags.map((tag) => (
                <li key={tag} className="border border-holo/30 bg-holo/[.06] px-3.5 py-2 font-mono text-[15px]">
                  {tag}
                </li>
              ))}
            </ul>
          </Panel>
        </Chapter>

        <Chapter index={at("SIGNAL")}>
          <Panel eyebrow="// signal">
            <h2 className="panel-title">Find me on.</h2>
            <ul className="mt-2">
              {platforms.map((p) => (
                <li key={p.id} className="flex items-baseline gap-3 py-2.5 font-mono text-[16px] text-[#cdf4ff]">
                  <i className="size-[9px] flex-none self-center rounded-full" style={{ background: p.color }} />
                  <span>{p.label.toLowerCase()}</span>
                  <span className="flex-1 border-b border-dotted border-holo/35" />
                  {p.url ? (
                    <a className="text-holo hover:underline" href={p.url} target="_blank" rel="noopener noreferrer">
                      connect ↗
                    </a>
                  ) : (
                    <span className="text-muted">not set</span>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        </Chapter>

        {showHelp && (
          <Chapter index={at("HELP")} align="center">
            <HelpPanel settings={helpSettings} items={helpItems} />
          </Chapter>
        )}

        <Chapter index={at("TRACES")} align="right">
          <TracePanel platforms={[...platforms, otherPlatform]} />
        </Chapter>

        <Chapter index={at("END")}>
          <Panel eyebrow="// end of transmission">
            <h2 className="panel-title">More chapters plug in here.</h2>
            <p className="panel-text">
              Every section switched on in the admin panel becomes its own chapter in this journey, with its own shape
              and camera move.
            </p>
            <ul className="mt-2 mb-5 grid grid-cols-2 gap-x-5 gap-y-1 max-[720px]:grid-cols-1">
              {site.sections.map((section) => (
                <li
                  key={section.key}
                  className="flex justify-between gap-2 border-b border-holo/10 py-1.5 font-mono text-[14px] text-[#a9cfdc]"
                >
                  {section.title.toLowerCase()}
                  {section.enabled ? (
                    <span className="text-[11px] tracking-widest text-holo">ONLINE</span>
                  ) : (
                    <span className="text-[11px] tracking-widest text-[#ff7ad9]">OFFLINE</span>
                  )}
                </li>
              ))}
            </ul>
            <BackToTop />
          </Panel>
        </Chapter>
      </main>
    </div>
  );
}
