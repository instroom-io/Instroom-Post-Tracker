# CLAUDE CODE — GO LIVE SESSION
## Everything is hardcoded. Just execute each step in order.

The Instroom codebase is 100% complete (Phases 1–12 done). This session's only job is:
1. Fix 3 small code gaps that will cause crashes on first use
2. Create `.env.local` with the real credentials
3. Push the database schema to Supabase
4. Generate TypeScript types from the live schema
5. Run the app and verify it works
6. Deploy to Vercel

Do not ask for credentials. Do not ask what to do next. Execute each step, verify it worked, then move to the next one.

---

## THE SUPABASE PROJECT (already created — use these values everywhere)

```
Project URL:   https://xwrrccmhsnognnfuihvz.supabase.co
Project Ref:   xwrrccmhsnognnfuihvz
Anon key:      eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3cnJjY21oc25vZ25uZnVpaHZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NDEzNDAsImV4cCI6MjA4OTAxNzM0MH0.-v8Z2e69vZ3Ic-0s_9ChjWVujCr5-X4HVDkVyVnwnPw
Service role:  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3cnJjY21oc25vZ25uZnVpaHZ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzQ0MTM0MCwiZXhwIjoyMDg5MDE3MzQwfQ.8T5CaRkzhCYZFuBsBN50DKwW4s7-7xxmvhm8tUO5Z20
```

---

## STEP 1 — Create `.env.local`

Create this file at the project root. Overwrite it if it already exists.

**File: `.env.local`**
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xwrrccmhsnognnfuihvz.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3cnJjY21oc25vZ25uZnVpaHZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NDEzNDAsImV4cCI6MjA4OTAxNzM0MH0.-v8Z2e69vZ3Ic-0s_9ChjWVujCr5-X4HVDkVyVnwnPw
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3cnJjY21oc25vZ25uZnVpaHZ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzQ0MTM0MCwiZXhwIjoyMDg5MDE3MzQwfQ.8T5CaRkzhCYZFuBsBN50DKwW4s7-7xxmvhm8tUO5Z20

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Ensemble (for webhook testing only — real keys not needed yet)
ENSEMBLE_WEBHOOK_SECRET=test_secret_123
ENSEMBLE_API_KEY=

# Google Drive (not needed yet)
GOOGLE_SERVICE_ACCOUNT_JSON_B64=

# Cron (not needed for local dev)
CRON_SECRET=
```

Verify `.env.local` is listed in `.gitignore`. If it isn't, add it on its own line immediately.

---

## STEP 2 — Fix the 3 Code Gaps

These files are missing and will cause crashes. Create them now before running anything.

### 2A — Dashboard error boundary

**Create: `app/(app)/[workspaceSlug]/(dashboard)/error.tsx`**

```tsx
'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-10 text-center">
      <div className="text-4xl">⚠️</div>
      <p className="font-display text-[16px] font-bold text-foreground">
        Something went wrong
      </p>
      <p className="max-w-sm text-[13px] text-foreground-lighter">
        An unexpected error occurred. Your data is safe — try refreshing the page.
      </p>
      <Button variant="primary" size="md" onClick={reset}>
        Try again
      </Button>
    </div>
  )
}
```

### 2B — Loading states for all dashboard pages

Create these 6 files. They are all identical — copy the same content to each path:

- `app/(app)/[workspaceSlug]/(dashboard)/overview/loading.tsx`
- `app/(app)/[workspaceSlug]/(dashboard)/campaigns/loading.tsx`
- `app/(app)/[workspaceSlug]/(dashboard)/influencers/loading.tsx`
- `app/(app)/[workspaceSlug]/(dashboard)/posts/loading.tsx`
- `app/(app)/[workspaceSlug]/(dashboard)/analytics/loading.tsx`
- `app/(app)/[workspaceSlug]/(dashboard)/settings/loading.tsx`

Content for all 6:

```tsx
export default function Loading() {
  return (
    <div className="space-y-5 p-5">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-background-muted" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-background-muted" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-background-muted" />
      <div className="h-40 animate-pulse rounded-xl bg-background-muted" />
    </div>
  )
}
```

### 2C — Fix the inline Server Action in campaign detail

Open: `app/(app)/[workspaceSlug]/(dashboard)/campaigns/[campaignId]/page.tsx`

Find this block (around line 74–83):

```tsx
<form action={async () => {
  'use server'
  const { createClient } = await import('@/lib/supabase/server')
  const s = await createClient()
  await s.from('campaigns').update({ status: 'active' }).eq('id', campaignId)
}}>
  <Button type="submit" variant="primary" size="sm">
    <Play size={12} />
    Activate
  </Button>
