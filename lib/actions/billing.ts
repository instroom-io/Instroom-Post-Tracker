'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  createLemonSqueezyCheckout,
  getVariantId,
} from '@/lib/billing/lemonsqueezy'
import { calcTeamTotal, getSoloPrice, calcAnnualTotal } from '@/lib/billing/pricing'
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

  const variantId = getVariantId(planType, billingPeriod)
  if (!variantId) {
    return { error: 'Billing not configured. Contact support.' }
  }

  const displayTotal = billingPeriod === 'annual'
    ? calcAnnualTotal(planType, extraWorkspaces)
    : planType === 'solo' ? getSoloPrice('monthly') : calcTeamTotal(extraWorkspaces, 'monthly')

  const redirectUrl =
    `${process.env.NEXT_PUBLIC_APP_URL}/account/upgrade` +
    `?success=true&type=${planType}&period=${billingPeriod}&total=${displayTotal}`

  try {
    const url = await createLemonSqueezyCheckout({
      variantId,
      planType,
      billingPeriod,
      extraWorkspaces,
      userId: user.id,
      userEmail: user.email!,
      redirectUrl,
    })
    return { url }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[createCheckoutSession]', msg)
    return { error: `Failed to create checkout: ${msg}` }
  }
}
