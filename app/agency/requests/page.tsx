import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getBrandRequests } from '@/lib/actions/brand-requests'
import { PageHeader } from '@/components/layout/page-header'
import { BrandRequestsTable } from '@/components/agency/brand-requests-table'
import { BrandRequestsTableSkeleton } from '@/components/agency/brand-requests-table-skeleton'

export const metadata = {
  title: 'Brand Requests — Instroom',
}

async function BrandRequestsData() {
  const requests = await getBrandRequests()
  return <BrandRequestsTable requests={requests} />
}

export default async function AgencyRequestsPage() {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Agency check: user must be an owner of at least one workspace
  const { data: ownerMemberships } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .limit(1)

  if (!ownerMemberships || ownerMemberships.length === 0) {
    redirect('/app')
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <PageHeader
          title="Brand Requests"
          description="Review and manage incoming brand connection requests."
        />
        <div className="mt-6">
          <Suspense fallback={<BrandRequestsTableSkeleton />}>
            <BrandRequestsData />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
