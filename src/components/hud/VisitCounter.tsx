"use client";

import { counterDigits, useCounter } from "@/lib/visits/counter";

/**
 * The public visitor counter, when switched on. Each digit is its own element
 * keyed by its value, so a digit that changes rolls in while the rest stay put.
 */
export function VisitCounter({ className }: { className: string }) {
  const counter = useCounter();
  if (!counter) return null;
  const word = counter.kind === "visits" ? "VISITS" : "VISITORS";
  const digits = counterDigits(counter.value);
  return (
    <span className={className}>
      <span className="sr-only">
        {counter.value.toLocaleString("en-US")} {counter.kind === "visits" ? "visits" : "visitors"}
      </span>
      <span aria-hidden="true" className="counter-word">
        {word}
      </span>
      <b aria-hidden="true" className="counter-digits">
        {[...digits].map((ch, i) => (
          <span key={`${digits.length - i}-${ch}`} className={ch === "," ? "comma" : "digit"}>
            {ch}
          </span>
        ))}
      </b>
    </span>
  );
}
