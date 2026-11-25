"use client";

import { useActionState, useTransition } from "react";
import type { TraceSettings } from "@/config/site";
import { deleteTrace, saveTraceSettings, setTraceStatus } from "@/app/admin/actions";
import { SaveBar } from "./ui";

export function TraceSettingsForm({ settings }: { settings: TraceSettings }) {
  const [state, action] = useActionState(saveTraceSettings, null);
  return (
    <form action={action} aria-labelledby="trace-settings" className="border border-holo/20 bg-[rgba(4,14,22,.72)] px-5 py-4">
      <h2 id="trace-settings" className="mb-3 font-mono text-[13px] font-bold tracking-[0.14em] text-holo">
        &gt; SETTINGS
      </h2>
      <div className="flex flex-col gap-3 text-[15px]">
        <label className="flex cursor-pointer items-center gap-2.5">
          <input type="checkbox" name="enabled" defaultChecked={settings.enabled} className="size-[18px] accent-[var(--holo)]" />
          Show the traces chapter
        </label>
        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            name="approval"
            defaultChecked={settings.approval}
            className="mt-0.5 size-[18px] flex-none accent-[var(--holo)]"
          />
          <span>
            New traces wait for my approval
            <span className="block text-[13px] text-muted">Off: they appear right away and you can hide them later.</span>
          </span>
        </label>
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            name="allowMessage"
            defaultChecked={settings.allowMessage}
            className="size-[18px] accent-[var(--holo)]"
          />
          Let visitors add a short &quot;say hi&quot;
        </label>
        <label className="flex flex-wrap items-center gap-2.5">
          Stars on the wall: newest
          <input
            type="number"
            name="wallLimit"
            min={10}
            max={1000}
            step={1}
            defaultValue={settings.wallLimit}
            className="text-input w-24"
          />
        </label>
      </div>
      <SaveBar state={state} />
    </form>
  );
}

/** Approve / hide / show and delete for one trace. */
export function TraceActions({ id, status }: { id: string; status: "live" | "pending" | "hidden" }) {
  const [pending, start] = useTransition();
  return (
    <div className={`flex flex-wrap gap-2 ${pending ? "opacity-50" : ""}`} aria-busy={pending}>
      {status === "pending" && (
        <button
          type="button"
          disabled={pending}
          className="chip border-[#5dffb0] text-[#c9ffe5]"
          onClick={() => start(() => setTraceStatus(id, "live"))}
        >
          approve
        </button>
      )}
      {status === "live" && (
        <button type="button" disabled={pending} className="chip" onClick={() => start(() => setTraceStatus(id, "hidden"))}>
          hide
        </button>
      )}
      {status === "hidden" && (
        <button type="button" disabled={pending} className="chip" onClick={() => start(() => setTraceStatus(id, "live"))}>
          show
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        className="chip text-[#ff9be9] hover:border-pink"
        onClick={() => {
          if (window.confirm("Delete this trace for good? This can't be undone. (Hide keeps it.)"))
            start(() => deleteTrace(id));
        }}
      >
        delete
      </button>
    </div>
  );
}
