import { createClient } from '@/lib/supabase/server'
import { formatNumber, formatEMV } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface StatCardsProps {
  workspaceId: string
}

export async function StatCards({ workspaceId }: StatCardsProps) {
  const supabase = await createClient()

  const [
    { count: totalPosts },
    { count: downloadedPosts },
    { count: activeCampaigns },
    { data: emvData },
  ] = await Promise.all([
    supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId),
    supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('download_status', 'downloaded'),
    supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'active'),
    supabase
      .from('post_metrics')
      .select('emv')
      .eq('workspace_id', workspaceId),
  ])

  const totalEmv = (emvData ?? []).reduce((sum, m) => sum + Number(m.emv ?? 0), 0)

  const downloadRate =
    totalPosts && totalPosts > 0
      ? Math.round(((downloadedPosts ?? 0) / totalPosts) * 100)
      : 0

  const stats = [
    {
      label: 'Posts detected',
      value: formatNumber(totalPosts ?? 0),
      sub: totalPosts ? `across all campaigns` : 'none yet',
      accentColor: 'bg-brand',
      tourId: undefined,
    },
    {
      label: 'Downloaded',
      value: formatNumber(downloadedPosts ?? 0),
      sub: totalPosts ? `${downloadRate}% of ${totalPosts}` : 'no posts yet',
      accentColor: 'bg-info',
      tourId: 'ws-usage-rights',
    },
    {
      label: 'Total EMV',
      value: formatEMV(totalEmv),
      sub: 'estimated media value',
      accentColor: 'bg-warning',
      tourId: undefined,
    },
    {
      label: 'Active campaigns',
      value: formatNumber(activeCampaigns ?? 0),
      sub: activeCampaigns ? `running now` : 'none active',
      accentColor: 'bg-accent',
      tourId: undefined,
    },
  ]

  const delayClasses = ['', 'animate-fade-up-delay-1', 'animate-fade-up-delay-2', 'animate-fade-up-delay-3']

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          {...(stat.tourId ? { 'data-tour': stat.tourId } : {})}
          className={cn(
            'animate-fade-up rounded-xl border border-border bg-background-surface p-4 shadow-sm',
            delayClasses[i] ?? ''
          )}
        >
          <div className={cn('mb-3 h-0.5 w-8 rounded-full', stat.accentColor)} />
          <p className="text-[12px] font-medium text-foreground-lighter">{stat.label}</p>
          <p className="mt-1 font-display text-[24px] font-extrabold tracking-tight text-foreground tabular-nums">
            {stat.value}
          </p>
          <p className="mt-0.5 text-[11px] text-foreground-muted">{stat.sub}</p>
        </div>
      ))}
    </div>
  )
}
