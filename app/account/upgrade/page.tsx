import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UpgradeClient } from './upgrade-client'
import type { PlanType } from '@/lib/utils/plan'

interface PageProps {
  searchParams: Promise<{
    success?: string
    cancelled?: string
    type?: string
    total?: string
    period?: string
  }>
}

export default async function AccountUpgradePage({ searchParams }: PageProps) {
  const sp = await searchParams
  const billingPeriod = sp.period === 'annual' ? 'annual' : 'monthly'
  const isSuccess = sp.success === 'true'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/account/upgrade')

  // Get all owned workspaces to derive plan state
  const { data: memberships } = await supabase
    .from('workspace_members')
    .select('workspace_id, workspaces(id, slug, plan, trial_ends_at, account_type)')
    .eq('user_id', user.id)
    .eq('role', 'owner')

  type WorkspaceRow = {
    id: string
    slug: string
    plan: string
    trial_ends_at: string | null
    account_type: string | null
  }

  const firstWorkspace = (memberships?.[0]?.workspaces as unknown as WorkspaceRow | null) ?? null

  // If already subscribed and not arriving from a successful checkout, redirect to billing settings
  if (firstWorkspace && (firstWorkspace.plan as PlanType) === 'pro' && !isSuccess) {
    redirect(`/${firstWorkspace.slug}/settings?tab=billing`)
  }

  const plan = (firstWorkspace?.plan ?? 'trial') as PlanType
  const accountType = (firstWorkspace?.account_type ?? 'solo') as 'solo' | 'team'

  return (
    <UpgradeClient
      plan={plan}
      accountType={accountType}
      defaultWorkspaceSlug={firstWorkspace?.slug ?? null}
      success={isSuccess}
      cancelled={sp.cancelled === 'true'}
      successType={(sp.type as 'solo' | 'team') ?? 'solo'}
      successTotal={sp.total ? parseInt(sp.total, 10) : undefined}
      successPeriod={billingPeriod}
    />
  )
}
