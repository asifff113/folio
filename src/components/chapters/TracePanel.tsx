"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Platform, TraceSettings } from "@/config/site";
import { sendTrace } from "@/app/trace-actions";
import { visitSource } from "@/lib/source";
import { addOwnTrace, setWallLimit, useTraces } from "@/lib/traces/store";
import { Panel } from "./Chapter";

/** "just now", "4m ago", "3h ago", "2d ago", then the date. */
function ago(ms: number, now: number) {
  const s = Math.max(0, (now - ms) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** The current time, refreshed every 30 seconds (0 before the page is interactive). */
function useNow() {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 30_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);
  return now;
}

/**
 * The traces log plus the "leave your trace" form. Names are optional and
 * where someone found you is only stored for the admin, never shown here.
 */
export function TracePanel({ platforms, settings }: { platforms: Platform[]; settings: TraceSettings }) {
  const wall = useTraces();
  const now = useNow();
  const [platform, setPlatform] = useState<string | null>(null);
  const [detected, setDetected] = useState("direct");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [freshId, setFreshId] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const { canvasRef, inked, clearPad, exportImage } = useSignaturePad();

  useEffect(() => setWallLimit(settings.wallLimit), [settings.wallLimit]);

  // Pre-select where the visitor came from, when it is one of the choices.
  useEffect(() => {
    const t = window.setTimeout(() => {
      const source = visitSource();
      setDetected(source);
      if (platforms.some((p) => p.id === source)) setPlatform((current) => current ?? source);
    }, 0);
    return () => window.clearTimeout(t);
  }, [platforms]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(id);
  }, [toast]);

  const send = () => {
    if (pending) return;
    if (!inked) {
      setMessage("draw a signature first");
      return;
    }
    const signature = exportImage();
    const trace = { name: name.trim().slice(0, 24), message: settings.allowMessage ? note.trim().slice(0, 60) : "" };
    setMessage("sending...");
    start(async () => {
      const result = await sendTrace({ ...trace, signature, platform: platform ?? "", detected });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      if (result.status === "live") {
        addOwnTrace({ id: result.id, ...trace, signature, createdAt: Date.parse(result.createdAt) || Date.now() });
        setFreshId(result.id);
        setToast("trace://received · your star is on the wall");
        setMessage("signal received");
      } else {
        setToast("trace://received · it shows up once it's approved");
        setMessage("received, it shows up once it's approved");
      }
      clearPad();
      setName("");
      setNote("");
    });
  };

  const log = wall.traces.slice(0, 6);

  return (
    <Panel
      eyebrow={
        <>
          {"// traces · "}
          {wall.total} {wall.total === 1 ? "signal" : "signals"}
        </>
      }
    >
      <h2 className="panel-title">Leave your trace.</h2>
      <p className="panel-text">Sign the wall. Every signature becomes a star behind this box. A name is optional.</p>

      {wall.ready && log.length === 0 ? (
        <p className="my-4 border-y border-holo/10 py-3 font-mono text-[15px] text-[#9fc3d3]">
          No traces yet. Be the first to sign.
        </p>
      ) : (
        <ul aria-label="Latest traces" className="my-4 flex flex-col">
          {log.map((t) => (
            <li
              key={t.id}
              className={`grid grid-cols-[minmax(72px,auto)_minmax(0,1fr)_auto] items-center gap-3 border-b border-holo/10 px-1 py-2 font-mono text-[15px] text-[#c6eef9] ${
                t.id === freshId ? "trace-new" : ""
              }`}
            >
              <span className="text-[#8fb6c6]">{now ? ago(t.createdAt, now) : ""}</span>
              <span className="truncate">
                {t.name ? <b className="text-fg">{t.name}</b> : <span className="text-[#8fb6c6]">someone</span>}
                {t.message && <span className="text-[#9fc3d3]"> — {t.message}</span>}
              </span>
              {t.signature ? (
                // eslint-disable-next-line @next/next/no-img-element -- data URL signature
                <img alt="" src={t.signature} className="h-[28px] w-auto drop-shadow-[0_0_3px_rgba(47,227,255,.6)]" />
              ) : (
                <span />
              )}
            </li>
          ))}
        </ul>
      )}

      <label className="field-label" htmlFor="signature">
        signature
      </label>
      <div className="relative h-28 border border-dashed border-holo/35 bg-[rgba(2,10,16,.7)]">
        <canvas
          id="signature"
          ref={canvasRef}
          aria-label="Signature pad"
          className="block size-full cursor-crosshair touch-none"
        />
        {!inked && (
          <span className="pointer-events-none absolute inset-0 grid place-items-center font-mono text-[14px] text-[#6f9aab]">
            draw here
          </span>
        )}
        <button type="button" className="ghost-btn absolute top-1.5 right-1.5" onClick={clearPad}>
          clear
        </button>
      </div>

      <p className="field-label" id="from-label">
        where did you find me? <span className="normal-case">(optional · only I see this)</span>
      </p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby="from-label">
        {platforms.map((p) => (
          <button
            key={p.id}
            type="button"
            className="chip"
            aria-pressed={platform === p.id}
            onClick={() => setPlatform(platform === p.id ? null : p.id)}
          >
            <i style={{ background: p.color }} />
            {p.label.toLowerCase()}
          </button>
        ))}
      </div>

      <div className={`grid gap-x-4 ${settings.allowMessage ? "sm:grid-cols-2" : ""}`}>
        <div>
          <label className="field-label" htmlFor="trace-name">
            name or handle (optional)
          </label>
          <input
            id="trace-name"
            type="text"
            maxLength={24}
            placeholder="leave empty to stay anonymous"
            autoComplete="off"
            className="text-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        {settings.allowMessage && (
          <div>
            <label className="field-label" htmlFor="trace-note">
              say hi (optional · 60 chars)
            </label>
            <input
              id="trace-note"
              type="text"
              maxLength={60}
              autoComplete="off"
              className="text-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" className="btn" onClick={send} disabled={pending}>
          &gt; send_trace()
        </button>
        <p className="font-mono text-[13px] text-muted" role="status">
          {message || "one trace per visitor per hour"}
        </p>
      </div>

      {toast && (
        <div className="fixed top-[calc(52px+env(safe-area-inset-top,0px))] left-1/2 z-[5] -translate-x-1/2 border border-holo bg-[rgba(4,14,22,.9)] px-4 py-2.5 font-mono text-[13px] whitespace-nowrap text-fg">
          {toast}
        </div>
      )}
    </Panel>
  );
}

