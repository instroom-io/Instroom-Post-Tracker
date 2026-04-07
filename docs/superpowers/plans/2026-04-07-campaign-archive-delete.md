# Campaign Archive & Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 3-dot options menu to the campaigns list table with Archive, Restore, and Delete actions, backed by a new `archived` campaign status.

**Architecture:** New `archived` value added to the `campaign_status` DB enum. Three new/updated server actions handle the mutations. The `CampaignsTable` client component gains a 3-dot `DropdownMenu` per row, a "Show archived" toggle, and an inline delete confirmation `Dialog`. The campaigns page passes `workspaceId` and `userRole` down to the table.

**Tech Stack:** Next.js 15 App Router, Supabase (Postgres + RLS), Server Actions (`'use server'`), Phosphor Icons, Framer Motion (via existing `DropdownMenu` + `Dialog` components), Sonner toasts, Tailwind CSS design tokens.

---

## File Map

| Action | File |
|--------|------|
| Create | `supabase/migrations/0026_campaign_archived_status.sql` |
| Modify | `lib/types/index.ts` — line 10: add `'archived'` to `CampaignStatus` |
| Modify | `lib/validations/index.ts` — line 114: add `'archived'` to `updateCampaignSchema` status enum |
| Modify | `lib/actions/campaigns.ts` — replace `archiveCampaign`, add `restoreCampaign` + `deleteCampaign` |
| Modify | `components/dashboard/campaigns-table.tsx` — full rewrite with 3-dot menu, toggle, dialog |
| Modify | `app/(app)/[workspaceSlug]/(dashboard)/campaigns/page.tsx` — pass new props, fix `statusVariant` |

---

## Task 1: DB Migration + Type Updates

**Files:**
- Create: `supabase/migrations/0026_campaign_archived_status.sql`
- Modify: `lib/types/index.ts:10`
- Modify: `lib/validations/index.ts:114`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/0026_campaign_archived_status.sql
-- Adds 'archived' to campaign_status enum.
-- Archived campaigns are hidden from the default list, stop being scraped,
-- and can be restored to 'draft' or permanently deleted.

ALTER TYPE campaign_status ADD VALUE IF NOT EXISTS 'archived';
```

- [ ] **Step 2: Apply migration via Supabase MCP**

Use the `mcp__supabase__apply_migration` tool:
- Migration name: `campaign_archived_status`
- SQL: the content of the migration file above

Verify success: no error returned.

- [ ] **Step 3: Update `CampaignStatus` type in `lib/types/index.ts`**

Find line 10:
```ts
export type CampaignStatus = 'draft' | 'active' | 'ended'
```
Replace with:
```ts
export type CampaignStatus = 'draft' | 'active' | 'ended' | 'archived'
```

- [ ] **Step 4: Update `updateCampaignSchema` in `lib/validations/index.ts`**

Find line 114:
```ts
  status: z.enum(['draft', 'active', 'ended']).optional(),
```
Replace with:
```ts
  status: z.enum(['draft', 'active', 'ended', 'archived']).optional(),
```

- [ ] **Step 5: Run type-check**

```bash
npm run type-check
```

Expected: no errors. (TypeScript will now flag any `Record<CampaignStatus, ...>` that's missing the `'archived'` key — those will be fixed in Task 4.)

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0026_campaign_archived_status.sql lib/types/index.ts lib/validations/index.ts
git commit -m "04072026 - db: add archived status to campaign_status enum"
```

---

## Task 2: Server Actions

**Files:**
- Modify: `lib/actions/campaigns.ts`

Three changes in this file:
1. Replace the existing `archiveCampaign` (which currently calls `updateCampaign` with `status: 'ended'`) with a direct DB call setting `status: 'archived'`.
2. Add `restoreCampaign` — sets status back to `'draft'`.
3. Add `deleteCampaign` — hard deletes, guarded by post count.

- [ ] **Step 1: Replace `archiveCampaign` in `lib/actions/campaigns.ts`**

Find and replace the entire existing `archiveCampaign` function (currently lines 97–102):

```ts
// OLD (remove this):
export async function archiveCampaign(
  workspaceId: string,
  campaignId: string
): Promise<{ error: string } | void> {
  return updateCampaign(workspaceId, campaignId, { status: 'ended' })
}
```

Replace with:

