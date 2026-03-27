export interface TourStep {
  id: string
  title: string
  description: string
  side: 'right' | 'left' | 'bottom'
}

export const AGENCY_STEPS: TourStep[] = [
  {
    id: 'agency-dashboard',
    title: 'Dashboard',
    description: "Get a bird's-eye view of all your brand workspaces, workspace count, and total post volume in one place.",
    side: 'bottom',
  },
  {
    id: 'agency-brands',
    title: 'Brands',
    description: 'All the brand workspaces you manage live here. Click into any brand to view their campaigns, posts, and analytics.',
    side: 'bottom',
  },
  {
    id: 'agency-invite-brand',
    title: 'Invite a Brand',
    description: "Send a branded invite link to onboard a new client. They fill in their details and a workspace is created automatically — no account needed on their end.",
    side: 'bottom',
  },
  {
    id: 'agency-settings',
    title: 'Settings',
    description: 'Update your agency profile, logo, and preferences here.',
    side: 'bottom',
  },
]

export const WORKSPACE_STEPS: TourStep[] = [
  {
    id: 'ws-overview',
    title: 'Overview',
    description: 'Your campaign dashboard — stat cards, recent posts, and usage rights all at a glance.',
    side: 'right',
  },
  {
    id: 'ws-campaigns',
    title: 'Campaigns',
    description: 'Create a campaign for each brand collaboration. Add influencers, set tracking hashtags and handles, and Instroom detects their posts automatically across TikTok, Instagram and YouTube.',
    side: 'right',
  },
  {
    id: 'ws-influencers',
    title: 'Influencers',
    description: "Every influencer you've ever tracked lives here — across all campaigns. Add them once, reuse across campaigns.",
    side: 'right',
  },
  {
    id: 'ws-posts',
    title: 'Posts',
    description: 'All detected posts across every campaign, filterable by platform, influencer, and date. Download to Drive or manage collab tags from here.',
    side: 'right',
  },
  {
    id: 'ws-analytics',
    title: 'Analytics',
    description: 'EMV, engagement rate, post volume over time, platform breakdown, and an influencer leaderboard — all calculated from your real post data.',
    side: 'right',
  },
  {
    id: 'ws-usage-rights',
    title: 'Usage Rights',
    description: 'Toggle usage rights per influencer to unlock automatic post downloads to Google Drive. Without this enabled, posts are tracked but not downloaded.',
    side: 'right',
  },
  {
    id: 'ws-settings',
    title: 'Settings',
    description: 'Invite team members, configure your workspace name and logo, and set your Google Drive folder for post downloads.',
    side: 'right',
  },
]

export const TOUR_STEPS: Record<'agency' | 'workspace', TourStep[]> = {
  agency: AGENCY_STEPS,
  workspace: WORKSPACE_STEPS,
}
