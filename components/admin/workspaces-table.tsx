import { Badge } from '@/components/ui/badge'
import { LogoAvatar } from '@/components/ui/logo-avatar'
import { trialDaysRemaining } from '@/lib/utils/plan'
import type { PlanType } from '@/lib/utils/plan'

type SoloPlanRow = {
  id: string
  name: string
  slug: string
  logo_url: string | null
  plan: PlanType
  trial_ends_at: string | null
  owner_email: string | null
}

interface Props {
  workspaces: SoloPlanRow[]
}

function PlanBadge({ plan }: { plan: PlanType }) {
  if (plan === 'pro')   return <Badge variant="success">Pro</Badge>
  if (plan === 'trial') return <Badge variant="warning">Trial</Badge>
  return <Badge variant="muted">Free</Badge>
}

function TrialBillingCell({ plan, trialEndsAt }: { plan: PlanType; trialEndsAt: string | null }) {
  if (plan === 'pro') {
    return <span className="text-[11px] font-semibold text-brand">● Active subscriber</span>
  }
  if (plan === 'trial' && trialEndsAt) {
    const days = trialDaysRemaining(trialEndsAt)
    if (days <= 0) return <span className="text-[11px] text-foreground-muted">Expired</span>
    if (days <= 3)  return <span className="text-[11px] font-semibold text-destructive">⚠ {days} day{days !== 1 ? 's' : ''} left</span>
    return <span className="text-[11px] text-foreground-light">{days} days left</span>
  }
  if (plan === 'free') return <span className="text-[11px] text-foreground-muted">Free plan</span>
  return <span className="text-[11px] text-foreground-muted">—</span>
}

export function WorkspacesTable({ workspaces }: Props) {
  if (workspaces.length === 0) {
    return (
      <p className="py-8 text-center text-[13px] text-foreground-lighter">
        No Solo Plan accounts yet.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="pb-2.5 pr-4 text-[10px] font-semibold uppercase tracking-wide text-foreground-lighter">Account</th>
            <th className="pb-2.5 pr-4 text-[10px] font-semibold uppercase tracking-wide text-foreground-lighter">Plan Status</th>
            <th className="pb-2.5 pr-4 text-[10px] font-semibold uppercase tracking-wide text-foreground-lighter">Trial / Billing</th>
            <th className="pb-2.5 text-[10px] font-semibold uppercase tracking-wide text-foreground-lighter">Owner</th>
          </tr>
        </thead>
        <tbody>
          {workspaces.map((ws) => {
            const isExpiring = ws.plan === 'trial' && trialDaysRemaining(ws.trial_ends_at) <= 3 && trialDaysRemaining(ws.trial_ends_at) > 0
            return (
              <tr
                key={ws.id}
                className={`border-b border-border last:border-0 ${isExpiring ? 'bg-warning/[0.03]' : ''}`}
              >
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2.5">
                    <LogoAvatar logoUrl={ws.logo_url} name={ws.name} />
                    <div>
                      <p className="font-semibold text-foreground">{ws.name}</p>
                      <p className="text-[11px] text-foreground-muted">{ws.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <PlanBadge plan={ws.plan} />
                </td>
                <td className="py-3 pr-4">
                  <TrialBillingCell plan={ws.plan} trialEndsAt={ws.trial_ends_at} />
                </td>
                <td className="py-3 text-[11px] text-foreground-light">
                  {ws.owner_email ?? <span className="text-foreground-muted">—</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
