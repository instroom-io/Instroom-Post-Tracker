# Decisions — Instroom

> **These decisions are locked.**
> Do not revisit without an explicit product/engineering discussion and an update to this file.
> Each entry includes the decision, the rationale, and the implication for how code must be written.

---

## D-001 · Framework: Next.js 15 App Router

**Decision:** Next.js 15 with App Router (not Vite+React SPA, not Remix, not Next.js Pages Router).

**Rationale:**
- Marketing/landing page needs SSG — App Router delivers this in the same project
- Ensemble webhook needs an API route — no separate Express/Fastify server needed
- Server-side workspace auth (middleware + layouts) is trivial with App Router
- `@supabase/ssr` is purpose-built for Next.js cookie-based sessions
- RSC reduces client JS bundle on data-heavy dashboard pages

**Implication:** All pages default to Server Components. Add `'use client'` only to the minimum subtree that requires interactivity.

---

## D-002 · Database: Supabase

**Decision:** Supabase as both Postgres host, ORM/query client, and auth provider. Not Prisma + raw Postgres + NextAuth.

**Rationale:**
- Built-in Auth, RLS, and pg_cron out of the box
- `@supabase/ssr` handles cookie-based sessions for Next.js App Router correctly
- RLS enforces multi-tenancy at the DB — no application-layer workspace isolation bugs possible
- TypeScript type generation from schema (`supabase gen types typescript`)
- Supabase client handles connection pooling for serverless

**Implication:** All access control lives in RLS policies. Application code does not add `WHERE workspace_id = X` as a security measure — that's RLS's job.

---

## D-003 · Post deduplication: UNIQUE(ensemble_post_id, campaign_id)

**Decision:** The same Ensemble post can be saved multiple times — once per matching campaign — but only once per campaign. The uniqueness constraint is on the *pair*.

**Rationale:**
- A single post can simultaneously match multiple campaigns' hashtag/mention configs
- Each campaign needs an independent row for its own analytics and download record
- `ON CONFLICT DO NOTHING` makes the webhook insert idempotent — safe for Ensemble retries

**Implication:** `ensemble_post_id` alone is **NOT** unique in the `posts` table. Always filter by `campaign_id` when querying a campaign's posts.

---

## D-004 · Usage rights: no retroactive downloads

**Decision:** Toggling `usage_rights` ON does **not** retroactively download previously blocked posts.

**Rationale:**
- Usage rights confirmation should happen before a campaign launches, not after
- Retroactive downloads could violate agreements if rights were genuinely not obtained
- Keeps the pipeline deterministic — the webhook handler's decision at detection time is final
- Manual retry is available for exceptional cases (implemented in v2)

**Implication:** Blocked posts remain `download_status: 'blocked'` unless manually retried. The UI shows a warning for each blocked post.

---

## D-005 · Campaign dates are hard window filters

**Decision:** Posts with `posted_at` outside `[campaign.start_date, campaign.end_date]` are discarded **entirely**. They are not saved, not associated with the campaign.

**Rationale:**
- Campaign reporting is always time-bounded
- Saving out-of-window posts creates data the agency can't explain to clients
- Ensemble sends everything they monitor — Instroom is the filter

**Implication:** If campaign dates are wrong, posts outside the window are permanently lost. Teams must set dates correctly before activating. There is no "expand date range and recover posts" feature.

---

## D-006 · Analytics: frozen snapshot at 7 days post-publish

**Decision:** Post metrics are fetched exactly once, 7 days after `posted_at`. They are never updated.

**Rationale:**
- Industry standard for influencer marketing reporting: 7-day snapshot
- Consistent reporting — numbers don't change after they've been shared with a client
- Simplifies the pipeline — no "refresh metrics" button needed

**Implication:** There is no refresh button on metrics. `post_metrics` rows are immutable after creation. A second INSERT for the same `post_id` will violate the unique constraint — intentionally.

---

## D-007 · `emv_cpm_used` stored per post

**Decision:** The CPM rate used to calculate EMV is stored in `post_metrics.emv_cpm_used` alongside the EMV value.

**Rationale:**
- Agency CPM config can change over time
- Historical EMV must remain stable for consistent client reporting
- Auditors can verify exactly how any EMV was calculated

**Implication:** Changing `emv_config.cpm_rate` only affects **future** posts. Existing `post_metrics.emv` values never change.

---

## D-008 · Collab status: n/a for TikTok and YouTube

**Decision:** `collab_status` is forced to `'n/a'` for all non-Instagram posts. Only Instagram posts default to `'pending'`.

**Rationale:**
- Instagram has a formal "Paid Partnership" / "Collab" tag feature with legal significance
- TikTok's branded content toggle and YouTube's paid promotion disclosure are handled differently and not tracked in Instroom
- Showing collab status for non-Instagram platforms would create confusing and unused data

**Implication:** The collab status column and all UI around it only matters for Instagram posts. Collab controls must be rendered conditionally: `{post.platform === 'instagram' && <CollabStatusSelect />}`.

