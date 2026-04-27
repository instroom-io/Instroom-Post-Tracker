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

  // 4. Fetch all user memberships for workspace switcher + agency back-link (parallel)
  // Agency is always looked up by the current user's ownership so the "Team" row in the
  // workspace switcher appears even when they are viewing a shared solo-brand workspace.
  // Billing is sourced from the agency only for workspaces the agency actually owns.
  const accountType = workspace.account_type
  const [{ data: allMemberships }, { data: agency }] = await Promise.all([
    supabase
      .from('workspace_members')
      .select('role, workspaces(id, name, slug, logo_url, drive_folder_id, drive_connection_type, drive_oauth_token, created_at)')
      .eq('user_id', user.id),
    workspace.agency_id
      ? supabase
          .from('agencies')
          .select('id, name, slug, logo_url, plan, trial_ends_at')
          .eq('id', workspace.agency_id)
          .eq('owner_id', user.id)
          .maybeSingle()
      : supabase
          .from('agencies')
          .select('id, name, slug, logo_url, plan, trial_ends_at')
          .eq('owner_id', user.id)
          .maybeSingle(),
  ])

  // Use agency billing only when this workspace is actually owned/billed by the agency.
  // Shared solo-brand workspaces retain their own plan regardless of who is viewing them.
  const isAgencyBilledWorkspace = !!workspace.agency_id || accountType === 'team'
  const agencyBilling = isAgencyBilledWorkspace
    ? agency as typeof agency & { plan?: PlanType; trial_ends_at?: string | null } | null
    : null
  const workspacePlan = workspace.plan ?? 'free'
  const effectivePlan: PlanType = agencyBilling?.plan ?? workspacePlan
  const effectiveDaysRemaining = agencyBilling
    ? computeDaysRemaining(agencyBilling.trial_ends_at ?? null)
    : computeDaysRemaining(workspace.trial_ends_at ?? null)

  // 5. Hard-gate: if trial expired past grace period, send to /account/upgrade
  if (effectivePlan === 'free' && effectiveDaysRemaining < -3) {
    redirect(`/account/upgrade`)
  }

  return (
    <AppShell
      user={user}
      currentWorkspace={workspace as Workspace}
      currentRole={membership.role as WorkspaceRole}
      allMemberships={(allMemberships ?? []) as unknown as Array<{ role: WorkspaceRole; workspaces: Workspace }>}
      workspaceSlug={workspace.slug}
      agency={agency ?? null}
      plan={effectivePlan}
      daysRemaining={effectiveDaysRemaining}
    >
      {children}
    </AppShell>
  )
}
