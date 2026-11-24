import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-svh bg-void text-[15px]">
      <div className="hud-scanlines" aria-hidden="true" />
      <div className="relative">{children}</div>
    </div>
  );
}
