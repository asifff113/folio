/**
 * Where the visitor came from, detected in the browser on their first page
 * load and kept for the rest of the visit. Used to label inbox notes (and
 * visitor traces later).
 *
 * Order: an explicit `?ref=` or `?utm_source=` in the link, then the referring
 * site, else "direct".
 */
const KEY = "folio:source";

const HOSTS: [RegExp, string][] = [
  [/(^|\.)instagram\.com$|(^|\.)l\.instagram\.com$/, "instagram"],
  [/(^|\.)discord(app)?\.com$|(^|\.)discord\.gg$/, "discord"],
  [/(^|\.)t\.me$|(^|\.)telegram\.(org|me)$/, "telegram"],
  [/(^|\.)t\.co$|(^|\.)(twitter|x)\.com$/, "x"],
  [/(^|\.)linkedin\.com$|(^|\.)lnkd\.in$/, "linkedin"],
  [/(^|\.)github\.com$/, "github"],
  [/(^|\.)facebook\.com$|(^|\.)fb\.me$/, "facebook"],
  [/(^|\.)reddit\.com$/, "reddit"],
  [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/, "youtube"],
  [/(^|\.)google\.[a-z.]+$/, "google"],
  [/(^|\.)bing\.com$/, "bing"],
  [/(^|\.)duckduckgo\.com$/, "duckduckgo"],
];

const clean = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 40);

function detect(): string {
  const params = new URLSearchParams(window.location.search);
  const tagged = params.get("ref") ?? params.get("utm_source");
  if (tagged && clean(tagged)) return clean(tagged);

  if (!document.referrer) return "direct";
  try {
    const host = new URL(document.referrer).hostname.replace(/^www\./, "");
    if (host === window.location.hostname) return "direct";
    const known = HOSTS.find(([pattern]) => pattern.test(host));
    return known ? known[1] : clean(host) || "direct";
  } catch {
    return "direct";
  }
}

/** The visitor's source for this visit. Safe to call any time in the browser. */
export function visitSource(): string {
  try {
    const saved = sessionStorage.getItem(KEY);
    if (saved) return saved;
    const found = detect();
    sessionStorage.setItem(KEY, found);
    return found;
  } catch {
    return detect();
  }
}
