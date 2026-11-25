import type { Metadata } from "next";
import {
  Exo_2,
  IBM_Plex_Sans,
  Inter,
  JetBrains_Mono,
  Manrope,
  Orbitron,
  Space_Grotesk,
  Space_Mono,
  Syne,
  Unbounded,
} from "next/font/google";
import { getSiteContent } from "@/lib/content";
import { indexable, seoDescription, seoTitle, shareImage, siteUrl } from "@/lib/seo";
import "./globals.css";

/* The default pair (hologram) and the mono font load up front. */
const unbounded = Unbounded({ variable: "--font-unbounded", subsets: ["latin"], weight: ["400", "600", "800"] });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

/* The other pairs you can pick in /admin/theme. Not preloaded: a browser only downloads the one in use. */
const spaceMono = Space_Mono({ subsets: ["latin"], preload: false, display: "swap", variable: "--font-spacemono", weight: ["400", "700"] });
const plexSans = IBM_Plex_Sans({ subsets: ["latin"], preload: false, display: "swap", variable: "--font-plexsans", weight: ["400", "500", "600"] });
const orbitron = Orbitron({ subsets: ["latin"], preload: false, display: "swap", variable: "--font-orbitron" });
const exo = Exo_2({ subsets: ["latin"], preload: false, display: "swap", variable: "--font-exo" });
const syne = Syne({ subsets: ["latin"], preload: false, display: "swap", variable: "--font-syne" });
const inter = Inter({ subsets: ["latin"], preload: false, display: "swap", variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], preload: false, display: "swap", variable: "--font-spacegrotesk" });

const fontVariables = [unbounded, manrope, jetbrains, spaceMono, plexSans, orbitron, exo, syne, inter, spaceGrotesk]
  .map((f) => f.variable)
  .join(" ");

/** Title, description, share image and search settings, all from /admin/seo (with sensible defaults). */
export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteContent();
  const title = seoTitle(site);
  const description = seoDescription(site);
  const image = shareImage(site);
  const index = indexable(site);
  return {
    metadataBase: new URL(siteUrl(site)),
    title: { default: title, template: `%s · ${site.name}` },
    description,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      url: "/",
      siteName: site.name,
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: `${site.name}: ${description}` }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
    robots: index ? { index: true, follow: true } : { index: false, follow: false },
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The intro script may mark <html> as "intro seen" before React loads.
    <html lang="en" className={`${fontVariables} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-void text-fg">{children}</body>
    </html>
  );
}
