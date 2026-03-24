'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function toggleUsageRights(
  campaignInfluencerId: string,
  value: boolean
): Promise<{ error: string } | { unblocked: number } | void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('campaign_influencers')
    .update({
      usage_rights: value,
      usage_rights_updated_at: new Date().toISOString(),
    })
    .eq('id', campaignInfluencerId)

  if (error) return { error: 'Failed to update usage rights.' }

  // When turning ON: unblock any posts that were blocked due to missing usage rights
  // and re-enqueue them for download
  if (value === true) {
    const { data: ci } = await supabase
      .from('campaign_influencers')
      .select('campaign_id, influencer_id')
      .eq('id', campaignInfluencerId)
      .single()

    if (ci) {
      const { data: unblocked } = await supabase
        .from('posts')
        .update({ download_status: 'pending', blocked_reason: null })
        .eq('campaign_id', ci.campaign_id)
        .eq('influencer_id', ci.influencer_id)
        .eq('download_status', 'blocked')
        .eq('blocked_reason', 'no_usage_rights')
        .select('id')

      if (unblocked && unblocked.length > 0) {
        await supabase.from('retry_queue').insert(
          unblocked.map((p) => ({ post_id: p.id, job_type: 'download', status: 'pending' }))
        )
        revalidatePath('/', 'layout')
        return { unblocked: unblocked.length }
      }
    }
  }

  revalidatePath('/', 'layout')
}