---

## D-009 · All mutations are Server Actions (no REST routes)

**Decision:** All user-triggered mutations (form submissions, toggles, deletes) use Next.js Server Actions in `lib/actions/*.ts`. No `app/api/` routes for mutations.

**Rationale:**
- Server Actions are co-located with the UI that uses them
- Automatic CSRF protection
- `useTransition` + `useOptimistic` patterns work natively
- No separate API client layer to maintain

**Implication:** `app/api/` contains only: the Ensemble webhook handler, and Vercel Cron endpoints. Everything user-triggered goes through `'use server'` functions.

---

## D-010 · No real-time subscriptions in v1

**Decision:** No Supabase Realtime subscriptions in the dashboard.

**Rationale:**
- Post detection is async — teams don't need to watch it live
- Realtime adds client bundle size and long-lived connections
- Vercel serverless functions have connection limits
- A page refresh or navigation is sufficient for v1

**Implication:** The posts table doesn't auto-update when Ensemble sends a webhook. Users see new posts on next navigation or manual refresh. Adding a "Refresh" button is acceptable and encouraged.

---

## D-011 · Google Drive via service account (not per-user OAuth)

**Decision:** Drive uploads use a single service account, not per-user OAuth.

**Rationale:**
- Per-user OAuth requires each workspace owner to connect their Google account separately
- Agency teams share Drive access — one service account with shared folder is cleaner
- Reduces onboarding friction significantly
- Service account credentials are stable (no token refresh UX needed)

**Implication:** The Drive folder is owned by the service account. The workspace owner must grant the service account email access to their Google Drive folder during workspace setup.

---

## D-012 · Zustand for workspace context (not React Context)

**Decision:** Workspace switcher state lives in Zustand with `localStorage` persistence.

**Rationale:**
- Workspace selection must survive page navigations and browser refreshes
- React Context resets on navigation without additional persistence code
- Zustand `persist` middleware handles localStorage automatically
- React Context is not accessible in Server Components

**Implication:** `useWorkspaceStore()` is only usable in Client Components. Server Components receive workspace data via props from the dashboard layout.

---

## D-013 · Mobile layout deferred to v2

**Decision:** No mobile-responsive layout in v1. Minimum supported width: **1024px**.

**Rationale:**
- Primary users (campaign managers) work on desktop/laptop
- Mobile layout for complex data tables is a significant design problem
- Shipping desktop fast is more valuable than a poor mobile experience
- Mobile support is a known v2 commitment, not an oversight

**Implication:** Sidebar is fixed at 220px (no collapse). Tables scroll horizontally via `overflow-x-auto`. No `sm:` or `md:` breakpoint adjustments needed — only `lg:` for two-column layouts.

---

## D-014 · Influencer usage rights are per campaign, not global

**Decision:** `usage_rights` lives on `campaign_influencers`, not on `influencers`. The same influencer can have rights for campaign A but not campaign B.

**Rationale:**
- Usage rights are legal agreements scoped to a specific campaign and brand
- An influencer working with multiple brands (multiple workspaces) may have different rights per client
- Global rights toggle would risk accidentally enabling downloads for campaigns where rights weren't obtained

**Implication:** Every UI showing a usage rights toggle must scope it to the `campaign_influencer` row, not the `influencer` row.

---

## D-015 · Workspace creation is agency-triggered, not user self-serve

**Decision:** Workspaces are auto-created when a brand admin accepts an agency-generated onboarding link (`/onboard/[token]`). The manual `/onboarding` form (Flow 5) is for local development only and must return 404 or redirect in production.

**Rationale:**
- Instroom is a B2B tool for marketing agencies — random signups should not be able to create workspaces
- Brand clients are always onboarded by the agency, never self-serve
- Keeps the ownership model clean: agency creates the brand entry, brand admin only accepts
- Prevents orphaned workspaces with no agency affiliation

**Implication:** `lib/actions/brands.ts` handles all workspace creation via `acceptBrandInvitation()` using the service client. The `/onboarding` page must be gated with `if (process.env.NODE_ENV !== 'development') redirect('/login')`. All production workspace creation goes through Flow 0 in `WORKFLOWS.md`.

---

## D-016 · Brand onboarding tokens are single-use and expire in 30 days

**Decision:** Each brand invitation token (`brand_invitations.token`) can only be accepted once (`accepted_at IS NULL` check) and expires 30 days after generation.

**Rationale:**
- Single-use prevents the same link from being used by multiple people to create duplicate workspaces
- 30-day expiry balances security with practical agency timelines (brands may take time to onboard)
- Token regeneration (for expired links) is a v2 feature — agencies can use Supabase Studio to manually insert a new token in v1 if needed

**Implication:** `acceptBrandInvitation()` must re-validate the token inside a transaction (check `accepted_at IS NULL` and `expires_at > now()` again after acquiring the lock) to prevent race conditions. The `/onboard/[token]` page must show clear, distinct error states for: expired token, already-used token, and invalid token.
