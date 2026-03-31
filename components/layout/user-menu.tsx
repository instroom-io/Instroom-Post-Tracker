'use client'

import { useState, useRef, useEffect, useCallback, useTransition } from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Settings, LogOut } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { signOut } from '@/lib/actions/auth'
import { getInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface UserMenuProps {
  user: User
  compact?: boolean
  settingsHref?: string
}

export function UserMenu({ user, compact, settingsHref }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const pathname = usePathname()

  const email = user.email ?? ''
  const displayName = (user.user_metadata?.full_name as string | undefined) ?? email.split('@')[0]
  const initials = getInitials(displayName)
  const avatarUrl = (user.user_metadata?.avatar_url as string | undefined) ?? null

  // Extract workspaceSlug from current pathname (e.g. "/zippit/overview" → "zippit")
  const workspaceSlug = pathname.split('/')[1] ?? ''

  const close = useCallback(() => {
    setOpen(false)
    triggerRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [close])

  return (
    <div ref={ref} className="relative">
      {compact ? (
        /* ── Compact trigger: avatar circle only ── */
        <button
          ref={triggerRef}
          onClick={() => setOpen(!open)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`User menu for ${displayName}`}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-full transition-colors overflow-hidden',
            !avatarUrl && 'bg-background-muted text-foreground-light text-[11px] font-semibold',
            'hover:bg-background-muted/80 border border-border/60',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
            open && 'bg-background-muted border-border'
          )}
        >
          {avatarUrl ? (
            <Image src={avatarUrl} alt={displayName} width={28} height={28} className="h-7 w-7 rounded-full object-cover" />
          ) : (
            initials
          )}
        </button>
      ) : (
        /* ── Normal trigger: avatar + name ── */
        <button
          ref={triggerRef}
          onClick={() => setOpen(!open)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`User menu for ${displayName}`}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-brand-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
        >
          {avatarUrl ? (
            <Image src={avatarUrl} alt={displayName} width={24} height={24} className="h-6 w-6 rounded-full object-cover" />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-background-muted border border-border text-[10px] font-bold text-foreground-light">
              {initials}
            </div>
          )}
          <span className="text-[12px] font-medium text-foreground-lighter">{displayName}</span>
        </button>
      )}

      {open && (
        <div
          role="menu"
          aria-label="User menu"
          className={cn(
            'absolute z-50 w-48 rounded-lg border border-border bg-background-surface shadow-lg',
            compact
              ? 'right-0 top-full mt-1'
              : 'bottom-full left-0 mb-1'
          )}
        >
          <div className="border-b border-border px-3 py-2" role="presentation">
            <p className="truncate text-[12px] font-medium text-foreground">{displayName}</p>
            <p className="truncate text-[11px] text-foreground-lighter">{email}</p>
          </div>

          <div className="p-1">
            <a
              href={settingsHref ?? `/${workspaceSlug}/settings`}
              role="menuitem"
              onClick={() => close()}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-[12px] text-foreground transition-colors hover:bg-background-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
            >
              <Settings size={13} />
              Settings
            </a>

            <button
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); setShowLogoutConfirm(true) }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-[12px] text-destructive transition-colors hover:bg-destructive-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50"
            >
              <LogOut size={13} />
              Sign out
            </button>
          </div>
        </div>
      )}
      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Sign out?</DialogTitle>
            <DialogDescription>You'll be redirected to the login page.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setShowLogoutConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              loading={isPending}
              onClick={() => startTransition(async () => { await signOut() })}
            >
              Sign out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
