'use client'

import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
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

  function handleClose() {
    setOpen(false)
    setName('')
    setEmail('')
    setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await inviteBrand(agencyId, name, email)
      if (result?.error) {
        setError(result.error)
        return
      }
      toast.success('Invite sent')
      handleClose()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleClose(); else setOpen(true) }}>
      <DialogTrigger>
        <Button variant="primary" size="sm">
          <Plus size={13} />
          Invite brand
        </Button>
      </DialogTrigger>

      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Invite brand</DialogTitle>
          <DialogDescription>
            A workspace will be created and an invite link sent to the brand contact.
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
              placeholder="brand@nike.com"
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
      </DialogContent>
    </Dialog>
  )
}
