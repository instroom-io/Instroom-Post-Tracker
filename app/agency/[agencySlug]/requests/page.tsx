import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InviteBrandDialog } from '@/components/agency/invite-brand-dialog'
import { Check, Clock, X } from '@phosphor-icons/react/dist/ssr'
import { cn } from '@/lib/utils'

interface PageProps {
  params: Promise<{ agencySlug: string }>
}

export default async function AgencyRequestsPage({ params }: PageProps) {
  const { agencySlug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: agency } = await supabase
    .from('agencies')
    .select('id, name, owner_id')
    .eq('slug', agencySlug)
    .single()

  if (!agency || agency.owner_id !== user.id) redirect('/app')

  const { data: invites } = await supabase
    .from('brand_invites')
    .select('id, email, workspace_name, website_url, accepted_at, created_at, expires_at, workspace_id')
    .eq('agency_id', agency.id)
    .order('created_at', { ascending: false })

  const now = new Date()

  type InviteRow = NonNullable<typeof invites>[number]

  function getStatus(invite: InviteRow): 'accepted' | 'expired' | 'pending' {
    if (invite.accepted_at) return 'accepted'
    if (new Date(invite.expires_at) < now) return 'expired'
    return 'pending'
  }

  return (
    <div className="p-5">
      <div className="flex justify-end mb-4">
        <InviteBrandDialog agencyId={agency.id} />
      </div>
      {(invites ?? []).length === 0 ? (
          <div className="rounded-xl border border-border bg-background-surface p-12 text-center">
            <p className="text-sm text-foreground-muted">No invites sent yet.</p>
            <p className="mt-1 text-[12px] text-foreground-lighter">
              Use the Add button to invite a brand and share the onboarding link with them.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-background-subtle">
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-foreground-lighter">Brand</th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-foreground-lighter">Contact email</th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-foreground-lighter">Sent</th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-foreground-lighter">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background-surface">
                {invites!.map((invite) => {
                  const status = getStatus(invite)
                  const sentDate = new Date(invite.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  return (
                    <tr key={invite.id} className="hover:bg-background-subtle/50 transition-colors">
                      <td className="px-5 py-3 font-medium text-foreground">{invite.workspace_name}</td>
                      <td className="px-5 py-3 text-foreground-muted">{invite.email}</td>
                      <td className="px-5 py-3 text-foreground-muted">{sentDate}</td>
                      <td className="px-5 py-3">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                          status === 'accepted' && 'bg-success/10 text-success',
                          status === 'pending'  && 'bg-warning/10 text-warning',
                          status === 'expired'  && 'bg-foreground-lighter/10 text-foreground-lighter',
                        )}>
                          {status === 'accepted' && <Check size={10} weight="bold" />}
                          {status === 'pending'  && <Clock size={10} weight="bold" />}
                          {status === 'expired'  && <X size={10} weight="bold" />}
                          {status === 'accepted' ? 'Accepted' : status === 'pending' ? 'Pending' : 'Expired'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
    </div>
  )
}
