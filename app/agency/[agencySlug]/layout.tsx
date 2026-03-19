import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ agencySlug: string }>
}

export default async function AgencySlugLayout({ children, params }: LayoutProps) {
  const { agencySlug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify user owns this agency
  const { data: agency } = await supabase
    .from('agencies')
    .select('id, name, slug, logo_url, status')
    .eq('slug', agencySlug)
    .eq('owner_id', user.id)
    .single()

  if (!agency) redirect('/app')
  if (agency.status === 'suspended') redirect('/no-access')

  // Pending brand request count for this agency
  const { count: pendingBrandCount } = await supabase
    .from('brand_requests')
    .select('*', { count: 'exact', head: true })
    .eq('agency_id', agency.id)
    .eq('status', 'pending')

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex h-14 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-4">
          <Image src="/POST_TRACKER.svg" alt="Instroom" width={120} height={28} className="brightness-0 dark:invert" priority />
          <span className="text-xs text-muted-foreground">/</span>
          <span className="text-sm font-semibold text-foreground">{agency.name}</span>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <a href={`/agency/${agencySlug}/dashboard`} className="text-muted-foreground hover:text-foreground transition-colors">Dashboard</a>
          <a href={`/agency/${agencySlug}/brands`} className="text-muted-foreground hover:text-foreground transition-colors">Brands</a>
          <a href={`/agency/${agencySlug}/requests`} className="relative text-muted-foreground hover:text-foreground transition-colors">
            Requests
            {(pendingBrandCount ?? 0) > 0 && (
              <span className="absolute -right-3 -top-1 rounded-full bg-destructive px-1.5 py-0.5 text-[9px] font-bold text-background">
                {pendingBrandCount}
              </span>
            )}
          </a>
          <a href={`/agency/${agencySlug}/settings`} className="text-muted-foreground hover:text-foreground transition-colors">Settings</a>
        </nav>
      </div>
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">{children}</main>
    </div>
  )
}
