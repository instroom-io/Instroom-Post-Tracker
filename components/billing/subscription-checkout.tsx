'use client'

import { useState } from 'react'
import { createCheckoutSession } from '@/lib/actions/billing'
import { getSoloPrice, calcTeamTotal, calcAnnualTotal } from '@/lib/billing/pricing'
import type { BillingPeriod } from '@/lib/billing/pricing'

declare global {
  interface Window {
    createLemonSqueezy?: () => void
    LemonSqueezy?: {
      Setup: (options: { eventHandler?: (event: unknown) => void }) => void
      Url: { Open: (url: string) => void; Close: () => void }
    }
  }
}

interface SubscriptionCheckoutProps {
  accountType: 'solo' | 'team'
  extraWorkspaces?: number
  billingPeriod?: BillingPeriod
}

export function SubscriptionCheckout({
  accountType,
  extraWorkspaces = 0,
  billingPeriod = 'monthly',
}: SubscriptionCheckoutProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setError(null)
    setLoading(true)

    const result = await createCheckoutSession(
      accountType,
      billingPeriod,
      extraWorkspaces
    )

    setLoading(false)

    if ('error' in result) {
      setError(result.error)
      return
    }

    if (typeof window !== 'undefined') {
      const displayTotal =
        billingPeriod === 'annual'
          ? calcAnnualTotal(accountType, extraWorkspaces)
          : accountType === 'solo'
            ? getSoloPrice('monthly')
            : calcTeamTotal(extraWorkspaces, 'monthly')
      const successUrl =
        `${window.location.origin}/account/upgrade` +
        `?success=true&type=${accountType}&period=${billingPeriod}&total=${displayTotal}`

      window.createLemonSqueezy?.()
      window.LemonSqueezy?.Setup({
        eventHandler: (e: unknown) => {
          if ((e as { event?: string }).event === 'Checkout.Success') {
            window.LemonSqueezy?.Url.Close()
            window.location.href = successUrl
          }
        },
      })

      if (window.LemonSqueezy) {
        window.LemonSqueezy.Url.Open(result.url)
      } else {
        window.location.href = result.url
      }
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 text-[13px] font-semibold text-white shadow-xs transition-colors hover:bg-brand/90 active:bg-brand/80 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
      >
        {loading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Preparing checkout…
          </>
        ) : (
          'Subscribe now'
        )}
      </button>

      {error && (
        <p className="text-center text-[12px] text-destructive">{error}</p>
      )}

      <p className="text-center text-[11px] text-foreground-muted">
        Secured by Lemon Squeezy · Cancel anytime · All users free
      </p>
    </div>
  )
}
