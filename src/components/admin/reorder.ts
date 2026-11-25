"use client";

import { type Dispatch, type DragEvent, type SetStateAction, useRef, useState } from "react";

/** Moves one entry of a list to another position. */
export function moveItem<T>(rows: T[], from: number, to: number) {
  const next = [...rows];
  const [item] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(next.length, to)), 0, item);
  return next;
}

/**
 * Drag to reorder: spread `handle(i)` on the grip and `row(i)` on the list
 * row. The ↑ ↓ buttons next to it do the same for keyboards and phones.
 */
export function useDragReorder<T>(setRows: Dispatch<SetStateAction<T[]>>) {
  const from = useRef<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  return {
    over,
    handle: (index: number) => ({
      draggable: true,
      onDragStart: (e: DragEvent<HTMLElement>) => {
        from.current = index;
        e.dataTransfer.effectAllowed = "move";
        const row = e.currentTarget.closest("li");
        if (row) e.dataTransfer.setDragImage(row, 20, 20);
      },
      onDragEnd: () => {
        from.current = null;
        setOver(null);
      },
    }),
    row: (index: number) => ({
      onDragOver: (e: DragEvent<HTMLElement>) => {
        if (from.current === null) return;
        e.preventDefault();
        if (over !== index) setOver(index);
      },
      onDrop: (e: DragEvent<HTMLElement>) => {
        e.preventDefault();
        const start = from.current;
        from.current = null;
        setOver(null);
        if (start === null || start === index) return;
        setRows((rows) => moveItem(rows, start, index));
      },
    }),
  };
}
