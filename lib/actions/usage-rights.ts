'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function toggleUsageRights(
  campaignInfluencerId: string,
  value: boolean
): Promise<{ error: string } | void> {
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

  revalidatePath('/', 'layout')
}
