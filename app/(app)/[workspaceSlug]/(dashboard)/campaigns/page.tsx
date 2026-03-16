import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { CreateCampaignDialog } from '@/components/campaigns/create-campaign-dialog'
import { formatDateRange } from '@/lib/utils'
import type { WorkspaceRole, CampaignStatus } from '@/lib/types'

interface PageProps {
  params: Promise<{ workspaceSlug: string }>
}

const statusVariant: Record<CampaignStatus, 'active' | 'draft' | 'ended'> = {
  active: 'active',
  draft: 'draft',
  ended: 'ended',
}

export default async function CampaignsPage({ params }: PageProps) {
  const { workspaceSlug } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, name')
    .eq('slug', workspaceSlug)
    .single()
  if (!workspace) redirect('/app')

  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspace.id)
    .eq('user_id', user.id)
    .single()

  const role = (member?.role ?? 'viewer') as WorkspaceRole
  const canEdit = ['owner', 'admin', 'editor'].includes(role)

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name, status, start_date, end_date, platforms')
    .eq('workspace_id', workspace.id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <PageHeader
        title="Campaigns"
        actions={
          canEdit ? (
            <CreateCampaignDialog workspaceId={workspace.id} />
          ) : undefined
        }
      />

      <div className="p-5">
        <div className="rounded-xl border border-border bg-background-surface shadow-sm">
          {!campaigns || campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <div className="text-4xl">📢</div>
              <p className="font-display text-[15px] font-bold text-foreground">
                No campaigns yet
              </p>
              <p className="max-w-xs text-[13px] text-foreground-lighter">
                Create your first campaign to start tracking influencer posts.
              </p>
            </div>
          ) : (
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
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                      Platforms
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
                        <Badge variant={statusVariant[campaign.status as CampaignStatus]}>
                          {campaign.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1">
                          {(campaign.platforms as string[]).map((p) => (
                            <Badge
                              key={p}
                              variant={p as 'instagram' | 'tiktok' | 'youtube'}
                            >
                              {p}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-[12px] text-foreground-lighter">
                        {formatDateRange(campaign.start_date, campaign.end_date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
