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

## Phase 13 — Brand Request Flow & Workspace Auto-Creation ✅ Complete

> Implemented: brand-initiated request form + agency approval flow.
> Migration: `0002_brand_requests.sql` applied.
> Server Actions: `lib/actions/brand-requests.ts` (`submitBrandRequest`, `approveBrandRequest`, `rejectBrandRequest`, `getBrandRequests`).
> Routes: `/request-access` (Brand tab), `/agency/[slug]/requests`.

---

## Phase 15 — Multi-Agency Platform ✅ Complete

> Implements 3-tier hierarchy: Instroom → Agencies → Brands.
> Migration: `supabase/migrations/0011_multi_agency_platform.sql` applied.

### What was built

- [x] **DB:** `agencies`, `agency_requests` tables; `is_platform_admin` on `users`; `agency_id` on `workspaces` + `brand_requests`; `onboard_token` columns on `brand_requests`; `workspace_role` enum + `'brand'` value; `agency_status` + `agency_request_status` enums
- [x] **Server Actions:** `lib/actions/agencies.ts` — `submitAgencyRequest`, `approveAgencyRequest`, `rejectAgencyRequest`, `getAgencies`, `getAgencyBySlug`, `getAgencyRequests`, `getActiveAgenciesPublic`
- [x] **Server Actions:** `lib/actions/brand-requests.ts` — updated `approveBrandRequest` to set `agency_id`, generate `onboard_token`, send onboarding email
- [x] **Server Actions:** `lib/actions/brands.ts` — `acceptBrandOnboarding` (requires auth, inserts `workspace_members(role='brand')` idempotently, returns `workspaceSlug`)
- [x] **Routes:** `/admin`, `/admin/agencies`, `/admin/agencies/[agencyId]`
- [x] **Routes:** `/agency/[agencySlug]/dashboard`, `/agency/[agencySlug]/brands`, `/agency/[agencySlug]/requests`, `/agency/[agencySlug]/settings`
- [x] **Routes:** `/[workspaceSlug]/portal` — brand read-only portal (`(portal)` route group)
- [x] **Routes:** `/request-access` — updated with Brand tab + Agency tab (agency selector dropdown)
- [x] **Components:** `components/portal/drive-status-banner.tsx`, `components/portal/brand-portal-posts.tsx`
- [x] **Post-login redirect** — `app/app/page.tsx` updated with 5-tier redirect logic
- [x] **`/onboard/[token]`** — updated to use `acceptBrandOnboarding()` (creates `workspace_members` row, not workspace itself)

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