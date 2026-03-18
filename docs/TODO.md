# TODO

> Active backlog in priority order. Check this before building anything new.

---

## Immediate

- [x] **Commit pending changes** — migration rename (`0007_security_fixes.sql`), new `0008_co_member_rls.sql`, modified doc files (`ARCHITECTURE.md`, `CLAUDE.md`, `PRD.md`, `README.md`, `WORKFLOWS.md`)

---

## Pre-production (required before deploying to production)

### SendGrid Setup

- [x] **SendGrid local setup complete** — API key, sender email, and agency notification email all set in `.env.local`
- [ ] **SendGrid Vercel setup** — add `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `AGENCY_NOTIFICATION_EMAIL` to Vercel env vars (Settings → Environment Variables)

The email code is fully implemented. You just need to configure SendGrid and set 3 env vars.

**Step 1 — Create a SendGrid account**
- Go to [sendgrid.com](https://sendgrid.com) and sign up (free tier allows 100 emails/day)

**Step 2 — Create an API key**
- Dashboard → Settings → API Keys → Create API Key
- Name: `Instroom Post Tracker`
- Permission: **Restricted Access** → enable **Mail Send** only
- Copy the key immediately (shown only once) — this is your `SENDGRID_API_KEY`

**Step 3 — Verify your sender email (Single Sender — no DNS required)**
- Dashboard → Settings → Sender Authentication → **Single Sender Verification**
- Click "Create New Sender" → fill in your agency email (e.g. `notifications@instroom.co`)
- SendGrid sends a verification email → click the link to confirm
- This email address becomes your `SENDGRID_FROM_EMAIL`

> **Note:** Single Sender is sufficient to start. For better deliverability long-term, you can
> upgrade to Domain Authentication (Settings → Sender Authentication → Authenticate Your Domain)
> which adds SPF/DKIM DNS records. Do this after the app is live and stable.

**Step 4 — Set env vars locally and test**

Add to your `.env.local`:
```
SENDGRID_API_KEY=SG.your_key_here
SENDGRID_FROM_EMAIL=notifications@yourdomain.com
AGENCY_NOTIFICATION_EMAIL=your-inbox@yourdomain.com
```

Test by submitting a brand request at `http://localhost:3000/request-access` — the agency
notification email (Flow 1) should arrive at `AGENCY_NOTIFICATION_EMAIL` within seconds.

**Step 5 — Set env vars in Vercel**
- Vercel dashboard → your project → Settings → Environment Variables
- Add all three vars (`SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `AGENCY_NOTIFICATION_EMAIL`)
- Set scope to **Production** (and Preview if desired)
- Redeploy for the changes to take effect

---

- [ ] **Supabase Site URL** — change back from `http://localhost:3000` to `https://instroom-post-tracker.vercel.app` in Supabase → Authentication → URL Configuration
- [ ] **Vercel cron restore** — currently on Free plan: 1 cron (`/api/cron/download-worker`, every 30 min), `maxDuration=60` on all 3 cron routes. On Pro upgrade: restore to 3 crons + `maxDuration=300` in `vercel.json`

---

## Feature Backlog

- [ ] **Google Drive OAuth per-brand** — `drive_connection_type` and `drive_oauth_token` columns already exist on `workspaces` table. Need OAuth flow + Drive upload wired to brand-specific credentials instead of agency service account
- [ ] **Campaign detail — influencer UX polish** — "Add influencer to campaign" dialog exists (`add-influencer-to-campaign-dialog.tsx`) but UX may need refinement
- [ ] **Agency dashboard — brand request pagination** — `/agency/requests` currently loads all rows; add pagination for scale
- [ ] **Posts page — bulk download trigger** — allow manually re-triggering downloads for multiple posts at once from the UI

---

## Technical Debt

- [ ] **Google Drive in dev** — `GOOGLE_SERVICE_ACCOUNT_JSON_B64` is intentionally empty in `.env.local`; download worker always fails locally. Workaround: manually set `download_status = 'downloaded'` in Supabase for test posts
- [ ] **Metrics worker in dev** — `enqueue-metrics-fetch` pg_cron does not run on localhost. Workaround: manually `INSERT INTO retry_queue (post_id, job_type) VALUES ('<id>', 'metrics_fetch')` to test the metrics worker
