# Instructions — Instroom Setup & Onboarding

> Step-by-step guide to get from zero to a running Instroom instance.
> Follow sections in order — each step depends on the previous.

---

## Prerequisites

Before starting, you need:

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20.x or higher | https://nodejs.org |
| npm | 10.x or higher | Included with Node |
| Supabase CLI | Latest | `npm install -g supabase` |
| Git | Any | https://git-scm.com |

Optional but recommended:
- **VS Code** with the Tailwind CSS IntelliSense extension
- **Supabase Studio** for local DB inspection

---

## 1. Clone & Install

```bash
git clone https://github.com/arjaydelosreyes/Instroom-Post-Tracker.git
cd Instroom-Post-Tracker
npm install
```

---

## 2. Environment Variables

Copy the example file and fill in all values:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```bash
# ── Supabase ──────────────────────────────────────────────────────────────────
# From: Supabase project → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...          # anon/public key
SUPABASE_SERVICE_ROLE_KEY=eyJ...                      # service role — NEVER commit this

# ── App ───────────────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000              # use https://app.instroom.co in production

# ── Ensemble ──────────────────────────────────────────────────────────────────
# From: Ensemble dashboard → Settings → API
ENSEMBLE_WEBHOOK_SECRET=whsec_...                     # for HMAC signature verification
ENSEMBLE_API_KEY=ens_live_...                         # for content download + metrics API

# ── Google Drive ──────────────────────────────────────────────────────────────
# Base64-encoded service account JSON
# Run: cat service-account.json | base64 | tr -d '\n'
GOOGLE_SERVICE_ACCOUNT_JSON_B64=eyJhY2NvdW50...

# ── Vercel Cron (add after deploying to Vercel) ────────────────────────────────
CRON_SECRET=your-random-secret-here                   # used to authenticate cron job requests
```

> ⚠️ Never commit `.env.local`. It is already in `.gitignore`.

---

## 3. Supabase Setup

### Option A — Use Supabase Cloud (recommended for getting started)

1. Create a free project at https://supabase.com
2. Copy your project URL + anon key + service role key into `.env.local`
3. Apply the database schema:

```bash
npm run db:push
```

This runs all migration files in `supabase/migrations/` against your Supabase project.

4. Verify in Supabase Studio (Tables → you should see all 13 tables)

5. Generate TypeScript types from the live schema:

```bash
npm run db:generate
```

This creates `lib/types/supabase.ts`. Commit this file.

### Option B — Local Supabase (Docker required)

```bash
# Start local Supabase
npx supabase start

# Apply migrations
npx supabase db reset   # or: npx supabase migration up

# Get local credentials (use these in .env.local)
npx supabase status
```

Local Studio: http://localhost:54323

---

## 4. Google Drive Setup

### Create a service account

1. Go to https://console.cloud.google.com
2. Create or select a project
3. Enable the **Google Drive API**
4. Navigate to **IAM & Admin → Service Accounts**
5. Create a new service account (e.g., `instroom-drive@your-project.iam.gserviceaccount.com`)
6. Create a JSON key for the service account — download the file
7. Base64-encode the JSON file:

```bash
cat service-account.json | base64 | tr -d '\n'
```

8. Paste the output as `GOOGLE_SERVICE_ACCOUNT_JSON_B64` in `.env.local`

### Create the root Drive folder

1. Create a Google Drive folder named "Instroom" (or anything)
2. Share it with the service account email (Editor permission)
3. Copy the folder ID from the URL: `https://drive.google.com/drive/folders/{FOLDER_ID}`
4. When creating a workspace in the app, paste this folder ID in workspace settings

---

## 5. Ensemble Setup

1. Log in to your Ensemble dashboard
2. Navigate to Settings → Webhooks
3. Add a new webhook:
   - **URL:** `https://app.instroom.co/api/webhooks/ensemble`
   - **Events:** `post.created`, `post.updated`
   - **Secret:** Generate a random string (32+ chars) — copy to `ENSEMBLE_WEBHOOK_SECRET`
4. Copy your Ensemble API key to `ENSEMBLE_API_KEY`

