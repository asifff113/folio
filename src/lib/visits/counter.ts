import { useSyncExternalStore } from "react";

/** The public visitor counter, as the database last reported it. Null = switched off or not loaded yet. */
export type Counter = { kind: "people" | "visits"; value: number } | null;

let current: Counter = null;
const listeners = new Set<() => void>();

export function setCounter(next: unknown) {
  const c = next as Counter;
  const valid = c && (c.kind === "people" || c.kind === "visits") && Number.isFinite(c.value) ? c : null;
  if (valid?.kind === current?.kind && valid?.value === current?.value) return;
  current = valid ? { kind: valid.kind, value: Number(valid.value) } : null;
  for (const fn of listeners) fn();
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export const useCounter = () =>
  useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );

/** 1234 → "001,234": at least six digits, grouped in threes. */
export const counterDigits = (value: number) =>
  String(Math.max(0, Math.floor(value)))
    .padStart(6, "0")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
