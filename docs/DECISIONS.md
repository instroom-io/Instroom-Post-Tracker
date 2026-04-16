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

**Implication:** `app/api/` contains only: OAuth callbacks and proxy routes. Everything user-triggered goes through `'use server'` functions. Workers run as standalone Railway cron scripts in `workers/`.

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

D-011 · Google Drive: flexible per-workspace OAuth ⚠️ REVISED
Decision: Drive uploads use a per-workspace OAuth token, not a single shared service account. Each workspace configures its own Drive connection — either the agency's Google account or the brand's Google account.
Replaces: Original D-011 which mandated a single service account for all workspaces.
Rationale:

Agency clients have different preferences — some want content in their own Drive, others defer to the agency
A single service account creates a single point of failure and mixes all brand content under one account
Per-workspace OAuth is more auditable — each brand's Drive connection is independent
Agencies can revoke a brand's Drive connection without affecting other workspaces

Two modes:
Modedrive_connection_typeWho connectsWhere files landAgency DriveagencyAgency connects their Google accountAgency's Drive, in a brand-named folderBrand DrivebrandAgency connects brand's Google account on brand's behalfBrand's own Drive
Implementation:

workspaces.drive_connection_type stores 'agency' or 'brand'
workspaces.drive_oauth_token stores the encrypted OAuth token (refresh token — long-lived)
workspaces.drive_folder_id stores the root folder ID for this workspace
lib/drive/upload.ts accepts a Drive client initialized from the workspace's token
Token refresh is handled transparently by the Drive client on each worker run

Implication: The download worker must load the workspace's drive_connection_type and drive_oauth_token before uploading. Drive client initialization is no longer a single shared instance — it is instantiated per workspace per worker job. GOOGLE_SERVICE_ACCOUNT_JSON_B64 env var is no longer needed.
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

D-015 · Workspace creation is agency-triggered via approval flow ⚠️ SUPERSEDED BY D-024
Decision: Workspaces are auto-created when the agency approves a brand's connection request submitted via the public /request-access form. The manual /onboarding form is for local development only and must return 404 or redirect in production.
Replaces: Original D-015 which described workspace creation via an agency-generated invite link (/onboard/[token]).
Rationale:

The original invite-link design assumed the agency proactively reaches out. In practice, brands initiate contact with the agency, not the other way around.
A public request form + agency approval is simpler for both parties — no link generation, no token management on the agency side
The approval step gives the agency an explicit gate to review brand fit before onboarding
Removes the brand_invitations token system entirely — less complexity, fewer failure modes

Implication:

brands and brand_invitations tables from the original schema are no longer used in production — replaced by brand_requests
/onboard/[token] route is removed — no longer needed
/agency/requests is the new route where the agency manages pending requests
lib/actions/brands.ts is replaced by lib/actions/brand-requests.ts
All production workspace creation goes through approveBrandRequest() in lib/actions/brand-requests.ts
The /onboarding page must be gated: if (process.env.NODE_ENV !== 'development') redirect('/login')


D-016 · Brand onboarding tokens are single-use and expire in 30 days
⚠️ SUPERSEDED by D-015 revision
This decision is no longer applicable. The token-based onboarding system has been replaced by the brand request form + agency approval flow. There are no onboarding tokens to expire or consume.

D-017 · Brands have portal-only access ⚠️ SUPERSEDED BY D-024
Decision: Brands can log in but only access the read-only `/[workspaceSlug]/portal` route. They cannot access the full agency dashboard (`/(dashboard)/` route group).
Replaces: Original D-017 which stated brands never have login access.
Rationale:

As the platform evolved to 3-tier (Instroom → Agencies → Brands), brands need a lightweight way to view their content without full dashboard access
The portal is intentionally minimal — recent posts and Drive connection status
Separating portal from dashboard via route groups enforces this boundary at the layout level without complex conditional rendering

Implication:

`workspace_role` enum gains `'brand'` value
`(portal)/layout.tsx` is the auth boundary for brand users; redirects non-brand users away
`(dashboard)/layout.tsx` redirects `role='brand'` users to `/[slug]/portal`
The viewer role in workspace_role enum still exists for internal agency staff only


D-018 · Brand connection initiated by brand, approved by agency ⚠️ SUPERSEDED BY D-024
Decision: The flow for onboarding a new brand client is: brand submits /request-access form → agency reviews in /agency/requests → agency approves → workspace auto-created.
Rationale:

Brands typically reach out to agencies, not the other way around — the request form matches real-world sales flow
Agency approval gate prevents unauthorized or accidental workspace creation
No token management required — simpler system with fewer failure modes than the previous invite-link design
Request data (brand name, contact, description) populates the workspace automatically — no manual re-entry

Implication:

lib/actions/brand-requests.ts handles: submitBrandRequest() (public, no auth), approveBrandRequest() (agency only, service client), rejectBrandRequest() (agency only)
brand_requests table replaces brands + brand_invitations
No email sent automatically in v1 — agency notifies brand manually after approval/rejection
/request-access is a public SSR page (no auth required, but no sidebar either — minimal layout)
/agency/requests is an agency-only authenticated page


