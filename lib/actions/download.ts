'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { processPostDownload } from '@/lib/downloads/process-download'

export async function triggerPostDownload(
  postId: string,
  workspaceId: string
): Promise<{ driveUrl: string } | { error: string }> {
  // 1. Auth
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Role check
  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!member || !['owner', 'admin', 'editor'].includes(member.role)) {
    return { error: 'Insufficient permissions.' }
  }

  // 3. Validate post belongs to workspace and is eligible for download
  const { data: post } = await supabase
    .from('posts')
    .select('id, download_status')
    .eq('id', postId)
    .eq('workspace_id', workspaceId)
    .single()

  if (!post) return { error: 'Post not found.' }
  if (!['pending', 'failed'].includes(post.download_status)) {
    return { error: 'Post is not available for download.' }
  }

  // 4. Process download (service client needed for Drive + EnsembleData)
  try {
    const serviceClient = createServiceClient()
    const result = await processPostDownload(serviceClient, postId)

    revalidatePath('/', 'layout')
    return { driveUrl: `https://drive.google.com/file/d/${result.driveFileId}/view` }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Download failed.'
    return { error: message }
  }
}
