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

**User profile menu:** `AppNav` component renders a user icon dropdown with: email (+ Pro badge if subscribed), subscription status (renewal or cancellation date), "Manage Subscription" link (opens Polar customer portal via `/api/polar/portal`), and sign out. Subscription props (`isPro`, `isCanceled`, `hasSubscription`, `subscriptionEnd`) are computed in `(app)/layout.tsx` and passed down. The portal API route creates an authenticated Polar customer session using `POST /v1/customer-sessions/`.

**Subscription statuses in DB:** `active`, `trialing`, `canceled`, `inactive`. The webhook preserves Polar's `trialing` status as distinct from `active`. Canceled subscriptions with a future `current_period_end` retain access (grace period) but the UI shows "Your Pro ends [date]" instead of the Pro badge.

**Auth flow:** Supabase Auth → OAuth callback at `/api/auth/callback` → middleware protects `(app)` routes → `TokenSync` component pushes the Supabase access token into `chrome.storage.local` so the extension can make authenticated API calls.

**Dashboard guide cards (`GuideCard`):** Published guides show a "Published" badge (green) with **Copy Link** and **Unpublish** action buttons. Draft guides show a "Draft" badge with an **Edit** button. Clicking **Unpublish** PATCHes `is_public: false` then redirects to the editor. The **Delete** button opens a `Dialog` confirmation modal; on success the card is removed instantly via local `deleted` state (no page refresh); on API failure the modal stays open and shows an inline error.

**Editor read-only mode:** When a guide is published (`is_public = true`), the editor becomes read-only. `GuideEditor` derives `isReadOnly = guide.is_public` from reactive state and passes it down to `GuideHeader` (title input), `StepList` (DnD reordering blocked in `handleDragEnd`), and `StepCard` / `TipAlertBlock` (inputs, drag handle, and delete button are all disabled/hidden). The Publish/Unpublish button remains interactive at all times.

**Tip & Alert blocks:** Between each item in the editor, an `InsertBlockMenu` component renders a hover-revealed `+` button. Clicking it opens a small dropdown with two options — **Tip** (blue, lightbulb icon) and **Alert** (amber, warning icon). Selecting one POSTs a new row to `/api/guides/[id]/steps` with `type: 'tip'|'alert'`, splices it into local state at the correct position, then re-indexes all `order_index` values. Blocks are rendered as `TipAlertBlock` cards — draggable via dnd-kit, with an optional editable title and an editable body textarea; saves happen on blur like `StepCard`. In the published guide, `PublicTipAlertBlock` renders them with a coloured left border (blue for tip, amber for alert) and a type label — clearly distinct from numbered steps. Step numbers in both the editor and the public viewer only increment for `type === 'step'` items; the step count badge in `PublicGuideHeader` likewise filters to real steps only. The `InsertBlockMenu` and all editing inputs/buttons inside `TipAlertBlock` are hidden in read-only mode.

**Screenshot editing tools (editing mode only):** Each step screenshot shows a hover-revealed vertical toolbar (top-right, indigo `#6366F1` buttons) with two tools:
- **Annotation** (`BlurEditor.tsx`) — pencil icon; opens a canvas modal where the user draws rectangles over sensitive areas, applies `blur(20px)` + `#E0E7FF` overlay, then re-uploads the merged PNG via `/api/upload` and updates `screenshot_url` via PATCH `/api/steps/[id]`.
- **Freeform drawing** (`AnnotationEditor.tsx`) — pencil icon; canvas modal with 8 color swatches, thin/medium/thick stroke width picker, Undo (last stroke), Clear All, and Save Annotation. Uses `useRef` for in-progress stroke points (performance — no re-renders during `pointermove`), commits to React state on `pointerup`. Merged permanently into screenshot on save, same upload flow as blur.
- Both tools use `crossOrigin = "anonymous"` to load Supabase signed URLs into canvas without tainting it.
- The PATCH `/api/steps/[id]` route accepts `screenshot_url` updates (in addition to `title`, `description`, `order_index`, `type`).

### Extension (Chrome MV3, vanilla JS)

- `background/background.js` — Service worker: manages recording state, captures screenshots via `chrome.tabs.captureVisibleTab()` (600ms rate limit), annotates clicks using OffscreenCanvas (golden circle overlay), sends completed session to `/api/extension/session`
- `content/content.js` — Content script: listens for clicks, extracts element labels and coordinates
- `popup/popup.js` — Start/stop recording UI, step counter

The extension communicates with the web app via `externally_connectable` in the manifest.

### Database (Supabase/PostgreSQL)

Three tables: `guides`, `steps`, `user_subscriptions`. Row-Level Security (RLS) is enabled — users can only access their own data; public guides are readable by all. Screenshots are stored in Supabase Storage with matching RLS policies.

**`steps` table `type` column:** Each row has `type TEXT NOT NULL DEFAULT 'step' CHECK (type IN ('step', 'tip', 'alert'))`. Migration: `supabase/add-step-type.sql`. Existing rows default to `'step'`. Tip and Alert blocks reuse all the same CRUD API routes as steps — the `type` field is accepted on POST (`/api/guides/[id]/steps`) and PATCH (`/api/steps/[id]`). DELETE is unchanged; it safely skips storage cleanup when `screenshot_url` is null (as it always is for blocks).

## Design System

Dark theme with indigo accents. Key tokens:
- Background: `#0F1117`
- Accent: `#6366F1` (indigo)
- Fonts: Space Grotesk (headings), Work Sans (body)
- Defined in `tailwind.config.ts` and `globals.css`

### UI Components (`web-app/components/ui/`)

All components are unstyled primitives that compose Tailwind tokens from the design system above.

**`Button`** — `variant`: `primary` | `secondary` | `ghost` | `danger`. `size`: `sm` | `md` | `lg`. `loading?: boolean` shows a spinner and disables the button. Extends `ButtonHTMLAttributes`.

**`Badge`** — `variant`: `default` | `success` | `warning` | `error` | `accent`. Extends `HTMLAttributes<HTMLSpanElement>`.

**`Card`** — `hoverable?: boolean` adds lift + accent border on hover. `glow?: boolean` adds indigo shadow. `animate?: boolean` plays the `animate-card-enter` entrance animation. Extends `HTMLAttributes<HTMLDivElement>`.

**`Input`** — `label?: string` renders an accessible `<label>`. `error?: string` shows red border + error text below. `hint?: string` shows muted helper text (hidden when `error` is set). Auto-generates `id` from label if not provided. Extends `InputHTMLAttributes`.

**`Dialog`** — Client component. `open: boolean` controls visibility. `onClose: () => void` is called on Escape key or backdrop click. Renders via `createPortal` into `document.body` at `z-50`. Use for confirmation modals and overlays; lay out title, body, and action buttons as `children`.

## CORS

`next.config.ts` sets CORS headers on `/api/extension/*` routes to allow `chrome-extension://` origins so the extension can POST recordings.
