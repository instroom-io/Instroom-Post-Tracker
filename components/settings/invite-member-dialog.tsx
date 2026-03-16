'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { inviteMember } from '@/lib/actions/workspace'
import type { WorkspaceRole } from '@/lib/types'

interface InviteMemberDialogProps {
  workspaceId: string
  trigger?: React.ReactNode
}

export function InviteMemberDialog({ workspaceId, trigger }: InviteMemberDialogProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Exclude<WorkspaceRole, 'owner'>>('editor')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const result = await inviteMember(workspaceId, { email, role })
      if (result?.error) {
        setError(result.error)
        return
      }
      toast.success(`Invitation sent to ${email}.`)
      setOpen(false)
      setEmail('')
      setRole('editor')
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="primary" size="md">
            Invite member
          </Button>
        )}
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Invite a team member</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@agency.com"
              disabled={isPending}
            />
            <Select
              label="Role"
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
              options={[
                { value: 'admin', label: 'Admin — full access' },
                { value: 'editor', label: 'Editor — can edit data' },
                { value: 'viewer', label: 'Viewer — read-only' },
              ]}
            />
            {error && (
              <p className="text-[11px] text-destructive">{error}</p>
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            variant="ghost"
            size="md"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            loading={isPending}
            onClick={handleSubmit}
          >
            Send invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
