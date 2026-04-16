// lib/billing/pricing.ts
// Single source of truth for all billing pricing constants.

export const PRICING = {
  solo: {
    monthly: 19,
    annual: 15,   // per month, billed annually
  },
  team: {
    monthly: 49,
    annual: 39,   // per month, billed annually
    includedWorkspaces: 3,
    extraMonthly: 12,
    extraAnnual: 10,
  },
} as const

export type BillingPeriod = 'monthly' | 'annual'

export function getSoloPrice(period: BillingPeriod = 'monthly'): number {
  return period === 'annual' ? PRICING.solo.annual : PRICING.solo.monthly
}

export function calcTeamTotal(extraWorkspaces: number, period: BillingPeriod = 'monthly'): number {
  const base = period === 'annual' ? PRICING.team.annual : PRICING.team.monthly
  const extra = period === 'annual' ? PRICING.team.extraAnnual : PRICING.team.extraMonthly
  return base + extraWorkspaces * extra
}

export function getExtraWorkspacePrice(period: BillingPeriod = 'monthly'): number {
  return period === 'annual' ? PRICING.team.extraAnnual : PRICING.team.extraMonthly
}

/** Returns the total amount charged upfront for an annual subscription (per-month rate × 12). */
export function calcAnnualTotal(planType: 'solo' | 'team', extraWorkspaces: number = 0): number {
  return planType === 'solo'
    ? PRICING.solo.annual * 12
    : calcTeamTotal(extraWorkspaces, 'annual') * 12
}
