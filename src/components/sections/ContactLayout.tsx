"use client";

import { useActionState, useState } from "react";
import { CONTACT_PLATFORMS, type ContactPlatform } from "@/config/site";
import { sendContact } from "@/app/contact-actions";
import { visitSource } from "@/lib/source";

/** The contact form. Messages go to the admin inbox; nothing is shown on the site. */
export function ContactLayout() {
  const [state, action, pending] = useActionState(sendContact, null);
  const [platform, setPlatform] = useState<ContactPlatform>("email");
  const [note, setNote] = useState("");
  const [source] = useState(() => (typeof window === "undefined" ? "direct" : visitSource()));
  const placeholder = CONTACT_PLATFORMS.find((p) => p.id === platform)?.placeholder ?? "";

  if (state?.ok) {
    return (
      <p
        role="status"
        className="mt-4 flex items-center gap-3 border border-[#5dffb0]/50 bg-[#5dffb0]/[.07] px-4 py-3.5 text-[16px] text-[#d6ffeb]"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#5dffb0" strokeWidth="1.8" aria-hidden="true">
          <path d="M3 9.5l4 4 8-9" />
        </svg>
        Sent. Thanks, I&apos;ll get back to you.
      </p>
    );
  }

  return (
    <form action={action} className="mt-3 flex flex-col gap-[18px]">
      <input type="hidden" name="platform" value={platform} />
      <input type="hidden" name="source" value={source} />
      {/* Spam trap: hidden from people, bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label className="flex flex-col gap-[7px]">
        <span className="field-label m-0">your name</span>
        <input name="name" required maxLength={40} autoComplete="name" className="text-input" />
      </label>

      <div className="flex flex-col gap-[7px]">
        <span className="field-label m-0" id="contact-reach-label">
          how can i reach you?
        </span>
        <div role="radiogroup" aria-labelledby="contact-reach-label" className="flex flex-wrap gap-1.5">
          {CONTACT_PLATFORMS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={platform === p.id}
              onClick={() => setPlatform(p.id)}
              className="chip"
            >
              {p.label}
            </button>
          ))}
        </div>
        <input
          name="contact"
          required
          maxLength={120}
          aria-label="Your contact"
          placeholder={placeholder}
          type={platform === "email" ? "email" : "text"}
          autoComplete={platform === "email" ? "email" : "off"}
          className="text-input"
        />
      </div>

      <label className="flex flex-col gap-[7px]">
        <span className="field-label m-0">message</span>
        <textarea
          name="note"
          required
          maxLength={800}
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="text-input resize-y leading-relaxed"
        />
        <span className="self-end font-mono text-[11px] text-[#7fa6b8]">{note.length} / 800</span>
      </label>

      <div className="flex flex-wrap items-center gap-3.5">
        <p className="min-w-[180px] flex-1 text-[14px] leading-snug text-[#9fc3d3]">
          Only I see this. Your contact is never shown on the site.
        </p>
        <button type="submit" disabled={pending} className="btn btn-solid disabled:opacity-60">
          {pending ? "sending..." : "SEND ▸"}
        </button>
      </div>
      {state && !state.ok && (
        <p role="alert" className="font-mono text-[13px] text-pink">
          {state.message}
        </p>
      )}
    </form>
  );
}
