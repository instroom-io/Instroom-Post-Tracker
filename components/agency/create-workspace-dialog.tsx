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
import { createAgencyWorkspace } from '@/lib/actions/agencies'

interface CreateWorkspaceDialogProps {
  agencyId: string
}

export function CreateWorkspaceDialog({ agencyId }: CreateWorkspaceDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')

  function handleClose() {
    setOpen(false)
    setName('')
    setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createAgencyWorkspace(agencyId, name)
      if (result?.error) {
        setError(result.error)
        return
      }
      toast.success('Workspace created')
      handleClose()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleClose(); else setOpen(true) }}>
      <DialogTrigger>
        <Button variant="primary" size="sm">
          <Plus size={13} />
          New workspace
        </Button>
      </DialogTrigger>

      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Create workspace</DialogTitle>
          <DialogDescription>
            Add a new brand workspace for your agency.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            <Input
              label="Workspace name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nike Summer Campaign"
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
              Create workspace
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
