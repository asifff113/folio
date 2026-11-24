# folio

A personal portfolio built as a scroll-driven 3D journey in a holographic terminal style. Visitors scroll through one continuous WebGL world, find links to my platforms, and can leave a trace: a hand-drawn signature plus where they came from.

All content (name, intro, links, sections) is edited from an admin panel. Optional sections such as skills, projects, research papers, gallery and certificates are built in and stay hidden until switched on.

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript) + Tailwind CSS
- [three.js](https://threejs.org) via React Three Fiber, drei and postprocessing
- Lenis for smooth scrolling
- Supabase for data and admin login (uploads and live traces in later phases)
- Vercel for hosting

## Getting started

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000. Without a database the site runs on placeholder content.

## Admin panel

The admin panel lives at `/admin`. It edits the profile, links, optional sections and theme, and saves to Supabase.

1. Create a free project at [supabase.com](https://supabase.com).
2. In the project's SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql). It creates the tables, the access rules (anyone can read, only admins can write) and placeholder content.
3. Copy `.env.example` to `.env.local` and fill in the project URL and publishable key (Project Settings → API Keys).
4. In Authentication → Users, add your user with a password. Then turn off new sign-ups (Authentication → Sign In / Providers), so nobody else can create an account.
5. Run the last statement in `schema.sql` with your email to make that user an admin.
6. Restart `pnpm dev` and sign in at http://localhost:3000/admin.

Saving in the admin panel refreshes the public site right away.

## Roadmap

| Phase | Scope | Status |
|---|---|---|
| 1 | Project setup, design tokens, HUD shell | done |
| 2 | Scroll-driven 3D journey (boot, about, interests, signal, traces, end) | done |
| 3 | Supabase, admin login, profile / links / sections / theme editors | done |
| 4 | Trace system: signature pad, platform detection, live log, moderation | next |
| 5 | Optional sections, each one a new chapter of the journey | planned |
| 6 | SEO, share image, performance, deploy | planned |
