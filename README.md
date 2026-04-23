# Quiqlog

Quiqlog is a SaaS platform that lets users record browser interactions and automatically generates shareable, step-by-step how-to guides — similar to Scribe or Tango.

## What it does

1. Install the Chrome extension and click **Start Recording**
2. Perform the workflow you want to document in any browser tab
3. Click **Stop** — Quiqlog captures every click with a screenshot and builds a guide automatically
4. Edit, annotate, and publish your guide with a shareable link

## Project structure

```
quiqlogapp/
├── web-app/        # Next.js 15 web application
├── extension/      # Chrome MV3 extension (no build step)
└── supabase/       # Database schema and migrations
```

## Tech stack

| Layer | Technology |
|---|---|
| Frontend / API | Next.js 15 (App Router), React, TypeScript |
| Styling | Tailwind CSS, custom dark design system |
| Database | Supabase (PostgreSQL + RLS + Storage) |
| Auth | Supabase Auth (OAuth) |
| Payments | Polar.sh |
| Extension | Chrome MV3, vanilla JS |

## Getting started

### Prerequisites

- Node.js 18+
- A Supabase project
- A Polar.sh account (for payments)
- Chrome (to use the extension)

### Web app

```bash
cd web-app
npm install
```

Create `web-app/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
POLAR_ACCESS_TOKEN=
POLAR_PRODUCT_ID=
POLAR_WEBHOOK_SECRET=
POLAR_SERVER=sandbox   # or "production"
```

```bash
npm run dev   # http://localhost:3000
```

### Chrome extension

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `extension/` folder

The extension connects to the web app and syncs the user's Supabase auth token automatically.

## Key features

- **Auto-capture** — Screenshots taken on every click with golden circle annotations marking each interaction
- **Guide editor** — Drag-and-drop step reordering, inline title/description editing, publish/unpublish toggle
- **Tip & Alert blocks** — Insert contextual callout blocks between steps
- **Screenshot tools** — Blur sensitive areas or draw freeform annotations directly on screenshots
- **Public guide viewer** — SEO-optimized, no login required for readers
- **Paywall** — Free tier includes 10 guides/month; Pro tier via Polar.sh subscription

## Database

Three tables with Row-Level Security (RLS):

- `guides` — guide metadata (title, slug, `is_public`, owner)
- `steps` — ordered steps with `type` (`step` | `tip` | `alert`), screenshot URL, title, description
- `user_subscriptions` — subscription state synced from Polar.sh webhooks

Run migrations from `supabase/`.

## Routes

| Path | Description |
|---|---|
| `/home` | Authenticated home — extension CTA + guide stats |
| `/dashboard` | Guide list |
| `/dashboard/guides/[id]/editor` | Guide editor |
| `/guide/[slug]` | Public guide viewer |
| `/api/guides/*` | Guide + step CRUD |
| `/api/extension/session` | Receives completed recordings from the extension |
| `/api/polar/webhook` | Polar.sh subscription events |
| `/api/polar/portal` | Opens Polar customer portal |

## License

Private — all rights reserved.
