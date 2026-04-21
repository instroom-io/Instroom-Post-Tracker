'use client'

import { useState, useRef, useEffect, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Check, CaretUpDown, SignOut, Users } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/utils'
import { signOut } from '@/lib/actions/auth'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Workspace, WorkspaceRole } from '@/lib/types'

function WorkspaceLogo({
  name, logoUrl, className, fallbackClassName, textClassName,
}: {
  name: string
  logoUrl: string
  className: string
  fallbackClassName: string
  textClassName: string
}) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div className={cn('flex flex-shrink-0 items-center justify-center font-bold', fallbackClassName, textClassName)}>
        {getInitials(name)}
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoUrl} alt={name} className={className} onError={() => setFailed(true)} />
  )
}

const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  editor: 'Editor',
  manager: 'Manager',
  viewer: 'Viewer',
}

interface WorkspaceSwitcherProps {
  currentWorkspace: Workspace
  currentRole: WorkspaceRole
  memberships: Array<{ role: WorkspaceRole; workspaces: Workspace }>
  align?: 'left' | 'right'
  agency?: { id: string; name: string; slug: string; logo_url?: string | null } | null
  user: { displayName: string; email: string; avatarUrl?: string | null }
}

export function WorkspaceSwitcher({
  currentWorkspace,
  currentRole,
  memberships,
  align = 'left',
  agency,
  user,
}: WorkspaceSwitcherProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => {
    setOpen(false)
    triggerRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) close()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, close])

  const userInitials = getInitials(user.displayName)

  function handleInviteBrand() {
    close()
    if (agency) router.push(`/agency/${agency.slug}/dashboard?invite=1`)
  }

  const ownedMemberships = memberships.filter(m => m.role === 'owner')
  const sharedMemberships = memberships.filter(m => m.role !== 'owner')

  return (
    <div ref={containerRef} data-tour="ws-user-menu" className="relative">

      {/* ── Trigger button ─────────────────────────────────────────────── */}
      <button
        ref={triggerRef}
        data-testid="ws-switcher-btn"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Switch workspace, current: ${currentWorkspace.name}`}
        className={cn(
          'flex items-center gap-2.5 rounded-xl border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
          align === 'left' && [
            'w-full px-3 py-2',
            'border-white/10 bg-white/8',
            'hover:border-white/20 hover:bg-white/12',
            open && 'border-white/20 bg-white/12',
          ],
          align === 'right' && [
            'px-2.5 py-1.5',
            'border-border/60 bg-transparent',
            'hover:bg-background-muted',
            open && 'bg-background-muted',
          ],
        )}
      >
        {currentWorkspace.logo_url ? (
          <WorkspaceLogo
            name={currentWorkspace.name}
            logoUrl={currentWorkspace.logo_url}
            className={cn('flex-shrink-0 rounded-lg object-contain', align === 'left' ? 'h-9 w-9 rounded-xl' : 'h-7 w-7')}
            fallbackClassName={align === 'left' ? 'h-9 w-9 rounded-xl bg-white/10 border border-white/15 text-white/70' : 'h-7 w-7 rounded-lg bg-background-muted border border-border text-foreground-lighter'}
            textClassName={align === 'left' ? 'text-[10px]' : 'text-[9px]'}
          />
        ) : (
          <div className={cn(
            'flex flex-shrink-0 items-center justify-center font-bold',
            align === 'left'
              ? 'h-9 w-9 rounded-xl text-[10px] bg-white/10 border border-white/15 text-white/70'
              : 'h-7 w-7 rounded-lg text-[9px] bg-background-muted border border-border text-foreground-lighter'
          )}>
            {getInitials(currentWorkspace.name)}
          </div>
        )}

        {align === 'left' ? (
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-[13px] font-semibold leading-tight text-white">
              {currentWorkspace.name}
            </p>
            <p className="text-[10px] leading-tight text-white/50">
              {ROLE_LABELS[currentRole]}
            </p>
          </div>
        ) : (
          <span className="max-w-[120px] truncate text-[13px] font-semibold text-foreground">
            {currentWorkspace.name}
          </span>
        )}

        <CaretUpDown size={13} className="flex-shrink-0 text-foreground-muted" />
      </button>

      {/* ── Dropdown ───────────────────────────────────────────────────── */}
      {open && (
        <>
          {/* Backdrop */}
          <div aria-hidden="true" className="fixed inset-0 z-10" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div
            role="listbox"
            aria-label="Workspaces"
            className={cn(
              'absolute top-full z-20 mt-1 w-60 overflow-hidden rounded-xl border border-border bg-background-surface shadow-lg',
              align === 'right' ? 'right-0' : 'left-0'
            )}
          >

            {/* ── Team row ── */}
            {agency && (
              <>
                <div className="px-1.5 pt-1.5">
                  <Link
                    href={`/agency/${agency.slug}/settings`}
                    onClick={close}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-background-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                  >
                    <div className="flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-md overflow-hidden bg-background-muted border border-border">
                      <Users size={12} className="text-foreground-lighter" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold text-foreground">Team</p>
                      <p className="text-[10px] text-foreground-muted">Team settings</p>
                    </div>
                  </Link>
                </div>
                <div className="mx-1.5 my-1 h-px bg-border" />
              </>
            )}

            {/* ── Workspaces ── */}
            <p className="px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-widest text-foreground-muted">
              Workspaces
            </p>

            {ownedMemberships.map(({ workspaces: ws, role }) => (
              <button
                key={ws.id}
                role="option"
                aria-selected={ws.id === currentWorkspace.id}
                onClick={() => {
                  router.push(`/${ws.slug}/overview`)
                  close()
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-background-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
              >
                {ws.logo_url ? (
                  <WorkspaceLogo
                    name={ws.name}
                    logoUrl={ws.logo_url}
                    className="h-5 w-5 flex-shrink-0 rounded-md object-contain"
                    fallbackClassName="h-5 w-5 rounded-md bg-background-muted border border-border text-foreground-lighter"
                    textClassName="text-[8px]"
                  />
                ) : (
                  <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-background-muted border border-border text-[8px] font-bold text-foreground-lighter">
                    {getInitials(ws.name)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium text-foreground">
                    {ws.name}
                  </p>
                  <p className="text-[10px] text-foreground-muted">
                    {ROLE_LABELS[role]}
                  </p>
                </div>
                {ws.id === currentWorkspace.id && (
                  <Check size={12} className="flex-shrink-0 text-brand" />
                )}
              </button>
            ))}

            {/* ── Add workspace ── */}
            {agency && (
              <div className="px-1.5 pb-1.5">
                <button
                  onClick={handleInviteBrand}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-background-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                >
                  <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border border-dashed border-brand/40 bg-brand/5 text-[11px] text-brand">+</div>
                  <span className="text-[12px] font-medium text-brand">Add Workspace</span>
                </button>
              </div>
            )}

            {/* ── Shared Workspaces ── */}
            {sharedMemberships.length > 0 && (
              <>
                <div className="mx-1.5 my-1 h-px bg-border" />
                <p className="px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-widest text-foreground-muted">
                  Shared Workspaces
                </p>
                {sharedMemberships.map(({ workspaces: ws, role }) => (
                  <button
                    key={ws.id}
                    role="option"
                    aria-selected={ws.id === currentWorkspace.id}
                    onClick={() => {
                      router.push(`/${ws.slug}/overview`)
                      close()
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-background-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                  >
                    {ws.logo_url ? (
                      <WorkspaceLogo
                        name={ws.name}
                        logoUrl={ws.logo_url}
                        className="h-5 w-5 flex-shrink-0 rounded-md object-contain"
                        fallbackClassName="h-5 w-5 rounded-md bg-background-muted border border-border text-foreground-lighter"
                        textClassName="text-[8px]"
                      />
                    ) : (
                      <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-background-muted border border-border text-[8px] font-bold text-foreground-lighter">
                        {getInitials(ws.name)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium text-foreground">{ws.name}</p>
                      <p className="text-[10px] text-foreground-muted">{ROLE_LABELS[role]}</p>
                    </div>
                    {ws.id === currentWorkspace.id && (
                      <Check size={12} className="flex-shrink-0 text-brand" />
                    )}
                  </button>
                ))}
              </>
            )}

            {/* ── Divider ── */}
            <div className="mx-1.5 my-1 h-px bg-border" />

            {/* ── User profile row ── */}
            <div className="px-1.5">
              <Link
                href="/account/settings"
                onClick={close}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-background-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
              >
                <div className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full overflow-hidden border border-border">
                  {user.avatarUrl ? (
                    <Image src={user.avatarUrl} alt={user.displayName} width={26} height={26} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-background-muted text-[9px] font-bold text-foreground-light">
                      {userInitials}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-foreground">{user.displayName}</p>
                  <p className="truncate text-[10px] text-foreground-muted">{user.email}</p>
                  <p className="text-[10px] text-brand">Account settings</p>
                </div>
              </Link>
            </div>

            {/* ── Log out ── */}
            <div className="px-1.5 pb-1.5">
              <button
                onClick={() => { close(); setShowLogoutConfirm(true) }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-destructive/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50"
              >
                <SignOut size={13} className="flex-shrink-0 text-destructive" />
                <span className="text-[12px] font-medium text-destructive">Log out</span>
              </button>
            </div>

          </div>
        </>
      )}

      {/* ── Logout confirmation dialog ── */}
      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Sign out?</DialogTitle>
            <DialogDescription>You&apos;ll be redirected to the login page.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setShowLogoutConfirm(false)}>Cancel</Button>
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
