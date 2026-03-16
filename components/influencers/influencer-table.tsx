'use client'

import { useTransition } from 'react'
import { MoreHorizontal, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { getInitials } from '@/lib/utils'

interface InfluencerRow {
  id: string
  full_name: string
  ig_handle: string | null
  tiktok_handle: string | null
  youtube_handle: string | null
  campaign_count: number
}

interface InfluencerTableProps {
  influencers: InfluencerRow[]
  canEdit: boolean
  onRemove?: (influencerId: string) => Promise<void>
}

export function InfluencerTable({ influencers, canEdit, onRemove }: InfluencerTableProps) {
  const [isPending, startTransition] = useTransition()

  if (influencers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <div className="text-4xl">👥</div>
        <p className="font-display text-[15px] font-bold text-foreground">
          No influencers added
        </p>
        <p className="max-w-xs text-[13px] text-foreground-lighter">
          Add influencers to your workspace to start managing their campaigns.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
              Influencer
            </th>
            <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
              Instagram
            </th>
            <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
              TikTok
            </th>
            <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
              YouTube
            </th>
            <th className="px-5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
              Campaigns
            </th>
            {canEdit && <th className="w-10 px-5 py-2.5" />}
          </tr>
        </thead>
        <tbody>
          {influencers.map((inf) => (
            <tr
              key={inf.id}
              className="border-b border-border/50 transition-colors last:border-0 hover:bg-background-muted/30"
            >
              <td className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-muted text-[11px] font-bold text-brand">
                    {getInitials(inf.full_name)}
                  </div>
                  <p className="text-[12px] font-medium text-foreground">
                    {inf.full_name}
                  </p>
                </div>
              </td>
              <td className="px-5 py-3 text-[12px] text-foreground-lighter">
                {inf.ig_handle ? `@${inf.ig_handle}` : '—'}
              </td>
              <td className="px-5 py-3 text-[12px] text-foreground-lighter">
                {inf.tiktok_handle ? `@${inf.tiktok_handle}` : '—'}
              </td>
              <td className="px-5 py-3 text-[12px] text-foreground-lighter">
                {inf.youtube_handle ? `@${inf.youtube_handle}` : '—'}
              </td>
              <td className="px-5 py-3 text-right text-[12px] text-foreground">
                {inf.campaign_count}
              </td>
              {canEdit && (
                <td className="px-3 py-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <button
                        type="button"
                        className="rounded-md p-1 text-foreground-muted transition-colors hover:bg-background-muted hover:text-foreground"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => {
                          if (!onRemove) return
                          startTransition(async () => {
                            await onRemove(inf.id)
                            toast.success(`${inf.full_name} removed`)
                          })
                        }}
                        disabled={isPending}
                      >
                        <Trash2 size={13} />
                        Remove from workspace
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
