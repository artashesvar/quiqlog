# Quiqlog — Project Plan & Progress Tracker

> **Purpose:** This file tracks what has been built and what remains. Reference this at the start of every session to pick up exactly where we left off.

---

## What Is Quiqlog?

A browser extension + web app (like Scribe.com / Tango.ai) that records a user's clicks and screen context, then transforms that session into a clean, shareable how-to guide document — with annotated screenshots, step descriptions, and a public shareable URL. No manual writing required.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Web App | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS — dark theme (#0F1117), indigo accent (#6366F1) |
| Fonts | Space Grotesk (headings), Work Sans (body) |
| Auth + DB + Storage | Supabase |
| Extension | Chrome MV3, Vanilla JS |
| Key Packages | @supabase/ssr, nanoid, react-hot-toast |

---

## Directory Structure

```
myawsomeapp/
├── web-app/             # Next.js 15 web application
│   ├── app/
│   │   ├── (auth)/      # login, signup pages
│   │   ├── (app)/       # protected dashboard, editor
│   │   │   ├── dashboard/
│   │   │   └── guides/[id]/editor/
│   │   ├── guide/[slug]/    # public shareable guide viewer
│   │   ├── api/             # all API routes
│   │   │   ├── guides/
│   │   │   ├── steps/
│   │   │   ├── upload/
│   │   │   ├── auth/callback/
│   │   │   └── extension/session/
│   │   ├── layout.tsx
│   │   ├── page.tsx         # landing page
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/              # Button, Card, Input, Badge
│   │   ├── dashboard/       # GuideCard, GuideList, ExtensionCTA, NewGuideButton
│   │   ├── editor/          # GuideEditor, GuideHeader, StepList, StepCard, BlurEditor, IndicatorEditor
│   │   ├── public/          # PublicGuideHeader, PublicStep, PublicGuideViewer
│   │   └── AppNav.tsx
│   ├── lib/
│   │   ├── supabase/        # client.ts, server.ts
│   │   ├── types.ts
│   │   ├── constants.ts
│   │   └── utils.ts
│   ├── hooks/               # (reserved for future hooks)
│   ├── middleware.ts         # auth protection
│   ├── tailwind.config.ts
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   └── .env.local.example
│
├── extension/               # Chrome MV3 extension
│   ├── manifest.json
│   ├── src/
│   │   ├── background/background.js   # recording + screenshot capture
│   │   ├── content/content.js         # click listener
│   │   ├── content/styles.css         # overlay animation
│   │   └── popup/popup.html/.js/.css  # extension popup UI
│   └── icons/               # icon16/48/128.png (add manually)
│
├── supabase/
│   ├── schema.sql                    # tables, RLS, triggers
│   ├── storage-policies.sql          # storage bucket RLS
│   └── add-indicator-position.sql    # migration: indicator_x, indicator_y on steps
│
├── project-plan.md           # this file
└── .gitignore
```

---

## Phase Completion Status

### ✅ Phase 1 — Scaffold & Design System
- [x] Next.js 15 project created (TypeScript, Tailwind, App Router)
- [x] Tailwind config: dark palette, indigo accent, Space Grotesk + Work Sans, rounded/shadow tokens
- [x] `app/globals.css` with CSS variables, font imports, scrollbar styles
- [x] `app/layout.tsx` with `next/font/google` imports for both fonts
- [x] UI primitives: `Button.tsx`, `Card.tsx`, `Input.tsx`, `Badge.tsx`
- [x] `lib/types.ts` — Guide, Step, User, RecordedStep, ExtensionSession
- [x] `lib/constants.ts` — APP_NAME, EXTENSION_ID, APP_URL, etc.
- [x] `lib/utils.ts` — generateSlug, formatDate, copyToClipboard, base64ToBuffer
- [x] `extension/manifest.json` — Chrome MV3 manifest

### ✅ Phase 2 — Supabase Schema
- [x] `supabase/schema.sql` — guides + steps tables, RLS policies, updated_at trigger
- [x] `supabase/storage-policies.sql` — screenshots bucket RLS
- [x] `lib/supabase/client.ts` — browser client
- [x] `lib/supabase/server.ts` — server client + admin client
- [x] `middleware.ts` — protects /dashboard, redirects /login if authed
- [x] **DONE:** Supabase project created, schema.sql run, screenshots bucket created, .env.local configured

### ✅ Phase 3 — Authentication
- [x] `app/(auth)/layout.tsx` — centered auth card layout
- [x] `app/(auth)/login/page.tsx` — email+password login
- [x] `app/(auth)/signup/page.tsx` — signup with email confirmation
- [x] `app/api/auth/callback/route.ts` — OAuth code exchange

