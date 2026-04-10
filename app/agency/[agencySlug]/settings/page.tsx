import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AgencySettingsForm } from '@/components/agency/agency-settings-form'
import type { Agency } from '@/lib/types'

interface PageProps {
  params: Promise<{ agencySlug: string }>
}

export default async function AgencySettingsPage({ params }: PageProps) {
  const { agencySlug } = await params
  const supabase = await createClient()

  const { data: agency } = await supabase
    .from('agencies')
    .select('id, name, slug, owner_id, status, logo_url, drive_folder_id, created_at, google_connected_email')
    .eq('slug', agencySlug)
    .single()

  if (!agency) redirect('/app')

  const connectedEmail = (agency as Agency).google_connected_email ?? null

  return (
    <AgencySettingsForm
      agency={agency as Agency}
      connectedEmail={connectedEmail}
    />
  )
}
