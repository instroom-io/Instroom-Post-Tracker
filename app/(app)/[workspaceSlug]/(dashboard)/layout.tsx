import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/app-shell'
import type { Workspace, WorkspaceRole } from '@/lib/types'

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ workspaceSlug: string }>
}

export default async function DashboardLayout({ children, params }: LayoutProps) {
  const { workspaceSlug } = await params
  const supabase = await createClient()

  // 1. Verify auth
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirectTo=/${workspaceSlug}/overview`)

  // 2. Look up workspace by slug
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, name, slug, logo_url, drive_folder_id, created_at')
    .eq('slug', workspaceSlug)
    .single()

  if (!workspace) redirect('/app')

  // 3. Verify membership + get role
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspace.id)
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/app')

  // 4. Fetch all user memberships for workspace switcher
  const { data: allMemberships } = await supabase
    .from('workspace_members')
    .select('role, workspaces(id, name, slug, logo_url, drive_folder_id, created_at)')
    .eq('user_id', user.id)

  return (
    <AppShell
      user={user}
      currentWorkspace={workspace as Workspace}
      currentRole={membership.role as WorkspaceRole}
      allMemberships={(allMemberships ?? []) as unknown as Array<{ role: WorkspaceRole; workspaces: Workspace }>}
      workspaceSlug={workspace.slug}
    >
      {children}
    </AppShell>
  )
}
