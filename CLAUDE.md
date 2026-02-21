# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Quiqlog** is a SaaS platform (similar to Scribe/Tango) that lets users record browser clicks and auto-generates shareable step-by-step how-to guides. It consists of two sub-projects:

- `web-app/` — Next.js 15 web application (dashboard, editor, public guide viewer, API)
- `extension/` — Chrome MV3 extension (captures clicks + screenshots, sends to web app)
- `supabase/` — Database schema and migrations

## Commands

All commands run from `web-app/`:

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build
npm run start    # Start production server
```

The extension has no build step — load `extension/` directly as an unpacked Chrome extension.

## Environment Variables

Required in `web-app/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
POLAR_ACCESS_TOKEN=
POLAR_PRODUCT_ID=
POLAR_WEBHOOK_SECRET=
POLAR_SERVER=sandbox   # or "production"
```

## Architecture

### Web App (Next.js 15 App Router)

**Route groups:**
- `(auth)/` — Login/signup pages (unauthenticated)
- `(app)/` — Protected routes (dashboard, guide editor); middleware enforces auth
- `guide/[slug]/` — Public guide viewer (SEO-optimized, no auth required)
- `api/` — Backend: guide/step CRUD, screenshot upload, extension session receiver, Polar webhooks

**Key library files (`web-app/lib/`):**
- `types.ts` — Shared TypeScript interfaces (`Guide`, `Step`, `User`, `ExtensionSession`)
- `constants.ts` — App-wide config (`FREE_GUIDES_PER_MONTH`, `EXTENSION_ID`, etc.)
- `paywall.ts` — Shared paywall logic (`canCreateGuide`, `resolvePaywall`) — used by both UI and API routes to enforce subscription limits
- `supabase/client.ts` — Browser Supabase client
- `supabase/server.ts` — Server-side Supabase client + admin client

**Paywall system:** Free users get 10 guides/month. `canCreateGuide()` and `resolvePaywall()` in `lib/paywall.ts` are the single source of truth — both the API and UI import from here. Subscription state is stored in the `user_subscriptions` table and managed via Polar.sh webhooks at `/api/polar/webhook`.

**Auth flow:** Supabase Auth → OAuth callback at `/api/auth/callback` → middleware protects `(app)` routes → `TokenSync` component pushes the Supabase access token into `chrome.storage.local` so the extension can make authenticated API calls.

### Extension (Chrome MV3, vanilla JS)

- `background/background.js` — Service worker: manages recording state, captures screenshots via `chrome.tabs.captureVisibleTab()` (600ms rate limit), annotates clicks using OffscreenCanvas (golden circle overlay), sends completed session to `/api/extension/session`
- `content/content.js` — Content script: listens for clicks, extracts element labels and coordinates
- `popup/popup.js` — Start/stop recording UI, step counter

The extension communicates with the web app via `externally_connectable` in the manifest.

### Database (Supabase/PostgreSQL)

Three tables: `guides`, `steps`, `user_subscriptions`. Row-Level Security (RLS) is enabled — users can only access their own data; public guides are readable by all. Screenshots are stored in Supabase Storage with matching RLS policies.

## Design System

Dark theme with indigo accents. Key tokens:
- Background: `#0F1117`
- Accent: `#6366F1` (indigo)
- Fonts: Space Grotesk (headings), Work Sans (body)
- Defined in `tailwind.config.ts` and `globals.css`

## CORS

`next.config.ts` sets CORS headers on `/api/extension/*` routes to allow `chrome-extension://` origins so the extension can POST recordings.
