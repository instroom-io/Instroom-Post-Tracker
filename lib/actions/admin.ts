// lib/actions/admin.ts
'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const setWorkspacePlanSchema = z.object({
  workspaceId: z.string().uuid(),
  plan: z.enum(['trial', 'free', 'pro']),
  quota: z.number().int().positive().optional(),
})

export async function setWorkspacePlan(
  workspaceId: string,
  plan: string,
  quota?: number
): Promise<{ error: string } | void> {
  const parsed = setWorkspacePlanSchema.safeParse({ workspaceId, plan, quota })
  if (!parsed.success) return { error: parsed.error.errors[0].message }

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
  const updates: Record<string, unknown> = { plan: parsed.data.plan }
  if (parsed.data.quota !== undefined) updates.workspace_quota = parsed.data.quota

  const { error } = await serviceClient.from('workspaces').update(updates).eq('id', parsed.data.workspaceId)

  if (error) return { error: 'Failed to update plan.' }

  revalidatePath('/admin', 'layout')
}
