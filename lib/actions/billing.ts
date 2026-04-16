'use server'

// lib/actions/billing.ts
// Server Actions for billing. Checkout creation only — no optimistic activation.
// All subscription state changes are driven by the LS webhook handler.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  createLemonSqueezyCheckout,
  getVariantId,
} from '@/lib/billing/lemonsqueezy'
import { calcTeamTotal, getSoloPrice } from '@/lib/billing/pricing'
import type { BillingPeriod } from '@/lib/billing/pricing'

export async function createCheckoutSession(
  workspaceSlug: string,
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

  // Compute display total for the success-screen query param
  const displayTotal =
    planType === 'solo'
      ? getSoloPrice(billingPeriod)
      : calcTeamTotal(extraWorkspaces, billingPeriod)

  const redirectUrl =
    `${process.env.NEXT_PUBLIC_APP_URL}/${workspaceSlug}/upgrade` +
    `?success=true&type=${planType}&period=${billingPeriod}&total=${displayTotal}`

  try {
    const url = await createLemonSqueezyCheckout({
      variantId,
      planType,
      billingPeriod,
      extraWorkspaces,
      userId: user.id,
      userEmail: user.email!,
      workspaceSlug,
      redirectUrl,
    })
    return { url }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[createCheckoutSession]', msg)
    return { error: `Failed to create checkout: ${msg}` }
  }
}
