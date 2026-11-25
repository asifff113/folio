import type { CSSProperties } from "react";
import QRCode from "qrcode";
import { otherPlatform, type Platform } from "@/config/site";
import { getSiteContent } from "@/lib/content";
import { BackToTop } from "@/components/chapters/BackToTop";
import { Chapter, Panel } from "@/components/chapters/Chapter";
import { ConnectPanel } from "@/components/chapters/ConnectPanel";
import { HelpPanel } from "@/components/chapters/HelpPanel";
import { TracePanel } from "@/components/chapters/TracePanel";
import { WaveName } from "@/components/chapters/WaveName";
import { Hud } from "@/components/hud/Hud";
import { SectionPanel } from "@/components/sections/SectionPanel";
import { JourneyCanvas } from "@/components/journey/JourneyCanvas";
import { ScrollDriver } from "@/components/journey/ScrollDriver";
import { journeyChapters } from "@/lib/journey/store";
import { sectionHasContent } from "@/lib/sections";

/** QR codes (as SVG) for platforms set to "generated", dark on light so every phone can scan them. */
async function qrCodesFor(platforms: Platform[]) {
  const entries = await Promise.all(
    platforms
      .filter((p) => p.qr === "generated" && p.url)
      .map(async (p) => {
        const svg = await QRCode.toString(p.url, {
          type: "svg",
          margin: 1,
          errorCorrectionLevel: "M",
          color: { dark: "#05070c", light: "#e8fbff" },
        });
        return [p.id, svg] as const;
      }),
  );
  return Object.fromEntries(entries);
}

/**
 * The scroll-driven 3D journey: one fixed WebGL world behind the chapters.
 * Scrolling between chapters morphs the particles and moves the camera.
 * Optional chapters (sections, help, traces) only appear when switched on and filled in.
 */
export default async function Home() {
  const site = await getSiteContent();
  const platforms = site.platforms.filter((p) => p.visible);
  const themeVars = {
    "--holo": site.theme.primary,
    "--pink": site.theme.secondary,
    "--holo-dim": `color-mix(in srgb, ${site.theme.primary} 20%, transparent)`,
  } as CSSProperties;
  const { items: helpItems, ...helpSettings } = site.help;
  const showHelp =
    helpSettings.enabled &&
    helpItems.some((i) => i.visible && (helpSettings.showSolved || i.status !== "solved"));
  const showTraces = site.traces.enabled;
  // Sections you switched on that have something to show, in your order.
  const sections = site.sections.filter((s) => s.enabled && sectionHasContent(s));
  const chapters = journeyChapters({ help: showHelp, traces: showTraces, sections: sections.map((s) => s.key) });
  const at = (key: (typeof chapters)[number]) => chapters.indexOf(key);
  const qrCodes = await qrCodesFor(platforms);

  return (
    <div style={themeVars}>
      <ScrollDriver />
      <JourneyCanvas theme={site.theme} chapters={chapters} />
      <Hud handle={site.handle} scanlines={site.theme.scanlines} chapters={chapters} />

      <main className="relative z-[3]">
        <Chapter index={at("BOOT")}>
          <div className="boot-hero">
            <div className="holo-avatar">
              {/* eslint-disable-next-line @next/next/no-img-element -- uploaded picture or the built-in placeholder */}
              <img src={site.avatar || "/avatar-placeholder.svg"} alt={`Picture of ${site.name}`} />
              <i className="ring" aria-hidden="true" />
              <i className="ring outer" aria-hidden="true" />
              <i className="scan" aria-hidden="true" />
            </div>
            <WaveName
              name={site.name}
              className="font-display text-[clamp(56px,10vw,132px)] leading-[0.9] font-extrabold tracking-[-0.03em] text-[#dffaff]"
            />
          </div>
        </Chapter>

        <Chapter index={at("ABOUT")}>
          <Panel eyebrow="// about">
            <h2 className="panel-title">{site.about.heading}</h2>
            <p className="panel-text">{site.about.body}</p>
          </Panel>
        </Chapter>

        <Chapter index={at("INTERESTS")}>
          <Panel eyebrow="// interests">
            <h2 className="panel-title">{site.interests.heading}</h2>
            <ul className="mt-3 flex flex-wrap gap-3">
              {site.interests.tags.map((tag) => (
                <li
                  key={tag}
                  className="border border-holo/35 bg-holo/[.07] px-4 py-2.5 font-mono text-[16px] text-[#d6f6ff]"
                >
                  {tag}
                </li>
              ))}
            </ul>
          </Panel>
        </Chapter>

        {sections.map((section) => (
          <Chapter key={section.key} index={at(`S:${section.key}`)}>
            <SectionPanel section={section} />
          </Chapter>
        ))}

        <Chapter index={at("SIGNAL")}>
          <ConnectPanel platforms={platforms} qrCodes={qrCodes} />
        </Chapter>

        {showHelp && (
          <Chapter index={at("HELP")}>
            <HelpPanel settings={helpSettings} items={helpItems} />
          </Chapter>
        )}

        {showTraces && (
          <Chapter index={at("TRACES")}>
            <TracePanel platforms={[...platforms, otherPlatform]} settings={site.traces} />
          </Chapter>
        )}

        <Chapter index={at("END")}>
          <Panel eyebrow="// end of transmission">
            <h2 className="panel-title">Thanks for stopping by.</h2>
            <p className="panel-text">
              {showTraces ? "Leave a trace on your way out, or come back any time." : "Come back any time."} The signal stays
              on.
            </p>
            <div className="mt-6">
              <BackToTop />
            </div>
          </Panel>
        </Chapter>
      </main>
    </div>
  );
}
