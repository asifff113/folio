"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NavLink } from "@/config/customize";
import type { NavItem } from "@/lib/journey/nav";
import { journey, onJourneyFrame, scrollToChapter } from "@/lib/journey/store";
import { VisitCounter } from "./VisitCounter";

const pad = (n: number) => String(n + 1).padStart(2, "0");
const opensTab = (url: string) => /^https?:/i.test(url);

/**
 * The top nav bar: your handle, a jump link per chapter, extra links, and
 * the HUD's online light and clock. When the links don't fit (phones, narrow
 * windows, many sections) they fold into one MENU button with a full-screen list.
 */
export function TopNav({
  handle,
  items,
  links,
  autoHide,
  online,
  clock,
}: {
  handle: string;
  items: NavItem[];
  links: NavLink[];
  autoHide: boolean;
  online: boolean;
  clock: boolean;
}) {
  const [active, setActive] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [compact, setCompact] = useState(false);
  const [menu, setOpen] = useState(false);
  const slot = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const time = useRef<HTMLSpanElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);

  // Which chapter is on screen.
  useEffect(() => onJourneyFrame((s) => setActive(Math.round(s))), []);

  // Fold the links into the menu when they don't fit beside the handle and clock.
  useEffect(() => {
    const s = slot.current;
    const l = list.current;
    if (!s || !l) return;
    const fit = () => setCompact(l.scrollWidth > s.clientWidth + 1);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(s);
    ro.observe(l);
    document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, [items, links]);

  // Slide away while scrolling down, come back on the way up.
  useEffect(() => {
    if (!autoHide) return;
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 80) setHidden(false);
      else if (y > last + 6) setHidden(true);
      else if (y < last - 6) setHidden(false);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [autoHide]);

  useEffect(() => {
    if (!clock) return;
    const tick = () => {
      if (time.current) time.current.textContent = new Date().toTimeString().slice(0, 8);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [clock]);

  // A window grown wide enough to show the links closes the menu.
  const open = menu && compact;
  const close = useCallback(() => setOpen(false), []);

  // While the menu is open: page scroll paused, focus kept inside, Escape closes.
  useEffect(() => {
    if (!open) return;
    const button = menuButton.current;
    journey.lenis?.stop();
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    sheet.current?.querySelector<HTMLElement>("[aria-current='true'], button, a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return close();
      if (e.key !== "Tab" || !sheet.current) return;
      const focusable = sheet.current.querySelectorAll<HTMLElement>("button, a[href]");
      const first = focusable[0];
      const lastEl = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = overflow;
      journey.lenis?.start();
      button?.focus();
    };
  }, [open, close]);

  const jump = (index: number) => {
    setOpen(false);
    // Let the menu release the page scroll first.
    requestAnimationFrame(() => scrollToChapter(index));
  };

  const isActive = (item: NavItem) => item.index === active;

  return (
    <>
      <header className="top-nav" data-hidden={autoHide && hidden && !open}>
        <button type="button" className="top-nav-home" onClick={() => jump(0)} aria-label={`${handle}, back to the start`}>
          SYS://{handle.toUpperCase()}
        </button>

        <div ref={slot} className="top-nav-slot">
          <nav aria-label="Chapters" aria-hidden={compact || undefined}>
            <ul ref={list} className={compact ? "top-nav-links is-measuring" : "top-nav-links"}>
              {items.map((item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    className="top-nav-link"
                    aria-current={isActive(item) || undefined}
                    onClick={() => jump(item.index)}
                    tabIndex={compact ? -1 : undefined}
                  >
                    <span className="num" aria-hidden="true">
                      {pad(item.index)}
                    </span>
                    {item.label}
                  </button>
                </li>
              ))}
              {links.length > 0 && <li aria-hidden="true" className="top-nav-sep" />}
              {links.map((link) => (
                <li key={link.url + link.label}>
                  <a
                    href={link.url}
                    className="top-nav-link extra"
                    tabIndex={compact ? -1 : undefined}
                    {...(opensTab(link.url) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  >
                    {link.label}
                    {opensTab(link.url) && <span aria-hidden="true"> ↗</span>}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <VisitCounter className="top-nav-counter" />

        {(online || clock) && (
          <span className="top-nav-status" aria-hidden="true">
            {online && (
              <>
                <span className="blink">●</span> ONLINE{" "}
              </>
            )}
            {clock && <span ref={time}>--:--:--</span>}
          </span>
        )}

        {compact && (
          <button
            ref={menuButton}
            type="button"
            className="top-nav-menu"
            aria-expanded={open}
            aria-haspopup="dialog"
            onClick={() => setOpen(true)}
          >
            MENU
            <svg aria-hidden="true" width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 2h16M1 7h16M5 12h12" />
            </svg>
          </button>
        )}
      </header>

      {open && (
        <div ref={sheet} className="nav-sheet" role="dialog" aria-modal="true" aria-label="Jump to a chapter" data-lenis-prevent>
          <div className="nav-sheet-head">
            <span>{"// JUMP TO"}</span>
            <button type="button" className="top-nav-menu" onClick={close}>
              CLOSE
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 1l12 12M13 1L1 13" />
              </svg>
            </button>
          </div>
          <nav aria-label="Chapters">
            <ul className="nav-sheet-list">
              {items.map((item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    className="nav-sheet-item"
                    aria-current={isActive(item) || undefined}
                    onClick={() => jump(item.index)}
                  >
                    <span className="num" aria-hidden="true">
                      {pad(item.index)}
                    </span>
                    <span className="name">{item.label}</span>
                    {isActive(item) && <span className="here">YOU ARE HERE</span>}
                  </button>
                </li>
              ))}
            </ul>
            {links.length > 0 && (
              <ul className="nav-sheet-links">
                {links.map((link) => (
                  <li key={link.url + link.label}>
                    <a
                      href={link.url}
                      className="nav-sheet-extra"
                      {...(opensTab(link.url) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    >
                      {link.label}
                      {opensTab(link.url) && <span aria-hidden="true">↗</span>}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </nav>
          <VisitCounter className="nav-sheet-counter" />
          <p className="nav-sheet-foot">Tap a chapter and the camera flies there.</p>
        </div>
      )}
    </>
  );
}
