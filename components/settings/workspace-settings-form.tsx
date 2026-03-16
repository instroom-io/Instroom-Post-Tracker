'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { updateWorkspace } from '@/lib/actions/workspace'
import type { Workspace } from '@/lib/types'

interface WorkspaceSettingsFormProps {
  workspace: Workspace
  canEdit: boolean
}

export function WorkspaceSettingsForm({ workspace, canEdit }: WorkspaceSettingsFormProps) {
  const [name, setName] = useState(workspace.name)
  const [logoUrl, setLogoUrl] = useState(workspace.logo_url ?? '')
  const [driveFolderId, setDriveFolderId] = useState(workspace.drive_folder_id ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await updateWorkspace(workspace.id, {
        name,
        logo_url: logoUrl || undefined,
        drive_folder_id: driveFolderId || undefined,
      })
      if (result?.error) {
        setError(result.error)
      } else {
        toast.success('Workspace settings saved.')
      }
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
      <Input
        label="Google Drive folder ID"
        value={driveFolderId}
        onChange={(e) => setDriveFolderId(e.target.value)}
        disabled={!canEdit || isPending}
        placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE..."
        hint="The ID from the Drive folder URL"
      />

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
