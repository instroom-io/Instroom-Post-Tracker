import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AccountSettingsForm } from '@/components/account/account-settings-form'
import { GoogleDriveCard } from '@/components/account/google-drive-card'

export default async function AccountSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase
      .from('users')
      .select('preferred_language, timezone, google_connected_email')
      .eq('id', user.id)
      .single(),
    supabase
      .from('workspace_members')
      .select('workspace_id, drive_folder_id, workspace:workspaces!workspace_members_workspace_id_fkey(id, name)')
      .eq('user_id', user.id)
      .neq('role', 'brand'),
  ])

  const workspaceFolders = (memberships ?? []).map((m) => {
    const ws = Array.isArray(m.workspace) ? m.workspace[0] : m.workspace
    return {
      workspaceId: m.workspace_id,
      workspaceName: (ws as { name: string } | null)?.name ?? 'Workspace',
      currentFolderId: m.drive_folder_id ?? null,
    }
  })

  return (
    <div className="space-y-5">
      <AccountSettingsForm
        preferredLanguage={profile?.preferred_language ?? 'en'}
        timezone={profile?.timezone ?? 'UTC'}
      />
      <GoogleDriveCard
        connectedEmail={(profile as unknown as { google_connected_email: string | null } | null)?.google_connected_email ?? null}
        workspaceFolders={workspaceFolders}
      />
    </div>
  )
}
