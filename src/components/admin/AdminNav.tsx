"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "profile", note: "name, intro, about" },
  { href: "/admin/links", label: "links", note: "platforms" },
  { href: "/admin/sections", label: "sections", note: "optional chapters" },
  { href: "/admin/theme", label: "theme", note: "colors, effects" },
  { href: "/admin/help", label: "help", note: "ready to help me?" },
  { href: "/admin/inbox", label: "inbox", note: "notes from visitors" },
] as const;

/** `badges` maps a menu link to something shown next to it (the unread count). */
export function AdminNav({ badges = {} }: { badges?: Partial<Record<string, ReactNode>> }) {
  const path = usePathname();
  return (
    <nav aria-label="Admin sections">
      <ul className="flex gap-1.5 overflow-x-auto md:flex-col">
        {ITEMS.map((item) => {
          const active = path === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`block border px-3.5 py-2.5 font-mono text-[14px] whitespace-nowrap ${
                  active
                    ? "border-holo bg-holo/10 text-fg"
                    : "border-transparent text-muted hover:border-holo-dim hover:text-fg"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span>
                    <span className="text-holo">&gt;</span> {item.label}
                  </span>
                  {badges[item.href]}
                </span>
                <span className="mt-0.5 hidden text-[12px] text-muted md:block">{item.note}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
