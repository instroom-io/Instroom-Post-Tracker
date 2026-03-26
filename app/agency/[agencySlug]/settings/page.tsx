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
    .select('id, name, slug, owner_id, status, logo_url, created_at')
    .eq('slug', agencySlug)
    .single()

  if (!agency) redirect('/app')

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div>
        <h1 className="text-xl font-bold text-foreground">Agency Settings</h1>
        <p className="text-[12px] text-foreground-lighter mt-1">Slug: {agency.slug}</p>
      </div>
      <div className="rounded-xl border border-border bg-background-surface p-5">
        <AgencySettingsForm agency={agency as Agency} />
      </div>
    </div>
  )
}
