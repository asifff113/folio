"use client";

import { useEffect, useRef, useState } from "react";
import type { Platform } from "@/config/site";
import { addTrace, useTraces } from "@/lib/traces/store";
import { Panel } from "./Chapter";

const time = (ms: number) => new Date(ms).toTimeString().slice(0, 5);

/**
 * Trace log plus the "leave your trace" form.
 * Phase 2: traces stay in this browser. Phase 5 saves them and detects the referrer.
 */
export function TracePanel({ platforms }: { platforms: Platform[] }) {
  const traces = useTraces();
  const [platform, setPlatform] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState(false);
  const [freshId, setFreshId] = useState<string | null>(null);
  const { canvasRef, inked, clearPad, exportImage } = useSignaturePad();
  const colorOf = (id: string) => platforms.find((p) => p.id === id)?.color ?? "#a58bff";

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(false), 3000);
    return () => window.clearTimeout(id);
  }, [toast]);

  const send = () => {
    if (!inked || !platform) {
      setMessage(
        !inked && !platform
          ? "draw a signature and pick a platform"
          : !inked
            ? "draw a signature first"
            : "pick where you came from",
      );
      return;
    }
    const id = addTrace({ name: name.trim().slice(0, 24) || "anonymous", platform, signature: exportImage() });
    setFreshId(id);
    clearPad();
    setName("");
    setMessage("signal received");
    setToast(true);
  };

  return (
    <Panel
      eyebrow={
        <>
          {"// traces · "}
          {traces.length} signals
        </>
      }
    >
      <h2 className="panel-title">Leave your trace.</h2>

      <ul className="mb-4 max-h-[240px] overflow-hidden">
        {traces
          .slice(-6)
          .reverse()
          .map((t) => (
            <li
              key={t.id}
              className={`grid grid-cols-[auto_8px_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-holo/10 py-2 font-mono text-[13px] text-[#b4e8f5] ${t.id === freshId ? "trace-new" : ""}`}
            >
              <span>{time(t.createdAt)}</span>
              <i className="size-[7px] rounded-full" style={{ background: colorOf(t.platform) }} />
              <span className="truncate">
                {t.platform} · {t.name}
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL signature */}
              <img alt="" src={t.signature} className="h-[22px] w-auto drop-shadow-[0_0_3px_rgba(47,227,255,.6)]" />
            </li>
          ))}
      </ul>

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
          <span className="pointer-events-none absolute inset-0 grid place-items-center font-mono text-[14px] text-[#4f7a8c]">
            draw here
          </span>
        )}
        <button type="button" className="ghost-btn absolute top-1.5 right-1.5" onClick={clearPad}>
          clear
        </button>
      </div>

      <p className="field-label" id="from-label">
        i came from
      </p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby="from-label">
        {platforms.map((p) => (
          <button
            key={p.id}
            type="button"
            className="chip"
            aria-pressed={platform === p.id}
            onClick={() => setPlatform(p.id)}
          >
            <i style={{ background: p.color }} />
            {p.label.toLowerCase()}
          </button>
        ))}
      </div>

      <label className="field-label" htmlFor="trace-name">
        name or handle (optional)
      </label>
      <input
        id="trace-name"
        type="text"
        maxLength={24}
        placeholder="@yourhandle"
        autoComplete="off"
        className="text-input"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <div className="mt-3.5 flex flex-wrap items-center gap-3">
        <button type="button" className="btn" onClick={send}>
          &gt; send_trace()
        </button>
        <p className="font-mono text-[13px] text-muted" role="status">
          {message}
        </p>
      </div>

      {toast && (
        <div className="fixed top-[calc(52px+env(safe-area-inset-top,0px))] left-1/2 z-[5] -translate-x-1/2 border border-holo bg-[rgba(4,14,22,.9)] px-4 py-2.5 font-mono text-[13px] whitespace-nowrap text-fg">
          trace://received · your star is on the wall
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

  const exportImage = () => {
    const out = document.createElement("canvas");
    out.width = 220;
    out.height = 80;
    if (canvas.current) out.getContext("2d")?.drawImage(canvas.current, 0, 0, 220, 80);
    return out.toDataURL();
  };

  return { canvasRef: canvas, inked, clearPad: clear, exportImage };
}
