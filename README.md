# folio

A personal portfolio built as a scroll-driven 3D journey in a holographic terminal style. Visitors scroll through one continuous WebGL world, find links to my platforms, and can leave a trace: a hand-drawn signature that becomes a star on the wall. Where they came from is only shown to the admin.

All content (name, intro, links, sections) is edited from an admin panel. Optional sections such as skills, projects, research papers, gallery and certificates are built in and stay hidden until switched on.

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript) + Tailwind CSS
- [three.js](https://threejs.org) via React Three Fiber, drei and postprocessing
- Lenis for smooth scrolling
- Supabase for data, admin login, image uploads and the live traces wall (Realtime broadcast)
- Vercel for hosting

## Getting started

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000. Without a database the site runs on placeholder content.

## Admin panel

The admin panel lives at `/admin`. It edits the profile, links, optional sections, theme and the "Ready to help me?" chapter, has an inbox for notes from visitors, and saves to Supabase.

1. Create a free project at [supabase.com](https://supabase.com).
2. In the project's SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql), then [`supabase/phase4_help.sql`](supabase/phase4_help.sql) and [`supabase/phase4b_connect.sql`](supabase/phase4b_connect.sql), then [`supabase/phase5_traces.sql`](supabase/phase5_traces.sql), [`supabase/phase6_sections.sql`](supabase/phase6_sections.sql) and [`supabase/phase7_customize.sql`](supabase/phase7_customize.sql). They create the tables, the access rules (anyone can read, only admins can write; only admins can read the inbox and the full traces table) and placeholder content.
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
| 4 | "Ready to help me?" chapter, admin inbox, centred glass panels with materialize animation, profile picture, link cards with QR codes | done |
| 5 | Trace system: saved signatures, private platform detection, live wall, approval and moderation | done |
| 6 | Sections: six layouts (cards, timeline, skills, gallery, text, links), resume PDF, contact form, build your own, image uploads | done |
| 7 | Customization: look (fonts, glow, glass, effects, HUD), 3D shapes per chapter, particles, motion and extras, chapter order and text, intro, maintenance mode with a private preview | done |
| 8 | SEO, share image, performance, deploy | next |
