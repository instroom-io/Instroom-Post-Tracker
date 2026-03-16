'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Settings, LogOut } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { signOut } from '@/lib/actions/auth'
import { getInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface UserMenuProps {
  user: User
  compact?: boolean
}

export function UserMenu({ user, compact }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  const email = user.email ?? ''
  const displayName = (user.user_metadata?.full_name as string | undefined) ?? email.split('@')[0]
  const initials = getInitials(displayName)

  // Extract workspaceSlug from current pathname (e.g. "/zippit/overview" → "zippit")
  const workspaceSlug = pathname.split('/')[1] ?? ''

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      {compact ? (
        /* ── Compact trigger: avatar circle only ── */
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-full transition-colors',
            'bg-background-muted text-foreground-light text-[11px] font-semibold',
            'hover:bg-background-muted/80 border border-border/60',
            open && 'bg-background-muted border-border'
          )}
        >
          {initials}
        </button>
      ) : (
        /* ── Normal trigger: avatar + name ── */
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/10"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
            {initials}
          </div>
          <span className="text-[12px] font-medium text-[#94B89E]">{displayName}</span>
        </button>
      )}

      {open && (
        <div
          className={cn(
            'absolute z-50 w-48 rounded-lg border border-border bg-background-surface shadow-lg',
            compact
              ? 'right-0 top-full mt-1'
              : 'bottom-full left-0 mb-1'
          )}
        >
          <div className="border-b border-border px-3 py-2">
            <p className="truncate text-[12px] font-medium text-foreground">{displayName}</p>
            <p className="truncate text-[11px] text-foreground-lighter">{email}</p>
          </div>

          <div className="p-1">
            <a
              href={`/${workspaceSlug}/settings`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-[12px] text-foreground transition-colors hover:bg-background-muted"
            >
              <Settings size={13} />
              Settings
            </a>

            <form action={signOut}>
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-[12px] text-destructive transition-colors hover:bg-destructive-muted"
              >
                <LogOut size={13} />
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
