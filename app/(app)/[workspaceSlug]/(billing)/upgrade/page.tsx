import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UpgradeClient } from './upgrade-client'
import type { PlanType } from '@/lib/utils/plan'

interface PageProps {
  params: Promise<{ workspaceSlug: string }>
  searchParams: Promise<{ success?: string; cancelled?: string; type?: string; total?: string }>
}

export default async function UpgradePage({ params, searchParams }: PageProps) {
  const { workspaceSlug } = await params
  const sp = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirectTo=/${workspaceSlug}/upgrade`)

  const [{ data: workspace }, { data: membership }] = await Promise.all([
    supabase
      .from('workspaces')
      .select('id, plan, trial_ends_at, account_type')
      .eq('slug', workspaceSlug)
      .single(),
    supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', (await supabase.from('workspaces').select('id').eq('slug', workspaceSlug).single()).data?.id ?? '')
      .eq('user_id', user.id)
      .single(),
  ])

  if (!workspace) redirect('/app')

  // Only owner can upgrade
  if (!membership || membership.role !== 'owner') redirect(`/${workspaceSlug}/overview`)

  // Already subscribed → go to billing settings
  if ((workspace.plan as PlanType) === 'pro') {
    redirect(`/${workspaceSlug}/settings?tab=billing`)
  }

  return (
    <UpgradeClient
      workspaceSlug={workspaceSlug}
      plan={workspace.plan as PlanType}
      accountType={(workspace.account_type as 'solo' | 'team') ?? 'solo'}
      success={sp.success === 'true'}
      cancelled={sp.cancelled === 'true'}
      successType={(sp.type as 'solo' | 'team') ?? 'solo'}
      successTotal={sp.total ? parseInt(sp.total, 10) : undefined}
    />
  )
}
