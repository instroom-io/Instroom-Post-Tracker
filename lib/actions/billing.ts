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
    })
    return { url }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[createCheckoutSession]', msg)
    return { error: `Failed to create checkout: ${msg}` }
  }
}
