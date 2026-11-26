"use client";

import { useEffect } from "react";
import { type ChapterKey, onJourneyFrame } from "@/lib/journey/store";
import { browserClient } from "@/lib/supabase/browser";
import { visitSource } from "@/lib/source";
import { setCounter } from "@/lib/visits/counter";

const KEY = "folio:visit";
/** A reload or a new tab within this long is the same visit. */
const SAME_VISIT_MS = 30 * 60_000;

type Saved = { id: string; at: number };

function readSaved(): Saved | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) ?? "null") as Saved | null;
    return saved && typeof saved.id === "string" && Date.now() - saved.at < SAME_VISIT_MS ? saved : null;
  } catch {
    return null;
  }
}

function save(id: string) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ id, at: Date.now() }));
  } catch {
    // Private mode: every load counts as a visit, which is fine.
  }
}

/**
 * Counts the visit once, then tells the database which chapters it reached
 * and that it is still here (every minute while the tab is visible). Starts
 * after the page has settled so it never competes with the 3D for the first frames.
 */
export function VisitTracker({ chapters }: { chapters: ChapterKey[] }) {
  useEffect(() => {
    let id: string | null = null;
    let stopped = false;
    let flushTimer = 0;
    const reached = new Set<ChapterKey>();

    const flush = async () => {
      window.clearTimeout(flushTimer);
      const db = browserClient();
      if (!db || stopped) return;
      if (!id) {
        const { data } = await db.rpc("visit_counter");
        setCounter(data);
        return;
      }
      const { data, error } = await db.rpc("visit_seen", { p_id: id, p_reached: [...reached] });
      if (!error) {
        setCounter(data);
        save(id);
      }
    };

    const start = async () => {
      const saved = readSaved();
      if (saved) {
        id = saved.id;
        return flush();
      }
      try {
        const res = await fetch("/visit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ source: visitSource() }),
          keepalive: true,
        });
        const data = (await res.json()) as { id?: string | null; counter?: unknown };
        if (stopped) return;
        setCounter(data.counter);
        if (data.id) {
          id = data.id;
          save(id);
          if (reached.size) void flush();
        }
      } catch {
        // Offline or blocked: the site works the same, just uncounted.
      }
    };

    const off = onJourneyFrame((s) => {
      const key = chapters[Math.round(s)];
      if (!key || reached.has(key)) return;
      reached.add(key);
      window.clearTimeout(flushTimer);
      flushTimer = window.setTimeout(() => void flush(), 2000);
    });

    const begin = window.setTimeout(() => void start(), 1500);
    const beat = window.setInterval(() => {
      if (document.visibilityState === "visible") void flush();
    }, 60_000);

    return () => {
      stopped = true;
      off();
      window.clearTimeout(begin);
      window.clearTimeout(flushTimer);
      window.clearInterval(beat);
    };
  }, [chapters]);

  return null;
}
