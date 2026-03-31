import { Layers, HardDriveDownload, TrendingUp, Megaphone } from 'lucide-react'
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
      label: 'Total posts',
      value: formatNumber(totalPosts ?? 0),
      sub: 'detected via Ensemble',
      icon: Layers,
      iconBg: 'bg-brand/10',
      iconColor: 'text-brand',
    },
    {
      label: 'Downloads',
      value: formatNumber(downloadedPosts ?? 0),
      sub: totalPosts
        ? `${downloadRate}% of ${totalPosts} downloaded`
        : 'no posts yet',
      icon: HardDriveDownload,
      iconBg: 'bg-info/10',
      iconColor: 'text-info',
    },
    {
      label: 'Total EMV',
      value: formatEMV(totalEmv),
      sub: 'estimated media value',
      icon: TrendingUp,
      iconBg: 'bg-warning/10',
      iconColor: 'text-warning',
    },
    {
      label: 'Active campaigns',
      value: formatNumber(activeCampaigns ?? 0),
      sub: 'currently tracking',
      icon: Megaphone,
      iconBg: 'bg-brand/10',
      iconColor: 'text-brand',
    },
  ]

  const delayClasses = ['', 'animate-fade-up-delay-1', 'animate-fade-up-delay-2', 'animate-fade-up-delay-3']

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className={`animate-fade-up rounded-xl border border-border bg-background-surface p-4 shadow-md ${delayClasses[i] ?? ''}`}
        >
          <div className="flex items-start justify-between">
            <p className="text-[12px] font-medium text-foreground-lighter">
              {stat.label}
            </p>
            <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg', stat.iconBg)}>
              <stat.icon size={14} className={stat.iconColor} />
            </div>
          </div>
          <p className="mt-2 font-display text-[22px] font-extrabold text-foreground">
            {stat.value}
          </p>
          <p className="mt-0.5 text-[11px] text-foreground-muted">{stat.sub}</p>
        </div>
      ))}
    </div>
  )
}
