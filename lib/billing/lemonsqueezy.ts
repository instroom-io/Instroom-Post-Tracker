// lib/billing/lemonsqueezy.ts
// Server-only: Lemon Squeezy API client + checkout creation.
// Never import this in client components.

import { lemonSqueezySetup, createCheckout } from '@lemonsqueezy/lemonsqueezy.js'
import { calcTeamTotal, getSoloPrice } from '@/lib/billing/pricing'
import type { BillingPeriod } from '@/lib/billing/pricing'

lemonSqueezySetup({
  apiKey: process.env.LEMONSQUEEZY_API_KEY!,
  onError: (error) => console.error('[LemonSqueezy]', error),
})

export function getVariantId(
  planType: 'solo' | 'team',
  billingPeriod: BillingPeriod
): string | undefined {
  if (planType === 'solo') {
    return billingPeriod === 'annual'
      ? process.env.LEMONSQUEEZY_SOLO_ANNUAL_VARIANT_ID
      : process.env.LEMONSQUEEZY_SOLO_MONTHLY_VARIANT_ID
  }
  return billingPeriod === 'annual'
    ? process.env.LEMONSQUEEZY_TEAM_ANNUAL_VARIANT_ID
    : process.env.LEMONSQUEEZY_TEAM_MONTHLY_VARIANT_ID
}

// Returns the price in cents to pass as custom_price to the LS checkout API.
// For monthly plans: cents = dollars × 100
// For annual plans:  cents = (monthly_dollars × 12) × 100  (LS charges full year upfront)
function calcCustomPriceCents(
  planType: 'solo' | 'team',
  billingPeriod: BillingPeriod,
  extraWorkspaces: number
): number {
  const monthlyAmount =
    planType === 'solo'
      ? getSoloPrice(billingPeriod)
      : calcTeamTotal(extraWorkspaces, billingPeriod)

  return billingPeriod === 'annual'
    ? monthlyAmount * 12 * 100
    : monthlyAmount * 100
}

export interface CreateCheckoutOptions {
  variantId: string
  planType: 'solo' | 'team'
  billingPeriod: BillingPeriod
  extraWorkspaces: number
  userId: string
  userEmail: string
  workspaceSlug: string
  redirectUrl: string
}

// Creates a hosted checkout session via the LS API and returns the checkout URL.
// Throws on API error.
export async function createLemonSqueezyCheckout(
  opts: CreateCheckoutOptions
): Promise<string> {
  const {
    variantId,
    planType,
    billingPeriod,
    extraWorkspaces,
    userId,
    userEmail,
    workspaceSlug,
    redirectUrl,
  } = opts

  // Only send customPrice when extra workspaces are added (requires "Allow custom prices"
  // in LS product settings). Base variant prices are already correct for standard plans.
  const hasExtraWorkspaces = planType === 'team' && extraWorkspaces > 0
  const customPrice = hasExtraWorkspaces
    ? calcCustomPriceCents(planType, billingPeriod, extraWorkspaces)
    : undefined

  const { data, error } = await createCheckout(
    process.env.LEMONSQUEEZY_STORE_ID!,
    variantId,
    {
      ...(customPrice !== undefined && { customPrice }),
      checkoutData: {
        email: userEmail,
        // All values must be strings — parsed back in webhook handler
        custom: {
          user_id: userId,
          workspace_slug: workspaceSlug,
          plan_type: planType,
          billing_period: billingPeriod,
          extra_workspaces: String(extraWorkspaces),
        },
      },
      productOptions: {
        redirectUrl,
        receiptButtonText: 'Go to Dashboard',
        receiptLinkUrl: redirectUrl,
      },
      checkoutOptions: {
        embed: true,  // opens as overlay on our page
        media: false,
        logo: true,
      },
    }
  )

  if (error) throw new Error(error.message)

  const url = data?.data?.attributes?.url
  if (!url) throw new Error('Lemon Squeezy returned no checkout URL')

  return url
}
