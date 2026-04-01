'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { updateCollabStatusSchema } from '@/lib/validations'
import { getFreshAccessToken } from '@/lib/google/tokens'
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

export async function savePostToUserDrive(
  postId: string,
  workspaceId: string
): Promise<{ url: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const accessToken = await getFreshAccessToken(user.id)
  if (!accessToken) return { error: 'connect_required' }

  const [{ data: post }, { data: member }] = await Promise.all([
    supabase
      .from('posts')
      .select('drive_file_id')
      .eq('id', postId)
      .eq('workspace_id', workspaceId)
      .single(),
    supabase
      .from('workspace_members')
      .select('drive_folder_id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single(),
  ])

  if (!post?.drive_file_id) return { error: 'not_downloaded' }

  const copyBody: Record<string, unknown> = {}
  if (member?.drive_folder_id) {
    copyBody.parents = [member.drive_folder_id]
  }

  const copyRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${post.drive_file_id}/copy`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(copyBody),
    }
  )

  if (!copyRes.ok) {
    console.error('[savePostToUserDrive] Drive copy error:', await copyRes.text())
    return { error: 'Failed to save to Google Drive. Please try again.' }
  }

  const copied = await copyRes.json() as { id: string }
  return { url: `https://drive.google.com/file/d/${copied.id}/view` }
}
