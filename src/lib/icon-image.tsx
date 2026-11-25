import { ImageResponse } from "next/og";
import { getSiteContent } from "@/lib/content";
import { fontData, googleFont, imageDataUrl } from "@/lib/og-assets";

/** The site icon at a given size: your picture, or the first letter of your name in your colors. */
export async function iconImage(size: number) {
  const site = await getSiteContent();
  const { primary, secondary } = site.theme;
  const avatar = site.seo.icon === "avatar" && site.avatar ? await imageDataUrl(site.avatar) : null;
  const display = avatar ? null : fontData(await googleFont("Unbounded", 800));
  const letter = (site.name.trim()[0] ?? "N").toUpperCase();

  return new ImageResponse(
    avatar ? (
      <div style={{ width: "100%", height: "100%", display: "flex", borderRadius: size / 5, overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered into the icon */}
        <img src={avatar} width={size} height={size} alt="" style={{ objectFit: "cover" }} />
      </div>
    ) : (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#05070c",
          border: `${Math.max(1, Math.round(size / 24))}px solid ${secondary}`,
          borderRadius: size / 5,
          color: primary,
          fontFamily: display ? "Display" : undefined,
          fontSize: size * 0.62,
          fontWeight: 800,
          textShadow: `0 0 ${size / 8}px ${primary}`,
        }}
      >
        {letter}
      </div>
    ),
    {
      width: size,
      height: size,
      fonts: display ? [{ name: "Display", data: display, weight: 800, style: "normal" }] : [],
    },
  );
}
