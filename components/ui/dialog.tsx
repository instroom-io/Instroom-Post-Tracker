'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useId,
  type ReactNode,
} from 'react'
import { X } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

// ─── Context ──────────────────────────────────────────────────────────────────

interface DialogContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  titleId: string
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
  const triggerRef = useRef<HTMLElement | null>(null)
  const titleId = useId()

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const setOpen = useCallback(
    (val: boolean) => {
      if (val) {
        // Capture the element that opened the dialog so we can return focus on close
        triggerRef.current = document.activeElement as HTMLElement
      }
      if (!isControlled) setUncontrolledOpen(val)
      onOpenChange?.(val)
    },
    [isControlled, onOpenChange]
  )

  // Return focus to trigger when dialog closes
  useEffect(() => {
    if (!open && triggerRef.current) {
      triggerRef.current.focus()
    }
  }, [open])

  return (
    <DialogContext.Provider value={{ open, setOpen, titleId }}>
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
  const { open, setOpen, titleId } = useDialogContext()
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, setOpen])

  // Focus trap: cycle Tab/Shift+Tab within dialog
  useEffect(() => {
    if (!open) return
    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handleTab)
    return () => document.removeEventListener('keydown', handleTab)
  }, [open])

  // Focus first focusable element when dialog opens
  useEffect(() => {
    if (!open) return
    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current
      if (!panel) return
      const first = panel.querySelector<HTMLElement>(FOCUSABLE)
      first ? first.focus() : panel.focus()
    })
    return () => cancelAnimationFrame(raf)
  }, [open])

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
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              tabIndex={-1}
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                'relative w-full rounded-2xl border border-border bg-background-surface shadow-lg outline-none',
                sizeClasses[size],
                className
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setOpen(false)}
                aria-label="Close dialog"
                className="absolute right-4 top-4 rounded-md p-0.5 text-foreground-muted transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
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
  const { titleId } = useDialogContext()
  return (
    <h2
      id={titleId}
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
