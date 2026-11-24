"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/app/admin/actions";

/** Labelled form row. */
export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-4">
      <label className="field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 font-mono text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

/** Submit button plus the result of the last save. */
export function SaveBar({ state, label = "save" }: { state: FormState; label?: string }) {
  const { pending } = useFormStatus();
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-holo/10 pt-5">
      <button type="submit" className="btn disabled:opacity-50" disabled={pending}>
        &gt; {pending ? "saving..." : `${label}()`}
      </button>
      <p
        key={state?.at}
        role="status"
        className={`font-mono text-xs ${state ? (state.ok ? "text-holo" : "text-pink") : ""}`}
      >
        {state?.message}
      </p>
    </div>
  );
}
