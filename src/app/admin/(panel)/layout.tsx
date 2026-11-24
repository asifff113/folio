import type { ReactNode } from "react";
import Link from "next/link";
import { Suspense } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { AccountBadge } from "@/components/admin/AdminContent";

export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-[920px] px-5 pt-6 pb-20">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-holo-dim pb-4 font-mono text-[11px] font-medium tracking-[0.14em] text-holo">
        <span>
          SYS://ADMIN <span className="blink">●</span>
        </span>
        <span className="flex items-center gap-4">
          <Suspense fallback={null}>
            <AccountBadge />
          </Suspense>
          <Link href="/" className="hover:underline">
            view site ↗
          </Link>
        </span>
      </header>
      <div className="grid gap-6 md:grid-cols-[180px_minmax(0,1fr)]">
        <AdminNav />
        <div>{children}</div>
      </div>
    </div>
  );
}
