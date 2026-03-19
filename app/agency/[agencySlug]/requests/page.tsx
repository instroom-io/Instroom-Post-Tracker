import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BrandRequestsTable } from '@/components/agency/brand-requests-table'

interface PageProps {
  params: Promise<{ agencySlug: string }>
}

export default async function AgencyRequestsPage({ params }: PageProps) {
  const { agencySlug } = await params
  const supabase = await createClient()

  const { data: agency } = await supabase
    .from('agencies')
    .select('id')
    .eq('slug', agencySlug)
    .single()

  if (!agency) redirect('/app')

  const { data: requests } = await supabase
    .from('brand_requests')
    .select('*')
    .eq('agency_id', agency.id)
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-foreground">Brand Requests</h1>
      <BrandRequestsTable requests={requests ?? []} agencySlug={agencySlug} />
    </div>
  )
}
