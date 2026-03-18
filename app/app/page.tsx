import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AppPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Find user's workspace memberships with role
  const { data: memberships } = await supabase
    .from('workspace_members')
    .select('role, workspace_id, workspaces(slug)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })

  if (memberships && memberships.length > 0) {
    // Agency admin (owner) → always goes to agency portal
    const ownerMembership = memberships.find((m) => m.role === 'owner')
    if (ownerMembership) {
      redirect('/agency/requests')
    }

    // Team member (non-owner) → go to their most recent workspace
    const workspace = memberships[0].workspaces as unknown as { slug: string } | null
    if (workspace?.slug) {
      redirect(`/${workspace.slug}/overview`)
    }
  }

  // No memberships: check if this is the agency admin email
  // Agency admin before their first workspace → agency portal
  // Anyone else with no memberships → no-access
  const adminEmail = process.env.ADMIN_EMAIL
  if (adminEmail && user.email?.toLowerCase() === adminEmail.toLowerCase()) {
    redirect('/agency/requests')
  }
  redirect('/no-access')
}
