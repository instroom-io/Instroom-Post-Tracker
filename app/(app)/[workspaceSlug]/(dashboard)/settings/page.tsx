import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { WorkspaceSettingsForm } from '@/components/settings/workspace-settings-form'
import { MemberTable } from '@/components/settings/member-table'
import { InviteMemberDialog } from '@/components/settings/invite-member-dialog'
import { EmvSettingsPanel } from '@/components/settings/emv-settings-panel'
import { BillingPanel } from '@/components/settings/billing-panel'
import { SectionErrorBoundary } from '@/components/ui/section-error-boundary'
import { MembersSkeleton } from '@/components/dashboard/members-skeleton'
import { EmvSectionSkeleton } from '@/components/dashboard/emv-section-skeleton'
import { computeDaysRemaining } from '@/lib/billing/trial-state'
import { canUseFeature } from '@/lib/utils/plan'
import type { WorkspaceRole, Workspace, PlanType, WorkspaceJoinRequest } from '@/lib/types'

interface PageProps {
  params: Promise<{ workspaceSlug: string }>
}

// ─── Streaming server components ──────────────────────────────────────────────

async function MembersSection({
  workspaceId,
  workspaceSlug,
  currentRole,
  canEdit,
  userId,
  plan,
}: {
  workspaceId: string
  workspaceSlug: string
  currentRole: WorkspaceRole
  canEdit: boolean
  userId: string
  plan: PlanType
}) {
  const supabase = await createClient()
  const isOwner = currentRole === 'owner'

  const [membersResult, joinRequestsResult] = await Promise.all([
    supabase
      .from('workspace_members')
      .select('id, user_id, role, user:users!workspace_members_user_id_fkey(full_name, email, avatar_url)')
      .eq('workspace_id', workspaceId)
      .order('joined_at'),
    isOwner
      ? supabase
          .from('workspace_join_requests')
          .select('id, requester_id, status, requested_at, requester:users!workspace_join_requests_requester_id_fkey(full_name, email, avatar_url)')
          .eq('workspace_id', workspaceId)
          .eq('status', 'pending')
          .order('requested_at', { ascending: true })
      : Promise.resolve({ data: [] as WorkspaceJoinRequest[] }),
  ])

  const membersData = (membersResult.data ?? []).map((m) => ({
    id: m.id,
    user_id: m.user_id,
    role: m.role,
    user: Array.isArray(m.user) ? (m.user[0] ?? null) : m.user,
  }))

  const joinRequests = (!('error' in joinRequestsResult) || !joinRequestsResult.error
    ? (joinRequestsResult.data ?? []).map((r) => ({
        ...r,
        requester: Array.isArray(r.requester) ? (r.requester[0] ?? null) : r.requester,
      }))
    : []) as WorkspaceJoinRequest[]

  return (
    <div className="rounded-xl border border-border bg-background-surface shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-y-2 border-b border-border px-5 py-4">
        <div>
          <h2 className="font-display text-[15px] font-bold text-foreground">Members</h2>
          <p className="mt-0.5 text-[12px] text-foreground-lighter">
            {membersData.length} member{membersData.length !== 1 ? 's' : ''}
            {joinRequests.length > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                {joinRequests.length} pending
              </span>
            )}
          </p>
        </div>
        {canEdit && canUseFeature(plan, 'team_members') && (
          <InviteMemberDialog workspaceId={workspaceId} />
        )}
        {canEdit && !canUseFeature(plan, 'team_members') && (
          <a
            href="/account/upgrade"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background-muted px-3 py-1.5 text-[12px] font-medium text-foreground-muted hover:text-foreground transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="h-3 w-3 shrink-0 fill-current" aria-hidden="true"><path d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM100,56a28,28,0,0,1,56,0V80H100ZM208,208H48V96H208V208Zm-80-48a12,12,0,1,1,12-12A12,12,0,0,1,128,160Z"/></svg>
            Invite members · Upgrade
          </a>
        )}
      </div>
      <MemberTable
        members={membersData}
        currentUserId={userId}
        currentRole={currentRole}
        workspaceId={workspaceId}
        workspaceSlug={workspaceSlug}
        joinRequests={joinRequests}
      />
    </div>
  )
}

async function EmvSection({
  workspaceId,
  canEdit,
}: {
  workspaceId: string
  canEdit: boolean
}) {
  const supabase = await createClient()
  const { data: emvConfigs } = await supabase
    .from('emv_config')
    .select('id, workspace_id, platform, cpm_rate, updated_at')
    .eq('workspace_id', workspaceId)

  return (
    <EmvSettingsPanel
      workspaceId={workspaceId}
      configs={emvConfigs ?? []}
      canEdit={canEdit}
    />
  )
}

