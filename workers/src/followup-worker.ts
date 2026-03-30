import { createServiceClient } from './lib/supabase'
import { differenceInDays } from 'date-fns'
import { sendEmail, escapeHtml } from '@/lib/email'

async function main() {
  const supabase = createServiceClient()

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
    process.exit(1)
  }

  if (!rows || rows.length === 0) {
    console.log(JSON.stringify({ processed: 0 }))
    process.exit(0)
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

      const clockStart = (row.product_sent_at as string | null) ?? (row.added_at as string)
      const daysSince = differenceInDays(new Date(), new Date(clockStart))

      if (daysSince < 10) continue

      const { count: postCount } = await supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id)
        .eq('influencer_id', row.influencer_id as string)

      if ((postCount ?? 0) > 0) continue

      const workspace = campaign.workspaces
      let recipientEmail: string | null = null
      let recipientName = 'Team'

      if (workspace.assigned_member_id) {
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
        subject = `[${rawCampaignName}] Follow up with ${rawInfluencerHandle}`
        html = `
          <p>Hi ${escapeHtml(recipientName)},</p>
          <p><strong>${influencerHandle}</strong> hasn't posted yet for the <strong>${campaignName}</strong> campaign (${workspaceName}).</p>
          <p>It's been <strong>${daysSince} days</strong> since the product was sent. Please follow up with them.</p>
          <p style="color:#888;font-size:12px;">This is the first follow-up reminder.</p>
        `
        updateField = { follow_up_1_sent_at: new Date().toISOString() }
      } else if (daysSince >= 13 && follow_up_1_sent_at && !follow_up_2_sent_at) {
        subject = `[${rawCampaignName}] Follow up again with ${rawInfluencerHandle}`
        html = `
          <p>Hi ${escapeHtml(recipientName)},</p>
          <p><strong>${influencerHandle}</strong> still hasn't posted for the <strong>${campaignName}</strong> campaign (${workspaceName}).</p>
          <p>It's been <strong>${daysSince} days</strong> since the product was sent. Your first follow-up may have gotten buried — please try again.</p>
          <p style="color:#888;font-size:12px;">This is the second follow-up reminder.</p>
        `
        updateField = { follow_up_2_sent_at: new Date().toISOString() }
      } else {
        continue
      }

      await sendEmail({ to: recipientEmail, subject, html })

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

  console.log(JSON.stringify({
    processed: rows.length,
    emailsSent,
    ...(errors.length > 0 && { errors }),
  }))
  process.exit(0)
}

main()
