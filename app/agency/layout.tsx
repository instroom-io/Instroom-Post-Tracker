import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/app-shell'
import Image from 'next/image'
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

  // 2. Get user's workspace memberships
  const { data: allMemberships } = await supabase
    .from('workspace_members')
    .select('role, workspaces(id, name, slug, logo_url, drive_folder_id, drive_connection_type, drive_oauth_token, created_at)')
    .eq('user_id', user.id)

  const memberships = (allMemberships ?? []) as unknown as Array<{ role: WorkspaceRole; workspaces: Workspace }>

  const ownerMembership = memberships.find((m) => m.role === 'owner')

  // Non-owner with memberships = team member who shouldn't be here
  if (!ownerMembership && memberships.length > 0) {
    redirect('/no-access')
  }

  // Fresh agency admin (no workspaces yet) — render minimal layout without AppShell
  if (!ownerMembership) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="flex h-14 items-center border-b border-border px-6">
          <Image
            src="/POST_TRACKER.svg"
            alt="Instroom Post Tracker"
            width={140}
            height={32}
            className="brightness-0 dark:invert"
            priority
          />
        </div>
        <main className="flex-1 p-6">{children}</main>
      </div>
    )
  }

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
