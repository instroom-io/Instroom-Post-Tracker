import { Fragment } from 'react'
import { Badge } from '@/components/ui/badge'
import { LogoAvatar } from '@/components/ui/logo-avatar'
import { trialDaysRemaining } from '@/lib/utils/plan'
import type { PlanType } from '@/lib/utils/plan'

type BrandRow = {
  id: string
  name: string
  slug: string
}

type TeamPlanDetailRow = {
  id: string
  name: string
  slug: string
  logo_url: string | null
  plan: PlanType
  trial_ends_at: string | null
  owner_email: string | null
  brands: BrandRow[]
}

interface Props {
  agencies: TeamPlanDetailRow[]
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

export function TeamPlanDetailTable({ agencies }: Props) {
  if (agencies.length === 0) {
    return (
      <p className="py-8 text-center text-[13px] text-foreground-lighter">
        No Team Plan accounts yet.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="pb-2.5 pr-4 text-[11px] font-semibold text-foreground-lighter">Account</th>
            <th className="pb-2.5 pr-4 text-[11px] font-semibold text-foreground-lighter">Plan Status</th>
            <th className="pb-2.5 pr-4 text-[11px] font-semibold text-foreground-lighter">Trial / Billing</th>
            <th className="pb-2.5 text-[11px] font-semibold text-foreground-lighter">Owner</th>
          </tr>
        </thead>
        <tbody>
          {agencies.map((agency) => {
            const isExpiring = agency.plan === 'trial' && trialDaysRemaining(agency.trial_ends_at) <= 3 && trialDaysRemaining(agency.trial_ends_at) > 0
            return (
              <Fragment key={agency.id}>
                <tr
                  className={`border-b border-border ${agency.brands.length === 0 ? 'last:border-0' : ''} ${isExpiring ? 'bg-warning/[0.03]' : ''}`}
                >
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2.5">
                      <LogoAvatar logoUrl={agency.logo_url} name={agency.name} />
                      <div>
                        <p className="font-semibold text-foreground">{agency.name}</p>
                        <p className="text-[11px] text-foreground-muted">{agency.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <PlanBadge plan={agency.plan} />
                  </td>
                  <td className="py-3 pr-4">
                    <TrialBillingCell plan={agency.plan} trialEndsAt={agency.trial_ends_at} />
                  </td>
                  <td className="py-3 text-[11px] text-foreground-light">
                    {agency.owner_email ?? <span className="text-foreground-muted">—</span>}
                  </td>
                </tr>
                {agency.brands.map((brand, idx) => (
                  <tr
                    key={brand.id}
                    className={`border-b border-border bg-background-muted ${idx === agency.brands.length - 1 ? 'last:border-0' : ''}`}
                  >
                    <td colSpan={4} className="py-2 pl-10 pr-4">
                      <span className="text-foreground-muted">↳</span>{' '}
                      <span className="font-semibold text-foreground">{brand.name}</span>{' '}
                      <span className="text-[11px] text-foreground-muted">{brand.slug}</span>
                      <span className="ml-3 text-[11px] font-medium text-brand">Covered by team plan</span>
                    </td>
                  </tr>
                ))}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
