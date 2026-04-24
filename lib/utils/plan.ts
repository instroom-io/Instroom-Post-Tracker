// lib/utils/plan.ts
// Single source of truth for all plan feature gate logic.
// Import this in both app code and worker code.

export type PlanFeature =
  | 'drive_download'
  | 'emv_reporting'
  | 'advanced_analytics'
  | 'team_members'

export type PlanType = 'trial' | 'free' | 'pro'

const PLAN_FEATURES: Record<PlanFeature, PlanType[]> = {
  drive_download:     ['trial', 'pro'],
  emv_reporting:      ['trial', 'pro'],
  advanced_analytics: ['trial', 'pro'],
  team_members:       ['trial', 'pro'],
  // workspace creation is gated by workspace_quota, not a feature flag
}

/** Returns true if the given plan can access the given feature. */
export function canUseFeature(plan: PlanType, feature: PlanFeature): boolean {
  return PLAN_FEATURES[feature].includes(plan)
}

/** Days remaining in trial. Returns 0 if already expired or no date set. */
export function trialDaysRemaining(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0
  return Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000))
}

