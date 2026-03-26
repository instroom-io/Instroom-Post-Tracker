'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { updateWorkspace, updateAssignedMember } from '@/lib/actions/workspace'
import type { Workspace } from '@/lib/types'

interface MemberOption {
  id: string
  user_id: string
  role: string
  user: { full_name: string | null; email: string } | null
}

interface WorkspaceSettingsFormProps {
  workspace: Workspace
  canEdit: boolean
  members?: MemberOption[]
}

export function WorkspaceSettingsForm({ workspace, canEdit, members = [] }: WorkspaceSettingsFormProps) {
  const [name, setName] = useState(workspace.name)
  const [logoUrl, setLogoUrl] = useState(workspace.logo_url ?? '')
  const [assignedMemberId, setAssignedMemberId] = useState<string>(
    workspace.assigned_member_id ?? ''
  )
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await updateWorkspace(workspace.id, {
        name,
        logo_url: logoUrl || undefined,
      })
      if (result?.error) {
        setError(result.error)
        return
      }

      const assignedResult = await updateAssignedMember(workspace.id, {
        userId: assignedMemberId || null,
      })
      if (assignedResult?.error) {
        setError(assignedResult.error)
        return
      }

      toast.success('Workspace settings saved.')
    })
  }

  return (
    <div className="space-y-4 max-w-md">
      <Input
        label="Workspace name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={!canEdit || isPending}
        placeholder="My Agency"
      />
      <Input
        label="Logo URL"
        value={logoUrl}
        onChange={(e) => setLogoUrl(e.target.value)}
        disabled={!canEdit || isPending}
        placeholder="https://..."
        hint="Paste a public image URL for your logo"
      />

      {members.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium text-foreground">
            Assigned team member
          </label>
          <p className="text-[11px] text-foreground-lighter">
            This person receives follow-up email reminders when influencers haven&apos;t posted.
          </p>
          <select
            value={assignedMemberId}
            onChange={(e) => setAssignedMemberId(e.target.value)}
            disabled={!canEdit || isPending}
            className="rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          >
            <option value="">— None (falls back to workspace owner) —</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.user?.full_name ?? m.user?.email ?? m.user_id}
                {m.role === 'owner' ? ' (owner)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <p className="text-[11px] text-destructive">{error}</p>
      )}

      {canEdit && (
        <Button
          variant="primary"
          size="md"
          loading={isPending}
          onClick={handleSave}
        >
          Save changes
        </Button>
      )}
    </div>
  )
}
