import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import Link from 'next/link'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { UserMenu } from '@/components/layout/user-menu'
import { AgencyLogoImage } from '@/components/agency/agency-logo-image'

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
          <Link href="/"><Image src="/POST_TRACKER.svg" alt="Instroom" width={120} height={28} priority /></Link>
          <span className="text-[12px] text-foreground-muted">/</span>
          <div className="flex items-center gap-2">
            {agency.logo_url && (
              <AgencyLogoImage src={agency.logo_url} alt={agency.name} className="h-4 w-4 rounded object-contain" />
            )}
            <span className="text-[13px] font-semibold text-foreground">{agency.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-4">
            <a href={`/agency/${agencySlug}/dashboard`} className="text-[13px] font-medium text-foreground-lighter hover:text-foreground transition-colors">Dashboard</a>
            <a href={`/agency/${agencySlug}/brands`} className="text-[13px] font-medium text-foreground-lighter hover:text-foreground transition-colors">Brands</a>
            <a href={`/agency/${agencySlug}/requests`} className="relative text-[13px] font-medium text-foreground-lighter hover:text-foreground transition-colors">
              Requests
              {(pendingBrandCount ?? 0) > 0 && (
                <span className="absolute -right-3 -top-1 rounded-full bg-destructive px-1.5 py-0.5 text-[9px] font-bold text-background">
                  {pendingBrandCount}
                </span>
              )}
            </a>
            <a href={`/agency/${agencySlug}/settings`} className="text-[13px] font-medium text-foreground-lighter hover:text-foreground transition-colors">Settings</a>
          </nav>
          <UserMenu user={user} compact settingsHref={`/agency/${agencySlug}/settings`} />
          <ThemeToggle />
        </div>
      </div>
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">{children}</main>
    </div>
  )
}
