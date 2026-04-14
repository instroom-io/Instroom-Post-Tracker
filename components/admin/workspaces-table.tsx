'use client'

import { useState, useTransition } from 'react'
import { setWorkspacePlan } from '@/lib/actions/admin'
import type { PlanType } from '@/lib/utils/plan'

interface WorkspaceRow {
  id: string
  name: string
  slug: string
  plan: PlanType
  workspace_quota: number
  account_type: string
  trial_ends_at: string | null
  owner_email: string | null
}

interface Props {
  workspaces: WorkspaceRow[]
}

function PlanDropdown({ workspaceId, currentPlan }: { workspaceId: string; currentPlan: PlanType }) {
  const [plan, setPlanState] = useState<PlanType>(currentPlan)
  const [isPending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newPlan = e.target.value as PlanType
    setPlanState(newPlan)
    startTransition(async () => {
      await setWorkspacePlan(workspaceId, newPlan)
    })
  }

  return (
    <select
      value={plan}
      onChange={handleChange}
      disabled={isPending}
      onClick={(e) => e.stopPropagation()}
      className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
    >
      <option value="trial">trial</option>
      <option value="free">free</option>
      <option value="pro">pro</option>
    </select>
  )
}

export function WorkspacesTable({ workspaces }: Props) {
  if (workspaces.length === 0) {
    return (
      <p className="py-8 text-center text-[13px] text-foreground-lighter">
        No workspaces yet.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-border text-left text-foreground-lighter">
            <th className="pb-2 pr-4 font-medium">Workspace</th>
            <th className="pb-2 pr-4 font-medium">Owner</th>
            <th className="pb-2 pr-4 font-medium">Type</th>
            <th className="pb-2 pr-4 font-medium">Plan</th>
            <th className="pb-2 pr-4 font-medium">Quota</th>
            <th className="pb-2 font-medium">Trial ends</th>
          </tr>
        </thead>
        <tbody>
          {workspaces.map((ws) => (
            <tr key={ws.id} className="border-b border-border last:border-0">
              <td className="py-2.5 pr-4">
                <p className="font-medium text-foreground">{ws.name}</p>
                <p className="text-foreground-muted">{ws.slug}</p>
              </td>
              <td className="py-2.5 pr-4 text-foreground-light">
                {ws.owner_email ?? <span className="text-foreground-muted">—</span>}
              </td>
              <td className="py-2.5 pr-4 text-foreground-light capitalize">{ws.account_type}</td>
              <td className="py-2.5 pr-4">
                <PlanDropdown workspaceId={ws.id} currentPlan={ws.plan} />
              </td>
              <td className="py-2.5 pr-4 text-foreground-light">{ws.workspace_quota}</td>
              <td className="py-2.5 text-foreground-light">
                {ws.trial_ends_at
                  ? new Date(ws.trial_ends_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                  : <span className="text-foreground-muted">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
