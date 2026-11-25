import type { ReactNode } from "react";
import QRCode from "qrcode";
import { otherPlatform, type Platform, type SiteConfig } from "@/config/site";
import { BackToTop } from "@/components/chapters/BackToTop";
import { Chapter, Panel } from "@/components/chapters/Chapter";
import { ConnectPanel } from "@/components/chapters/ConnectPanel";
import { HelpPanel } from "@/components/chapters/HelpPanel";
import { TracePanel } from "@/components/chapters/TracePanel";
import { WaveName } from "@/components/chapters/WaveName";
import { Hud } from "@/components/hud/Hud";
import { JourneyCanvas } from "@/components/journey/JourneyCanvas";
import { ScrollDriver } from "@/components/journey/ScrollDriver";
import { SectionPanel } from "@/components/sections/SectionPanel";
import { type ChapterKey, isSectionChapter, journeyChapters } from "@/lib/journey/store";
import { sectionHasContent } from "@/lib/sections";
import { defaultJourney, sceneNumbers } from "@/config/customize";
import { Intro } from "./Intro";
import { lookStyle } from "./lookStyle";

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
 * Chapters come in the order set in /admin/journey; optional ones (sections,
 * help, traces) only appear when switched on and filled in.
 */
export async function SiteJourney({ site, banner }: { site: SiteConfig; banner?: ReactNode }) {
  const { look, journey } = site;
  const platforms = site.platforms.filter((p) => p.visible);
  const { items: helpItems, ...helpSettings } = site.help;
  const showHelp =
    helpSettings.enabled && helpItems.some((i) => i.visible && (helpSettings.showSolved || i.status !== "solved"));
  const showTraces = site.traces.enabled;
  // Sections you switched on that have something to show, in their own order.
  const sections = site.sections.filter((s) => s.enabled && sectionHasContent(s));
  const chapters = journeyChapters({
    help: showHelp,
    traces: showTraces,
    sections: sections.map((s) => s.key),
    order: journey.order,
  });
  const qrCodes = await qrCodesFor(platforms);
  const endText =
    !showTraces && journey.endText === defaultJourney.endText ? "Come back any time. The signal stays on." : journey.endText;

  const chapter = (key: ChapterKey): ReactNode => {
    if (isSectionChapter(key)) {
      const section = sections.find((s) => `S:${s.key}` === key);
      return section && <SectionPanel section={section} />;
    }
    switch (key) {
      case "BOOT":
        return (
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
              className={`font-display text-[clamp(56px,10vw,132px)] leading-[0.9] font-extrabold tracking-[-0.03em] text-[#dffaff] ${
                look.fringe ? "" : "no-fringe"
              }`}
            />
          </div>
        );
      case "ABOUT":
        return (
          <Panel eyebrow="// about">
            <h2 className="panel-title">{site.about.heading}</h2>
            <p className="panel-text">{site.about.body}</p>
          </Panel>
        );
      case "INTERESTS":
        return (
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
        );
      case "SIGNAL":
        return <ConnectPanel platforms={platforms} qrCodes={qrCodes} title={journey.connectTitle} />;
      case "HELP":
        return <HelpPanel settings={helpSettings} items={helpItems} />;
      case "TRACES":
        return (
          <TracePanel
            platforms={[...platforms, otherPlatform]}
            settings={site.traces}
            title={journey.tracesTitle}
            text={journey.tracesText}
          />
        );
      case "END":
        return (
          <Panel eyebrow="// end of transmission">
            <h2 className="panel-title">{journey.endTitle}</h2>
            {endText && <p className="panel-text">{endText}</p>}
            <div className="mt-6">
              <BackToTop />
            </div>
          </Panel>
        );
      default:
        return null;
    }
  };

  return (
    <div style={lookStyle(site)} className="site">
      <ScrollDriver ease={sceneNumbers(site.scene).ease} />
      <JourneyCanvas theme={site.theme} chapters={chapters} look={look} scene={site.scene} />
      <Hud handle={site.handle} scanlines={site.theme.scanlines} chapters={chapters} look={look} />
      {look.vignette && <div className="look-vignette" aria-hidden="true" />}
      {look.grain && <div className="film-grain" aria-hidden="true" />}
      {banner}

      <main className="relative z-[3]">
        {chapters.map((key, index) => (
          <Chapter key={key} index={index}>
            {chapter(key)}
          </Chapter>
        ))}
      </main>

      {journey.intro !== "none" && <Intro settings={journey} name={site.name} />}
    </div>
  );
}
