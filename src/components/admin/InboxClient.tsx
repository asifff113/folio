"use client";

import { useEffect, useState, useTransition } from "react";
import { deleteMessage, setMessageRead } from "@/app/admin/actions";

// Messages already marked read automatically in this tab. "Mark unread" then sticks.
const autoMarked = new Set<string>();

/** Marks a message read the first time it is opened. */
export function MarkRead({ id }: { id: string }) {
  useEffect(() => {
    if (autoMarked.has(id)) return;
    autoMarked.add(id);
    void setMessageRead(id, true);
  }, [id]);
  return null;
}

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(t);
  }, [copied]);
  return (
    <button
      type="button"
      className="ghost-btn"
      onClick={() => navigator.clipboard.writeText(text).then(() => setCopied(true), () => {})}
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}

export function DeleteMessageButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="chip text-[#ff9be9] hover:border-pink"
      onClick={() => {
        if (window.confirm("Delete this note for good? This can't be undone. (Archive keeps it.)"))
          start(() => deleteMessage(id));
      }}
    >
      {pending ? "deleting..." : "delete"}
    </button>
  );
}

/** Date and time in the viewer's own timezone. */
export function LocalTime({ iso, short = false, className }: { iso: string; short?: boolean; className?: string }) {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  const text = short
    ? today
      ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString([], { day: "numeric", month: "short" })
    : d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {text}
    </time>
  );
}