```ts
export async function archiveCampaign(
  workspaceId: string,
  campaignId: string
): Promise<{ error: string } | void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()
  if (!member || !['owner', 'admin', 'editor'].includes(member.role)) {
    return { error: 'Insufficient permissions.' }
  }

  const { error } = await supabase
    .from('campaigns')
    .update({ status: 'archived' })
    .eq('id', campaignId)
    .eq('workspace_id', workspaceId)
  if (error) return { error: 'Failed to archive campaign.' }

  revalidatePath('/', 'layout')
}
```

- [ ] **Step 2: Add `restoreCampaign` after `archiveCampaign`**

```ts
export async function restoreCampaign(
  workspaceId: string,
  campaignId: string
): Promise<{ error: string } | void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()
  if (!member || !['owner', 'admin', 'editor'].includes(member.role)) {
    return { error: 'Insufficient permissions.' }
  }

  const { error } = await supabase
    .from('campaigns')
    .update({ status: 'draft' })
    .eq('id', campaignId)
    .eq('workspace_id', workspaceId)
  if (error) return { error: 'Failed to restore campaign.' }

  revalidatePath('/', 'layout')
}
```

- [ ] **Step 3: Add `deleteCampaign` after `restoreCampaign`**

```ts
export async function deleteCampaign(
  workspaceId: string,
  campaignId: string
): Promise<{ error: string } | void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()
  if (!member || !['owner', 'admin', 'editor'].includes(member.role)) {
    return { error: 'Insufficient permissions.' }
  }

  const { count } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('workspace_id', workspaceId)
  if ((count ?? 0) > 0) return { error: 'Cannot delete a campaign that has posts.' }

  const { error } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', campaignId)
    .eq('workspace_id', workspaceId)
  if (error) return { error: 'Failed to delete campaign.' }

  revalidatePath('/', 'layout')
}
```

- [ ] **Step 4: Run type-check**

```bash
npm run type-check
```

Expected: no errors in `lib/actions/campaigns.ts`.

- [ ] **Step 5: Commit**

```bash
git add lib/actions/campaigns.ts
git commit -m "04072026 - actions: archive, restore, delete campaign"
```

---

## Task 3: CampaignsTable Component

**Files:**
- Modify: `components/dashboard/campaigns-table.tsx` (full rewrite)

This is the most significant change. The component gains:
- Two new required props: `workspaceId: string` and `userRole: WorkspaceRole`
- `showArchived` toggle button in the search bar row
- 3-dot `DropdownMenu` on every row (only rendered when `userRole` is owner/admin/editor)
- Row-level `group` class for hover-reveal of the 3-dot button
- Delete confirmation `Dialog` controlled by `deleteTarget` state
- Archived rows rendered at 50% opacity with a grey badge

Replace the entire file with:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Megaphone,
  MagnifyingGlass,
  ArrowsDownUp,
  ArrowUp,
  ArrowDown,
  DotsThree,
  Archive,
  ArrowCounterClockwise,
  Trash,
  Eye,
  EyeSlash,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { AnimatedBadge } from '@/components/ui/animated-badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { archiveCampaign, restoreCampaign, deleteCampaign } from '@/lib/actions/campaigns'
import { formatDateRange, cn } from '@/lib/utils'
import type { CampaignStatus, WorkspaceRole } from '@/lib/types'

interface Campaign {
  id: string
  name: string
  status: CampaignStatus
  start_date: string
  end_date: string | null
  post_count: number
}

interface CampaignsTableProps {
  campaigns: Campaign[]
  workspaceSlug: string
  workspaceId: string
  userRole: WorkspaceRole
}

const statusVariant: Record<CampaignStatus, 'active' | 'draft' | 'ended'> = {
  active: 'active',
  draft: 'draft',
  ended: 'ended',
  archived: 'ended',
}

type SortKey = 'name' | 'status' | 'post_count' | 'start_date'
type SortDir = 'asc' | 'desc'

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowsDownUp size={12} className="text-foreground-muted" />
  return dir === 'asc'
    ? <ArrowUp size={12} className="text-foreground" />
    : <ArrowDown size={12} className="text-foreground" />
}

