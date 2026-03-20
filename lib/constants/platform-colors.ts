// Platform and semantic hex colors for use in Recharts charts.
// Recharts stroke/fill props require actual color strings — CSS classes cannot be used.
// CSS variable equivalents are defined in styles/globals.css and tailwind.config.ts.
// These hex values must stay in sync with the --platform-* and semantic token values.

export const PLATFORM_COLORS = {
  instagram: '#A855F7', // --platform-instagram
  tiktok:    '#3B82F6', // --platform-tiktok
  youtube:   '#EF4444', // --platform-youtube
} as const

// ER benchmark reference lines — mapped to existing semantic tokens:
// micro (2%) → info, mid (4%) → warning, macro (8%) → destructive
export const ER_BENCHMARK_COLORS = {
  micro: '#2C8EC4', // --info
  mid:   '#F4B740', // --warning
  macro: '#E24B4A', // --destructive
} as const

// Full chart color palette — includes utility colors for grid/axis lines.
// Import this in chart components instead of defining local CHART_COLORS objects.
export const CHART_COLORS = {
  brand:  'hsl(145, 72%, 40%)', // --brand
  muted:  'hsl(0, 0%, 88%)',   // --foreground-muted (grid lines, axis ticks)
  ...PLATFORM_COLORS,
} as const
