'use client'

import { useState, useTransition, useRef } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { updateWorkspace, updateAssignedMember, uploadWorkspaceLogo, removeWorkspaceLogo } from '@/lib/actions/workspace'
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
  const [uploadPending, startUploadTransition] = useTransition()
  const [removePending, startRemoveTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    startUploadTransition(async () => {
      const result = await uploadWorkspaceLogo(workspace.id, formData)
      if ('error' in result) { toast.error(result.error); return }
      setLogoUrl(result.url)
      toast.success('Logo updated.')
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleRemove() {
    startRemoveTransition(async () => {
      const result = await removeWorkspaceLogo(workspace.id)
      if (result?.error) { toast.error(result.error); return }
      setLogoUrl('')
      toast.success('Logo removed.')
    })
  }

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await updateWorkspace(workspace.id, { name })
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

  const isUploading = uploadPending
  const isRemoving = removePending
  const initials = workspace.name.slice(0, 2).toUpperCase()

  return (
    <div className="space-y-4 max-w-md">

      {/* Logo upload */}
      {canEdit && (
        <div className="flex items-center gap-4">
          <div className="relative h-[52px] w-[52px] flex-shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt={workspace.name} className="h-full w-full rounded-lg object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-lg bg-foreground text-[18px] font-bold text-background">
                {initials}
              </div>
            )}
            {(isUploading || isRemoving) && (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/60">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground-lighter border-t-transparent" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif"
              className="hidden"
              onChange={handleUpload}
            />
            <Button
              variant="secondary"
              size="sm"
              loading={isUploading}
              disabled={isUploading || isRemoving}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload photo
            </Button>
            <Button
              variant="ghost"
              size="sm"
              loading={isRemoving}
              disabled={!logoUrl || isUploading || isRemoving}
              onClick={handleRemove}
              className="text-foreground-muted hover:text-destructive"
            >
              Remove photo
            </Button>
          </div>
        </div>
      )}

      <Input
        label="Workspace name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={!canEdit || isPending}
        placeholder="My Agency"
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