D-019 · Google Drive connected per workspace via OAuth ✨ NEW
Decision: Each workspace stores its own Google OAuth refresh token. Drive connection is set up in workspace settings after the workspace is created. The agency chooses agency mode (files go to agency Drive) or brand mode (files go to brand's Drive) per workspace.
Rationale:

Different brand clients have different Drive preferences — a single service account cannot accommodate this
OAuth refresh tokens are long-lived — once connected, the Drive client works silently without user intervention
Flexible model future-proofs the product for enterprise clients who require data residency in their own Drive

Implication:

workspaces table gains: drive_connection_type (agency | brand), drive_oauth_token (encrypted), drive_folder_id
lib/drive/client.ts exports getDriveClient(token) — initializes a Drive client from a stored OAuth token
Download worker loads workspace Drive credentials before each upload
Workspace settings page has a "Connect Google Drive" section with OAuth button
If Drive is not connected, download jobs fail gracefully with download_status = 'failed' and an informative error message
GOOGLE_SERVICE_ACCOUNT_JSON_B64 env var is removed — replaced by per-workspace OAuth tokens stored in the database (encrypted at rest via Supabase Vault or pgcrypto)

---

## D-020 · Workspace auto-created on agency approval, not on brand confirmation ⚠️ SUPERSEDED BY D-024

**Decision:** The workspace is auto-created the moment the agency clicks Approve on the brand request. The brand's onboarding confirmation step (`/onboard/[token]`) only creates the `workspace_members(role='brand')` row — it does not create the workspace.

**Rationale:**
- Agency needs the workspace to exist immediately so they can start configuring campaigns and influencers
- Brand confirmation is an acknowledgment / first-login step, not a provisioning step
- Decouples workspace readiness from brand responsiveness — agency can start work before the brand confirms

**Implication:** `approveBrandRequest()` calls `workspaces.insert()` AND generates `onboard_token`. `acceptBrandOnboarding()` only calls `workspace_members.insert()`.

---

## D-021 · `role='brand'` is portal-only ⚠️ SUPERSEDED BY D-024

**Decision:** Users with `workspace_members.role = 'brand'` can only access the `/(portal)/portal` route group. They are explicitly blocked from all `/(dashboard)/` routes.

**Rationale:**
- Brands should see a simplified, read-only view — not the full campaign management UI
- Separating portal from dashboard via route groups enforces this at the layout level
- Avoids complex conditional rendering inside dashboard components

**Implication:** The `(portal)/layout.tsx` checks for `role='brand'`. The `(dashboard)/layout.tsx` redirects `role='brand'` users to `/[slug]/portal`. The brand portal shows recent posts and Drive status only.

---

## D-022 · `onboard_token` stored on `brand_requests`, not a separate table ⚠️ SUPERSEDED BY D-024

**Decision:** The brand onboarding token fields (`onboard_token`, `onboard_token_expires_at`, `onboard_accepted_at`) are columns on `brand_requests`, not in a separate `brand_onboard_tokens` table.

**Rationale:**
- Token is scoped 1:1 to a brand request — there is no need for a separate table
- Simpler schema: one row per brand request contains all state (pending → approved → token generated → accepted)
- Easier to query: `SELECT * FROM brand_requests WHERE onboard_token = $token`

**Implication:** There is no `brand_onboard_tokens` table. Token lookup is always on `brand_requests`.

---

## D-023 · `approveAgencyRequest` falls back to current admin as owner ⚠️ SUPERSEDED BY D-024

**Decision:** When the platform admin approves an agency request, if the agency contact email does not match an existing `auth.users` account, the approving platform admin becomes the temporary `owner_id` of the agency.

**Rationale:**
- Agency contacts may not have signed up yet when the platform admin reviews their request
- The platform admin can reassign the owner later once the agency owner signs up
- Avoids blocking the approval flow on the agency contact's signup status

**Implication:** `approveAgencyRequest()` looks up `auth.users` by `contact_email`; if no match, falls back to `auth.uid()` (the platform admin). Agency owner must be updated manually if the fallback was used.

---

## D-024 · v2.0 Account Model: Solo/Team replaces the agency tier

**Decision:** Replace the 3-tier hierarchy (Instroom → Agencies → Brand Workspaces) with a 2-tier model (Instroom → Workspaces). Introduce two account types: **Solo** (1 workspace, `workspace_quota=1`) and **Team** (3 workspaces, `workspace_quota=3`).

**Rationale:**
- The agency tier added complexity (separate tables, routes, approval workflows) that can be modelled more simply via workspace quotas
- Self-serve signup was impossible in v1 because workspace creation required agency approval — a blocker for PLG growth
- "Solo" and "Team" map directly to how users describe their usage
- Workspace quotas are more flexible and extensible than a binary agency/brand distinction
- Removing the brand portal eliminates a separate route group maintained for a minimal read-only view

**What changes:**
- `agencies`, `agency_requests`, `brand_invites` tables deprecated (kept for data safety, not used in new code)
- `/agency/[slug]/*` routes deprecated
- `role='brand'` in `workspace_members` no longer assigned to new users
- `workspaces` gains `account_type` (solo|team) and `workspace_quota` (int)
- `workspace_role` enum gains `'manager'` value (preferred over legacy `'editor'` for new invites)
- Signup auto-creates workspace; no admin approval required
- Feature gates live in `lib/utils/plan.ts`; workspace creation is gated by `ownedWorkspaceCount < workspace.workspace_quota`

**Implication:**
- `approveAgencyRequest()`, `submitAgencyRequest()`, `inviteBrand()` actions are deprecated — do not call from new code
- `app/auth/callback/route.ts` is the canonical workspace creation entry point
- Platform admin at `/admin` manages workspace plans and quotas directly (not agency-level plan)
- Trial reminder worker (`workers/src/trial-worker.ts`) queries only `workspaces`, not `agencies`