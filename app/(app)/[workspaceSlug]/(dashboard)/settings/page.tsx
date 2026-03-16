import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { WorkspaceSettingsForm } from '@/components/settings/workspace-settings-form'
import { MemberTable } from '@/components/settings/member-table'
import { InviteMemberDialog } from '@/components/settings/invite-member-dialog'
import { EmvSettingsPanel } from '@/components/settings/emv-settings-panel'

interface PageProps {
  params: Promise<{ workspaceSlug: string }>
}

export default async function SettingsPage({ params }: PageProps) {
  const { workspaceSlug } = await params
  const supabase = await createClient()

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, name, slug, logo_url, drive_folder_id, created_at')
    .eq('slug', workspaceSlug)
    .single()

  if (!workspace) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: members }, { data: emvConfigs }, { data: currentMember }] =
    await Promise.all([
      supabase
        .from('workspace_members')
        .select('id, user_id, role, user:users(full_name, email)')
        .eq('workspace_id', workspace.id)
        .order('joined_at'),
      supabase
        .from('emv_config')
        .select('id, workspace_id, platform, cpm_rate, updated_at')
        .eq('workspace_id', workspace.id),
      supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspace.id)
        .eq('user_id', user!.id)
        .single(),
    ])

  const currentRole = currentMember?.role ?? 'viewer'
  const canEdit = currentRole === 'owner' || currentRole === 'admin'

  const membersData = (members ?? []).map((m) => ({
    id: m.id,
    user_id: m.user_id,
    role: m.role,
    user: Array.isArray(m.user) ? (m.user[0] ?? null) : m.user,
  }))

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Settings" />

      {/* General */}
      <div className="rounded-xl border border-border bg-background-surface p-5 shadow-sm">
        <div className="mb-5 border-b border-border pb-4">
          <h2 className="font-display text-[15px] font-bold text-foreground">General</h2>
          <p className="mt-1 text-[12px] text-foreground-lighter">
            Workspace name, logo, and Google Drive folder.
          </p>
        </div>
        <WorkspaceSettingsForm workspace={workspace} canEdit={canEdit} />
      </div>

      {/* Members */}
      <div className="rounded-xl border border-border bg-background-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-display text-[15px] font-bold text-foreground">Members</h2>
            <p className="mt-0.5 text-[12px] text-foreground-lighter">
              {membersData.length} member{membersData.length !== 1 ? 's' : ''}
            </p>
          </div>
          {canEdit && (
            <InviteMemberDialog workspaceId={workspace.id} />
          )}
        </div>
        <MemberTable
          members={membersData}
          currentUserId={user!.id}
          currentRole={currentRole}
          workspaceId={workspace.id}
        />
      </div>

      {/* EMV Config — admin+ only */}
      {canEdit && (
        <EmvSettingsPanel
          workspaceId={workspace.id}
          configs={emvConfigs ?? []}
          canEdit={canEdit}
        />
      )}
    </div>
  )
}
