import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import Link from 'next/link'
import { UserMenu } from '@/components/layout/user-menu'
import { AgencyLogoImage } from '@/components/agency/agency-logo-image'
import { AgencyTourWrapper, AgencyTourButton } from '@/components/agency/agency-tour-wrapper'
import { AgencyNav } from '@/components/agency/agency-nav'
import { TrialBanner } from '@/components/layout/trial-banner'
import { computeDaysRemaining } from '@/lib/billing/trial-state'
import type { PlanType } from '@/lib/utils/plan'
import type { WorkspaceRole } from '@/lib/types'

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
  const { data: agencyRaw } = await supabase
    .from('agencies')
    .select('id, name, slug, logo_url, status, plan, trial_ends_at')
    .eq('slug', agencySlug)
    .eq('owner_id', user.id)
    .single()

  if (!agencyRaw) redirect('/app')
  if (agencyRaw.status === 'suspended') redirect('/no-access')

  // Cast to include billing columns added in migration 0038 (pending type regen)
  const agency = agencyRaw as typeof agencyRaw & { plan: PlanType; trial_ends_at: string | null }

  const agencyPlan = agency.plan ?? 'free'
  const daysRemaining = computeDaysRemaining(agency.trial_ends_at ?? null)

  if (agencyPlan === 'free' && daysRemaining < -3) {
    redirect('/account/upgrade')
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TrialBanner
        plan={agencyPlan}
        daysRemaining={daysRemaining}
        upgradeHref="/account/upgrade"
        role={'owner' as WorkspaceRole}
      />
      <div className="flex h-14 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-4">
          <Link href={`/agency/${agencySlug}/dashboard`}><Image src="/POST_TRACKER.svg" alt="Instroom" width={120} height={28} priority /></Link>
          <span className="text-[12px] text-foreground-muted">/</span>
          <div className="flex items-center gap-2">
            {agency.logo_url && (
              <AgencyLogoImage src={agency.logo_url} alt={agency.name} className="h-4 w-4 rounded object-contain" />
            )}
            <span className="text-[13px] font-semibold text-foreground">{agency.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <UserMenu user={user} compact settingsHref={`/agency/${agencySlug}/settings`} />
          <AgencyTourButton />
        </div>
      </div>
      <AgencyNav agencySlug={agencySlug} />
      <AgencyTourWrapper>
        <main className="flex-1 p-6 max-w-6xl mx-auto w-full">{children}</main>
      </AgencyTourWrapper>
    </div>
  )
}