</form>
```

**Step 1:** Add `activateCampaign` to `lib/actions/campaigns.ts`. Append this at the bottom of that file:

```typescript
// ── Activate campaign ──────────────────────────────────────────────────────────

export async function activateCampaign(
  workspaceId: string,
  campaignId: string
): Promise<{ error: string } | void> {
  await assertEditorRole(workspaceId)
  const supabase = await createClient()

  const { error } = await supabase
    .from('campaigns')
    .update({ status: 'active' })
    .eq('id', campaignId)
    .eq('workspace_id', workspaceId)

  if (error) return { error: 'Failed to activate campaign.' }
  revalidatePath(`/(app)/[workspaceSlug]/(dashboard)/campaigns/[campaignId]`, 'page')
  revalidatePath(`/(app)/[workspaceSlug]/(dashboard)/campaigns`, 'page')
}

// ── End campaign ───────────────────────────────────────────────────────────────

export async function endCampaign(
  workspaceId: string,
  campaignId: string
): Promise<{ error: string } | void> {
  await assertEditorRole(workspaceId)
  const supabase = await createClient()

  const { error } = await supabase
    .from('campaigns')
    .update({ status: 'ended' })
    .eq('id', campaignId)
    .eq('workspace_id', workspaceId)

  if (error) return { error: 'Failed to end campaign.' }
  revalidatePath(`/(app)/[workspaceSlug]/(dashboard)/campaigns/[campaignId]`, 'page')
  revalidatePath(`/(app)/[workspaceSlug]/(dashboard)/campaigns`, 'page')
}
```

**Step 2:** In `app/(app)/[workspaceSlug]/(dashboard)/campaigns/[campaignId]/page.tsx`:

Add to the imports at the top:
```tsx
import { activateCampaign, endCampaign } from '@/lib/actions/campaigns'
```

Also add near the top of the component (after `const { workspaceSlug, campaignId } = await params`):
```tsx
// Bind workspace for Server Actions
const activate = activateCampaign.bind(null, workspace?.id ?? '', campaignId)
const end = endCampaign.bind(null, workspace?.id ?? '', campaignId)
```

Wait — workspace is fetched in parallel with campaign. Move the workspace ID binding to after the data fetches. Replace the inline form with:

```tsx
{campaign.status === 'draft' && (
  <form action={activate}>
    <Button type="submit" variant="primary" size="sm">
      <Play size={12} />
      Activate
    </Button>
  </form>
)}
{campaign.status === 'active' && (
  <form action={end}>
    <Button type="submit" variant="secondary" size="sm">
      <StopCircle size={12} />
      End campaign
    </Button>
  </form>
)}
```

And define `activate` and `end` after both `campaign` and `workspace` are confirmed non-null:

```tsx
if (!campaign || !workspace) notFound()

const activate = activateCampaign.bind(null, workspace.id, campaignId)
const end = endCampaign.bind(null, workspace.id, campaignId)
```

### 2D — Fix `package.json` scripts

Open `package.json`. Update the `scripts` section to add `db:push` and fix `db:generate`:

```json
"scripts": {
  "dev": "next dev --turbopack",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "type-check": "tsc --noEmit",
  "db:push": "supabase db push",
  "db:generate": "supabase gen types typescript --project-id xwrrccmhsnognnfuihvz > lib/types/supabase.ts"
}
```

---

## STEP 3 — Install Supabase CLI and Push the Migration

```bash
# Install Supabase CLI
npm install -g supabase

# Login (opens browser — user must authorise)
supabase login

# Link to the project
supabase link --project-ref xwrrccmhsnognnfuihvz

