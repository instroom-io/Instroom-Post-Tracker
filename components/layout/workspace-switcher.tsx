'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/utils'
import type { Workspace, WorkspaceRole } from '@/lib/types'

const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
}

interface WorkspaceSwitcherProps {
  currentWorkspace: Workspace
  currentRole: WorkspaceRole
  memberships: Array<{ role: WorkspaceRole; workspaces: Workspace }>
  align?: 'left' | 'right'
}

export function WorkspaceSwitcher({
  currentWorkspace,
  currentRole,
  memberships,
  align = 'left',
}: WorkspaceSwitcherProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">

      {/* ── Trigger button ─────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2.5 rounded-xl border transition-colors',
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
        {/* Workspace avatar — square with rounded corners (Shopify-style) */}
        {currentWorkspace.logo_url ? (
          <Image
            src={currentWorkspace.logo_url}
            alt={currentWorkspace.name}
            width={align === 'left' ? 36 : 28}
            height={align === 'left' ? 36 : 28}
            className={cn(
              'flex-shrink-0 rounded-lg object-cover',
              align === 'left' ? 'h-9 w-9 rounded-xl' : 'h-7 w-7'
            )}
          />
        ) : (
          <div className={cn(
            'flex flex-shrink-0 items-center justify-center bg-brand font-bold text-white',
            align === 'left' ? 'h-9 w-9 rounded-xl text-[10px]' : 'h-7 w-7 rounded-lg text-[9px]'
          )}>
            {getInitials(currentWorkspace.name)}
          </div>
        )}

        {/* Workspace name (+ role only in sidebar/left variant) */}
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

        <ChevronsUpDown size={13} className="flex-shrink-0 text-foreground-muted" />
      </button>

      {/* ── Dropdown ───────────────────────────────────────────────────── */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div
            className={cn(
              'absolute top-full z-20 mt-1 w-56 overflow-hidden rounded-lg border border-border bg-background-surface shadow-xl',
              align === 'right' ? 'right-0' : 'left-0'
            )}
          >
            <p className="px-3 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-widest text-foreground-muted">
              Workspaces
            </p>

            {memberships.map(({ workspaces: ws, role }) => (
              <button
                key={ws.id}
                onClick={() => {
                  router.push(`/${ws.slug}/overview`)
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-background-muted"
              >
                <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand/20 text-[8px] font-bold text-brand">
                  {getInitials(ws.name)}
                </div>
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

          </div>
        </>
      )}
    </div>
  )
}
