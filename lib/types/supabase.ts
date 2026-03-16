export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      brand_invitations: {
        Row: {
          accepted_at: string | null
          brand_id: string
          created_at: string | null
          expires_at: string
          id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          brand_id: string
          created_at?: string | null
          expires_at: string
          id?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          brand_id?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_invitations_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_requests: {
        Row: {
          brand_name: string
          contact_email: string
          contact_name: string
          created_at: string
          description: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["brand_request_status"]
          website_url: string
          workspace_id: string | null
        }
        Insert: {
          brand_name: string
          contact_email: string
          contact_name: string
          created_at?: string
          description?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["brand_request_status"]
          website_url: string
          workspace_id?: string | null
        }
        Update: {
          brand_name?: string
          contact_email?: string
          contact_name?: string
          created_at?: string
          description?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["brand_request_status"]
          website_url?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          agency_id: string
          created_at: string | null
          id: string
          name: string
          slug: string
          status: Database["public"]["Enums"]["brand_status"]
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          id?: string
          name: string
          slug: string
          status?: Database["public"]["Enums"]["brand_status"]
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
          status?: Database["public"]["Enums"]["brand_status"]
        }
        Relationships: []
      }
      campaign_influencers: {
        Row: {
          added_at: string
          added_by: string
          campaign_id: string
          id: string
          influencer_id: string
          monitoring_status: Database["public"]["Enums"]["monitoring_status"]
          usage_rights: boolean
          usage_rights_updated_at: string | null
        }
        Insert: {
          added_at?: string
          added_by: string
          campaign_id: string
          id?: string
          influencer_id: string
          monitoring_status?: Database["public"]["Enums"]["monitoring_status"]
          usage_rights?: boolean
          usage_rights_updated_at?: string | null
        }
        Update: {
          added_at?: string
          added_by?: string
          campaign_id?: string
          id?: string
          influencer_id?: string
          monitoring_status?: Database["public"]["Enums"]["monitoring_status"]
          usage_rights?: boolean
          usage_rights_updated_at?: string | null
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
          end_date: string
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
          end_date: string
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
          end_date?: string
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
          full_name: string
          id: string
          ig_handle: string | null
          instagram_user_id: string | null
          profile_pic_url: string | null
          tiktok_handle: string | null
          tiktok_sec_uid: string | null
          workspace_id: string
          youtube_channel_id: string | null
          youtube_handle: string | null
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          ig_handle?: string | null
          instagram_user_id?: string | null
          profile_pic_url?: string | null
          tiktok_handle?: string | null
          tiktok_sec_uid?: string | null
          workspace_id: string
          youtube_channel_id?: string | null
          youtube_handle?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          ig_handle?: string | null
          instagram_user_id?: string | null
          profile_pic_url?: string | null
          tiktok_handle?: string | null
          tiktok_sec_uid?: string | null
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
          collab_checked_by: string | null
          collab_status: Database["public"]["Enums"]["collab_status"]
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
          collab_checked_by?: string | null
          collab_status?: Database["public"]["Enums"]["collab_status"]
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
          collab_checked_by?: string | null
          collab_status?: Database["public"]["Enums"]["collab_status"]
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
            foreignKeyName: "posts_collab_checked_by_fkey"
            columns: ["collab_checked_by"]
            isOneToOne: false
            referencedRelation: "users"
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
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          id: string
          invited_by: string | null
          joined_at: string
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
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
        Relationships: []
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
      brand_request_status: "pending" | "approved" | "rejected"
      brand_status: "pending" | "active"
      campaign_status: "draft" | "active" | "ended"
      collab_status: "n/a" | "pending" | "confirmed" | "not_added"
      download_status: "pending" | "downloaded" | "blocked" | "failed"
      drive_connection_type: "agency" | "brand"
      job_status: "pending" | "processing" | "done" | "failed"
      job_type: "download" | "metrics_fetch"
      monitoring_status: "pending" | "active" | "paused"
      platform_type: "instagram" | "tiktok" | "youtube"
      workspace_role: "owner" | "admin" | "editor" | "viewer"
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
      brand_request_status: ["pending", "approved", "rejected"],
      brand_status: ["pending", "active"],
      campaign_status: ["draft", "active", "ended"],
      collab_status: ["n/a", "pending", "confirmed", "not_added"],
      download_status: ["pending", "downloaded", "blocked", "failed"],
      drive_connection_type: ["agency", "brand"],
      job_status: ["pending", "processing", "done", "failed"],
      job_type: ["download", "metrics_fetch"],
      monitoring_status: ["pending", "active", "paused"],
      platform_type: ["instagram", "tiktok", "youtube"],
      workspace_role: ["owner", "admin", "editor", "viewer"],
    },
  },
} as const
