import { Suspense } from 'react'
import { AdminStatCards } from '@/components/admin/admin-stat-cards'
import { AgenciesTable } from '@/components/admin/agencies-table'
import { WorkspacesTable } from '@/components/admin/workspaces-table'
import { getAgencies } from '@/lib/actions/agencies'
import { createClient } from '@/lib/supabase/server'

export default async function AdminPage() {
  const supabase = await createClient()

  const [agencies, { data: workspacesRaw }] = await Promise.all([
    getAgencies(),
    supabase
      .from('workspaces')
      .select('id, name, slug, plan, workspace_quota, account_type, trial_ends_at, workspace_members(user_id, role, users(email))')
      .order('created_at', { ascending: false }),
  ])

  // Flatten to extract owner email
  const workspaces = (workspacesRaw ?? []).map((ws) => {
    const members = (ws.workspace_members ?? []) as unknown as Array<{
      user_id: string
      role: string
      users: { email: string } | null
    }>
    const ownerEmail = members.find((m) => m.role === 'owner')?.users?.email ?? null
    return {
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      plan: (ws.plan ?? 'free') as 'trial' | 'free' | 'pro',
      workspace_quota: ws.workspace_quota,
      account_type: ws.account_type ?? 'team',
      trial_ends_at: ws.trial_ends_at,
      owner_email: ownerEmail,
    }
  })

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold text-foreground">Platform Overview</h1>
        <p className="text-[13px] text-foreground-lighter">Instroom Admin · {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
      </div>

      <Suspense fallback={<div className="h-24 skeleton rounded-xl" />}>
        <AdminStatCards />
      </Suspense>

      <div className="rounded-xl border border-border bg-background-surface p-5">
        <h2 className="mb-4 text-[14px] font-semibold text-foreground">Active Agencies</h2>
        <AgenciesTable agencies={agencies.filter((a) => a.status === 'active')} />
      </div>

      <div className="rounded-xl border border-border bg-background-surface p-5">
        <h2 className="mb-4 text-[14px] font-semibold text-foreground">Workspaces &amp; Plans</h2>
        <WorkspacesTable workspaces={workspaces} />
      </div>
    </div>
  )
}
