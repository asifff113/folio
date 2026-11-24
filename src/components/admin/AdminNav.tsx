"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "profile", note: "name, intro, about" },
  { href: "/admin/links", label: "links", note: "platforms" },
  { href: "/admin/sections", label: "sections", note: "optional chapters" },
  { href: "/admin/theme", label: "theme", note: "colors, effects" },
] as const;

export function AdminNav() {
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
                className={`block border px-3 py-2 font-mono text-xs whitespace-nowrap ${
                  active
                    ? "border-holo bg-holo/10 text-fg"
                    : "border-transparent text-muted hover:border-holo-dim hover:text-fg"
                }`}
              >
                <span className="text-holo">&gt;</span> {item.label}
                <span className="mt-0.5 hidden text-[10px] text-muted md:block">{item.note}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
