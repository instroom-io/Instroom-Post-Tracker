'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { PencilLine, Eye, ShieldCheck } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { inviteMember } from '@/lib/actions/workspace'
import type { WorkspaceRole } from '@/lib/types'

interface InviteMemberDialogProps {
  workspaceId: string
  currentUserIsOwner?: boolean
  trigger?: React.ReactNode
}

export function InviteMemberDialog({ workspaceId, currentUserIsOwner = false, trigger }: InviteMemberDialogProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'manager' | 'viewer' | 'admin'>('manager')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const result = await inviteMember(workspaceId, { email, role })
      if (result && 'error' in result) {
        setError(result.error)
        return
      }
      if (result && 'warning' in result) {
        toast.warning(result.warning)
      } else {
        toast.success(`Invitation sent to ${email}.`)
      }
      setOpen(false)
      setEmail('')
      setRole('manager')
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
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              disabled={isPending}
            />
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-foreground-light">Role</span>
              <div className="flex gap-2">
                {([
                  { value: 'manager', label: 'Manager', description: 'Can edit data', Icon: PencilLine  },
                  { value: 'viewer',  label: 'Viewer',  description: 'Read-only',      Icon: Eye         },
                  ...(currentUserIsOwner
                    ? [{ value: 'admin' as const, label: 'Admin', description: 'Full access', Icon: ShieldCheck }]
                    : []),
                ] as const).map(({ value, label, description, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRole(value)}
                    disabled={isPending}
                    className={cn(
                      'group flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border transition-colors',
                      role === value
                        ? 'border-brand bg-brand/10 text-brand'
                        : 'border-border bg-background-surface text-foreground-light hover:border-border-strong hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="text-[13px] font-medium">{label}</span>
                    <span className={cn(
                      'text-[10px] font-normal transition-opacity duration-150',
                      role === value
                        ? 'text-brand/70 opacity-100'
                        : 'text-foreground-muted opacity-0 group-hover:opacity-100'
                    )}>
                      {description}
                    </span>
                  </button>
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
