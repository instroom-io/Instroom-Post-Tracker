import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { WorkspaceSettingsForm } from '@/components/settings/workspace-settings-form'
import { MemberTable } from '@/components/settings/member-table'
import { InviteMemberDialog } from '@/components/settings/invite-member-dialog'
import { EmvSettingsPanel } from '@/components/settings/emv-settings-panel'
import { SectionErrorBoundary } from '@/components/ui/section-error-boundary'
import { MembersSkeleton } from '@/components/dashboard/members-skeleton'
import { EmvSectionSkeleton } from '@/components/dashboard/emv-section-skeleton'
import type { WorkspaceRole, Workspace } from '@/lib/types'

interface PageProps {
  params: Promise<{ workspaceSlug: string }>
}

// ─── Streaming server components ──────────────────────────────────────────────

async function MembersSection({
  workspaceId,
  currentRole,
  canEdit,
  userId,
}: {
  workspaceId: string
  currentRole: WorkspaceRole
  canEdit: boolean
  userId: string
}) {
  const supabase = await createClient()
  const { data: members } = await supabase
    .from('workspace_members')
    .select('id, user_id, role, user:users!workspace_members_user_id_fkey(full_name, email, avatar_url)')
    .eq('workspace_id', workspaceId)
    .order('joined_at')

  const membersData = (members ?? []).map((m) => ({
    id: m.id,
    user_id: m.user_id,
    role: m.role,
    user: Array.isArray(m.user) ? (m.user[0] ?? null) : m.user,
  }))

  return (
    <div className="rounded-xl border border-border bg-background-surface shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-y-2 border-b border-border px-5 py-4">
        <div>
          <h2 className="font-display text-[15px] font-bold text-foreground">Members</h2>
          <p className="mt-0.5 text-[12px] text-foreground-lighter">
            {membersData.length} member{membersData.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canEdit && <InviteMemberDialog workspaceId={workspaceId} />}
      </div>
      <MemberTable
        members={membersData}
        currentUserId={userId}
        currentRole={currentRole}
        workspaceId={workspaceId}
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
      .select('id, name, slug, logo_url, agency_id, drive_connection_type, drive_oauth_token, created_at, assigned_member_id')
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
              currentRole={currentRole}
              canEdit={canEdit}
              userId={user.id}
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
      </div>
    </div>
  )
}
