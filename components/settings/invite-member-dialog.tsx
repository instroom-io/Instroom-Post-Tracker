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
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
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
              label="Work email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="instroom@colleague.com"
              disabled={isPending}
            />
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-foreground-light">Role</span>
              <div className="flex gap-2">
                {([
                  { value: 'admin', label: 'Admin', description: 'Full access' },
                  { value: 'editor', label: 'Editor', description: 'Can edit data' },
                  { value: 'viewer', label: 'Viewer', description: 'Read-only' },
                ] as const).map(({ value, label, description }) => (
                  <Tooltip key={value} content={description} side="bottom">
                    <button
                      type="button"
                      onClick={() => setRole(value)}
                      disabled={isPending}
                      className={cn(
                        'flex-1 h-9 rounded-lg border text-[13px] font-medium transition-colors',
                        role === value
                          ? 'border-brand bg-brand/10 text-brand'
                          : 'border-border bg-background-surface text-foreground-light hover:border-border-strong hover:text-foreground'
                      )}
                    >
                      {label}
                    </button>
                  </Tooltip>
                ))}
              </div>
            </div>
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
