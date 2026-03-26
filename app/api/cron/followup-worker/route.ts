// app/api/cron/followup-worker/route.ts
import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { differenceInDays } from 'date-fns'
import { sendEmail, escapeHtml } from '@/lib/email'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const supabase = createServiceClient()

  // Load all active campaign_influencers with campaign, influencer, and workspace data
  const { data: rows, error: loadError } = await supabase
    .from('campaign_influencers')
    .select(`
      id,
      product_sent_at,
      added_at,
      follow_up_1_sent_at,
      follow_up_2_sent_at,
      influencer_id,
      campaigns!inner (
        id,
        name,
        workspace_id,
        status,
        workspaces!inner (
          id,
          name,
          assigned_member_id
        )
      ),
      influencers!inner (
        tiktok_handle,
        ig_handle,
        youtube_handle
      )
    `)
    .in('monitoring_status', ['pending', 'active'])
    .eq('campaigns.status', 'active')

  if (loadError) {
    console.error('[followup-worker] Failed to load rows:', loadError)
    return NextResponse.json({ error: loadError.message }, { status: 500 })
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  let emailsSent = 0
  const errors: string[] = []

  for (const row of rows) {
    try {
      const campaign = row.campaigns as unknown as {
        id: string
        name: string
        workspace_id: string
        workspaces: {
          id: string
          name: string
          assigned_member_id: string | null
        }
      }
      const influencer = row.influencers as unknown as {
        tiktok_handle: string | null
        ig_handle: string | null
        youtube_handle: string | null
      }

      // ── Clock start: product_sent_at with added_at fallback ──────────────────
      const clockStart = (row.product_sent_at as string | null) ?? (row.added_at as string)
      const daysSince = differenceInDays(new Date(), new Date(clockStart))

      // Only process if we're in the follow-up window (day 10+)
      if (daysSince < 10) continue

      // ── Check if influencer has posted yet ────────────────────────────────────
      const { count: postCount } = await supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id)
        .eq('influencer_id', row.influencer_id as string)

      if ((postCount ?? 0) > 0) continue // Already posted — nothing to do

      // ── Resolve recipient email ───────────────────────────────────────────────
      const workspace = campaign.workspaces
      let recipientEmail: string | null = null
      let recipientName = 'Team'

      if (workspace.assigned_member_id) {
        // Prefer assigned member
        const { data: assignedUser } = await supabase
          .from('users')
          .select('email, full_name')
          .eq('id', workspace.assigned_member_id)
          .single()
        if (assignedUser) {
          recipientEmail = assignedUser.email
          recipientName = assignedUser.full_name ?? 'Team'
        }
      }

      if (!recipientEmail) {
        // Fallback: workspace owner
        const { data: ownerMember } = await supabase
          .from('workspace_members')
          .select('user_id, users!workspace_members_user_id_fkey(email, full_name)')
          .eq('workspace_id', campaign.workspace_id)
          .eq('role', 'owner')
          .single()
        const ownerUser = (ownerMember?.users as unknown as { email: string; full_name: string | null } | null)
        if (ownerUser) {
          recipientEmail = ownerUser.email
          recipientName = ownerUser.full_name ?? 'Team'
        }
      }

      if (!recipientEmail) {
        errors.push(`[campaign ${campaign.id}] No recipient email found`)
        continue
      }

      // ── Determine which follow-up to send ────────────────────────────────────
      const handle =
        influencer.tiktok_handle ?? influencer.ig_handle ?? influencer.youtube_handle ?? 'Unknown'
      const rawCampaignName = campaign.name
      const rawInfluencerHandle = `@${handle}`

      const campaignName = escapeHtml(rawCampaignName)
      const influencerHandle = escapeHtml(rawInfluencerHandle)
      const workspaceName = escapeHtml(workspace.name)

      const follow_up_1_sent_at = row.follow_up_1_sent_at as string | null
      const follow_up_2_sent_at = row.follow_up_2_sent_at as string | null

      let subject: string
      let html: string
      let updateField: Record<string, string>

      if (daysSince >= 10 && !follow_up_1_sent_at) {
        // First follow-up: day 10
        subject = `[${rawCampaignName}] Follow up with ${rawInfluencerHandle}`
        html = `
          <p>Hi ${escapeHtml(recipientName)},</p>
          <p><strong>${influencerHandle}</strong> hasn't posted yet for the <strong>${campaignName}</strong> campaign (${workspaceName}).</p>
          <p>It's been <strong>${daysSince} days</strong> since the product was sent. Please follow up with them.</p>
          <p style="color:#888;font-size:12px;">This is the first follow-up reminder.</p>
        `
        updateField = { follow_up_1_sent_at: new Date().toISOString() }
      } else if (daysSince >= 13 && follow_up_1_sent_at && !follow_up_2_sent_at) {
        // Second follow-up: day 13
        subject = `[${rawCampaignName}] Follow up again with ${rawInfluencerHandle}`
        html = `
          <p>Hi ${escapeHtml(recipientName)},</p>
          <p><strong>${influencerHandle}</strong> still hasn't posted for the <strong>${campaignName}</strong> campaign (${workspaceName}).</p>
          <p>It's been <strong>${daysSince} days</strong> since the product was sent. Your first follow-up may have gotten buried — please try again.</p>
          <p style="color:#888;font-size:12px;">This is the second follow-up reminder.</p>
        `
        updateField = { follow_up_2_sent_at: new Date().toISOString() }
      } else {
        continue // No email to send in this state
      }

      // ── Send email ────────────────────────────────────────────────────────────
      await sendEmail({ to: recipientEmail, subject, html })

      // ── Record timestamp to prevent duplicate sends ───────────────────────────
      await supabase
        .from('campaign_influencers')
        .update(updateField)
        .eq('id', row.id)

      emailsSent++
      console.log(`[followup-worker] Sent follow-up to ${recipientEmail} for ${influencerHandle} in ${campaignName}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      errors.push(`[row ${row.id}] ${message}`)
    }
  }

  return NextResponse.json({
    processed: rows.length,
    emailsSent,
    ...(errors.length > 0 && { errors }),
  })
}
