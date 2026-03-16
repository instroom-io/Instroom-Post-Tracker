# TODO — Instroom Build Backlog

> Active task list for Claude Code.
> Items are ordered by dependency — do not skip ahead.
> Mark `[x]` when complete.

---

## Phase 1 — Foundation ✅ Complete
*(Unchanged)*

## Phase 2 — Auth ✅ Complete
*(Unchanged)*

## Phase 3 — Workspace Shell ✅ Complete
*(Unchanged)*

## Phase 4 — UI Atoms ✅ Complete
*(Unchanged)*

## Phase 5 — Dashboard ✅ Complete
*(Unchanged)*

## Phase 6 — Campaigns ✅ Complete
*(Unchanged)*

## Phase 7 — Influencer Management ✅ Complete
*(Unchanged)*

## Phase 8 — Posts ✅ Complete
*(Unchanged)*

## Phase 9 — Analytics ✅ Complete
*(Unchanged)*

## Phase 10 — Settings ✅ Complete
*(Unchanged)*

## Phase 11 — Workers & Drive ✅ Complete
*(Unchanged — but Drive upload utility needs update in Phase 14)*

## Phase 12 — Marketing Page ✅ Complete
*(Unchanged)*

---

## Phase 13 — Brand Request Flow & Workspace Auto-Creation ⬅️ CURRENT

> Replaces original Phase 13 (agency-generated invite link / `/onboard/[token]` flow).
> Implements the brand-initiated request form + agency approval flow (WORKFLOWS.md Flow 0, DECISIONS.md D-018).

### 13a — Database migration

- [ ] **`supabase/migrations/0002_brand_requests.sql`**
  - `CREATE TYPE brand_request_status AS ENUM ('pending', 'approved', 'rejected')`
  - `CREATE TYPE drive_connection_type AS ENUM ('agency', 'brand')`
  - `CREATE TABLE brand_requests` — id, brand_name, website_url, contact_name, contact_email, description, status, workspace_id, reviewed_by, reviewed_at, created_at
  - `ALTER TABLE workspaces ADD COLUMN drive_connection_type`, `drive_oauth_token`, `drive_folder_id`
  - RLS: authenticated users can SELECT brand_requests
  - Indexes: `idx_brand_requests_status`, `idx_brand_requests_contact_email`
  - Run: `npm run db:push` then `npm run db:generate`

### 13b — Server Actions

- [ ] **`lib/actions/brand-requests.ts`** (replaces original `lib/actions/brands.ts`)
  - `submitBrandRequest(data)` — **public, no auth required**, uses service client
    - Zod validate: brand_name, website_url, contact_name, contact_email, description
    - `INSERT INTO brand_requests (status: 'pending')`
    - Returns `{ success: true }` or `{ error: string }`
  - `approveBrandRequest(requestId)` — agency only, uses service client
    - Auth check: user must be logged in
    - Re-validate request is still `pending` (race condition guard)
    - `INSERT INTO workspaces` (name + slug from request, `toSlug()` with collision handling)
    - `INSERT INTO workspace_members` (agency user as `owner`)
    - `CALL seed_workspace_defaults(workspace.id)`
    - `UPDATE brand_requests SET status='approved', workspace_id, reviewed_by, reviewed_at`
    - Returns `{ workspaceSlug }` — caller redirects to `/{workspaceSlug}/overview`
  - `rejectBrandRequest(requestId)` — agency only, uses service client
    - Auth check: user must be logged in
    - `UPDATE brand_requests SET status='rejected', reviewed_by, reviewed_at`
    - Returns `{ success: true }` or `{ error: string }`
  - `getBrandRequests(status?)` — agency only, user-scoped client
    - Returns brand_requests filtered by status (default: 'pending')

### 13c — Public request form

- [ ] **`app/(marketing)/request-access/page.tsx`** — Public SSR page, no auth, no sidebar
  - Lives inside `(marketing)` route group (minimal layout — nav + footer only)
  - Form fields: Brand name, Website URL, Contact name, Contact email, Description (textarea, optional)
  - Calls `submitBrandRequest()` Server Action on submit
  - Loading state on submit button
  - Success state: replace form with confirmation message — *"Your request has been received. We'll be in touch soon."*
  - Error state: inline field validation errors + generic fallback
  - No redirect after success — brand stays on the same page with confirmation

- [ ] **`lib/validations/index.ts`** — Add `brandRequestSchema`
  ```typescript
  export const brandRequestSchema = z.object({
    brand_name:    z.string().min(2).max(100),
    website_url:   z.string().url(),
    contact_name:  z.string().min(2).max(100),
    contact_email: z.string().email(),
    description:   z.string().max(500).optional(),
  })
  ```

### 13d — Agency requests dashboard

- [ ] **`app/(app)/agency/requests/page.tsx`** — Agency-only authenticated page
  - Server Component — fetches brand_requests with `status = 'pending'` (and optionally 'approved'/'rejected' via tab filter)
  - Renders: PageHeader ("Brand Requests") + `BrandRequestsTable`
  - If no pending requests: empty state — *"No pending brand requests."*

