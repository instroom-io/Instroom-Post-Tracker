'use client'

import { useState, useTransition } from 'react'
import { Check } from '@phosphor-icons/react'
import { submitContactInquiry } from '@/lib/actions/contact'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useMarketingContact } from '@/components/marketing/marketing-contact-provider'

type FormState = 'idle' | 'submitting' | 'success'

const inputClassName = 'bg-background-muted border-border text-foreground placeholder:text-foreground-muted focus:border-brand focus:ring-brand/20 dark:bg-white/5 dark:border-white/10'

export function ContactModal() {
  const { open, setOpen } = useMarketingContact()
  const [formState, setFormState] = useState<FormState>('idle')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  function handleClose(value: boolean) {
    setOpen(value)
    if (!value) {
      setFormState('idle')
      setError(null)
      setName('')
      setCompany('')
      setEmail('')
      setMessage('')
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await submitContactInquiry({ name, company, email, message })
      if (result?.error) {
        setError(result.error)
        return
      }
      setFormState('success')
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent size="sm" className="bg-background border-border dark:shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
        {formState === 'success' ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-muted">
              <Check className="h-6 w-6 text-brand" />
            </div>
            <p className="text-foreground-light text-sm">We&apos;ll be in touch shortly.</p>
            <Button variant="ghost" className="text-foreground-lighter hover:text-foreground hover:bg-background-muted dark:hover:bg-white/5" onClick={() => handleClose(false)}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader className="border-border">
              <DialogTitle className="text-foreground">Get in touch</DialogTitle>
              <DialogDescription className="text-foreground-lighter">Fill in the form below and we&apos;ll get back to you shortly.</DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-foreground-light">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required className={inputClassName} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-foreground-light">Company</label>
                <Input value={company} onChange={(e) => setCompany(e.target.value)} required className={inputClassName} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-foreground-light">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClassName} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-foreground-light">Message</label>
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us about your agency..." className={inputClassName} />
              </div>
            </DialogBody>
            <DialogFooter className="border-border">
              {error && (
                <p className="text-[11px] text-destructive w-full">{error}</p>
              )}
              <Button type="button" variant="ghost" className="text-foreground-lighter hover:text-foreground hover:bg-background-muted dark:hover:bg-white/5" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={isPending} className="dark:shadow-[0_0_20px_rgba(31,174,91,0.3)]">
                Submit
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
