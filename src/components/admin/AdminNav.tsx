"use client";

import { type ReactNode, Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "profile", note: "name, intro, about" },
  { href: "/admin/links", label: "links", note: "platforms" },
  { href: "/admin/sections", label: "sections", note: "optional chapters" },
  { href: "/admin/theme", label: "look", note: "colors, fonts, glow, HUD" },
  { href: "/admin/3d", label: "3d", note: "shapes, particles, motion" },
  { href: "/admin/journey", label: "journey", note: "order, intro, maintenance" },
  { href: "/admin/seo", label: "seo", note: "search, share image, icon" },
  { href: "/admin/help", label: "help", note: "ready to help me?" },
  { href: "/admin/inbox", label: "inbox", note: "notes from visitors" },
  { href: "/admin/traces", label: "traces", note: "signatures, sources" },
] as const;

type Badges = Partial<Record<string, ReactNode>>;

/**
 * The admin menu. `badges` maps a menu link to something shown next to it
 * (the unread count). The current page is highlighted once the URL is known;
 * until then (while a dynamic page streams in) the menu shows unhighlighted.
 */
export function AdminNav({ badges = {} }: { badges?: Badges }) {
  return (
    <Suspense fallback={<NavList path="" badges={badges} />}>
      <LiveNav badges={badges} />
    </Suspense>
  );
}

function LiveNav({ badges }: { badges: Badges }) {
  return <NavList path={usePathname()} badges={badges} />;
}

function NavList({ path, badges }: { path: string; badges: Badges }) {
  return (
    <nav aria-label="Admin sections">
      <ul className="flex gap-1.5 overflow-x-auto md:flex-col">
        {ITEMS.map((item) => {
          const active = path === item.href || (item.href !== "/admin" && path.startsWith(`${item.href}/`));
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
