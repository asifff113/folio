"use client";

import { scrollToTop } from "@/lib/journey/store";

export function BackToTop() {
  return (
    <button type="button" className="btn" onClick={scrollToTop}>
      &gt; back_to_top()
    </button>
  );
}
