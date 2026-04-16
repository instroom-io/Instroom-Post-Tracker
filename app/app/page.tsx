import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AppPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Case 1: Platform admin
  const { data: profile } = await supabase
    .from('users')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  if (profile?.is_platform_admin) redirect('/admin')

  // Case 2: Team/agency owner
  const { data: agency } = await supabase
    .from('agencies')
    .select('slug')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (agency) redirect(`/agency/${agency.slug}/dashboard`)

  // Case 3: Workspace member
  const { data: memberships } = await supabase
    .from('workspace_members')
    .select('role, workspace_id, workspaces(slug)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })

  if (memberships && memberships.length > 0) {
    const workspace = memberships[0].workspaces as unknown as { slug: string } | null
    if (workspace?.slug) redirect(`/${workspace.slug}/overview`)
  }

  redirect('/no-access')
}
