# Campaign Archive & Delete — Design Spec

**Date:** 2026-04-07  
**Status:** Approved  

---

## Context

The campaigns list table has no row-level actions. Agency users need a way to archive campaigns they no longer want cluttering the active list, and to permanently delete draft campaigns that were created in error. This feature adds a 3-dot options menu to each row in the campaigns table.

---

## Goals

- Let users archive campaigns (soft, reversible — hides from default list, stops scraping)
- Let users delete campaigns (hard, permanent — only allowed when 0 posts exist)
- Let users restore archived campaigns back to `draft`
- Keep the default campaigns view clean (archived hidden by default, toggle to show)

---

## Non-Goals

- Bulk archive / bulk delete
- Archive from the campaign detail page (3-dot on the list only)
- Separate archive page or route

---

## Database

**Migration:** `0026_campaign_archived_status.sql`

```sql
ALTER TYPE campaign_status ADD VALUE 'archived';
```

No other schema changes. The `campaign_auto_end` trigger is unaffected — it only fires when `status = 'active'` AND `end_date < current_date`, so archived campaigns are not touched by it.

**Type update:** Add `'archived'` to the `CampaignStatus` union in `lib/types/index.ts`.

---

## Server Actions (`lib/actions/campaigns.ts`)

All three new actions follow the existing auth + role-check + revalidate pattern.

### `archiveCampaign(workspaceId, campaignId)`
- Auth check, role check (`owner | admin | editor`)
- `UPDATE campaigns SET status = 'archived' WHERE id = campaignId AND workspace_id = workspaceId`
- `revalidatePath('/', 'layout')`

### `restoreCampaign(workspaceId, campaignId)`
- Auth check, role check (`owner | admin | editor`)
- `UPDATE campaigns SET status = 'draft' WHERE id = campaignId AND workspace_id = workspaceId`
- Restores to `draft` (not `active`) so the user can review dates before re-activating
- `revalidatePath('/', 'layout')`

### `deleteCampaign(workspaceId, campaignId)`
- Auth check, role check (`owner | admin | editor`)
- Guard: fetch `post_count` for this campaign; if `> 0`, return `{ error: 'Cannot delete a campaign with posts.' }`
- `DELETE FROM campaigns WHERE id = campaignId AND workspace_id = workspaceId`
- `revalidatePath('/', 'layout')`

---

## Worker Behaviour

The posts-worker already filters `.eq('campaigns.status', 'active')` — archived campaigns are automatically excluded from scraping with no worker changes needed.

---

## Component: `CampaignsTable`

**File:** `components/dashboard/campaigns-table.tsx`

### Table structure changes
- Add a 5th column header (no label, `w-10`, right-aligned) for the actions menu
- Each data row gets a 5th cell containing the 3-dot trigger button
- Row `onClick` navigation is unaffected — the 3-dot cell calls `e.stopPropagation()` to prevent row navigation when clicking the menu

### 3-dot trigger
- Icon: `DotsThree` (Phosphor, size 16, `weight="bold"`)
- Styled: `p-1.5 rounded-md text-foreground-muted hover:text-foreground hover:bg-background-muted transition-colors`
- Only visible on row hover (`opacity-0 group-hover:opacity-100`) plus always visible when the menu is open

### Dropdown menu items (context-aware)

| Campaign status | Menu items |
|---|---|
| `draft` — 0 posts | Archive, separator, Delete (destructive) |
| `draft` — has posts | Archive (Delete omitted) |
| `active` | Archive (Delete omitted) |
| `ended` | Archive (Delete omitted) |
| `archived` | Restore, separator, Delete (destructive) |

Icons:
- Archive → `Archive` (Phosphor)
- Restore → `ArrowCounterClockwise` (Phosphor)
- Delete → `Trash` (Phosphor, destructive variant)

### Delete confirmation dialog
- Uses existing `Dialog` component
- Trigger: clicking Delete in the dropdown sets `pendingDeleteId` state
- Title: "Delete campaign?"
- Body: "**[Campaign Name]** will be permanently deleted. This cannot be undone."
- Actions: Cancel (secondary) + Delete (destructive primary)
- On confirm: calls `deleteCampaign`, shows toast on error

### "Show archived" toggle
- Location: right side of the search bar row, next to the search input
- A small toggle button: "Show archived" — uses `Eye` / `EyeSlash` icon (Phosphor)
- State: `showArchived` boolean (local `useState`)
- When `false` (default): filter out `status === 'archived'` from the displayed list
- When `true`: include archived rows, which render with `opacity-50` and a grey `archived` Badge
- The `archived` status gets a new `statusVariant` entry → `variant="ended"` (reuses the same neutral grey styling)

### Props change
- `Campaign` interface gains `workspace_id: string` so the server actions can be called directly from the component

---

## Page: `campaigns/page.tsx`

No structural changes needed. `post_count` is already included in the campaigns query. Pass `workspaceId` down to `CampaignsTable` via a new `workspaceId` prop (currently it only receives `workspaceSlug`).

---

## Permissions

All three actions require role `owner | admin | editor`. `viewer` and `brand` roles do not see the 3-dot button at all.

Implementation: the campaigns page already fetches the current user's membership row (`role`). Pass `userRole: WorkspaceRole` as a prop to `CampaignsTable`. The component renders the 3-dot column only when `['owner', 'admin', 'editor'].includes(userRole)`.

---

## Verification

1. Create a `draft` campaign with 0 posts → 3-dot shows Archive + Delete → Delete opens confirm dialog → confirm deletes and campaign disappears
2. Create a `draft` campaign with posts → 3-dot shows Archive only (no Delete)
3. Archive an `active` campaign → disappears from default list → posts-worker skips it on next run
4. Toggle "Show archived" → archived campaign reappears dimmed with `archived` badge
5. Restore archived campaign → status becomes `draft`, reappears in active list
6. Attempt to delete via direct action call with posts → returns error
7. `viewer` role: 3-dot button not rendered
