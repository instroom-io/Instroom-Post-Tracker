// lib/billing/pricing.ts
// Single source of truth for all billing pricing constants.
// All values are placeholders — replace with real prices before launch.

export const PRICING = {
  solo: {
    workspacePrice: 29,
  },
  team: {
    basePrice: 79,
    includedWorkspaces: 3,
    extraWorkspacePrice: 25,
  },
} as const

export function calcTeamTotal(extraWorkspaces: number): number {
  return PRICING.team.basePrice + extraWorkspaces * PRICING.team.extraWorkspacePrice
}