export function CampaignsTable({ campaigns, workspaceSlug, workspaceId, userRole }: CampaignsTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('start_date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [showArchived, setShowArchived] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const showActions = ['owner', 'admin', 'editor'].includes(userRole)

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function handleArchive(campaignId: string) {
    startTransition(async () => {
      const result = await archiveCampaign(workspaceId, campaignId)
      if (result?.error) toast.error(result.error)
    })
  }

  function handleRestore(campaignId: string) {
    startTransition(async () => {
      const result = await restoreCampaign(workspaceId, campaignId)
      if (result?.error) toast.error(result.error)
    })
  }

  function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      const result = await deleteCampaign(workspaceId, deleteTarget.id)
      if (result?.error) {
        toast.error(result.error)
      } else {
        setDeleteTarget(null)
      }
    })
  }

  const filtered = campaigns
    .filter((c) => showArchived || c.status !== 'archived')
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name)
      else if (sortKey === 'status') cmp = a.status.localeCompare(b.status)
      else if (sortKey === 'post_count') cmp = a.post_count - b.post_count
      else if (sortKey === 'start_date') cmp = (a.start_date ?? '').localeCompare(b.start_date ?? '')
      return sortDir === 'asc' ? cmp : -cmp
    })

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background-muted">
          <Megaphone size={18} className="text-foreground-muted" />
        </div>
        <p className="font-display text-[14px] font-bold text-foreground">No campaigns yet</p>
        <p className="max-w-xs text-[13px] text-foreground-lighter">
          Create your first campaign to start tracking influencer posts.
        </p>
      </div>
    )
  }

  return (
    <>
      <div>
        {/* Search bar + Show archived toggle */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="relative max-w-xs">
            <MagnifyingGlass size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search campaigns…"
              className="h-8 w-full rounded-lg border border-border bg-background-muted pl-8 pr-3 text-[12px] text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] transition-colors',
              showArchived
                ? 'bg-background-muted text-foreground'
                : 'text-foreground-muted hover:text-foreground'
            )}
          >
            {showArchived ? <EyeSlash size={13} /> : <Eye size={13} />}
            {showArchived ? 'Hide archived' : 'Show archived'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th
                  scope="col"
                  onClick={() => toggleSort('name')}
                  className="cursor-pointer select-none px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-lighter hover:text-foreground"
                >
                  <span className="inline-flex items-center gap-1.5">
                    Campaign
                    <SortIcon active={sortKey === 'name'} dir={sortDir} />
                  </span>
                </th>
                <th
                  scope="col"
                  onClick={() => toggleSort('status')}
                  className="cursor-pointer select-none px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-lighter hover:text-foreground"
                >
                  <span className="inline-flex items-center gap-1.5">
                    Status
                    <SortIcon active={sortKey === 'status'} dir={sortDir} />
                  </span>
                </th>
                <th
                  scope="col"
                  onClick={() => toggleSort('post_count')}
                  className="cursor-pointer select-none px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wide text-foreground-lighter hover:text-foreground"
                >
                  <span className="inline-flex items-center justify-end gap-1.5">
                    Posts
                    <SortIcon active={sortKey === 'post_count'} dir={sortDir} />
                  </span>
                </th>
                <th
                  scope="col"
                  onClick={() => toggleSort('start_date')}
                  className="cursor-pointer select-none px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-lighter hover:text-foreground"
                >
                  <span className="inline-flex items-center gap-1.5">
                    Date range
                    <SortIcon active={sortKey === 'start_date'} dir={sortDir} />
                  </span>
                </th>
                {showActions && <th scope="col" className="w-10 px-3 py-3" />}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={showActions ? 5 : 4}
                    className="px-5 py-12 text-center text-[13px] text-foreground-lighter"
                  >
                    {search
                      ? `No campaigns match "${search}"`
                      : 'No archived campaigns'}
                  </td>
                </tr>
              ) : (
                filtered.map((campaign) => (
                  <tr
                    key={campaign.id}
                    onClick={() => router.push(`/${workspaceSlug}/campaigns/${campaign.id}`)}
                    className={cn(
                      'group border-b border-border/50 transition-colors last:border-0 hover:bg-background-muted cursor-pointer',
                      campaign.status === 'archived' && 'opacity-50'
                    )}
                  >
                    <td className="px-5 py-3.5">
                      <span className="text-[12px] font-medium text-foreground">
                        {campaign.name}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {campaign.status === 'active' ? (
                        <AnimatedBadge className="capitalize">{campaign.status}</AnimatedBadge>
                      ) : (
                        <Badge variant={statusVariant[campaign.status]} className="capitalize">
                          {campaign.status}
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right text-[12px] font-medium text-foreground">
                      {campaign.post_count}
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-foreground-lighter">
                      {formatDateRange(campaign.start_date, campaign.end_date)}
                    </td>
                    {showActions && (
                      <td className="px-3 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="flex items-center justify-center rounded-md p-1.5 text-foreground-muted opacity-0 transition-all group-hover:opacity-100 hover:bg-background-muted hover:text-foreground focus:opacity-100 focus:outline-none"
                            >
                              <DotsThree size={16} weight="bold" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {campaign.status !== 'archived' ? (
                              <DropdownMenuItem onClick={() => handleArchive(campaign.id)}>
                                <Archive size={14} />
                                Archive
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleRestore(campaign.id)}>
                                <ArrowCounterClockwise size={14} />
                                Restore
                              </DropdownMenuItem>
                            )}
                            {(campaign.post_count === 0 || campaign.status === 'archived') && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setDeleteTarget({ id: campaign.id, name: campaign.name })}
                                >
                                  <Trash size={14} />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete campaign?</DialogTitle>
            <DialogDescription>
              <strong>{deleteTarget?.name}</strong> will be permanently deleted. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              loading={isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

- [ ] **Step 1: Replace the entire file with the code above**

- [ ] **Step 2: Run type-check**

```bash
npm run type-check
```

Expected: no errors in `components/dashboard/campaigns-table.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/campaigns-table.tsx
git commit -m "04072026 - campaigns: 3-dot menu with archive, restore, delete"
```

---

## Task 4: Update CampaignsPage

**Files:**
- Modify: `app/(app)/[workspaceSlug]/(dashboard)/campaigns/page.tsx`

Two changes:
1. Pass `workspaceId` and `userRole` as props to `<CampaignsTable>`.
2. Update the dead-code `statusVariant` constant (TypeScript will error since `Record<CampaignStatus, ...>` is now incomplete without `'archived'`).

- [ ] **Step 1: Update `statusVariant` constant (line 14–19)**

Find:
```ts
const statusVariant: Record<CampaignStatus, 'active' | 'draft' | 'ended'> = {
  active: 'active',
  draft: 'draft',
  ended: 'ended',
}
```
Replace with:
```ts
const statusVariant: Record<CampaignStatus, 'active' | 'draft' | 'ended'> = {
  active: 'active',
  draft: 'draft',
  ended: 'ended',
  archived: 'ended',
}
```

- [ ] **Step 2: Pass new props to `<CampaignsTable>` (line 91)**

Find:
```tsx
<CampaignsTable campaigns={enrichedCampaigns} workspaceSlug={workspaceSlug} />
```
Replace with:
```tsx
<CampaignsTable
  campaigns={enrichedCampaigns}
  workspaceSlug={workspaceSlug}
  workspaceId={workspace.id}
  userRole={role}
/>
```

- [ ] **Step 3: Run type-check + build**

```bash
npm run type-check && npm run build
```

Expected: clean — 0 TypeScript errors, all routes compile.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/[workspaceSlug]/(dashboard)/campaigns/page.tsx"
git commit -m "04072026 - campaigns: pass workspaceId and userRole to table"
```

---

## Task 5: Manual Verification

Start the dev server (`npm run dev`) and navigate to `http://localhost:3000/[workspace-slug]/campaigns`.

- [ ] **Scenario 1 — Archive a draft campaign with 0 posts**
  - Hover a draft row → 3-dot appears → click → menu shows "Archive" only (no Delete since it has posts, or Delete if 0 posts)
  - Click Archive → row disappears from list (it's now archived, hidden by default)
  - Click "Show archived" toggle → row reappears dimmed with "archived" grey badge

- [ ] **Scenario 2 — Restore an archived campaign**
  - With "Show archived" on → hover archived row → 3-dot → menu shows "Restore" + "Delete"
  - Click Restore → campaign reappears in main list with "draft" badge

- [ ] **Scenario 3 — Delete a campaign (0 posts)**
  - Hover a draft row with 0 posts → 3-dot → menu shows both "Archive" and "Delete"
  - Click Delete → confirmation dialog appears with campaign name
  - Click Cancel → dialog closes, campaign still present
  - Click Delete again → confirm → campaign permanently removed from list

- [ ] **Scenario 4 — Delete blocked on campaign with posts**
  - Hover a campaign row with posts > 0 → 3-dot → menu shows "Archive" only (no Delete option)

- [ ] **Scenario 5 — Viewer role sees no 3-dot**
  - Log in as a viewer-role workspace member → campaigns page → no 3-dot column rendered

- [ ] **Scenario 6 — Row click still navigates**
  - Click anywhere on a row (not the 3-dot cell) → navigates to campaign detail page

- [ ] **Scenario 7 — Archived campaign not scraped**
  - Archive an active campaign → check Supabase `campaigns` table → `status = 'archived'`
  - Posts-worker `.eq('campaigns.status', 'active')` filter will exclude it automatically
