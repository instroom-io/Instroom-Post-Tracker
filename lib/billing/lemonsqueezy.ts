// lib/billing/lemonsqueezy.ts
// Server-only: Lemon Squeezy API client + checkout creation.
// Never import this in client components.

import { calcTeamTotal, getSoloPrice } from '@/lib/billing/pricing'
import type { BillingPeriod } from '@/lib/billing/pricing'

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
  userName?: string
}

// Creates a hosted checkout session via the LS API and returns the checkout URL.
// Uses native fetch directly (bypasses SDK) for reliable env var access on Vercel.
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
    userName,
  } = opts

  const apiKey = process.env.LEMONSQUEEZY_API_KEY?.trim()
  const storeId = process.env.LEMONSQUEEZY_STORE_ID?.trim()
  if (!apiKey || !storeId) throw new Error('Lemon Squeezy env vars not configured')


  // Only send customPrice when extra workspaces are added (requires "Allow custom prices"
  // in LS product settings). Base variant prices are already correct for standard plans.
  const hasExtraWorkspaces = planType === 'team' && extraWorkspaces > 0
  const customPrice = hasExtraWorkspaces
    ? calcCustomPriceCents(planType, billingPeriod, extraWorkspaces)
    : undefined

  const body = {
    data: {
      type: 'checkouts',
      attributes: {
        ...(customPrice !== undefined && { custom_price: customPrice }),
        checkout_data: {
          email: userEmail,
          ...(userName && { name: userName }),
          custom: {
            user_id: userId,
            plan_type: planType,
            billing_period: billingPeriod,
            extra_workspaces: String(extraWorkspaces),
          },
        },
        product_options: {
          receipt_button_text: 'Go to Dashboard',
        },
        checkout_options: {
          embed: true,
          media: false,
          logo: true,
        },
      },
      relationships: {
        store: { data: { type: 'stores', id: storeId } },
        variant: { data: { type: 'variants', id: variantId.trim() } },
      },
    },
  }

  const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/vnd.api+json',
      'Accept': 'application/vnd.api+json',
    },
    body: JSON.stringify(body),
  })

  const json = await res.json() as Record<string, unknown>

  if (!res.ok) {
    const errDetail = (json as { errors?: Array<{detail: string}> }).errors?.[0]?.detail
      ?? res.statusText
    console.error('[createLemonSqueezyCheckout] LS error', res.status, JSON.stringify(json))
    throw new Error(errDetail)
  }

  const url = (json as { data?: { attributes?: { url?: string } } })
    ?.data?.attributes?.url
  if (!url) throw new Error('Lemon Squeezy returned no checkout URL')

  return url
}
