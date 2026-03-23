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
      <div className="space-y-2">
        <Input
          label="Google Drive folder"
          value={driveFolderId}
          onChange={(e) => setDriveFolderId(e.target.value)}
          disabled={!canEdit || isPending}
          placeholder="https://drive.google.com/drive/folders/..."
        />
        <div className="text-[11px] text-foreground-muted space-y-1 leading-relaxed">
          <p>Downloaded posts will be uploaded to this folder. To set it up:</p>
          <ol className="list-decimal list-inside space-y-0.5 pl-1">
            <li>Create a folder in Google Drive</li>
            <li>Share it with <span className="font-mono text-foreground select-all">drive-uploader@instroom-post-tracker-drive.iam.gserviceaccount.com</span> as <strong>Editor</strong></li>
            <li>Open the folder in your browser and copy the URL</li>
            <li>Paste the URL (or just the folder ID) above and save</li>
          </ol>
        </div>
      </div>

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
