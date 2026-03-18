import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AppPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Find user's most recent workspace membership
  const { data: memberships } = await supabase
    .from('workspace_members')
    .select('workspace_id, workspaces(slug)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })
    .limit(1)

  if (memberships && memberships.length > 0) {
    const workspace = memberships[0].workspaces as unknown as { slug: string } | null
    if (workspace?.slug) {
      redirect(`/${workspace.slug}/overview`)
    }
  }

  redirect('/no-access')
}
