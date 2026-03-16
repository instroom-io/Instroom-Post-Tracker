'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { updateEmvConfigSchema } from '@/lib/validations'
import type { Platform } from '@/lib/types'

export async function updateEmvConfig(
  workspaceId: string,
  platform: Platform,
  cpmRate: number
): Promise<{ error: string } | void> {
  const parsed = updateEmvConfigSchema.safeParse({ workspace_id: workspaceId, platform, cpm_rate: cpmRate })
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!member || !['owner', 'admin'].includes(member.role)) {
    return { error: 'Only admins and owners can update EMV config.' }
  }

  const { error } = await supabase
    .from('emv_config')
    .update({ cpm_rate: cpmRate, updated_at: new Date().toISOString() })
    .eq('workspace_id', workspaceId)
    .eq('platform', platform)

  if (error) return { error: 'Failed to update EMV config.' }

  revalidatePath('/', 'layout')
}