### ✅ Phase 4 — Core API Routes
- [x] `app/api/guides/route.ts` — GET list, POST create
- [x] `app/api/guides/[id]/route.ts` — GET, PATCH, DELETE (with storage cleanup)
- [x] `app/api/guides/[id]/steps/route.ts` — GET, POST
- [x] `app/api/steps/[id]/route.ts` — PATCH, DELETE
- [x] `app/api/upload/route.ts` — base64/file → Supabase Storage
- [x] `app/api/extension/session/route.ts` — receives full recording, creates guide+steps

### ✅ Phase 5 — Dashboard
- [x] `app/(app)/layout.tsx` — app shell with auth check
- [x] `components/AppNav.tsx` — top nav with sign-out
- [x] `app/(app)/dashboard/page.tsx` — server-rendered guide list
- [x] `components/dashboard/GuideCard.tsx` — guide card with actions
- [x] `components/dashboard/GuideList.tsx` — grid with empty state
- [x] `components/dashboard/ExtensionCTA.tsx` — detects extension, shows CTA
- [x] `components/dashboard/NewGuideButton.tsx` — creates guide and navigates to editor

### ✅ Phase 6 — Guide Editor
- [x] `app/(app)/guides/[id]/editor/page.tsx` — server renders guide+steps
- [x] `components/editor/GuideEditor.tsx` — client wrapper with state + mutations
- [x] `components/editor/GuideHeader.tsx` — editable title, publish toggle, share link
- [x] `components/editor/StepList.tsx` — group-based up/down arrow reordering (no DnD)
- [x] `components/editor/StepCard.tsx` — screenshot, inline edit title/description, delete, move arrows
- [x] `components/editor/TipAlertBlock.tsx` — tip/alert blocks, not independently movable

### ✅ Phase 7 — Public Guide Viewer
- [x] `app/guide/[slug]/page.tsx` — SEO-ready public guide page
- [x] `components/public/PublicGuideHeader.tsx`
- [x] `components/public/PublicStep.tsx`
- [x] `generateMetadata` for SEO + og:image

### ✅ Phase 8 — Chrome Extension (Core)
- [x] `extension/manifest.json` — complete MV3 manifest
- [x] `extension/src/background/background.js` — recording state, captureVisibleTab, raw PNG capture (no burned-in circle), session POST with viewportWidth/viewportHeight
- [x] `extension/src/content/content.js` — click listener, label extraction, storage sync, viewportWidth/viewportHeight in CLICK_RECORDED
- [x] `extension/src/content/styles.css` — pulse animation for overlay
- [x] `extension/src/popup/popup.html` — popup UI
- [x] `extension/src/popup/popup.js` — recording toggle, step count
- [x] `extension/src/popup/popup.css` — dark popup styles

### ✅ Phase 9 — Landing Page & Config
- [x] `app/page.tsx` — marketing landing page
- [x] `next.config.ts` — image domains, CORS headers for extension
- [x] `.env.local.example` — env template
- [x] `.gitignore`

---

### ✅ Phase 10 — Payments (Polar)
- [x] `supabase/subscriptions-migration.sql` — `user_subscriptions` table with RLS + guide index
- [x] `components/editor/PaywallOverlay.tsx` — paywall modal shown when free limit reached
- [x] `app/api/polar/checkout/route.ts` — creates Polar embedded checkout session with `user_id` metadata
- [x] `app/api/polar/webhook/route.ts` — handles subscription lifecycle events, upserts to Supabase
- [x] `lib/paywall.ts` — shared `resolvePaywall()` and `canCreateGuide()` utilities (UTC, handles active/trialing/canceled)
- [x] Server-side guide creation enforcement in `POST /api/guides` (returns 403 when limit reached)
- [x] Both editor pages use shared `resolvePaywall()` — no duplicate logic
- [x] `FREE_GUIDES_PER_MONTH = 10` constant wired into paywall logic
- [x] `trialing` status mapped to `active` (2-week trial support)
- [x] End-to-end tested in sandbox: paywall → checkout → webhook → Supabase `status: active` → paywall gone

## 🟡 Remaining Work (Next Sessions)

### Setup — DONE ✅
- [x] Node.js installed, `npm install` run, dev server running at localhost:3000
- [x] Supabase project created with schema, storage bucket, and .env.local
- [x] Extension icons generated and extension loaded in Chrome (ID: dlpkihkhjihfcomcgnkggahddkjciabd)
- [x] Token sync working — dashboard sends auth token to extension
- [x] Full end-to-end flow tested and working

