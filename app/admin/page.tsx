import { Suspense } from 'react'
import { AdminStatCards } from '@/components/admin/admin-stat-cards'
import { AgencyRequestsTable } from '@/components/admin/agency-requests-table'
import { AgenciesTable } from '@/components/admin/agencies-table'
import { getAgencyRequests, getAgencies } from '@/lib/actions/agencies'

export default async function AdminPage() {
  const [pendingRequests, agencies] = await Promise.all([
    getAgencyRequests('pending'),
    getAgencies(),
  ])

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold text-foreground">Platform Overview</h1>
        <p className="text-sm text-muted-foreground">Instroom Admin · {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
      </div>

      <Suspense fallback={<div className="h-24 animate-pulse rounded-xl bg-background-surface" />}>
        <AdminStatCards />
      </Suspense>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-background-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Pending Agency Requests</h2>
            {pendingRequests.length > 0 && (
              <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-white">
                {pendingRequests.length}
              </span>
            )}
          </div>
          <AgencyRequestsTable requests={pendingRequests} />
        </div>

        <div className="rounded-xl border border-border bg-background-surface p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Active Agencies</h2>
          <AgenciesTable agencies={agencies.filter((a) => a.status === 'active')} />
        </div>
      </div>
    </div>
  )
}
