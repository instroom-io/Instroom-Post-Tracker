import { UsersThree, Buildings, HardDrives, TrendUp } from '@phosphor-icons/react/dist/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'

export async function AdminStatCards() {
  const supabase = createServiceClient()

  const [
    { count: userCount },
    { count: workspaceCount },
    { count: postCount },
    { data: emvRows },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('workspaces').select('*', { count: 'exact', head: true }),
    supabase.from('posts').select('*', { count: 'exact', head: true }),
    supabase.from('post_metrics').select('emv').not('emv', 'is', null),
  ])

  const totalEmv = (emvRows ?? []).reduce((sum, r) => sum + (r.emv ?? 0), 0)
  const formattedEmv = totalEmv >= 1000
    ? `€${(totalEmv / 1000).toFixed(1)}K`
    : `€${totalEmv.toFixed(0)}`

  const stats = [
    {
      label: 'Total Users',
      value: userCount ?? 0,
      sub: 'registered accounts',
      icon: UsersThree,
      iconBg: 'bg-brand/10',
      iconColor: 'text-brand',
    },
    {
      label: 'Total Workspaces',
      value: workspaceCount ?? 0,
      sub: 'active workspaces',
      icon: Buildings,
      iconBg: 'bg-accent/10',
      iconColor: 'text-accent',
    },
    {
      label: 'Posts Downloaded',
      value: (postCount ?? 0).toLocaleString(),
      sub: 'to Google Drive',
      icon: HardDrives,
      iconBg: 'bg-info/10',
      iconColor: 'text-info',
    },
    {
      label: 'Platform EMV',
      value: formattedEmv,
      sub: 'estimated media value',
      icon: TrendUp,
      iconBg: 'bg-warning/10',
      iconColor: 'text-warning',
    },
  ]

  const delayClasses = ['', 'animate-fade-up-delay-1', 'animate-fade-up-delay-2', 'animate-fade-up-delay-3']

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map((stat, i) => (
        <div key={stat.label} className={`animate-fade-up rounded-xl border border-border bg-background-surface p-4 shadow-md ${delayClasses[i] ?? ''}`}>
          <div className="flex items-start justify-between">
            <p className="text-[12px] font-medium text-foreground-lighter">{stat.label}</p>
            <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg', stat.iconBg)}>
              <stat.icon size={14} weight="duotone" className={stat.iconColor} />
            </div>
          </div>
          <p className="mt-2 font-display text-[22px] font-extrabold text-foreground">{stat.value}</p>
          <p className="mt-0.5 text-[11px] text-foreground-muted">{stat.sub}</p>
        </div>
      ))}
    </div>
  )
}
