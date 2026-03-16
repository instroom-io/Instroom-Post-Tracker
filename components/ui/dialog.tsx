'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// ─── Context ──────────────────────────────────────────────────────────────────

interface DialogContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const DialogContext = createContext<DialogContextValue | null>(null)

function useDialogContext() {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('Dialog components must be used within <Dialog>')
  return ctx
}

// ─── Dialog Root ──────────────────────────────────────────────────────────────

interface DialogProps {
  children: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function Dialog({ children, open: controlledOpen, onOpenChange }: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const setOpen = useCallback(
    (val: boolean) => {
      if (!isControlled) setUncontrolledOpen(val)
      onOpenChange?.(val)
    },
    [isControlled, onOpenChange]
  )

  return (
    <DialogContext.Provider value={{ open, setOpen }}>
      {children}
    </DialogContext.Provider>
  )
}

// ─── Trigger ─────────────────────────────────────────────────────────────────

export function DialogTrigger({ children, asChild: _asChild }: { children: ReactNode; asChild?: boolean }) {
  const { setOpen } = useDialogContext()

  return (
    <span onClick={() => setOpen(true)} className="contents">
      {children}
    </span>
  )
}

// ─── Close ───────────────────────────────────────────────────────────────────

export function DialogClose({ children }: { children: ReactNode }) {
  const { setOpen } = useDialogContext()

  return (
    <span onClick={() => setOpen(false)} className="contents">
      {children}
    </span>
  )
}

// ─── Content ─────────────────────────────────────────────────────────────────

type DialogSize = 'sm' | 'md' | 'lg'

interface DialogContentProps {
  children: ReactNode
  size?: DialogSize
  className?: string
}

const sizeClasses: Record<DialogSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
}

export function DialogContent({
  children,
  size = 'md',
  className,
}: DialogContentProps) {
  const { open, setOpen } = useDialogContext()

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, setOpen])

  // Lock body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'relative w-full rounded-xl border border-border bg-background-surface shadow-xl',
                sizeClasses[size],
                className
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setOpen(false)}
                className="absolute right-4 top-4 rounded-md p-0.5 text-foreground-muted transition-colors hover:text-foreground"
              >
                <X size={15} />
              </button>

              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Header ──────────────────────────────────────────────────────────────────

export function DialogHeader({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'border-b border-border px-5 py-4 pr-10',
        className
      )}
    >
      {children}
    </div>
  )
}

export function DialogTitle({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <h2
      className={cn(
        'font-display text-[15px] font-bold text-foreground',
        className
      )}
    >
      {children}
    </h2>
  )
}

export function DialogDescription({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p className={cn('mt-0.5 text-[12px] text-foreground-lighter', className)}>
      {children}
    </p>
  )
}

// ─── Footer ──────────────────────────────────────────────────────────────────

export function DialogFooter({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-2 border-t border-border px-5 py-4',
        className
      )}
    >
      {children}
    </div>
  )
}

// ─── Body ────────────────────────────────────────────────────────────────────

export function DialogBody({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('px-5 py-4', className)}>{children}</div>
  )
}
