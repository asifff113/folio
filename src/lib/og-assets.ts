import "server-only";
import { cacheLife } from "next/cache";

/**
 * Assets for the generated images (share image, icons). Fetched once and
 * cached, so the images can still be prerendered and served fast.
 */

/** A Google font as base64 TTF (the image renderer needs raw font data). Null if it can't be fetched. */
export async function googleFont(family: string, weight: number): Promise<string | null> {
  "use cache";
  cacheLife("max");
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&display=swap`,
      // An old browser name makes Google send TTF, which the renderer can read.
      { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1)" } },
    ).then((r) => r.text());
    const url = css.match(/src:\s*url\(([^)]+)\)\s*format\('(?:truetype|opentype)'\)/)?.[1];
    if (!url) return null;
    const font = await fetch(url).then((r) => r.arrayBuffer());
    return Buffer.from(font).toString("base64");
  } catch {
    return null;
  }
}

export const fontData = (base64: string | null) => (base64 ? Buffer.from(base64, "base64") : null);

/** An image (your uploaded picture) as a data URL, so the renderer doesn't fetch it again. */
export async function imageDataUrl(url: string): Promise<string | null> {
  "use cache";
  cacheLife("hours");
  if (!/^https:\/\//.test(url)) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/png";
    if (!/^image\/(png|jpeg|webp)/.test(type)) return null;
    const data = Buffer.from(await res.arrayBuffer()).toString("base64");
    return `data:${type};base64,${data}`;
  } catch {
    return null;
  }
}
