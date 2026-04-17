// lib/billing/trial-state.ts
// Computes trial/subscription state from DB values.
// In dev, can be overridden via NEXT_PUBLIC_TRIAL_DAYS_REMAINING and
// NEXT_PUBLIC_SUBSCRIPTION_ACTIVE to test all UI states without backend changes.
//
// HYDRATION NOTE: Call computeDaysRemaining() in RSC/server context and pass
// the result as a prop to client components. Never call Date.now() inside a
// client component render body — it causes SSR/hydration text node mismatches.

import type { PlanType } from '@/lib/utils/plan'

export interface TrialState {
  isSubscribed: boolean
  isTrialing: boolean
  /** True when trial ended AND the 3-day grace period has passed (daysRemaining < -3) */
  isExpired: boolean
  /** True when trial ended but still within the 3-day grace window (0 to -3) */
  isGracePeriod: boolean
  /** Positive = days remaining; negative = days since expiry */
  daysRemaining: number
  /** 0–3 days remaining */
  isCritical: boolean
  /** 4–7 days remaining */
  isWarning: boolean
}

/**
 * Compute daysRemaining on the SERVER (RSC or server action) and pass the
 * result as a prop to client components. This keeps Date.now() out of client
 * component render bodies, preventing SSR/hydration mismatches.
 */
export function computeDaysRemaining(trialEndsAt: string | null): number {
  const isDev = process.env.NODE_ENV === 'development'
  const mockDaysEnv = isDev ? process.env.NEXT_PUBLIC_TRIAL_DAYS_REMAINING : undefined
  if (mockDaysEnv !== undefined && mockDaysEnv !== '') {
    return parseInt(mockDaysEnv, 10)
  }
  if (!trialEndsAt) return Infinity  // No trial end date configured → never expires
  return Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000)
}

/**
 * Derive TrialState from a pre-computed daysRemaining value.
 * Accept daysRemaining as a prop (computed server-side) — no Date.now() call.
 */
export function getTrialState(plan: PlanType, daysRemaining: number): TrialState {
  const isDev = process.env.NODE_ENV === 'development'
  const mockSubscribed = isDev && process.env.NEXT_PUBLIC_SUBSCRIPTION_ACTIVE === 'true'
  const isSubscribed = mockSubscribed || plan === 'pro'
  // Infinity means trial_ends_at was null — workspace was never put on a trial
  const hasNoTrial = daysRemaining === Infinity

  const isTrialing    = !isSubscribed && !hasNoTrial && daysRemaining > 0
  const isGracePeriod = !isSubscribed && !hasNoTrial && daysRemaining <= 0 && daysRemaining >= -3
  const isExpired     = !isSubscribed && !hasNoTrial && daysRemaining < -3
  const isCritical    = !isSubscribed && !hasNoTrial && daysRemaining >= 0 && daysRemaining <= 3
  const isWarning     = !isSubscribed && !hasNoTrial && daysRemaining > 3 && daysRemaining <= 7

  return {
    isSubscribed,
    isTrialing,
    isExpired,
    isGracePeriod,
    daysRemaining,
    isCritical,
    isWarning,
  }
}
