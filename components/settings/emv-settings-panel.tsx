import { EmvConfigForm } from '@/components/analytics/emv-config-form'
import type { EmvConfig } from '@/lib/types'

interface EmvSettingsPanelProps {
  workspaceId: string
  configs: EmvConfig[]
  canEdit: boolean
}

export function EmvSettingsPanel({ workspaceId, configs, canEdit }: EmvSettingsPanelProps) {
  return (
    <div className="rounded-xl border border-border bg-background-surface p-5 shadow-sm">
      <div className="mb-5 border-b border-border pb-4">
        <h2 className="font-display text-[15px] font-bold text-foreground">EMV Configuration</h2>
        <p className="mt-1 text-[12px] text-foreground-lighter">
          Set CPM rates used to estimate media value. Changes apply to future posts only.
        </p>
      </div>
      <EmvConfigForm workspaceId={workspaceId} configs={configs} canEdit={canEdit} />
    </div>
  )
}
