import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ workspaceSlug: string }>
}

export default async function PortalLayout({ children, params }: LayoutProps) {
  const { workspaceSlug } = await params
  const supabase = await createClient()

  const [{ data: { user } }, { data: workspace }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('workspaces')
      .select('id, name, slug, drive_folder_id, drive_connection_type, agency_id')
      .eq('slug', workspaceSlug)
      .single(),
  ])

  if (!user) redirect(`/login?redirectTo=/${workspaceSlug}/portal`)
  if (!workspace) redirect('/app')

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspace.id)
    .eq('user_id', user.id)
    .single()

  // Only 'brand' role can access the portal layout
  if (!membership || membership.role !== 'brand') redirect('/app')

  // Fetch agency name for "via Agency" display
  let agencyName: string | null = null
  if (workspace.agency_id) {
    const { data: agency } = await supabase
      .from('agencies')
      .select('name')
      .eq('id', workspace.agency_id)
      .single()
    agencyName = agency?.name ?? null
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <div className="w-48 min-w-48 border-r border-border bg-background-surface flex flex-col py-4 gap-1">
        <div className="px-4 pb-3 border-b border-border mb-1">
          <p className="text-xs font-bold text-foreground truncate">{workspace.name}</p>
          {agencyName && (
            <p className="text-[10px] text-muted-foreground mt-0.5">via {agencyName}</p>
          )}
        </div>
        <a href={`/${workspaceSlug}/portal`} className="px-4 py-2 text-sm font-medium text-foreground bg-accent/10 border-r-2 border-foreground">My Content</a>
        <a href={`/${workspaceSlug}/portal`} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Reports</a>
        <a href={`/${workspaceSlug}/portal`} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Brand Profile</a>
      </div>
      {/* Main */}
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  )
}
