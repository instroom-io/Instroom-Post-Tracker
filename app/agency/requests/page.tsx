import { Suspense } from 'react'
import { getBrandRequests } from '@/lib/actions/brand-requests'
import { PageHeader } from '@/components/layout/page-header'
import { BrandRequestsTable } from '@/components/agency/brand-requests-table'
import { BrandRequestsTableSkeleton } from '@/components/agency/brand-requests-table-skeleton'

export const metadata = {
  title: 'Brand Requests — Instroom',
}

async function BrandRequestsData() {
  const requests = await getBrandRequests()
  return <BrandRequestsTable requests={requests} agencySlug="" />
}

export default function AgencyRequestsPage() {
  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Brand Requests"
        description="Review and manage incoming brand connection requests."
      />
      <Suspense fallback={<BrandRequestsTableSkeleton />}>
        <BrandRequestsData />
      </Suspense>
    </div>
  )
}
