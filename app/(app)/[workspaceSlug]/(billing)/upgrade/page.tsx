import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UpgradeClient } from './upgrade-client'
import type { PlanType } from '@/lib/utils/plan'

interface PageProps {
  params: Promise<{ workspaceSlug: string }>
  searchParams: Promise<{ success?: string; cancelled?: string; type?: string; total?: string; period?: string }>
}

export default async function UpgradePage({ params, searchParams }: PageProps) {
  const { workspaceSlug } = await params
  const sp = await searchParams
  const billingPeriod = sp.period === 'annual' ? 'annual' : 'monthly'
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirectTo=/${workspaceSlug}/upgrade`)

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, plan, trial_ends_at, account_type')
    .eq('slug', workspaceSlug)
    .single()

  if (!workspace) redirect('/app')

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspace.id)
    .eq('user_id', user.id)
    .single()

  // Only owner can upgrade
  if (!membership || membership.role !== 'owner') redirect(`/${workspaceSlug}/overview`)

  // Already subscribed → go to billing settings (unless arriving from successful checkout)
  const isSuccess = sp.success === 'true'
  if ((workspace.plan as PlanType) === 'pro' && !isSuccess) {
    redirect(`/${workspaceSlug}/settings?tab=billing`)
  }

  return (
    <UpgradeClient
      workspaceSlug={workspaceSlug}
      plan={workspace.plan as PlanType}
      accountType={(workspace.account_type as 'solo' | 'team') ?? 'solo'}
      success={isSuccess}
      cancelled={sp.cancelled === 'true'}
      successType={(sp.type as 'solo' | 'team') ?? 'solo'}
      successTotal={sp.total ? parseInt(sp.total, 10) : undefined}
      successPeriod={billingPeriod}
    />
  )
}
