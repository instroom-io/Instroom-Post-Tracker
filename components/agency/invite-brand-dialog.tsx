'use client'

import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { inviteBrand } from '@/lib/actions/brand-requests'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface Props {
  agencyId: string
  agencySlug: string
}

const inputClass =
  'h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-foreground-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors'

const labelClass = 'text-[12px] font-medium text-foreground-light'

export function InviteBrandDialog({ agencyId, agencySlug }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data = {
      brand_name: formData.get('brand_name') as string,
      contact_email: formData.get('contact_email') as string,
    }

    startTransition(async () => {
      const result = await inviteBrand(agencyId, agencySlug, data)
      if ('error' in result) {
        setError(result.error)
        return
      }
      toast.success(`Invite sent to ${data.contact_email}`)
      setOpen(false)
    })
  }

  return (
    <>
      <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
        <Plus size={14} />
        Invite Brand
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a Brand</DialogTitle>
          </DialogHeader>

          <p className="text-[13px] text-foreground-lighter">
            Enter the brand name and contact email. They'll receive an invitation to fill in their
            details and connect their brand portal.
          </p>

          <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="brand_name" className={labelClass}>
                Brand name
              </label>
              <input
                id="brand_name"
                name="brand_name"
                type="text"
                required
                placeholder="Acme Co."
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="contact_email" className={labelClass}>
                Brand contact email
              </label>
              <input
                id="contact_email"
                name="contact_email"
                type="email"
                required
                placeholder="contact@acme.com"
                className={inputClass}
              />
            </div>

            {error && <p className="text-[11px] text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={isPending}>
                {isPending ? 'Sending…' : 'Send Invite'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
