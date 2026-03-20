import { createServiceClient } from '@/lib/supabase/server'

export async function AdminStatCards() {
  const supabase = createServiceClient()

  const [
    { count: agencyCount },
    { count: brandCount },
    { count: postCount },
    { data: emvRows },
  ] = await Promise.all([
    supabase.from('agencies').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('workspaces').select('*', { count: 'exact', head: true }),
    supabase.from('posts').select('*', { count: 'exact', head: true }),
    supabase.from('post_metrics').select('emv').not('emv', 'is', null),
  ])

  const totalEmv = (emvRows ?? []).reduce((sum, r) => sum + (r.emv ?? 0), 0)
  const formattedEmv = totalEmv >= 1000
    ? `€${(totalEmv / 1000).toFixed(1)}K`
    : `€${totalEmv.toFixed(0)}`

  const stats = [
    { label: 'Active Agencies', value: agencyCount ?? 0 },
    { label: 'Brand Clients', value: brandCount ?? 0 },
    { label: 'Posts Downloaded', value: (postCount ?? 0).toLocaleString() },
    { label: 'Platform EMV', value: formattedEmv },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map((stat, i) => (
        <div key={stat.label} className={`rounded-xl border border-border bg-background-surface p-4 shadow-md animate-fade-up animate-fade-up-delay-${i + 1}`}>
          <p className="text-[11px] uppercase tracking-wide text-foreground-muted">{stat.label}</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
        </div>
      ))}
    </div>
  )
}
