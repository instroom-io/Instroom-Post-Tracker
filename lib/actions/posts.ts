'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { updateCollabStatusSchema } from '@/lib/validations'
import type { CollabStatus } from '@/lib/types'

export async function updateCollabStatus(
  postId: string,
  status: CollabStatus
): Promise<{ error: string } | void> {
  const parsed = updateCollabStatusSchema.safeParse({ post_id: postId, status })
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('posts')
    .update({
      collab_status: status,
      collab_checked_by: user.id,
    })
    .eq('id', postId)

  if (error) return { error: 'Failed to update collab status.' }

  revalidatePath('/', 'layout')
}

export async function retryDownload(
  _postId: string
): Promise<{ error: string } | void> {
  // v2 feature — stub
  return { error: 'Manual retry is coming in v2.' }
}