# Push the migration — creates all 13 tables, RLS, triggers, indexes, pg_cron jobs
supabase db push
```

**If `pg_cron` extension error appears:**
The user needs to enable it in Supabase first:
1. Go to https://supabase.com/dashboard/project/xwrrccmhsnognnfuihvz/database/extensions
2. Search for `pg_cron` → click Enable
3. Then re-run `supabase db push`

**Verify the migration worked** by running these SQL queries directly against the database (use the Supabase MCP if available, or tell the user to run them in Supabase → SQL Editor):

```sql
-- Should return exactly 13 table names
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Expected: `campaign_influencers, campaign_tracking_configs, campaigns, emv_config, influencers, invitations, post_metrics, posts, retry_queue, users, workspace_members, workspace_platform_handles, workspaces`

```sql
-- Should return 3 rows (default EMV rates won't exist yet — that's created per workspace)
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public';
```

If fewer than 13 tables come back, check the Supabase SQL Editor for migration errors and fix them before proceeding.

---

## STEP 4 — Generate TypeScript Types

```bash
npx supabase gen types typescript --project-id xwrrccmhsnognnfuihvz > lib/types/supabase.ts
```

After generating, open `lib/types/supabase.ts` and confirm these exist:
- `posts` table with `ensemble_post_id`, `download_status`, `collab_status`, `metrics_fetch_after`
- `campaigns` table with `status`, `platforms`, `start_date`, `end_date`
- `emv_config` table with `cpm_rate`, `platform`
- All enum types: `platform_type`, `workspace_role`, `campaign_status`, `download_status`, `collab_status`

If the file is empty or shows an error, the migration in Step 3 didn't fully apply. Fix that first.

---

## STEP 5 — Run Type Check and Fix All Errors

```bash
npm install
npm run type-check
```

Fix every TypeScript error before proceeding. Common ones:

- **"Property X does not exist"** → The generated Supabase types differ from what the code expects. Update `lib/types/index.ts` to match the generated schema, or fix the query `.select()` to include the missing field.
- **"Cannot find module '@/lib/types/supabase'"** → The `db:generate` in Step 4 failed. Re-run it.
- **"activateCampaign is not exported"** → The Step 2C changes weren't saved. Re-check `lib/actions/campaigns.ts`.

Do not move to Step 6 until `npm run type-check` returns zero errors.

---

## STEP 6 — Start the Dev Server

```bash
npm run dev
```

Open http://localhost:3000 in the browser.

**Expected:** The Instroom marketing landing page loads.

**If you see a blank white page:** Open browser devtools → Console. Share the error.

**If you see "Invalid API key":** The `.env.local` values have a typo or extra space. Re-check Step 1.

**If the server crashes on start:** Run `npm run build` to see the full error list.

---

## STEP 7 — Sign Up and Create the First Workspace

1. Go to http://localhost:3000/signup
2. Enter: real name, a real email address, a strong password
3. Click "Create account"
4. The page should say "Check your email to confirm your account"

