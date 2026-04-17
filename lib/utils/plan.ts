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

