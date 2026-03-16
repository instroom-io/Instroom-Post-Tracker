import { createClient } from '@/lib/supabase/server'
import { formatNumber, formatEMV } from '@/lib/utils'

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

  const totalEmv = (emvData ?? []).reduce((sum, m) => sum + (m.emv ?? 0), 0)

  const stats = [
    {
      label: 'Total posts',
      value: formatNumber(totalPosts ?? 0),
      sub: 'detected via Ensemble',
    },
    {
      label: 'Downloads',
      value: formatNumber(downloadedPosts ?? 0),
      sub: `of ${totalPosts ?? 0} posts`,
    },
    {
      label: 'Total EMV',
      value: formatEMV(totalEmv),
      sub: 'estimated media value',
    },
    {
      label: 'Active campaigns',
      value: formatNumber(activeCampaigns ?? 0),
      sub: 'currently tracking',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-border bg-background-surface p-4 shadow-sm"
        >
          <p className="text-[12px] font-medium text-foreground-lighter">
            {stat.label}
          </p>
          <p className="mt-1 font-display text-[22px] font-extrabold text-foreground">
            {stat.value}
          </p>
          <p className="mt-0.5 text-[11px] text-foreground-muted">{stat.sub}</p>
        </div>
      ))}
    </div>
  )
}