**About the confirmation email:**
- Supabase sends confirmation emails automatically using their built-in email service
- It may take 1–3 minutes to arrive
- Check spam/junk if it doesn't appear
- Subject line: "Confirm your signup" (from Supabase's default template)

**If no email arrives after 5 minutes:**
- Go to https://supabase.com/dashboard/project/xwrrccmhsnognnfuihvz/auth/users
- Find the user row → click the three dots → "Send magic link" as a workaround
- Or click the user → copy the confirmation URL from the "Last sign in" section

5. Click the confirmation link in the email
6. You'll be redirected to `http://localhost:3000/auth/callback` then to `/onboarding`

**Verify in Supabase (SQL Editor or MCP):**
```sql
SELECT id, email, email_confirmed_at FROM auth.users ORDER BY created_at DESC LIMIT 1;
```
`email_confirmed_at` should NOT be null.

---

## STEP 8 — Create the First Workspace (Dev Only)

> ⚠️ **Dev only.** This manual `/onboarding` flow exists for local development. In production, workspaces are auto-created via the brand onboarding link (`/onboard/[token]`). See Phase 13 in `docs/TODO.md` for the production implementation.

1. On the onboarding page at `/onboarding`, enter a workspace name (e.g. "My Agency")
2. Click "Create workspace"
3. You should land on `/{slug}/overview` (e.g. `/my-agency/overview`)

**Verify in Supabase:**
```sql
-- Check workspace was created
SELECT id, name, slug FROM workspaces;

-- Check you are the owner
SELECT wm.role, w.name, u.email 
FROM workspace_members wm
JOIN workspaces w ON w.id = wm.workspace_id
JOIN users u ON u.id = wm.user_id;

-- CRITICAL: Check EMV defaults were seeded
SELECT platform, cpm_rate FROM emv_config;
```

`emv_config` must have 3 rows: Instagram $5.20, TikTok $3.80, YouTube $7.50.

**If `emv_config` is empty**, the seed function didn't fire. Run this in Supabase SQL Editor (replace the UUID):
```sql
-- Get the workspace ID first
SELECT id FROM workspaces LIMIT 1;

-- Then seed it
SELECT seed_workspace_defaults('PASTE_WORKSPACE_UUID_HERE');
```

---

## STEP 9 — Test Every Page

Work through each page in order. Fix any crash before moving on.

### Overview dashboard (`/{slug}/overview`)
- [ ] Page loads without errors or white screen
- [ ] 4 stat cards visible showing zeros
- [ ] "No campaigns yet" empty state in campaigns widget
- [ ] "No posts detected" in recent posts section
- [ ] No errors in browser console (F12 → Console)

### Campaigns list (`/{slug}/campaigns`)
- [ ] Loads with "No campaigns yet" empty state
- [ ] Click "Create campaign" → dialog opens
- [ ] Fill: Name = `Nike Summer 2025`, Platform = Instagram, Start date = today, End date = 30 days from now
- [ ] Click Create → redirected to campaign detail page
- [ ] Campaign shows status badge "Draft"

### Campaign detail (`/{slug}/campaigns/{id}`)
- [ ] Campaign name and dates show correctly
- [ ] "Activate" button visible
- [ ] TrackingConfigPanel visible — add hashtag `nikesummer` → press Enter → chip appears → click Save
- [ ] Success toast appears after saving
- [ ] "No influencers in this campaign" empty state
- [ ] "No posts detected" empty state
- [ ] Click "Activate" → status changes to "Active" (no page reload — form action)

### Influencers (`/{slug}/influencers`)
- [ ] Loads with "No influencers added" empty state
- [ ] Click "Add influencer"
- [ ] Enter: Full name = `Maria Santos`, IG handle = `mariasantos`
- [ ] Click Add → influencer appears in the table

### Add influencer to campaign
- [ ] Go back to campaign detail
- [ ] In the influencers section, click "Add influencer"
- [ ] Select or add Maria Santos
- [ ] She appears with usage_rights toggle showing OFF (grey)
- [ ] Click the toggle → turns green instantly (optimistic update)
- [ ] Verify: `SELECT usage_rights FROM campaign_influencers;` → should be `true`

### Posts page (`/{slug}/posts`)
- [ ] Loads without error
- [ ] Filter bar visible: Platform / Campaign / Download Status / Collab Status
- [ ] "No posts detected" empty state

### Analytics (`/{slug}/analytics`)
- [ ] Page loads without error
- [ ] All chart containers render (empty is correct — no metrics yet)
- [ ] Date range filter visible

### Settings (`/{slug}/settings`)
- [ ] General tab: workspace name is pre-filled
- [ ] Change the name → Save → success toast → name updated in sidebar
- [ ] Members tab: you appear as Owner
- [ ] EMV Config tab: 3 rows with CPM rates
- [ ] Change Instagram CPM to `6.50` → Save → value persists after page refresh

### Sign out and sign back in
- [ ] Click avatar in sidebar bottom-left → "Sign out"
- [ ] Redirected to `/login`
- [ ] Sign in with same email/password
- [ ] Redirected back to `/{slug}/overview`

---

## STEP 10 — Simulate a Webhook (Test Post Detection Without Ensemble)

This tests the full detection pipeline: webhook → post created → appears in posts table.

**First, set Maria Santos's Ensemble ID** so the webhook can match her. Run in Supabase SQL Editor:
```sql
-- Get her ID
SELECT id, full_name FROM influencers;

-- Set ensemble_id (replace the UUID)
UPDATE influencers SET ensemble_id = 'test_influencer_001' WHERE id = 'HER_UUID_HERE';
```

**Confirm the campaign is Active and Maria has usage_rights = true:**
```sql
SELECT c.status, ci.usage_rights, ci.monitoring_status
FROM campaigns c
JOIN campaign_influencers ci ON ci.campaign_id = c.id
JOIN influencers i ON i.id = ci.influencer_id
WHERE i.full_name = 'Maria Santos';
```

Both `status = 'active'` and `usage_rights = true` must be true for the download to be enqueued.

**Generate the webhook signature and fire it** — run in terminal:

```bash
node -e "
const crypto = require('crypto');
const payload = JSON.stringify({
  event: 'post.created',
  ensemble_post_id: 'test_post_' + Date.now(),
  influencer_id: 'test_influencer_001',
  platform: 'instagram',
  post_url: 'https://www.instagram.com/p/test_abc123/',
  caption: 'Check out #nikesummer with @nike! Amazing summer collection.',
  thumbnail_url: null,
  posted_at: new Date().toISOString(),
  hashtags: ['nikesummer'],
  mentions: ['nike']
});
const sig = crypto.createHmac('sha256', 'test_secret_123').update(payload).digest('hex');
console.log('---SIGNATURE---');
console.log(sig);
console.log('---PAYLOAD---');
console.log(payload);
"
```

Then fire the webhook (replace SIGNATURE with the output above):
```bash
curl -X POST http://localhost:3000/api/webhooks/ensemble \
  -H "Content-Type: application/json" \
  -H "x-ensemble-signature: SIGNATURE_FROM_ABOVE" \
  -d 'PAYLOAD_FROM_ABOVE'
```

Expected response: `OK`

**Verify the post was created:**
```sql
SELECT id, platform, download_status, collab_status, detected_at
FROM posts
ORDER BY detected_at DESC
LIMIT 5;
```

Expected:
- `download_status = 'pending'` (because usage_rights = true — download job enqueued)
- `collab_status = 'pending'` (Instagram posts start as pending)

```sql
-- Check the download job was enqueued
SELECT job_type, status, scheduled_at FROM retry_queue ORDER BY scheduled_at DESC LIMIT 5;
```

Should show one row: `job_type = 'download'`, `status = 'pending'`

**Now refresh `/{slug}/posts`** — the post should appear in the table with "Pending" download status.

If the post shows `download_status = 'blocked'` instead:
- Maria's `usage_rights` is still false. Toggle it ON in the campaign detail, then re-fire the webhook with a different `ensemble_post_id`.

---

## STEP 11 — Deploy to Vercel

### Prepare for deployment

First run the production build locally to catch any remaining errors:
```bash
npm run build
```

Fix all errors. Do not deploy with a failing build.

Then commit and push:
```bash
git add -A
git commit -m "feat: complete Instroom v1 — all 12 phases, error boundary, loading states, clean actions"
git push origin main
```

### Create the Vercel project

Tell the user:

---

**Please do the following in your browser — I'll wait for the deployed URL:**

1. Go to https://vercel.com → click **"Add New Project"**
2. Import your GitHub repository
3. Framework Preset: **Next.js** (auto-detected — leave as is)
4. Before clicking Deploy, click **"Environment Variables"** and add these one by one:

| Variable Name | Value |
|---------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xwrrccmhsnognnfuihvz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3cnJjY21oc25vZ25uZnVpaHZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NDEzNDAsImV4cCI6MjA4OTAxNzM0MH0.-v8Z2e69vZ3Ic-0s_9ChjWVujCr5-X4HVDkVyVnwnPw` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3cnJjY21oc25vZ25uZnVpaHZ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzQ0MTM0MCwiZXhwIjoyMDg5MDE3MzQwfQ.8T5CaRkzhCYZFuBsBN50DKwW4s7-7xxmvhm8tUO5Z20` |
| `NEXT_PUBLIC_APP_URL` | *(leave blank for now — you'll fill this after you get the URL)* |
| `ENSEMBLE_WEBHOOK_SECRET` | `test_secret_123` |
| `ENSEMBLE_API_KEY` | *(leave blank)* |
| `GOOGLE_SERVICE_ACCOUNT_JSON_B64` | *(leave blank)* |
| `CRON_SECRET` | *(open a terminal and run: `openssl rand -hex 32` — paste the result)* |

5. Click **Deploy** and wait 2–3 minutes
6. When it finishes, copy the URL — it will look like `https://instroom-abc123.vercel.app`
7. Give me that URL

---

### After the user gives you the deployed URL

**A. Update `NEXT_PUBLIC_APP_URL` in Vercel:**
- Vercel → project → Settings → Environment Variables
- Edit `NEXT_PUBLIC_APP_URL` → set to `https://THEIR-URL.vercel.app`
- Click Save

**B. Update Supabase auth to allow the production domain:**
Tell the user to go to:
https://supabase.com/dashboard/project/xwrrccmhsnognnfuihvz/auth/url-configuration

Set:
- Site URL: `https://THEIR-URL.vercel.app`
- Add to Redirect URLs: `https://THEIR-URL.vercel.app/**`

**C. Trigger a redeploy** to pick up the updated `NEXT_PUBLIC_APP_URL`:
- Vercel → Deployments → click the three dots on the latest deployment → Redeploy

**D. Test on the live URL:**
- Sign up at `https://THEIR-URL.vercel.app/signup` with a real email
- Confirm the email
- Create a workspace
- Run through the checklist from Step 9 on the live URL

---

## WHAT STILL NEEDS SETUP LATER (not blocking go-live)

These features need additional credentials or Phase 13 work. They won't break the app — they just won't work until configured.

| Feature | What's needed | Where to configure |
|---------|---------------|-------------------|
| Post detection | Real `ENSEMBLE_WEBHOOK_SECRET` + `ENSEMBLE_API_KEY` | Vercel env vars |
| Drive downloads | `GOOGLE_SERVICE_ACCOUNT_JSON_B64` | Vercel env vars |
| Team member invitation emails | Add Resend integration to `lib/actions/workspace.ts` | Code + Resend account |
| Cron workers | `CRON_SECRET` already set — just need Ensemble API key | Vercel env vars |
| **Brand onboarding (production workspace creation)** | **Phase 13 in TODO.md** — `brands` + `brand_invitations` tables, `lib/actions/brands.ts`, `app/onboard/[token]/page.tsx` | Code + DB migration |
| Brand onboarding emails | Resend/Postmark for auto-sending invite link (v2) | Code + Resend account |

---

## IF ANYTHING BREAKS — QUICK FIXES

**Build fails:**
```bash
npm run type-check   # see all TypeScript errors
npm run build        # see build errors
```
Fix every error. Never deploy a failing build.

**"RLS violation" or "permission denied" errors:**
You're using `createClient()` (user-scoped) where the user doesn't have a session yet, or the RLS policy is wrong. Check the Supabase logs at:
https://supabase.com/dashboard/project/xwrrccmhsnognnfuihvz/logs/postgres-logs

**Confirmation email doesn't arrive:**
- Check https://supabase.com/dashboard/project/xwrrccmhsnognnfuihvz/auth/users — is the user there?
- If yes: click the user → Actions → "Resend confirmation email"
- Supabase built-in email has a 3/hour rate limit. If you've hit it, wait or use the SQL workaround:
```sql
-- Manually confirm a user (bypass email — only for testing)
UPDATE auth.users SET email_confirmed_at = now() WHERE email = 'youremail@example.com';
```

**"Invalid API key" after deployment:**
The Supabase anon key in Vercel has a typo or extra whitespace. Delete it and re-paste it carefully.

**Login redirect loop on production:**
`NEXT_PUBLIC_APP_URL` doesn't match the actual domain. Update it in Vercel env vars and redeploy.
