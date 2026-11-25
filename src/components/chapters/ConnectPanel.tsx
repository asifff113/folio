"use client";

import { useEffect, useState } from "react";
import type { Platform } from "@/config/site";

type Props = {
  platforms: Platform[];
  /** Platform id → QR code SVG made from its link (only for platforms set to "generated"). */
  qrCodes: Record<string, string>;
  title?: string;
};

/** "Connect with me": a row per platform; clicking one opens how to reach you there. */
export function ConnectPanel({ platforms, qrCodes, title = "Connect with me." }: Props) {
  // Visitors only see platforms that lead somewhere.
  const shown = platforms.filter((p) => p.url || p.handle);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="panel">
      <p className="eyebrow">{"// signal"}</p>
      <h2 className="panel-title">{title}</h2>

      {shown.length === 0 ? (
        <p className="panel-text">Links are on their way.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {shown.map((p) => {
            const expanded = open === p.id;
            const qr = p.qr === "generated" ? qrCodes[p.id] : undefined;
            const qrImage = p.qr === "image" && p.qrImage ? p.qrImage : undefined;
            return (
              <li
                key={p.id}
                className={`border transition-colors ${
                  expanded ? "bg-[rgba(2,10,16,.55)]" : "border-transparent hover:border-holo/25"
                }`}
                style={expanded ? { borderColor: p.color } : undefined}
              >
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? null : p.id)}
                  className="flex w-full cursor-pointer items-center gap-3.5 px-3.5 py-3 text-left font-mono text-[17px] text-[#d6f6ff]"
                >
                  <i
                    className="size-[11px] flex-none rounded-full"
                    style={{ background: p.color, boxShadow: `0 0 10px ${p.color}` }}
                  />
                  <span>{p.label.toLowerCase()}</span>
                  <span className="flex-1 border-b border-dotted border-holo/35" />
                  <span className="text-[14px] text-holo">{expanded ? "close ▴" : "open ▾"}</span>
                </button>

                {expanded && (
                  <div className="grid gap-5 px-4 pt-1 pb-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="flex min-w-0 flex-col gap-3">
                      {p.handle && <Handle value={p.handle} />}
                      {p.note && <p className="text-[16px] leading-relaxed text-[#c3dde8]">{p.note}</p>}
                      {p.url && (
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn self-start no-underline"
                          style={{ borderColor: p.color }}
                        >
                          open {p.label} ↗
                        </a>
                      )}
                    </div>
                    {(qr || qrImage) && (
                      <figure className="flex flex-col items-center gap-2">
                        {qr ? (
                          <div
                            role="img"
                            aria-label={`QR code for ${p.label}`}
                            className="qr-tile size-[168px]"
                            dangerouslySetInnerHTML={{ __html: qr }}
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element -- uploaded image from storage
                          <img src={qrImage} alt={`QR code for ${p.label}`} className="qr-tile size-[168px] object-contain" />
                        )}
                        <figcaption className="font-mono text-[12px] text-[#9fc3d3]">scan with your phone</figcaption>
                      </figure>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Handle({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(t);
  }, [copied]);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="font-mono text-[20px] font-bold break-all text-fg">{value}</span>
      <button
        type="button"
        className="ghost-btn"
        onClick={() => navigator.clipboard.writeText(value).then(() => setCopied(true), () => {})}
      >
        {copied ? "copied" : "copy"}
      </button>
    </div>
  );
}
