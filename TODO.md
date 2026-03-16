# TODO — Instroom Build Backlog

> Active task list for Claude Code.
> Items are ordered by dependency — do not skip ahead. Later items depend on earlier ones.
> Mark `[x]` when complete.

---

## Phase 1 — Foundation ✅ Complete

- [x] Next.js 15 scaffold (package.json, tsconfig.json, next.config.ts)
- [x] Design system (styles/globals.css, tailwind.config.ts with full token map)
- [x] Supabase clients (lib/supabase/server.ts, lib/supabase/client.ts)
- [x] Middleware (middleware.ts — auth check + session refresh)
- [x] Domain types (lib/types/index.ts)
- [x] Utilities (lib/utils/index.ts — cn, formatters, verifyEnsembleSignature, toSlug)
- [x] Zod schemas (lib/validations/index.ts)
- [x] Zustand workspace store (lib/hooks/use-workspace-store.ts)
- [x] Database migration (supabase/migrations/0001_initial_schema.sql)

---

## Phase 2 — Auth ✅ Complete

- [x] Login page + form + Server Action
- [x] Signup page + form + Server Action
- [x] Auth callback route (app/(auth)/callback/route.ts)
- [x] Onboarding page + form (app/onboarding/page.tsx)

---

## Phase 3 — Workspace Shell ✅ Complete

- [x] Workspace Server Actions (create, update, invite member, accept invite, remove member)
- [x] AppShell component (sidebar + main layout wrapper)
- [x] WorkspaceSwitcher component
- [x] UserMenu component
- [x] PageHeader component
- [x] Dashboard layout (app/(app)/[workspaceSlug]/(dashboard)/layout.tsx)
- [x] Invite acceptance page (app/invite/[token]/page.tsx)
- [x] Redirect dispatcher (app/app/page.tsx)

---

## Phase 4 — UI Atoms ✅ Complete

- [x] Button component (components/ui/button.tsx)
- [x] Badge component (components/ui/badge.tsx)
- [x] **Input** — `components/ui/input.tsx`
- [x] **Select** — `components/ui/select.tsx`
- [x] **Textarea** — `components/ui/textarea.tsx`
- [x] **TagInput** — `components/ui/tag-input.tsx`
- [x] **Dialog** — `components/ui/dialog.tsx`
- [x] **Tooltip** — `components/ui/tooltip.tsx`
- [x] **DropdownMenu** — `components/ui/dropdown-menu.tsx`

---

## Phase 5 — Dashboard ✅ Complete

- [x] StatCards component + StatCardsSkeleton
- [x] CampaignsTable (dashboard widget)
- [x] RecentPostsGrid
- [x] UsageRightsPanel (with optimistic toggle)
- [x] Overview page (Server Component, parallel queries)

---

## Phase 6 — Campaigns ✅ Complete

- [x] Campaigns list page (app/(app)/[workspaceSlug]/(dashboard)/campaigns/page.tsx)
- [x] CreateCampaignDialog (components/campaigns/create-campaign-dialog.tsx)
- [x] Campaign detail page shell ([campaignId]/page.tsx)
- [x] **TrackingConfigPanel** — `components/campaigns/tracking-config-panel.tsx`
- [x] **CampaignInfluencersList** — `components/campaigns/campaign-influencers-list.tsx`
- [x] **CampaignPostsTable** — `components/campaigns/campaign-posts-table.tsx`

---

## Phase 7 — Influencer Management ✅ Complete

- [x] **`lib/actions/influencers.ts`** — Server Actions for influencer CRUD
- [x] **AddInfluencerDialog** — `components/influencers/add-influencer-dialog.tsx`
- [x] **InfluencerTable** — `components/influencers/influencer-table.tsx`
- [x] **Influencers page** — `app/(app)/[workspaceSlug]/(dashboard)/influencers/page.tsx`

---

## Phase 8 — Posts ✅ Complete

- [x] **`lib/actions/posts.ts`** — Server Actions for post updates
  - `updateCollabStatus(postId, status: CollabStatus)` — update collab_status
  - `retryDownload(postId)` — reset to pending + enqueue in retry_queue (v2 feature — stub it)
- [x] **CollabStatusSelect** — `components/posts/collab-status-select.tsx`
  - Depends on: DropdownMenu atom
  - See COMPONENTS.md §8 for spec
  - Only renders for `platform === 'instagram'`
  - Optimistic update on selection
- [x] **DownloadStatusBadge** — `components/posts/download-status-badge.tsx`
  - RSC — no interactivity
  - See COMPONENTS.md §9 for render logic + tooltip content
- [x] **PostsFilterBar** — `components/posts/posts-filter-bar.tsx`
  - Client Component (has filter state)
  - Filters: Platform (All / IG / TT / YT), Campaign (dropdown), Download status, Collab status
  - Emits filter changes up to parent via `onFilterChange` callback
- [x] **PostsTable** — `components/posts/posts-table.tsx`
  - Depends on: CollabStatusSelect, DownloadStatusBadge, PostsFilterBar
  - See COMPONENTS.md §7 for spec
  - Client Component — filter state drives visible rows
