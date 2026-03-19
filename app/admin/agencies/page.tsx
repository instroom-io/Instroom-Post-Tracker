import { AgenciesTable } from '@/components/admin/agencies-table'
import { getAgencies } from '@/lib/actions/agencies'

export default async function AdminAgenciesPage() {
  const agencies = await getAgencies()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-foreground">All Agencies</h1>
      <AgenciesTable agencies={agencies} />
    </div>
  )
}
