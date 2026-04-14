// lib/actions/admin.ts
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { PlanType } from '@/lib/utils/plan'

export async function setWorkspacePlan(
  workspaceId: string,
  plan: PlanType,
  quota?: number
): Promise<{ error: string } | void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRecord } = await supabase
    .from('users')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!userRecord?.is_platform_admin) return { error: 'Unauthorized.' }

  const serviceClient = createServiceClient()
  const updates: Record<string, unknown> = { plan }
  if (quota !== undefined) updates.workspace_quota = quota

  const { error } = await serviceClient.from('workspaces').update(updates).eq('id', workspaceId)

  if (error) return { error: 'Failed to update plan.' }

  revalidatePath('/admin', 'layout')
}
