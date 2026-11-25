import { ImageResponse } from "next/og";
import { getSiteContent } from "@/lib/content";
import { fontData, googleFont, imageDataUrl } from "@/lib/og-assets";
import { siteUrl } from "@/lib/seo";

/**
 * The share image (1200 × 630) shown when someone posts a link to the site:
 * your name, tagline, picture and colors on the hologram background.
 * Rebuilt when you save changes in the admin panel.
 */
export async function GET() {
  const site = await getSiteContent();
  const { primary, secondary } = site.theme;
  const [display, body] = await Promise.all([googleFont("Unbounded", 800), googleFont("Manrope", 500)]);
  const avatar = site.avatar ? await imageDataUrl(site.avatar) : null;
  const host = siteUrl(site).replace(/^https?:\/\//, "");
  const displayData = fontData(display);
  const bodyData = fontData(body);
  const nameSize = site.name.length > 12 ? 72 : site.name.length > 8 ? 92 : 112;

  const fonts = [
    ...(displayData ? [{ name: "Display", data: displayData, weight: 800 as const, style: "normal" as const }] : []),
    ...(bodyData ? [{ name: "Body", data: bodyData, weight: 500 as const, style: "normal" as const }] : []),
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "radial-gradient(ellipse at 28% 50%, #0e2b38 0%, #05070c 65%)",
          color: "#e4f6ff",
          fontFamily: "Body",
        }}
      >
        {/* Frame and top label. */}
        <div
          style={{
            position: "absolute",
            top: 22,
            left: 22,
            right: 22,
            bottom: 22,
            border: `1px solid ${primary}55`,
            display: "flex",
          }}
        />
        <div
          style={{ position: "absolute", left: 46, top: 38, fontSize: 20, letterSpacing: 3, color: primary, display: "flex" }}
        >
          {`SYS://${site.handle.toUpperCase()}`}
        </div>
        {/* Floor grid. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 150,
            display: "flex",
            backgroundImage: `linear-gradient(${primary}33 1px, transparent 1px), linear-gradient(90deg, ${primary}33 1px, transparent 1px)`,
            backgroundSize: "60px 30px",
          }}
        />

        {/* Picture. */}
        <div
          style={{
            position: "absolute",
            left: 105,
            top: 170,
            width: 290,
            height: 290,
            borderRadius: 999,
            border: `4px solid ${primary}`,
            boxShadow: `0 0 70px ${primary}88`,
            overflow: "hidden",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            background: "#0a1c26",
          }}
        >
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element -- rendered into the share image
            <img src={avatar} width={290} height={290} alt="" style={{ objectFit: "cover" }} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 104, height: 104, borderRadius: 999, background: primary, opacity: 0.85 }} />
              <div
                style={{
                  marginTop: 14,
                  width: 230,
                  height: 110,
                  borderTopLeftRadius: 115,
                  borderTopRightRadius: 115,
                  background: primary,
                  opacity: 0.55,
                }}
              />
            </div>
          )}
        </div>

        {/* Name, tagline, address. */}
        <div
          style={{
            position: "absolute",
            left: 470,
            right: 70,
            top: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 22,
          }}
        >
          <div
            style={{
              fontFamily: "Display",
              fontSize: nameSize,
              lineHeight: 1,
              color: "#dffaff",
              textShadow: `4px 0 ${secondary}, -4px 0 ${primary}`,
              display: "flex",
            }}
          >
            {site.name}
          </div>
          {site.tagline && <div style={{ fontSize: 34, color: "#b9d6e2", display: "flex" }}>{site.tagline}</div>}
          <div style={{ fontSize: 24, color: primary, display: "flex" }}>{host}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts },
  );
}
