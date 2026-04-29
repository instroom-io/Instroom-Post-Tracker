'use client'

import { motion } from 'framer-motion'
import { ChartBar } from '@phosphor-icons/react/dist/ssr'
import { formatNumber, formatEMV, formatPercent } from '@/lib/utils'
import { cn } from '@/lib/utils'

const rowVariant = {
  hidden: { opacity: 0, y: 4 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const, delay: i * 0.04 },
  }),
}

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

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-warning/15 text-[10px] font-bold text-warning">
        1
      </span>
    )
  if (rank === 2)
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-foreground/[0.08] text-[10px] font-bold text-foreground-lighter">
        2
      </span>
    )
  if (rank === 3)
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-foreground/[0.05] text-[10px] font-bold text-foreground-light">
        3
      </span>
    )
  return <span className="text-[11px] text-foreground-muted">{rank}</span>
}

export function InfluencerLeaderboard({ rows }: InfluencerLeaderboardProps) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background-muted">
          <ChartBar size={18} className="text-foreground-muted" />
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
        <caption className="sr-only">Influencer performance leaderboard ranked by EMV</caption>
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="w-8 px-4 py-2.5 text-left text-[11px] font-semibold text-foreground-lighter">
              #
            </th>
            <th scope="col" className="px-4 py-2.5 text-left text-[11px] font-semibold text-foreground-lighter">
              Influencer
            </th>
            <th scope="col" className="px-4 py-2.5 text-right text-[11px] font-semibold text-foreground-lighter">
              Posts
            </th>
            <th scope="col" className="px-4 py-2.5 text-right text-[11px] font-semibold text-foreground-lighter">
              Views
            </th>
            <th scope="col" className="px-4 py-2.5 text-right text-[11px] font-semibold text-foreground-lighter">
              Avg ER
            </th>
            <th scope="col" className="px-4 py-2.5 text-right text-[11px] font-semibold text-foreground-lighter">
              EMV
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <motion.tr
              key={row.fullName}
              custom={i}
              variants={rowVariant}
              initial="hidden"
              animate="show"
              className={cn(
                'border-b border-border/50 last:border-0 transition-colors hover:bg-background-muted/30',
                row.rank === 1 && 'bg-warning/[0.03]'
              )}
            >
              <td className="px-4 py-3">
                <RankBadge rank={row.rank} />
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
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
