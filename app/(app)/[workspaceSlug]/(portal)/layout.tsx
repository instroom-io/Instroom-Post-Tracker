import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import { ThemeToggle } from '@/components/layout/theme-toggle'

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
      <div className="w-48 min-w-48 border-r border-border bg-background-surface flex flex-col">
        <div className="px-4 py-4 border-b border-border">
          <p className="text-[13px] font-semibold text-foreground truncate">{workspace.name}</p>
          {agencyName && (
            <p className="text-[11px] text-foreground-muted mt-0.5">via {agencyName}</p>
          )}
        </div>
        <div className="flex flex-col pt-2">
          <a href={`/${workspaceSlug}/portal`} className="relative px-4 py-2 text-[13px] font-medium text-foreground bg-background-muted/50 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-4 before:w-[3px] before:rounded-r-full before:bg-brand">My Content</a>
          <a href={`/${workspaceSlug}/portal`} className="px-4 py-2 text-[13px] text-foreground-lighter hover:text-foreground hover:bg-background-muted/30 transition-colors">Reports</a>
          <a href={`/${workspaceSlug}/portal`} className="px-4 py-2 text-[13px] text-foreground-lighter hover:text-foreground hover:bg-background-muted/30 transition-colors">Brand Profile</a>
        </div>
        <div className="mt-auto border-t border-border px-4 py-3 flex flex-col gap-3">
          <a href="/" className="flex items-center gap-1.5 text-[11px] text-foreground-muted hover:text-foreground transition-colors">
            <Image src="/INSTROOM_LOGO.svg" alt="Instroom" width={14} height={14} />
            instroom.co
          </a>
          <ThemeToggle />
        </div>
      </div>
      {/* Main */}
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  )
}
