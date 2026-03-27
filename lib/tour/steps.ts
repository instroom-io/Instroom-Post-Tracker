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
    description: 'Create a campaign for each brand collaboration. Add influencers, configure tracking handles and hashtags, then view posts and downloads — all within each campaign.',
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

export const CAMPAIGN_STEPS: TourStep[] = [
  {
    id: 'campaign-tab-overview',
    title: 'Overview',
    description: 'Campaign stats, tracking configuration, and post volume at a glance. Set your hashtags and handles here to control what Instroom detects.',
    side: 'bottom',
  },
  {
    id: 'campaign-tab-influencers',
    title: 'Influencers',
    description: "Everyone you're tracking in this campaign. Add influencers, view their handles across platforms, and manage who is included.",
    side: 'bottom',
  },
  {
    id: 'campaign-tab-posts',
    title: 'Posts',
    description: 'All posts detected for this campaign across TikTok, Instagram, and YouTube — sorted by recency, filterable by platform.',
    side: 'bottom',
  },
  {
    id: 'campaign-tab-downloads',
    title: 'Downloads',
    description: 'Posts that have been downloaded to Google Drive. Enable usage rights per influencer on the Overview tab to unlock downloads.',
    side: 'bottom',
  },
]

export const TOUR_STEPS: Record<'agency' | 'workspace' | 'campaign', TourStep[]> = {
  agency: AGENCY_STEPS,
  workspace: WORKSPACE_STEPS,
  campaign: CAMPAIGN_STEPS,
}
