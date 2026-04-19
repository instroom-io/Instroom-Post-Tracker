import { redirect } from 'next/navigation'
import { LockKeyhole } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { SubscriptionCheckout } from '@/components/billing/subscription-checkout'
import type { PlanType } from '@/lib/utils/plan'

interface PageProps {
  params: Promise<{ workspaceSlug: string }>
}

export default async function TrialExpiredPage({ params }: PageProps) {
  const { workspaceSlug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirectTo=/${workspaceSlug}/trial-expired`)

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, plan, account_type')
    .eq('slug', workspaceSlug)
    .single()

  if (!workspace) redirect('/app')

  // If trial is still active or already subscribed, go back to app
  if ((workspace.plan as PlanType) !== 'free') redirect(`/${workspaceSlug}/overview`)

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspace.id)
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/app')

  const isOwner = membership.role === 'owner'

  // Fetch owner info for non-owners
  let ownerInfo: { email: string; full_name: string | null } | null = null
  if (!isOwner) {
    const { data: ownerMember } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspace.id)
      .eq('role', 'owner')
      .single()

    if (ownerMember) {
      const { data: ownerProfile } = await supabase
        .from('users')
        .select('email, full_name')
        .eq('id', ownerMember.user_id)
        .single()
      ownerInfo = ownerProfile
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background-muted">
        <LockKeyhole className="h-7 w-7 text-foreground-muted" />
      </div>

      <div>
        <h1 className="text-[22px] font-bold text-foreground">Your free trial has ended</h1>
        <p className="mt-2 text-[14px] text-foreground-lighter">
          Your 14-day trial has expired. Subscribe to restore full access.
        </p>
      </div>

      {isOwner ? (
        <div className="w-full">
          <SubscriptionCheckout
            accountType={(workspace.account_type as 'solo' | 'team') ?? 'solo'}
          />
        </div>
      ) : (
        <div className="w-full rounded-xl border border-border bg-background-surface px-5 py-4 text-left">
          <p className="text-[13px] text-foreground">Your workspace subscription has expired.</p>
          <p className="mt-1 text-[13px] text-foreground-lighter">
            Contact your workspace Admin to reactivate.
          </p>
          {ownerInfo && (
            <div className="mt-3 rounded-lg border border-border bg-background-muted px-3 py-2 text-[12px] text-foreground-light">
              <p className="font-medium">{ownerInfo.full_name ?? 'Workspace Admin'}</p>
              <p className="text-foreground-muted">{ownerInfo.email}</p>
            </div>
          )}
        </div>
      )}

      <p className="text-[12px] text-foreground-muted">
        Your data is safe — nothing is deleted. Subscribe anytime to restore access.
      </p>

      <p className="text-[12px] text-foreground-muted">
        Need help?{' '}
        <a href="mailto:support@instroom.co" className="underline hover:no-underline">
          Contact us →
        </a>
      </p>
    </div>
  )
}