> For local development, use a tunnel tool like [ngrok](https://ngrok.com) to expose `localhost:3000` and set that as the webhook URL temporarily.

---

## 6. First Run

```bash
npm run dev
```

Open http://localhost:3000

You should see the marketing landing page. Click "Get started" or go to http://localhost:3000/signup.

### First-time flow (local development)

1. **Sign up** with your email
2. **Confirm email** (Supabase sends a confirmation link)
3. **Create your first workspace** — enter a name (e.g., "Nike"), click Create
   > ⚠️ **Dev only.** The `/onboarding` manual workspace creation exists for local development only. In production, workspaces are auto-created when a brand admin accepts an agency-generated link (`/onboard/[token]`). See **Phase 13** in `docs/TODO.md` for the production implementation, and **Flow 0** in `docs/WORKFLOWS.md` for the full spec.
4. You'll land on the **overview dashboard**

### Testing the brand onboarding flow in development

Since the brand invite link is agency-generated (not a public URL), use token seeding to test it locally. This exercises the exact same code path as production:

```sql
-- Run in Supabase Studio SQL Editor

-- 1. Insert a test brand (use your dev user's ID as agency_id)
INSERT INTO brands (agency_id, name, slug, status)
VALUES ('your-dev-user-id', 'Test Brand', 'test-brand', 'pending')
RETURNING id;

-- 2. Seed a known token (999 days so it never expires in dev)
INSERT INTO brand_invitations (brand_id, token, expires_at)
VALUES ('brand-id-from-above', 'dev-test-token-123', now() + INTERVAL '999 days');
```

Then open: `http://localhost:3000/onboard/dev-test-token-123`

The full acceptance flow (auth gate → accept button → workspace auto-creation → redirect) runs exactly as it would in production.

---

## 7. Verify Everything Works

### Auth
- [ ] Can sign up with email
- [ ] Confirm email works
- [ ] Can sign in
- [ ] Sign out works

### Workspace
- [ ] `/onboarding` (dev) creates a workspace manually
- [ ] Workspace slug appears in URL
- [ ] Workspace switcher shows your workspace
- [ ] Brand onboarding: seed a token (see Section 6), open `/onboard/dev-test-token-123`, accept → new workspace created, redirect to `/{slug}/overview`

### Database
- [ ] Go to Supabase Studio → Table Editor → workspaces — your workspace should appear
- [ ] workspace_members should have a row with your user ID and role `owner`
- [ ] emv_config should have 3 rows (IG / TT / YT default CPM rates)

### Campaigns
- [ ] Create a campaign — fills in form, redirects to campaign detail
- [ ] Campaign appears in the campaigns list

---

## 8. Development Workflow

### Daily workflow

```bash
npm run dev          # Start dev server
npm run type-check   # Check for TypeScript errors (run before committing)
npm run lint         # Check for linting errors
```

### After schema changes

```bash
npm run db:push      # Apply new migration files to Supabase
npm run db:generate  # Regenerate lib/types/supabase.ts
```

### Creating a new migration

```bash
# Create a new migration file
npx supabase migration new my-migration-name
# Edit the file in supabase/migrations/
# Apply it
npm run db:push
```

---

## 9. Deployment (Vercel)

### First deployment

1. Push your code to GitHub
2. Import the repo in Vercel (https://vercel.com/new)
3. Add all environment variables in Vercel → Settings → Environment Variables:
   - All variables from `.env.local`
   - Use `https://app.instroom.co` for `NEXT_PUBLIC_APP_URL`
4. Deploy

### After deploying

1. Update the Ensemble webhook URL to your production URL
2. Go to Vercel → Settings → Cron Jobs — verify the two cron jobs are listed:
   - `/api/cron/download-worker` every 5 minutes
   - `/api/cron/metrics-worker` every 10 minutes
3. Set `CRON_SECRET` in Vercel env vars — this authenticates cron requests

### Custom domain

1. Vercel → Settings → Domains → Add `app.instroom.co`
2. Update DNS records as instructed by Vercel
3. Update `NEXT_PUBLIC_APP_URL` in Vercel environment variables

---

## 10. Common Issues

### "Error: missing supabase environment variables"
→ Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are in `.env.local`

### "RLS violation" errors in queries
→ You're using `createClient()` (user-scoped) in a place where the user doesn't have a session yet. Check the route is protected by middleware.

### Ensemble webhook returns 401
→ The `ENSEMBLE_WEBHOOK_SECRET` in `.env.local` doesn't match what's configured in Ensemble. Verify both.

### Types are stale / TypeScript errors about Supabase tables
→ Run `npm run db:generate` to regenerate `lib/types/supabase.ts`

### Drive upload fails
→ Check that:
1. `GOOGLE_SERVICE_ACCOUNT_JSON_B64` is the correct base64 (no newlines)
2. The service account email has Editor access to the Drive folder
3. The Google Drive API is enabled in Google Cloud Console

### "Cannot find module @/components/..."
→ Ensure `tsconfig.json` has `"paths": { "@/*": ["./*"] }` — it should already be there.

---

## 11. Project Scripts Reference

```bash
npm run dev           # Start Next.js dev server (localhost:3000, hot reload)
npm run build         # Production build — fails on TypeScript errors
npm run start         # Start production build locally
npm run lint          # ESLint — check code quality
npm run type-check    # TypeScript check without building
npm run db:generate   # Regenerate lib/types/supabase.ts from live Supabase schema
npm run db:push       # Push all migrations to Supabase (uses supabase CLI)
```

---

## 12. Repo Structure — For New Contributors

If you're new to the codebase, read the docs in this order:

1. **`CLAUDE.md`** (project root) — absolute rules and directory map
2. **`docs/PRD.md`** — understand what the product does and why
3. **`docs/ARCHITECTURE.md`** — system design and App Router structure
4. **`docs/DESIGN_SYSTEM.md`** — before touching any UI component
5. **`docs/DATABASE.md`** — before writing any Supabase query
6. **`docs/TODO.md`** — pick up an unchecked task in priority order

Then follow the rules in `docs/CODE_STYLE.md` and use `docs/COMPONENTS.md` as your component reference.
