import { BarChart2 } from 'lucide-react'
import { formatNumber, formatEMV, formatPercent } from '@/lib/utils'

interface LeaderboardRow {
  rank: number
  handle: string
  fullName: string
  posts: number
  totalViews: number
  avgEr: number
  totalEmv: number
}

interface InfluencerLeaderboardProps {
  rows: LeaderboardRow[]
}

export function InfluencerLeaderboard({ rows }: InfluencerLeaderboardProps) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background-muted">
          <BarChart2 size={18} className="text-foreground-muted" />
        </div>
        <p className="font-display text-[14px] font-bold text-foreground">No data yet</p>
        <p className="max-w-xs text-[13px] text-foreground-lighter">
          Influencer rankings appear once posts have metrics.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-foreground-muted w-8">
              #
            </th>
            <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
              Influencer
            </th>
            <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
              Posts
            </th>
            <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
              Views
            </th>
            <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
              Avg ER
            </th>
            <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
              EMV
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.fullName}
              className="border-b border-border/50 last:border-0 hover:bg-background-muted/30 transition-colors"
            >
              <td className="px-4 py-3 text-[11px] font-bold text-foreground-muted">
                {row.rank}
              </td>
              <td className="px-4 py-3">
                <p className="text-[12px] font-medium text-foreground">{row.fullName}</p>
                {row.handle && (
                  <p className="text-[11px] text-foreground-lighter">@{row.handle}</p>
                )}
              </td>
              <td className="px-4 py-3 text-right text-[12px] text-foreground">
                {row.posts}
              </td>
              <td className="px-4 py-3 text-right text-[12px] text-foreground">
                {formatNumber(row.totalViews)}
              </td>
              <td className="px-4 py-3 text-right text-[12px] text-foreground">
                {formatPercent(row.avgEr)}
              </td>
              <td className="px-4 py-3 text-right text-[12px] font-semibold text-foreground">
                {formatEMV(row.totalEmv)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