async function GeneralSection({
  workspace,
  canEdit,
}: {
  workspace: Workspace
  canEdit: boolean
}) {
  const supabase = await createClient()
  const { data: members } = await supabase
    .from('workspace_members')
    .select('id, user_id, role, user:users!workspace_members_user_id_fkey(full_name, email)')
    .eq('workspace_id', workspace.id)
    .order('joined_at')

  const membersData = (members ?? []).map((m) => ({
    id: m.id,
    user_id: m.user_id,
    role: m.role,
    user: Array.isArray(m.user) ? (m.user[0] ?? null) : m.user,
  }))

  return (
    <WorkspaceSettingsForm
      workspace={workspace}
      canEdit={canEdit}
      members={membersData}
    />
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SettingsPage({ params }: PageProps) {
  const { workspaceSlug } = await params
  const supabase = await createClient()

  const [{ data: workspace }, { data: { user } }] = await Promise.all([
    supabase
      .from('workspaces')
      .select('id, name, slug, logo_url, agency_id, drive_connection_type, drive_oauth_token, created_at, assigned_member_id, plan, trial_ends_at, account_type')
      .eq('slug', workspaceSlug)
      .single(),
    supabase.auth.getUser(),
  ])

  if (!workspace) notFound()
  if (!user) redirect('/login')

  const { data: currentMember } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspace.id)
    .eq('user_id', user.id)
    .single()

  const currentRole = (currentMember?.role ?? 'viewer') as WorkspaceRole
  const canEdit = currentRole === 'owner' || currentRole === 'admin'
  const isOwner = currentRole === 'owner'

  // Fetch member counts + subscription extras for billing panel (owner only)
  let memberCounts = { owner: 0, admin: 0, editor: 0, manager: 0, viewer: 0 }
  let extraWorkspaces = 0
  if (isOwner) {
    const [{ data: allMembers }, { data: activeSub }] = await Promise.all([
      supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspace.id),
      supabase
        .from('subscriptions')
        .select('extra_workspaces')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle(),
    ])
    for (const m of allMembers ?? []) {
      const r = m.role as keyof typeof memberCounts
      if (r in memberCounts) memberCounts[r]++
    }
    extraWorkspaces = (activeSub?.extra_workspaces as number | null) ?? 0
  }

  return (
    <div>
      <PageHeader title="Settings" description="Manage workspace, members, and billing." />
      <div className="p-5 space-y-5">
        {/* General — renders immediately, no extra data needed */}
        <div className="rounded-xl border border-border bg-background-surface p-5 shadow-sm">
          <div className="mb-5 border-b border-border pb-4">
            <h2 className="font-display text-[15px] font-bold text-foreground">General</h2>
            <p className="mt-1 text-[12px] text-foreground-lighter">
              Workspace name, logo, and Google Drive folder.
            </p>
          </div>
          <GeneralSection workspace={workspace as unknown as Workspace} canEdit={canEdit} />
        </div>

        {/* Members — streams in independently */}
        <SectionErrorBoundary>
          <Suspense fallback={<MembersSkeleton />}>
            <MembersSection
              workspaceId={workspace.id}
              workspaceSlug={workspaceSlug}
              currentRole={currentRole}
              canEdit={canEdit}
              userId={user.id}
              plan={((workspace as unknown as { plan: PlanType }).plan) ?? 'trial'}
            />
          </Suspense>
        </SectionErrorBoundary>

        {/* EMV Config — streams in independently, admin+ only */}
        {canEdit && (
          <SectionErrorBoundary>
            <Suspense fallback={<EmvSectionSkeleton />}>
              <EmvSection workspaceId={workspace.id} canEdit={canEdit} />
            </Suspense>
          </SectionErrorBoundary>
        )}

        {/* Billing — owner only */}
        {isOwner && (
          <BillingPanel
            plan={((workspace as unknown as { plan: PlanType }).plan) ?? 'trial'}
            daysRemaining={computeDaysRemaining((workspace as unknown as { trial_ends_at: string | null }).trial_ends_at ?? null)}
            accountType={((workspace as unknown as { account_type: string }).account_type as 'solo' | 'team') ?? 'team'}
            workspaceSlug={workspaceSlug}
            memberCounts={memberCounts}
            extraWorkspaces={extraWorkspaces}
          />
        )}
      </div>
    </div>
  )
}
