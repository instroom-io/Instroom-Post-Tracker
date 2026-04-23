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
    title: 'Invite Brand',
    description: "Invite a new client brand. They fill in their details and a workspace is created automatically — no account needed on their end.",
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
    description: 'Your campaign dashboard — stat cards, recent campaigns, and recent posts all at a glance.',
    side: 'right',
  },
  {
    id: 'ws-campaigns',
    title: 'Campaigns',
    description: 'Create a campaign for each brand collaboration. Add influencers, configure tracking handles and hashtags, then view posts and downloads — all within each campaign.',
    side: 'right',
  },
  {
    id: 'ws-influencers',
    title: 'Influencers',
    description: 'Your workspace-wide influencer directory. Add influencers here once and reuse them across campaigns — search, filter by campaign, and see at a glance which campaigns each influencer is part of.',
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
    title: 'Usage Rights & Downloads',
    description: 'This tracks how many posts have been saved to Google Drive. Downloads are unlocked per influencer — go to any campaign → Influencers tab and enable the Usage Rights toggle for each influencer you want downloaded.',
    side: 'right',
  },
  {
    id: 'ws-settings',
    title: 'Settings',
    description: 'Invite team members, configure your workspace name and logo, and set your Google Drive folder for post downloads.',
    side: 'right',
  },
  {
    id: 'ws-user-menu',
    title: 'Your Account',
    description: 'Access your profile, switch workspaces, and sign out — all from this menu.',
    side: 'left',
  },
]

export const CAMPAIGN_STEPS: TourStep[] = [
  {
    id: 'campaign-status',
    title: 'Campaign Status',
    description: 'Campaigns move through three states: Draft → Active → Ended. Activate once your tracking config is complete and influencers are added. End the campaign when the collaboration is over — you can re-activate if needed.',
    side: 'bottom',
  },
  {
    id: 'campaign-tab-overview',
    title: 'Overview',
    description: 'Campaign stats at a glance — posts detected, downloads, total views, and EMV. Your tracking configuration lives here too: set the hashtags and @mentions Instroom will look for.',
    side: 'bottom',
  },
  {
    id: 'campaign-tracking-config',
    title: 'Tracking Config',
    description: 'Add at least one hashtag (e.g. #yourbrand) and one @mention (e.g. @YourBrand) per platform. Instroom only picks up posts that match both. This must be complete before you can activate the campaign.',
    side: 'bottom',
  },
  {
    id: 'campaign-tab-influencers',
    title: 'Influencers',
    description: 'Add influencers to this campaign and record when each product was sent. Use the Usage Rights toggle per influencer — when on, detected posts are automatically downloaded to Google Drive; when off, posts are still tracked but never downloaded.',
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
    description: 'Posts that have been downloaded to Google Drive. Enable usage rights per influencer on the Influencers tab to unlock downloads.',
    side: 'bottom',
  },
]

export const CAMPAIGNS_LIST_STEPS: TourStep[] = [
  {
    id: 'campaigns-new-btn',
    title: 'Create a Campaign',
    description: 'Set up a campaign for each brand collaboration. Choose the social platforms you want to track, add your influencers, and configure the hashtags and @handles Instroom should look for.',
    side: 'bottom',
  },
  {
    id: 'campaigns-table',
    title: 'Your Campaigns',
    description: 'All campaigns in this workspace — with status, date range, and post count at a glance. Click into any campaign to manage tracking, view detected posts, and handle downloads.',
    side: 'bottom',
  },
]

export const TOUR_STEPS: Record<'agency' | 'workspace' | 'campaign' | 'campaigns-list', TourStep[]> = {
  agency: AGENCY_STEPS,
  workspace: WORKSPACE_STEPS,
  campaign: CAMPAIGN_STEPS,
  'campaigns-list': CAMPAIGNS_LIST_STEPS,
}
