'use client'

// components/billing/subscription-checkout.tsx
// Shared PayPal subscription checkout button used on /upgrade and /trial-expired.
// Renders nothing when NEXT_PUBLIC_PAYPAL_CLIENT_ID is not set.

import { useRouter } from 'next/navigation'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'
import { PRICING } from '@/lib/billing/pricing'
import { activateSubscription } from '@/lib/actions/billing'

interface SubscriptionCheckoutProps {
  accountType: 'solo' | 'team'
  extraWorkspaces?: number
  workspaceSlug: string
  userId: string
}

function CheckoutButtons({ accountType, extraWorkspaces = 0, workspaceSlug, userId }: SubscriptionCheckoutProps) {
  const router = useRouter()
  const soloPlanId = process.env.NEXT_PUBLIC_PAYPAL_SOLO_PLAN_ID
  const teamPlanId = process.env.NEXT_PUBLIC_PAYPAL_TEAM_PLAN_ID

  const planId = accountType === 'solo' ? soloPlanId : teamPlanId

  if (!planId) {
    return (
      <div className="rounded-lg border border-border bg-background-muted px-4 py-3 text-center text-[12px] text-foreground-lighter">
        PayPal plan ID not configured. Set <code>NEXT_PUBLIC_PAYPAL_SOLO_PLAN_ID</code> / <code>NEXT_PUBLIC_PAYPAL_TEAM_PLAN_ID</code>.
      </div>
    )
  }

  const total =
    accountType === 'solo'
      ? PRICING.solo.workspacePrice
      : PRICING.team.basePrice + extraWorkspaces * PRICING.team.extraWorkspacePrice

  return (
    <div>
      <PayPalButtons
        style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'subscribe' }}
        createSubscription={(_data: Record<string, unknown>, actions: { subscription: { create: (opts: { plan_id: string; custom_id: string }) => Promise<string> } }) => {
          return actions.subscription.create({ plan_id: planId, custom_id: userId })
        }}
        onApprove={async (data: { subscriptionID?: string | null }) => {
          if (data.subscriptionID) {
            await activateSubscription(data.subscriptionID, accountType, extraWorkspaces)
          }
          router.push(`/${workspaceSlug}/upgrade?success=true&type=${accountType}&total=${total}`)
        }}
        onCancel={() => {
          router.push(`/${workspaceSlug}/upgrade?cancelled=true`)
        }}
        onError={(err: Record<string, unknown>) => {
          console.error('PayPal error', err)
        }}
      />
      <p className="mt-2 text-center text-[11px] text-foreground-muted">
        Secured by PayPal · Cancel anytime · All users free
      </p>
    </div>
  )
}

export function SubscriptionCheckout(props: SubscriptionCheckoutProps) {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID

  if (!clientId) {
    return (
      <div className="rounded-lg border border-dashed border-border px-4 py-3 text-center text-[12px] text-foreground-lighter">
        PayPal not configured. Set <code>NEXT_PUBLIC_PAYPAL_CLIENT_ID</code> in <code>.env.local</code> to enable checkout.
      </div>
    )
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId,
        vault: true,
        intent: 'subscription',
      }}
    >
      <CheckoutButtons {...props} />
    </PayPalScriptProvider>
  )
}
