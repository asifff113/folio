# folio

A personal portfolio built as a scroll-driven 3D journey in a holographic terminal style. Visitors scroll through one continuous WebGL world, find links to my platforms, and can leave a trace: a hand-drawn signature plus where they came from.

All content (name, intro, links, sections) is edited from an admin panel. Optional sections such as skills, projects, research papers, gallery and certificates are built in and stay hidden until switched on.

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript) + Tailwind CSS
- [three.js](https://threejs.org) via React Three Fiber, drei and postprocessing
- Lenis for smooth scrolling
- Supabase for data, admin login, uploads and live traces (from Phase 3)
- Vercel for hosting

## Getting started

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000.

## Roadmap

| Phase | Scope | Status |
|---|---|---|
| 1 | Project setup, design tokens, HUD shell | done |
| 2 | Scroll-driven 3D journey (boot, about, interests, signal, traces, end) | done |
| 3 | Supabase, admin login, profile / links / sections editors | next |
| 4 | Trace system: signature pad, platform detection, live log, moderation | planned |
| 5 | Optional sections, each one a new chapter of the journey | planned |
| 6 | SEO, share image, performance, deploy | planned |