- [x] **Posts page** — `app/(app)/[workspaceSlug]/(dashboard)/posts/page.tsx`
  - Server Component — fetches all posts + campaigns list (for filter dropdown)
  - Renders: PageHeader + PostsTable with `showCampaignColumn={true}`

---

## Phase 9 — Analytics ✅ Complete

- [x] **`lib/actions/analytics.ts`** — (if needed for EMV config updates)
  - `updateEmvConfig(workspaceId, platform, cpmRate)` — update CPM rate
- [x] **AnalyticsFilterBar** — `components/analytics/analytics-filter-bar.tsx`
  - Client Component
  - Filters: Date range (from/to date pickers), Campaign (dropdown), Platform (multi-select)
  - Emits filter state to analytics page
- [x] **PostVolumeChart** — `components/analytics/post-volume-chart.tsx`
  - Recharts LineChart — posts detected per day over the date range
  - See COMPONENTS.md §10 for Recharts setup
- [x] **PlatformBreakdown** — `components/analytics/platform-breakdown.tsx`
  - Recharts BarChart or PieChart — post count + EMV split by platform
- [x] **EmvChart** — `components/analytics/emv-chart.tsx`
  - Recharts BarChart (horizontal) — top 10 influencers by EMV
- [x] **ErBenchmarkChart** — `components/analytics/er-benchmark-chart.tsx`
  - Recharts BarChart — influencer ER vs benchmark lines (2%, 4%, 8%)
- [x] **InfluencerLeaderboard** — `components/analytics/influencer-leaderboard.tsx`
  - Table ranked by EMV descending
  - Columns: rank, influencer, posts, total views, avg ER, total EMV
- [x] **EmvConfigForm** — `components/analytics/emv-config-form.tsx`
  - Depends on: Input atom
  - See COMPONENTS.md §12 for spec
  - Admin-only (hide/disable for editor/viewer)
- [x] **Analytics page** — `app/(app)/[workspaceSlug]/(dashboard)/analytics/page.tsx`
  - Server Component — fetches post_metrics with joined posts for the default date range (last 30 days)
  - Renders: AnalyticsFilterBar + 4 stat cards + all chart components + InfluencerLeaderboard

---

## Phase 10 — Settings ✅ Complete

- [x] **WorkspaceSettingsForm** — `components/settings/workspace-settings-form.tsx`
  - Fields: workspace name, logo URL (text input for now — no file upload in v1), Drive folder link
  - Calls `updateWorkspace` Server Action
- [x] **MemberTable** — `components/settings/member-table.tsx`
  - Columns: avatar initial, name, email, role badge, actions
  - Row actions: Change role (dropdown), Remove member
  - Owner row: no remove button
  - Current user row: no remove button
- [x] **InviteMemberDialog** — `components/settings/invite-member-dialog.tsx`
  - Depends on: Dialog, Input, Select atoms
  - Fields: email, role (Select: Admin / Editor / Viewer)
  - Calls `inviteMember` Server Action
- [x] **EmvSettingsPanel** — `components/settings/emv-settings-panel.tsx`
  - Wraps `EmvConfigForm` with a section card header
- [x] **Settings page** — `app/(app)/[workspaceSlug]/(dashboard)/settings/page.tsx`
  - Server Component — fetches workspace, members list, EMV config
  - Three sections (tabs or stacked): General / Members / EMV Config
  - Admin gate: EMV config section hidden for editor/viewer

---

## Phase 11 — Workers & Drive ✅ Complete

- [x] **`lib/drive/upload.ts`** — Google Drive upload utility
  - Authenticate with service account (GOOGLE_SERVICE_ACCOUNT_JSON_B64)
  - `getFolderIdOrCreate(path: string[]): Promise<string>` — create folder chain if needed, cache in-memory
  - `uploadFile(folderId, fileName, buffer, mimeType): Promise<{ fileId, webViewLink }>` — upload file
- [x] **`app/api/cron/download-worker/route.ts`** — GET handler for Vercel Cron
  - Verify `Authorization: Bearer ${CRON_SECRET}` header
  - Claim up to 10 pending download jobs with `FOR UPDATE SKIP LOCKED`
  - For each: fetch → download from Ensemble → upload to Drive → update post + job
  - Retry up to 3× with 15-min backoff
  - See WORKFLOWS.md §2 for full step-by-step
- [x] **`app/api/cron/metrics-worker/route.ts`** — GET handler for Vercel Cron
  - Same claim pattern, `job_type = 'metrics_fetch'`
  - Fetch from Ensemble metrics API → calculate EMV → INSERT post_metrics (immutable)
  - See WORKFLOWS.md §3 for full step-by-step
- [x] **`app/api/webhooks/ensemble/route.ts`** — POST handler, HMAC-SHA256 verify
- [x] **`vercel.json`** — Cron schedule config
  ```json
  {
    "crons": [
      { "path": "/api/cron/download-worker", "schedule": "*/5 * * * *" },
      { "path": "/api/cron/metrics-worker",  "schedule": "*/10 * * * *" }
    ]
  }
  ```

---

## Phase 12 — Marketing Page ✅ Complete

