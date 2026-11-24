import { defaultSite } from "@/config/site";

/**
 * Phase 1 placeholder: the HUD shell only.
 * Phase 2 replaces the middle with the scroll-driven 3D journey.
 */
export default function Home() {
  const site = defaultSite;

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none fixed inset-3 border border-holo-dim">
        <div className="absolute inset-x-5 top-3 flex justify-between font-mono text-[11px] tracking-[0.14em] text-holo">
          <span>SYS://{site.handle.toUpperCase()}</span>
          <span>
            <span className="blink">●</span> BOOTING
          </span>
        </div>
      </div>

      <section className="flex min-h-screen flex-col justify-end px-7 pb-[12vh]">
        <p className="mb-4 font-mono text-xs leading-7 text-holo">
          &gt; init hologram ......... pending
          <br />
          &gt; 3D journey ............ phase 2
        </p>
        <h1 className="glitch font-display text-[clamp(56px,10vw,128px)] font-extrabold leading-[0.9] tracking-tight text-[#dffaff]">
          {site.name}
        </h1>
        <p className="mt-3 font-mono text-[13px] text-muted">{"// "}{site.tagline}</p>
      </section>

      <div className="hud-scanlines" aria-hidden="true" />
    </main>
  );
}
