// ─── Enums ────────────────────────────────────────────────────────────────────

export type Platform = 'instagram' | 'tiktok' | 'youtube'

export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer'

export type AgencyStatus = 'pending' | 'active' | 'suspended'
export type AgencyRequestStatus = 'pending' | 'approved' | 'rejected'

export type CampaignStatus = 'draft' | 'active' | 'ended'

export type MonitoringStatus = 'pending' | 'active' | 'paused' | 'removed'

export type DownloadStatus = 'pending' | 'downloaded' | 'blocked' | 'failed'

export type CollabStatus = 'n/a' | 'pending' | 'confirmed' | 'not_added'

export type JobType = 'download' | 'metrics_fetch'

export type JobStatus = 'pending' | 'processing' | 'done' | 'failed'

export type DriveConnectionType = 'agency'

export interface Agency {
  id: string
  name: string
  slug: string
  owner_id: string
  status: AgencyStatus
  logo_url: string | null
  created_at: string
}

export interface AgencyRequest {
  id: string
  agency_name: string
  website_url: string
  contact_name: string
  contact_email: string
  description: string | null
  status: AgencyRequestStatus
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

// ─── Core Entities ────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  // google_refresh_token / google_access_token / google_token_expiry are intentionally
  // excluded — they are server-only credentials, never exposed to UI-layer types.
  google_connected_email: string | null
  created_at: string
}

export interface Workspace {
  id: string
  name: string
  slug: string
  logo_url: string | null
  agency_id: string | null
  drive_folder_id?: string | null
  drive_connection_type: DriveConnectionType | null
  drive_oauth_token: string | null
  created_at: string
  assigned_member_id?: string | null   // team member who receives follow-up notification emails; falls back to workspace owner if null
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: WorkspaceRole
  invited_by: string | null
  joined_at: string
  user?: User
}

export interface Invitation {
  id: string
  workspace_id: string
  email: string
  role: WorkspaceRole
  token: string
  expires_at: string
  accepted_at: string | null
  created_at: string
  workspace?: Workspace
}

export interface Campaign {
  id: string
  workspace_id: string
  name: string
  platforms: Platform[]
  start_date: string
  end_date: string | null
  status: CampaignStatus
  drive_folder_id: string | null
  created_by: string
  created_at: string
}

export interface CampaignTrackingConfig {
  id: string
  campaign_id: string
  platform: Platform
  hashtags: string[]
  mentions: string[]
}

export interface Influencer {
  id: string
  workspace_id: string
  ig_handle: string | null
  tiktok_handle: string | null
  youtube_handle: string | null
  youtube_channel_id: string | null
  profile_pic_url: string | null
  created_at: string
}

export interface CampaignInfluencer {
  id: string
  campaign_id: string
  influencer_id: string
  usage_rights: boolean
  usage_rights_updated_at: string | null
  monitoring_status: MonitoringStatus
  added_by: string
  added_at: string
  influencer?: Influencer
}

export interface Post {
  id: string
  workspace_id: string
  campaign_id: string
  influencer_id: string
  platform: Platform
  post_url: string
  platform_post_id: string
  media_url: string | null
  caption: string | null
  thumbnail_url: string | null
  posted_at: string
  detected_at: string
  download_status: DownloadStatus
  blocked_reason: 'no_usage_rights' | null
  drive_file_id: string | null
  drive_folder_path: string | null
  downloaded_at: string | null
  collab_status: CollabStatus
  collab_checked_by: string | null
  metrics_fetch_after: string | null
  metrics_fetched_at: string | null
  influencer?: Influencer
  campaign?: Campaign
  metrics?: PostMetrics
}

export interface PostMetrics {
  id: string
  post_id: string
  workspace_id: string
  views: number
  likes: number
  comments: number
  shares: number
  saves: number | null
  follower_count: number
  engagement_rate: number
  emv: number
  emv_cpm_used: number
  fetched_at: string
}

export interface EmvConfig {
  id: string
  workspace_id: string
  platform: Platform
  cpm_rate: number
  updated_at: string
}

export interface RetryQueue {
  id: string
  post_id: string
  job_type: JobType
  status: JobStatus
  attempts: number
  scheduled_at: string
  processed_at: string | null
  error: string | null
}

// ─── Composed / View Types ────────────────────────────────────────────────────

export interface WorkspaceMembership {
  workspace: Workspace
  role: WorkspaceRole
}

export interface CampaignWithStats extends Campaign {
  post_count: number
  influencer_count: number
}

export interface InfluencerWithCampaignCount extends Influencer {
  campaign_count: number
}

export interface PostWithDetails extends Post {
  influencer: Influencer
  campaign: Campaign
  metrics: PostMetrics | undefined
}
