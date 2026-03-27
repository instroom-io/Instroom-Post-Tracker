'use client'

import { useState, useTransition } from 'react'
import { Plus, Copy, Check } from 'lucide-react'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { inviteBrand } from '@/lib/actions/agencies'

interface InviteBrandDialogProps {
  agencyId: string
}

export function InviteBrandDialog({ agencyId }: InviteBrandDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(true)
  const [copied, setCopied] = useState(false)

  function handleClose() {
    setOpen(false)
    setName('')
    setEmail('')
    setError(null)
    setInviteLink(null)
    setEmailSent(true)
    setCopied(false)
  }

  function handleCopy() {
    if (!inviteLink) return
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await inviteBrand(agencyId, name, email)
      if ('error' in result) {
        setError(result.error)
        return
      }
      setEmailSent(result.emailSent)
      setInviteLink(`${window.location.origin}/brand-invite/${result.token}`)
    })
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleClose(); else setOpen(true) }}>
      <DialogTrigger asChild>
        <Button variant="primary" size="sm" data-tour="agency-invite-brand">
          <Plus size={13} />
          Invite brand
        </Button>
      </DialogTrigger>

      <DialogContent size="md">
        {inviteLink ? (
          <>
            <DialogHeader>
              <DialogTitle>Invite created</DialogTitle>
              <DialogDescription>
                {emailSent
                  ? 'An email was sent to the brand. You can also share this link directly.'
                  : "Email couldn't be sent — share this link directly with the brand."}
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={inviteLink}
                  className="flex-1 rounded-lg border border-border bg-background-muted px-3 py-2 text-[12px] text-foreground-lighter font-mono truncate"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-background-surface transition-colors hover:bg-background-muted"
                >
                  {copied ? <Check size={14} className="text-brand" /> : <Copy size={14} className="text-foreground-muted" />}
                </button>
              </div>
              <p className="text-[11px] text-foreground-muted">
                The brand fills out this form to submit their logo and website — no account needed.
              </p>
            </DialogBody>
            <DialogFooter>
              <Button variant="primary" size="md" onClick={handleClose}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Invite brand</DialogTitle>
              <DialogDescription>
                An invite link will be created and emailed to the brand contact.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <DialogBody className="space-y-4">
                <Input
                  label="Brand name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nike"
                  required
                  error={undefined}
                />
                <Input
                  label="Contact email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="instroom@brand.com"
                  required
                  error={undefined}
                />
                {error && (
                  <p className="text-[11px] text-destructive">{error}</p>
                )}
              </DialogBody>
              <DialogFooter>
                <Button type="button" variant="secondary" size="md" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="md" loading={isPending}>
                  Send invite
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
