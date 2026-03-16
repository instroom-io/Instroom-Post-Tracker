import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { formatDateRange } from '@/lib/utils'
import type { CampaignStatus } from '@/lib/types'

interface Campaign {
  id: string
  name: string
  status: CampaignStatus
  start_date: string
  end_date: string
  post_count: number
}

interface CampaignsTableProps {
  campaigns: Campaign[]
  workspaceSlug: string
}

const statusVariant: Record<CampaignStatus, 'active' | 'draft' | 'ended'> = {
  active: 'active',
  draft: 'draft',
  ended: 'ended',
}

export function CampaignsTable({ campaigns, workspaceSlug }: CampaignsTableProps) {
  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="text-4xl">📢</div>
        <p className="font-display text-[15px] font-bold text-foreground">
          No campaigns yet
        </p>
        <p className="max-w-xs text-[13px] text-foreground-lighter">
          Create your first campaign to start tracking influencer posts.
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
              Campaign
            </th>
            <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
              Status
            </th>
            <th className="px-5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
              Posts
            </th>
            <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
              Date range
            </th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign) => (
            <tr
              key={campaign.id}
              className="border-b border-border/50 transition-colors last:border-0 hover:bg-background-muted/30"
            >
              <td className="px-5 py-3">
                <Link
                  href={`/${workspaceSlug}/campaigns/${campaign.id}`}
                  className="text-[12px] font-medium text-foreground hover:text-brand"
                >
                  {campaign.name}
                </Link>
              </td>
              <td className="px-5 py-3">
                <Badge variant={statusVariant[campaign.status]}>
                  {campaign.status}
                </Badge>
              </td>
              <td className="px-5 py-3 text-right text-[12px] text-foreground">
                {campaign.post_count}
              </td>
              <td className="px-5 py-3 text-[12px] text-foreground-lighter">
                {formatDateRange(campaign.start_date, campaign.end_date)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