- [ ] **`components/agency/brand-requests-table.tsx`** — Client Component
  - Columns: Brand name, Website (link), Contact name, Contact email, Description (truncated), Submitted (date), Actions
  - Row actions: "Approve" button + "Reject" button
  - Approve: calls `approveBrandRequest(id)` → on success, redirect to new workspace overview
  - Reject: calls `rejectBrandRequest(id)` → row disappears from pending list (optimistic)
  - Loading states on both buttons per row (disable row while processing)
  - Tab filter: Pending / Approved / Rejected (shows full history)

- [ ] **`components/agency/brand-requests-table-skeleton.tsx`** — Skeleton for Suspense

### 13e — Navigation + routing

- [ ] **Sidebar** — Add "Brand Requests" link visible only to workspace `owner` role
  - Could be a top-level link in the sidebar (outside workspace nav) or in a separate agency nav section
  - Badge showing pending request count: `(count)` next to the link
  - Route: `/agency/requests`

- [ ] **`app/app/page.tsx`** — Update redirect dispatcher
  - Current: no workspace → redirect to `/onboarding`
  - Update: no workspace → redirect to `/login` in production (not `/onboarding`)
  - Keep: `if (process.env.NODE_ENV !== 'development') redirect('/login')`

- [ ] **`app/onboarding/page.tsx`** — Gate for production
  ```typescript
  if (process.env.NODE_ENV !== 'development') {
    redirect('/login')
  }
  ```

- [ ] **Remove `/onboard/[token]` route** — `app/onboard/[token]/page.tsx`
  - This route was for the old agency-generated invite link flow
  - Delete the file entirely, or return 404 if it already exists in the codebase

---

## Phase 14 — Google Drive OAuth Per Workspace

> Implements flexible Drive model (DECISIONS.md D-011 revised, D-019).
> Each workspace connects its own Drive — agency or brand — via OAuth.

### 14a — OAuth flow

- [ ] **`app/api/auth/google-drive/route.ts`** — OAuth initiation
  - `GET /api/auth/google-drive?workspaceId={id}&type={agency|brand}`
  - Builds Google OAuth URL with scopes: `drive.file` (minimum needed)
  - Stores `workspaceId` + `type` in state param (signed, not just raw)
  - Redirects to Google consent screen

- [ ] **`app/api/auth/google-drive/callback/route.ts`** — OAuth callback
  - Receives `code` + `state` from Google
  - Exchanges code for access + refresh tokens
  - Encrypts refresh token before storing
  - `UPDATE workspaces SET drive_connection_type, drive_oauth_token, drive_folder_id`
  - Redirects to `/{workspaceSlug}/settings` with success toast

- [ ] **`lib/drive/client.ts`** — Drive client factory (replaces old service account approach)
  ```typescript
  export function getDriveClient(encryptedToken: string): drive_v3.Drive
  // Decrypts token, initializes OAuth2 client, returns Drive instance
  // Handles token refresh transparently
  ```

- [ ] **`lib/drive/upload.ts`** — Update to use per-workspace Drive client
  - Accept `driveClient: drive_v3.Drive` parameter instead of using a shared singleton
  - Remove all service account references
  - Remove `GOOGLE_SERVICE_ACCOUNT_JSON_B64` usage

### 14b — Settings UI

- [ ] **`components/settings/drive-connection-panel.tsx`** — Drive connection section in workspace settings
  - Shows current connection status: connected (with type badge: "Agency Drive" / "Brand Drive") or not connected
  - "Connect Agency Drive" button → initiates OAuth with `type=agency`
  - "Connect Brand Drive" button → initiates OAuth with `type=brand`
  - "Disconnect" button (admin only) — clears `drive_oauth_token`, `drive_folder_id`, `drive_connection_type`
  - Warning if Drive not connected: *"Downloads are paused until Google Drive is connected."*

- [ ] **Settings page** — Add `DriveConnectionPanel` to `/{slug}/settings` below EMV config section

### 14c — Worker update

- [ ] **`app/api/cron/download-worker/route.ts`** — Update Drive initialization
  - Load `workspace.drive_oauth_token` and `workspace.drive_connection_type` per job
  - Initialize Drive client via `getDriveClient(workspace.drive_oauth_token)`
  - If `drive_oauth_token` is null → fail job with `error: 'Drive not connected'`, do NOT retry (set `attempts = 3` immediately to avoid infinite retries)

---

## Known Issues / Tech Debt

- [ ] Generate `lib/types/supabase.ts` after running `0002_brand_requests.sql` migration (`npm run db:generate`)
- [ ] Add `<Suspense>` boundaries to all data-heavy page sections
- [ ] Add `error.tsx` to `app/(app)/[workspaceSlug]/(dashboard)/error.tsx`
- [ ] Rate limiting on the Ensemble webhook route
- [ ] Email sending for staff invitations — integrate Resend or Postmark (v2)
- [ ] Email sending for brand request approval/rejection — same Resend integration (v2)
- [ ] Workspace logo upload — needs Supabase Storage bucket (v1 uses text URL input)
- [ ] `PostsTable` pagination for workspaces with > 100 posts
- [ ] `CampaignDetailPage` inline Server Action — move to `lib/actions/campaigns.ts`
- [ ] Add `loading.tsx` files alongside heavy pages
- [ ] Token regeneration for Drive OAuth (handle revoked tokens gracefully in download worker)
- [ ] Remove or archive `brands` and `brand_invitations` tables in a future cleanup migration (`0003_cleanup.sql`)
- [ ] `lib/actions/brands.ts` — rename to `lib/actions/brand-requests.ts` or delete if not yet created