### Phase 11 — Improvements
- [ ] Handle token refresh (Supabase tokens expire after 1 hour — re-sync on dashboard visit already handles this)
- [ ] Add loading skeletons to editor and dashboard
- [x] **Replaced drag-and-drop with group-based arrow reordering** — removed @dnd-kit entirely from editor; steps move with their attached tips/alerts as an atomic group via up/down arrows; tips/alerts have no independent move controls
- [x] **Removed insert-before-first-step button** — the "+" `InsertBlockMenu` that appeared above step 1 was removed; tips/alerts can only be inserted after a step
- [x] **Tip/Alert insert buttons visible in editing mode** — `InsertBlockMenu` `+` button was opacity-0 (hover-only, invisible); changed to opacity-40 at rest so users can discover the feature
- [x] **Extension: persist steps across service worker restarts** — load/save `steps[]` in `chrome.storage.local` so in-progress recordings survive background script restarts
- [x] **Extension: auth guard on screenshot upload** — `uploadScreenshot` now throws early if `authToken` is null, preventing unauthenticated upload attempts
- [x] **Extension: security fix for GET_STATE** — `GET_STATE` handler now rejects messages from content scripts (`sender.tab` check), preventing web pages from reading `authToken`
- [x] **Extension: fix click captured on wrong layer** — `handleClick` now uses `document.elementFromPoint(x, y)` instead of `event.target` to identify the topmost painted element at click coordinates, so popup/modal close buttons are correctly attributed instead of the background page behind them
- [x] **Extension: fix screenshot captures wrong window (C1)** — `captureVisibleTab` now resolves the windowId of the recorded tab via `chrome.tabs.get()` instead of passing `null`, so screenshots always capture the correct window when multiple browser windows are open
- [x] **Extension: fix popup stuck on Recording after on-page stop (S1)** — background broadcasts `RECORDING_STOPPED` at the top of `stopRecording()` so the popup resets immediately regardless of which stop path the user took
- [x] **Extension: persist targetTabId + sessionId across service worker restarts (C3-A)** — both values are now saved to `chrome.storage.local` on start and cleared on stop; `onTabUpdated` listener is re-registered on SW wake if a recording was active
- [x] **Extension: keepalive ping to extend SW lifetime to ~15 min (C3-B)** — content script pings background with `KEEPALIVE` every 25s while recording, resetting Chrome's idle timer and keeping the service worker alive for long sessions
- [x] **Drag-and-reposition click indicator** — removed burned-in yellow circle from extension screenshots; `indicator_x`/`indicator_y` (percentage) stored in DB; CSS overlay circle rendered in editor and public view; `IndicatorEditor.tsx` portal (same pattern as BlurEditor) lets user drag to reposition; Apply saves to DB optimistically; static circle follows zoom/pan with counter-scale for consistent size; `setOverlayVisibility` in content.js now also hides `.__quiqlog_circle__` feedback elements so they are never captured in screenshots
- [x] **DB migration** — `supabase/add-indicator-position.sql` adds nullable `indicator_x FLOAT` and `indicator_y FLOAT` columns to `steps` table

### Phase 12 — Production Deploy
- [ ] Deploy web app to Vercel (connect GitHub repo, set env vars)
- [ ] Set production env vars: `NEXT_PUBLIC_APP_URL`, `POLAR_ACCESS_TOKEN`, `POLAR_PRODUCT_ID`, `POLAR_WEBHOOK_SECRET`, `POLAR_SERVER=production`
- [ ] Update Polar production webhook URL to Vercel deployment URL
- [ ] Update `APP_URL` in `extension/src/background/background.js` and `extension/src/popup/popup.js`
- [ ] Update `externally_connectable` in `extension/manifest.json` with production domain
- [ ] Submit extension to Chrome Web Store
- [ ] Add `app/sitemap.ts` for public guide SEO

---

## Key Notes for Future Sessions

- **Extension ID** — unknown until extension is loaded unpacked. Must be set in `lib/constants.ts` → `EXTENSION_ID` and in `extension/manifest.json` → `externally_connectable` matches.
- **Supabase Storage** — screenshots are stored as `{userId}/{guideId}/{nanoid}.png`, served via 10-year signed URLs stored in `steps.screenshot_url`.
- **Editor route** — editor is at `/dashboard/guides/[id]/editor`, NOT `/guides/[id]/editor`. The `(app)` route group prefixes with the app layout.
- **Auth token flow** — the extension stores the Supabase access token in `chrome.storage.local`. The dashboard page must send this token each time the user logs in.
- **No build step for extension** — the extension uses vanilla JS and can be loaded directly as an unpacked extension. No webpack/esbuild needed.

---

## Design Tokens Reference

```
Background:         #0F1117
Background-secondary: #161B27
Background-tertiary:  #1E2535
Border:             #2A3147
Accent:             #6366F1
Accent-hover:       #818CF8
Text-primary:       #F8FAFC
Text-secondary:     #94A3B8
Text-muted:         #64748B
Border-radius:      12px (default), 8px (sm), 16px (lg)
Shadow:             0 4px 24px rgba(0,0,0,0.3)
Shadow-glow:        0 0 20px rgba(99,102,241,0.25)
Font-heading:       Space Grotesk Medium/SemiBold
Font-body:          Work Sans Regular/Medium
```