- [x] **`app/(marketing)/layout.tsx`** — Marketing nav + footer (no sidebar)
- [x] **`app/(marketing)/page.tsx`** — Landing page
  - Hero: headline + subhead + "Start free trial" CTA + product screenshot
  - Features section: 3–4 key features with icons
  - How it works: 3 steps
  - Pricing section (placeholder — single plan)
  - Footer: logo + links

---

## Phase 13 — Brand Onboarding Flow (Production Workspace Creation)

> This phase implements Flow 0 from WORKFLOWS.md. It is the production replacement for the dev-only manual workspace creation (Flow 5 / `/onboarding`).

- [ ] **Database migration** — `supabase/migrations/0002_brand_onboarding.sql`
  - `CREATE TYPE brand_status AS ENUM ('pending', 'active')`
  - `CREATE TABLE brands` (id, agency_id, name, slug, status, created_at)
  - `CREATE TABLE brand_invitations` (id, brand_id, token, expires_at, accepted_at, created_at)
  - RLS: `brands` — agency user can SELECT their own (`agency_id = auth.uid()`)
  - RLS: `brand_invitations` — no direct user access (service client only)
  - Indexes: `idx_brand_invitations_token`, `idx_brands_agency_id`, `idx_brands_slug`
  - Run: `npm run db:push` then `npm run db:generate`

- [ ] **`lib/actions/brands.ts`** — Server Actions (all use service client)
  - `createBrand(name: string): Promise<{ brand, inviteLink } | { error: string }>`
    - Validate input (Zod)
    - Auth check — only agency user can call this
    - INSERT into `brands` (status: 'pending')
    - Generate 32-byte hex token → INSERT into `brand_invitations` (expires: 30 days)
    - Return: `{ brand, inviteLink: \`${APP_URL}/onboard/${token}\` }`
  - `acceptBrandInvitation(token: string): Promise<{ workspaceSlug: string } | { error: string }>`
    - Validate token (exists, not expired, accepted_at IS NULL, brand status = 'pending')
    - Auth check — user must be logged in
    - BEGIN TRANSACTION:
      - INSERT into `workspaces` (name + slug from brand record)
      - INSERT into `workspace_members` (user as 'owner')
      - CALL `seed_workspace_defaults(workspace.id)`
      - UPDATE `brands` SET status = 'active'
      - UPDATE `brand_invitations` SET accepted_at = now()
    - Return: `{ workspaceSlug }`
  - `getBrands(): Promise<Brand[]>` — list agency's brands (user-scoped client, RLS)
  - `regenerateBrandInvitation(brandId: string)` — v2, out of scope for now

- [ ] **`app/onboard/[token]/page.tsx`** — Brand onboarding acceptance page
  - Server Component — validate token server-side before rendering
  - If token invalid/expired/used: show error state with clear message
  - Auth gate:
    - Not logged in → show "Sign in to accept" + "Create account" buttons (redirect back after auth)
    - Logged in → show brand name, workspace name, "Accept & Enter Workspace" button
  - On accept: call `acceptBrandInvitation(token)` → redirect to `/{workspaceSlug}/overview`
  - No sidebar, minimal layout (same as invite/[token])

- [ ] **Agency dashboard** — brand management UI (scope TBD for v1)
  - Minimum: a page where the agency can create brands and copy invite links
  - Route: could be `/agency/brands` or a modal on the workspace switcher
  - Component: `CreateBrandDialog` — name input → shows generated link on success
  - Note: Define exact route + scope before building

- [ ] **Disable `/onboarding` in production**
  - In `app/onboarding/page.tsx`, add at the top:
    ```typescript
    if (process.env.NODE_ENV !== 'development') {
      redirect('/login')
    }
    ```
  - Also update `app/app/page.tsx`: if user has no workspace, redirect to `/login` in production (not `/onboarding`)

---

## Known Issues / Tech Debt

- [ ] `CampaignDetailPage` uses inline Server Action for the Activate button — move to `lib/actions/campaigns.ts`
- [ ] Generate `lib/types/supabase.ts` and replace manual type assertions in all queries (`npm run db:generate`)
- [ ] Add `<Suspense>` boundaries to all data-heavy page sections (currently most pages render synchronously)
- [ ] Add `error.tsx` to `app/(app)/[workspaceSlug]/(dashboard)/error.tsx` (error boundary for dashboard crashes)
- [ ] Rate limiting on the Ensemble webhook route (prevent spam / cost overruns)
- [ ] Email sending for invitations — integrate Resend or Postmark (currently invitations are created but no email sent)
- [ ] Email sending for brand onboarding links — same Resend/Postmark integration (v2, noted in WORKFLOWS.md Flow 0)
- [ ] Workspace logo upload — needs Supabase Storage bucket (v1 uses text URL input as workaround)
- [ ] `CRON_SECRET` env var — add to vercel.json + worker route verification
- [ ] Add `loading.tsx` files alongside heavy pages for automatic Suspense boundaries
- [ ] `PostsTable` currently loads all posts — add pagination for workspaces with > 100 posts
- [ ] Token regeneration for expired brand invitations (v2 — out of scope for v1)
