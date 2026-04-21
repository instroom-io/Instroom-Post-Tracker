'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  createLemonSqueezyCheckout,
  getVariantId,
} from '@/lib/billing/lemonsqueezy'
import type { BillingPeriod } from '@/lib/billing/pricing'

export async function createCheckoutSession(
  planType: 'solo' | 'team',
  billingPeriod: BillingPeriod,
  extraWorkspaces: number = 0
): Promise<{ url: string } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!user.email) return { error: 'Your account has no email address. Please update your profile.' }

  const { data: userRow } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .single()
  const userName = userRow?.full_name ?? undefined

  // Block re-subscription or plan-type switching while an active subscription exists
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('id, status, plan_type')
    .eq('user_id', user.id)
    .in('status', ['active', 'suspended', 'pending'])
    .maybeSingle()

  if (existingSub) {
    if (existingSub.status === 'suspended') {
      return { error: 'Your subscription payment failed. Please update your payment method from billing settings.' }
    }
    if (existingSub.plan_type !== planType) {
      return { error: `You already have an active ${existingSub.plan_type === 'solo' ? 'Solo' : 'Team'} subscription. To switch plans, manage your billing from settings.` }
    }
    return { error: 'You already have an active subscription. To manage it, go to your billing settings.' }
  }

  const variantId = getVariantId(planType, billingPeriod)
  if (!variantId) {
    return { error: 'Billing not configured. Contact support.' }
  }

  try {
    const url = await createLemonSqueezyCheckout({
      variantId,
      planType,
      billingPeriod,
      extraWorkspaces,
      userId: user.id,
      userEmail: user.email,
      userName,
    })
    return { url }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[createCheckoutSession]', msg)
    return { error: `Failed to create checkout: ${msg}` }
  }
}