/** Pointer-drawn signature on a canvas, sized to the device pixel ratio. */
function useSignaturePad() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [inked, setInked] = useState(false);
  const inkedRef = useRef(false);

  const setInk = (v: boolean) => {
    inkedRef.current = v;
    setInked(v);
  };

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;

    const size = () => {
      const r = el.getBoundingClientRect();
      const d = Math.min(window.devicePixelRatio, 2);
      el.width = Math.max(1, Math.round(r.width * d));
      el.height = Math.max(1, Math.round(r.height * d));
      ctx.setTransform(d, 0, 0, d, 0, 0);
      ctx.strokeStyle = ctx.fillStyle = "#eef6ff";
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    };
    size();
    const ro = new ResizeObserver(() => {
      if (!inkedRef.current) size();
    });
    ro.observe(el);

    let drawing = false;
    let last = { x: 0, y: 0 };
    const at = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const down = (e: PointerEvent) => {
      drawing = true;
      last = at(e);
      el.setPointerCapture(e.pointerId);
      ctx.beginPath();
      ctx.arc(last.x, last.y, 1.2, 0, Math.PI * 2);
      ctx.fill();
      if (!inkedRef.current) setInk(true);
    };
    const move = (e: PointerEvent) => {
      if (!drawing) return;
      const p = at(e);
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      last = p;
    };
    const up = () => {
      drawing = false;
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      ro.disconnect();
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, []);

  const clear = () => {
    const el = canvas.current;
    el?.getContext("2d")?.clearRect(0, 0, el.width, el.height);
    setInk(false);
  };

  /** The signature as a small PNG (220 × 80), the size stored in the database. */
  const exportImage = () => {
    const out = document.createElement("canvas");
    out.width = 220;
    out.height = 80;
    if (canvas.current) out.getContext("2d")?.drawImage(canvas.current, 0, 0, 220, 80);
    return out.toDataURL("image/png");
  };

  return { canvasRef: canvas, inked, clearPad: clear, exportImage };
}
