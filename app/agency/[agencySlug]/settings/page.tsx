import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ agencySlug: string }>
}

export default async function AgencySettingsPage({ params }: PageProps) {
  const { agencySlug } = await params
  const supabase = await createClient()

  const { data: agency } = await supabase
    .from('agencies')
    .select('id, name, slug, logo_url')
    .eq('slug', agencySlug)
    .single()

  if (!agency) redirect('/app')

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <h1 className="text-xl font-bold text-foreground">Agency Settings</h1>
      <div className="rounded-xl border border-border bg-background-surface p-5">
        <p className="text-sm font-semibold text-foreground mb-1">{agency.name}</p>
        <p className="text-[11px] text-muted-foreground">Slug: {agency.slug}</p>
        <p className="mt-4 text-xs text-muted-foreground">Full settings editing coming soon.</p>
      </div>
    </div>
  )
}
