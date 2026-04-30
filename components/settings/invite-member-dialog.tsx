'use client'

import { useState, useTransition, useRef } from 'react'
import { toast } from 'sonner'
import Lottie, { type LottieRefCurrentProps } from 'lottie-react'
import managerAnim from '@/public/icons/icon-role-manager.json'
import viewerAnim from '@/public/icons/icon-role-viewer.json'
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
  trigger?: React.ReactNode
}

export function InviteMemberDialog({ workspaceId, trigger }: InviteMemberDialogProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'manager' | 'viewer'>('manager')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const managerRef = useRef<LottieRefCurrentProps>(null)
  const viewerRef  = useRef<LottieRefCurrentProps>(null)

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
                <button
                  type="button"
                  onClick={() => { setRole('manager'); managerRef.current?.goToAndPlay(0, true) }}
                  onMouseEnter={() => managerRef.current?.goToAndPlay(0, true)}
                  onMouseLeave={() => managerRef.current?.stop()}
                  disabled={isPending}
                  className={cn(
                    'group flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border transition-colors',
                    role === 'manager'
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-border bg-background-surface text-foreground-light hover:border-border-strong hover:text-foreground'
                  )}
                >
                  <div className={cn(
                    'transition-all duration-200',
                    role === 'manager'
                      ? '[filter:brightness(0)_saturate(100%)_invert(52%)_sepia(73%)_saturate(481%)_hue-rotate(93deg)_brightness(95%)]'
                      : '[filter:brightness(0)_opacity(0.35)]'
                  )}>
                    <Lottie lottieRef={managerRef} animationData={managerAnim} loop={false} autoplay={false} style={{ width: 22, height: 22 }} />
                  </div>
                  <span className="text-[13px] font-medium">Manager</span>
                  <span className={cn(
                    'text-[10px] font-normal transition-opacity duration-150',
                    role === 'manager' ? 'text-brand/70 opacity-100' : 'text-foreground-muted opacity-0 group-hover:opacity-100'
                  )}>
                    Can edit data
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => { setRole('viewer'); viewerRef.current?.goToAndPlay(0, true) }}
                  onMouseEnter={() => viewerRef.current?.goToAndPlay(0, true)}
                  onMouseLeave={() => viewerRef.current?.stop()}
                  disabled={isPending}
                  className={cn(
                    'group flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border transition-colors',
                    role === 'viewer'
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-border bg-background-surface text-foreground-light hover:border-border-strong hover:text-foreground'
                  )}
                >
                  <div className={cn(
                    'transition-all duration-200',
                    role === 'viewer'
                      ? '[filter:brightness(0)_saturate(100%)_invert(52%)_sepia(73%)_saturate(481%)_hue-rotate(93deg)_brightness(95%)]'
                      : '[filter:brightness(0)_opacity(0.35)]'
                  )}>
                    <Lottie lottieRef={viewerRef} animationData={viewerAnim} loop={false} autoplay={false} style={{ width: 22, height: 22 }} />
                  </div>
                  <span className="text-[13px] font-medium">Viewer</span>
                  <span className={cn(
                    'text-[10px] font-normal transition-opacity duration-150',
                    role === 'viewer' ? 'text-brand/70 opacity-100' : 'text-foreground-muted opacity-0 group-hover:opacity-100'
                  )}>
                    Read-only
                  </span>
                </button>
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
