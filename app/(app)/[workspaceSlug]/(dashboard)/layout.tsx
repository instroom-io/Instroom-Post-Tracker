import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/app-shell'
import { computeDaysRemaining } from '@/lib/billing/trial-state'
import type { Workspace, WorkspaceRole, PlanType } from '@/lib/types'

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ workspaceSlug: string }>
}

export default async function DashboardLayout({ children, params }: LayoutProps) {
  const { workspaceSlug } = await params
  const supabase = await createClient()

  // 1. Verify auth
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirectTo=/${workspaceSlug}/overview`)

  // 2. Look up workspace by slug
  const { data: workspaceRaw } = await supabase
    .from('workspaces')
    .select('id, name, slug, logo_url, agency_id, drive_folder_id, drive_connection_type, drive_oauth_token, created_at, plan, trial_ends_at, account_type, workspace_quota')
    .eq('slug', workspaceSlug)
    .single()

  if (!workspaceRaw) redirect('/app')

  // Cast once to include billing columns (added in migrations 0031–0033, pending type regen)
  const workspace = workspaceRaw as typeof workspaceRaw & {
    plan: PlanType
    trial_ends_at: string | null
    account_type: string | null
  }

  // 3. Verify membership + get role
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspace.id)
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/app')

  // 4. Hard-gate: if trial expired past grace period, send to /account/upgrade
  const plan = workspace.plan ?? 'free'
  const trialEndsAt = workspace.trial_ends_at ?? null
  const daysRemaining = computeDaysRemaining(trialEndsAt)
  if (plan === 'free' && daysRemaining < -3) {
    redirect(`/account/upgrade`)
  }

  // 5. Fetch all user memberships for workspace switcher + agency back-link (parallel)
  const accountType = workspace.account_type
  const [{ data: allMemberships }, { data: agency }] = await Promise.all([
    supabase
      .from('workspace_members')
      .select('role, workspaces(id, name, slug, logo_url, drive_folder_id, drive_connection_type, drive_oauth_token, created_at)')
      .eq('user_id', user.id),
    workspace.agency_id
      ? supabase
          .from('agencies')
          .select('id, name, slug, logo_url')
          .eq('id', workspace.agency_id)
          .eq('owner_id', user.id)
          .maybeSingle()
      : accountType === 'team'
        ? supabase
            .from('agencies')
            .select('id, name, slug, logo_url')
            .eq('owner_id', user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
  ])

  return (
    <AppShell
      user={user}
      currentWorkspace={workspace as Workspace}
      currentRole={membership.role as WorkspaceRole}
      allMemberships={(allMemberships ?? []) as unknown as Array<{ role: WorkspaceRole; workspaces: Workspace }>}
      workspaceSlug={workspace.slug}
      agency={agency ?? null}
      plan={plan}
      daysRemaining={daysRemaining}
    >
      {children}
    </AppShell>
  )
}
