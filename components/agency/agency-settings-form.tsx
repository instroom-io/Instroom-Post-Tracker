'use client'

import { useState, useTransition, useRef } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateAgency, uploadAgencyLogo, removeAgencyLogo, updateAgencyStorageFolder } from '@/lib/actions/agencies'
import { StorageCard } from '@/components/settings/storage-card'
import { cn } from '@/lib/utils'
import type { Agency } from '@/lib/types'

interface AgencySettingsFormProps {
  agency: Agency
}

export function AgencySettingsForm({ agency }: AgencySettingsFormProps) {
  const [name, setName] = useState(agency.name)
  const [logoUrl, setLogoUrl] = useState(agency.logo_url ?? '')
  const [nameError, setNameError] = useState<string | null>(null)
  const [savePending, startSaveTransition] = useTransition()
  const [uploadPending, startUploadTransition] = useTransition()
  const [removePending, startRemoveTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const initials = agency.name.slice(0, 2).toUpperCase()

  const createdDate = new Intl.DateTimeFormat('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  }).format(new Date(agency.created_at))

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    startUploadTransition(async () => {
      const result = await uploadAgencyLogo(agency.id, formData)
      if ('error' in result) { toast.error(result.error); return }
      setLogoUrl(result.url)
      toast.success('Logo updated.')
    })
    // Reset file input so re-uploading same file works
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleRemove() {
    startRemoveTransition(async () => {
      const result = await removeAgencyLogo(agency.id)
      if (result?.error) { toast.error(result.error); return }
      setLogoUrl('')
      toast.success('Logo removed.')
    })
  }

  function handleSave() {
    setNameError(null)
    startSaveTransition(async () => {
      const result = await updateAgency(agency.id, { name, logo_url: logoUrl })
      if (result?.error) { setNameError(result.error); return }
      toast.success('Agency settings saved.')
    })
  }

  const isUploading = uploadPending
  const isRemoving = removePending

  return (
    <div className="flex gap-10">
      {/* Sidebar */}
      <nav className="w-[180px] flex-shrink-0">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">Agency</p>
        <ul className="flex flex-col gap-0.5">
          <li>
            <div className="w-full rounded-lg px-3 py-2 text-left text-[13px] bg-background-muted font-medium text-foreground">
              General
            </div>
          </li>
        </ul>
      </nav>

      {/* Main content */}
      <div className="flex-1 flex flex-col gap-6 max-w-lg">
        <div>
          <h1 className="text-[18px] font-semibold text-foreground">General</h1>
          <p className="text-[12px] text-foreground-lighter mt-0.5">Agency details and account information.</p>
        </div>

        {/* Details card */}
        <div className="rounded-xl border border-border bg-background-surface p-5">
          <h2 className="text-[13px] font-semibold text-foreground mb-4">Details</h2>
          <div className="flex flex-col gap-5">

            {/* Avatar row */}
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="relative h-[52px] w-[52px] flex-shrink-0">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={agency.name}
                    className="h-full w-full rounded-lg object-cover"
                  />
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

              {/* Photo actions */}
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

            {/* Name input */}
            <Input
              label="Agency Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={savePending}
              placeholder="Armful Media"
              error={nameError ?? undefined}
            />

            <div>
              <Button variant="primary" size="sm" loading={savePending} onClick={handleSave}>
                Save changes
              </Button>
            </div>
          </div>
        </div>

        {/* Storage */}
        <StorageCard
          currentFolderId={agency.drive_folder_id}
          canEdit={true}
          onSave={(value) => updateAgencyStorageFolder(agency.id, value)}
        />

        {/* Account Info card */}
        <div className="rounded-xl border border-border bg-background-surface p-5">
          <h2 className="text-[13px] font-semibold text-foreground mb-4">Account Info</h2>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-foreground-muted">Status</span>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[12px] font-medium text-foreground">Active</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-foreground-muted">Created</span>
              <span className="text-[12px] text-foreground">{createdDate}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
