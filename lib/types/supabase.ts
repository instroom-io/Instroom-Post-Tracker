export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      agencies: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          created_at: string
          drive_folder_id: string | null
          google_access_token: string | null
          google_connected_email: string | null
          google_refresh_token: string | null
          google_token_expiry: number | null
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          slug: string
          status: Database["public"]["Enums"]["agency_status"]
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          drive_folder_id?: string | null
          google_access_token?: string | null
          google_connected_email?: string | null
          google_refresh_token?: string | null
          google_token_expiry?: number | null
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          slug: string
          status?: Database["public"]["Enums"]["agency_status"]
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          drive_folder_id?: string | null
          google_access_token?: string | null
          google_connected_email?: string | null
          google_refresh_token?: string | null
          google_token_expiry?: number | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          slug?: string
          status?: Database["public"]["Enums"]["agency_status"]
        }
        Relationships: []
      }
      agency_requests: {
        Row: {
          agency_name: string
          contact_email: string
          contact_name: string
          created_at: string
          description: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["agency_request_status"]
          website_url: string
        }
        Insert: {
          agency_name: string
          contact_email: string
          contact_name: string
          created_at?: string
          description?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["agency_request_status"]
          website_url: string
        }
        Update: {
          agency_name?: string
          contact_email?: string
          contact_name?: string
          created_at?: string
          description?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["agency_request_status"]
          website_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_invites: {
        Row: {
          accepted_at: string | null
          agency_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          token: string
          website_url: string | null
          workspace_id: string | null
          workspace_name: string
        }
        Insert: {
          accepted_at?: string | null
          agency_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          token?: string
          website_url?: string | null
          workspace_id?: string | null
          workspace_name: string
        }
        Update: {
          accepted_at?: string | null
          agency_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          token?: string
          website_url?: string | null
          workspace_id?: string | null
          workspace_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_invites_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_influencers: {
        Row: {
          added_at: string
          added_by: string
          campaign_id: string
          follow_up_1_sent_at: string | null
          follow_up_2_sent_at: string | null
          id: string
          ig_last_post_at: string | null
          influencer_id: string
          monitoring_status: Database["public"]["Enums"]["monitoring_status"]
          product_sent_at: string | null
          stop_after_post: boolean
          tiktok_last_post_at: string | null
          usage_rights: boolean
          usage_rights_updated_at: string | null
          yt_last_post_at: string | null
        }
        Insert: {
          added_at?: string
          added_by: string
          campaign_id: string
          follow_up_1_sent_at?: string | null
          follow_up_2_sent_at?: string | null
          id?: string
          ig_last_post_at?: string | null
          influencer_id: string
          monitoring_status?: Database["public"]["Enums"]["monitoring_status"]
          product_sent_at?: string | null
          stop_after_post?: boolean
          tiktok_last_post_at?: string | null
          usage_rights?: boolean
          usage_rights_updated_at?: string | null
          yt_last_post_at?: string | null
        }
        Update: {
          added_at?: string
          added_by?: string
          campaign_id?: string
          follow_up_1_sent_at?: string | null
          follow_up_2_sent_at?: string | null
          id?: string
          ig_last_post_at?: string | null
          influencer_id?: string
          monitoring_status?: Database["public"]["Enums"]["monitoring_status"]
          product_sent_at?: string | null
          stop_after_post?: boolean
          tiktok_last_post_at?: string | null
          usage_rights?: boolean
          usage_rights_updated_at?: string | null
          yt_last_post_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_influencers_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_influencers_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_influencers_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_tracking_configs: {
        Row: {
          campaign_id: string
          hashtags: string[]
          id: string
          mentions: string[]
          platform: Database["public"]["Enums"]["platform_type"]
        }
        Insert: {
          campaign_id: string
          hashtags?: string[]
          id?: string
          mentions?: string[]
          platform: Database["public"]["Enums"]["platform_type"]
        }
        Update: {
          campaign_id?: string
          hashtags?: string[]
          id?: string
          mentions?: string[]
          platform?: Database["public"]["Enums"]["platform_type"]
        }
        Relationships: [
          {
            foreignKeyName: "campaign_tracking_configs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          created_by: string
          drive_folder_id: string | null
          end_date: string | null
          id: string
          name: string
          platforms: Database["public"]["Enums"]["platform_type"][]
          start_date: string
          status: Database["public"]["Enums"]["campaign_status"]
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          drive_folder_id?: string | null
          end_date?: string | null
          id?: string
          name: string
          platforms?: Database["public"]["Enums"]["platform_type"][]
          start_date: string
          status?: Database["public"]["Enums"]["campaign_status"]
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          drive_folder_id?: string | null
          end_date?: string | null
          id?: string
          name?: string
          platforms?: Database["public"]["Enums"]["platform_type"][]
          start_date?: string
          status?: Database["public"]["Enums"]["campaign_status"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      emv_config: {
        Row: {
          cpm_rate: number
          id: string
          platform: Database["public"]["Enums"]["platform_type"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          cpm_rate: number
          id?: string
          platform: Database["public"]["Enums"]["platform_type"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          cpm_rate?: number
          id?: string
          platform?: Database["public"]["Enums"]["platform_type"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emv_config_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      influencers: {
        Row: {
          created_at: string
          id: string
          ig_handle: string | null
          instagram_user_id: string | null
          profile_pic_url: string | null
          tiktok_handle: string | null
          workspace_id: string
          youtube_channel_id: string | null
          youtube_handle: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ig_handle?: string | null
          instagram_user_id?: string | null
          profile_pic_url?: string | null
          tiktok_handle?: string | null
          workspace_id: string
          youtube_channel_id?: string | null
          youtube_handle?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ig_handle?: string | null
          instagram_user_id?: string | null
          profile_pic_url?: string | null
          tiktok_handle?: string | null
          workspace_id?: string
          youtube_channel_id?: string | null
          youtube_handle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "influencers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          role: Database["public"]["Enums"]["workspace_role"]
          token: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          token?: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      post_metrics: {
        Row: {
          comments: number
          emv: number
          emv_cpm_used: number | null
          engagement_rate: number
          fetched_at: string
          follower_count: number
          id: string
          likes: number
          post_id: string
          saves: number | null
          shares: number
          views: number
          workspace_id: string
        }
        Insert: {
          comments?: number
          emv?: number
          emv_cpm_used?: number | null
          engagement_rate?: number
          fetched_at?: string
          follower_count?: number
          id?: string
          likes?: number
          post_id: string
          saves?: number | null
          shares?: number
          views?: number
          workspace_id: string
        }
        Update: {
          comments?: number
          emv?: number
          emv_cpm_used?: number | null
          engagement_rate?: number
          fetched_at?: string
          follower_count?: number
          id?: string
          likes?: number
          post_id?: string
          saves?: number | null
          shares?: number
          views?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_metrics_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_metrics_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          blocked_reason: string | null
          campaign_id: string
          caption: string | null
          detected_at: string
          download_status: Database["public"]["Enums"]["download_status"]
          downloaded_at: string | null
          drive_file_id: string | null
          drive_folder_path: string | null
          id: string
          influencer_id: string
          media_url: string | null
          metrics_fetch_after: string | null
          metrics_fetched_at: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          platform_post_id: string
          post_url: string
          posted_at: string
          thumbnail_url: string | null
          workspace_id: string
        }
        Insert: {
          blocked_reason?: string | null
          campaign_id: string
          caption?: string | null
          detected_at?: string
          download_status?: Database["public"]["Enums"]["download_status"]
          downloaded_at?: string | null
          drive_file_id?: string | null
          drive_folder_path?: string | null
          id?: string
          influencer_id: string
          media_url?: string | null
          metrics_fetch_after?: string | null
          metrics_fetched_at?: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          platform_post_id: string
          post_url: string
          posted_at: string
          thumbnail_url?: string | null
          workspace_id: string
        }
        Update: {
          blocked_reason?: string | null
          campaign_id?: string
          caption?: string | null
          detected_at?: string
          download_status?: Database["public"]["Enums"]["download_status"]
          downloaded_at?: string | null
          drive_file_id?: string | null
          drive_folder_path?: string | null
          id?: string
          influencer_id?: string
          media_url?: string | null
          metrics_fetch_after?: string | null
          metrics_fetched_at?: string | null
          platform?: Database["public"]["Enums"]["platform_type"]
          platform_post_id?: string
          post_url?: string
          posted_at?: string
          thumbnail_url?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      retry_queue: {
        Row: {
          attempts: number
          error: string | null
          id: string
          job_type: Database["public"]["Enums"]["job_type"]
          post_id: string
          processed_at: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["job_status"]
        }
        Insert: {
          attempts?: number
          error?: string | null
          id?: string
          job_type: Database["public"]["Enums"]["job_type"]
          post_id: string
          processed_at?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["job_status"]
        }
        Update: {
          attempts?: number
          error?: string | null
          id?: string
          job_type?: Database["public"]["Enums"]["job_type"]
          post_id?: string
          processed_at?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["job_status"]
        }
        Relationships: [
          {
            foreignKeyName: "retry_queue_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          google_access_token: string | null
          google_connected_email: string | null
          google_refresh_token: string | null
          google_token_expiry: string | null
          id: string
          is_platform_admin: boolean
          onboarding_completed: boolean
          personal_drive_folder_id: string | null
          preferred_language: string
          timezone: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          google_access_token?: string | null
          google_connected_email?: string | null
          google_refresh_token?: string | null
          google_token_expiry?: string | null
          id: string
          is_platform_admin?: boolean
          onboarding_completed?: boolean
          personal_drive_folder_id?: string | null
          preferred_language?: string
          timezone?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          google_access_token?: string | null
          google_connected_email?: string | null
          google_refresh_token?: string | null
          google_token_expiry?: string | null
          id?: string
          is_platform_admin?: boolean
          onboarding_completed?: boolean
          personal_drive_folder_id?: string | null
          preferred_language?: string
          timezone?: string
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          drive_folder_id: string | null
          id: string
          invited_by: string | null
          joined_at: string
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          drive_folder_id?: string | null
          id?: string
          invited_by?: string | null
          joined_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          drive_folder_id?: string | null
          id?: string
          invited_by?: string | null
          joined_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_platform_handles: {
        Row: {
          display_name: string | null
          handle: string
          id: string
          platform: Database["public"]["Enums"]["platform_type"]
          workspace_id: string
        }
        Insert: {
          display_name?: string | null
          handle: string
          id?: string
          platform: Database["public"]["Enums"]["platform_type"]
          workspace_id: string
        }
        Update: {
          display_name?: string | null
          handle?: string
          id?: string
          platform?: Database["public"]["Enums"]["platform_type"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_platform_handles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          agency_id: string | null
          assigned_member_id: string | null
          created_at: string
          drive_connection_type:
            | Database["public"]["Enums"]["drive_connection_type"]
            | null
          drive_folder_id: string | null
          drive_oauth_token: string | null
          id: string
          logo_url: string | null
          name: string
          slug: string
        }
        Insert: {
          agency_id?: string | null
          assigned_member_id?: string | null
          created_at?: string
          drive_connection_type?:
            | Database["public"]["Enums"]["drive_connection_type"]
            | null
          drive_folder_id?: string | null
          drive_oauth_token?: string | null
          id?: string
          logo_url?: string | null
          name: string
          slug: string
        }
        Update: {
          agency_id?: string | null
          assigned_member_id?: string | null
          created_at?: string
          drive_connection_type?:
            | Database["public"]["Enums"]["drive_connection_type"]
            | null
          drive_folder_id?: string | null
          drive_oauth_token?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspaces_assigned_member_id_fkey"
            columns: ["assigned_member_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_jobs: {
        Args: {
          p_job_type: Database["public"]["Enums"]["job_type"]
          p_limit: number
        }
        Returns: {
          attempts: number
          error: string | null
          id: string
          job_type: Database["public"]["Enums"]["job_type"]
          post_id: string
          processed_at: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["job_status"]
        }[]
        SetofOptions: {
          from: "*"
          to: "retry_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      my_workspace_ids: { Args: never; Returns: string[] }
      seed_workspace_defaults: {
        Args: { p_workspace_id: string }
        Returns: undefined
      }
    }
    Enums: {
      agency_request_status: "pending" | "approved" | "rejected"
      agency_status: "pending" | "active" | "suspended"
      brand_request_status: "pending" | "approved" | "rejected" | "invited"
      brand_status: "pending" | "active"
      campaign_status: "draft" | "active" | "ended" | "archived"
      download_status: "pending" | "downloaded" | "blocked" | "failed"
      drive_connection_type: "agency" | "brand"
      job_status: "pending" | "processing" | "done" | "failed"
      job_type: "download" | "metrics_fetch"
      monitoring_status: "pending" | "active" | "paused" | "removed" | "stopped"
      platform_type: "instagram" | "tiktok" | "youtube"
      workspace_role: "owner" | "admin" | "editor" | "viewer" | "brand"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      agency_request_status: ["pending", "approved", "rejected"],
      agency_status: ["pending", "active", "suspended"],
      brand_request_status: ["pending", "approved", "rejected", "invited"],
      brand_status: ["pending", "active"],
      campaign_status: ["draft", "active", "ended", "archived"],
      download_status: ["pending", "downloaded", "blocked", "failed"],
      drive_connection_type: ["agency", "brand"],
      job_status: ["pending", "processing", "done", "failed"],
      job_type: ["download", "metrics_fetch"],
      monitoring_status: ["pending", "active", "paused", "removed", "stopped"],
      platform_type: ["instagram", "tiktok", "youtube"],
      workspace_role: ["owner", "admin", "editor", "viewer", "brand"],
    },
  },
} as const
