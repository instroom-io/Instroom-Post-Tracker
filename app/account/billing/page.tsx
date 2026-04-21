import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AccountBillingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/account/billing')

  const { data: memberships } = await supabase
    .from('workspace_members')
    .select('workspace_id, workspaces(slug)')
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .order('joined_at', { ascending: true })
    .limit(1)

  type WorkspaceRow = { slug: string }
  const ws = (memberships?.[0]?.workspaces as unknown as WorkspaceRow | null) ?? null

  if (!ws) redirect('/account/upgrade')
  redirect(`/${ws.slug}/settings?tab=billing`)
}
