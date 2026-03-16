import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/app-shell'
import type { Workspace, WorkspaceRole } from '@/lib/types'

interface LayoutProps {
  children: React.ReactNode
}

export default async function AgencyLayout({ children }: LayoutProps) {
  const supabase = await createClient()

  // 1. Verify auth
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Get user's most recent workspace (for sidebar context)
  const { data: allMemberships } = await supabase
    .from('workspace_members')
    .select('role, workspaces(id, name, slug, logo_url, drive_folder_id, drive_connection_type, drive_oauth_token, created_at)')
    .eq('user_id', user.id)

  const memberships = (allMemberships ?? []) as unknown as Array<{ role: WorkspaceRole; workspaces: Workspace }>

  // Must have at least one workspace as owner
  const ownerMembership = memberships.find((m) => m.role === 'owner')
  if (!ownerMembership) redirect('/app')

  const currentWorkspace = ownerMembership.workspaces

  // 3. Pending brand request count
  const { count: pendingRequestCount } = await supabase
    .from('brand_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  return (
    <AppShell
      user={user}
      currentWorkspace={currentWorkspace}
      currentRole="owner"
      allMemberships={memberships}
      workspaceSlug={currentWorkspace.slug}
      pendingRequestCount={pendingRequestCount ?? undefined}
    >
      {children}
    </AppShell>
  )
}
