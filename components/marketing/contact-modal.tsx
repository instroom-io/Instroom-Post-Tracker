'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useMarketingContact } from '@/components/marketing/marketing-contact-provider'

type FormState = 'idle' | 'submitting' | 'success'

const inputClassName = 'bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-brand focus:ring-brand/20'

export function ContactModal() {
  const { open, setOpen } = useMarketingContact()
  const [formState, setFormState] = useState<FormState>('idle')
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  function handleClose(value: boolean) {
    setOpen(value)
    if (!value) {
      setFormState('idle')
      setName('')
      setCompany('')
      setEmail('')
      setMessage('')
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormState('submitting')
    setTimeout(() => setFormState('success'), 1500)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent size="sm" className="bg-[#091810] border-brand/20 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
        {formState === 'success' ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/20">
              <Check className="h-6 w-6 text-brand" />
            </div>
            <p className="text-white/70 text-sm">We&apos;ll be in touch shortly.</p>
            <Button variant="ghost" className="text-white/60 hover:text-white hover:bg-white/5" onClick={() => handleClose(false)}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader className="border-white/10">
              <DialogTitle className="text-white">Get in touch</DialogTitle>
              <DialogDescription className="text-white/50">Tell us about your agency and we&apos;ll reach out.</DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-white/70">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required className={inputClassName} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-white/70">Company</label>
                <Input value={company} onChange={(e) => setCompany(e.target.value)} required className={inputClassName} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-white/70">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClassName} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-white/70">Message</label>
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us about your agency..." className={inputClassName} />
              </div>
            </DialogBody>
            <DialogFooter className="border-white/10">
              <Button type="button" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/5" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={formState === 'submitting'} className="shadow-[0_0_20px_rgba(31,174,91,0.3)]">
                Submit
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
