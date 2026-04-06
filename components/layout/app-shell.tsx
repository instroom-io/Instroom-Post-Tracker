'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import type { User } from '@supabase/supabase-js'
import { Question, SquaresFour, Megaphone, Users, ChartBar, GearSix, SidebarSimple } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useTour } from '@/lib/hooks/use-tour'
import { TourProvider } from '@/components/tour/tour-provider'
import { cn } from '@/lib/utils'
import type { Workspace, WorkspaceRole } from '@/lib/types'
import { WorkspaceSwitcher } from './workspace-switcher'
import { ThemeToggle } from './theme-toggle'

interface NavItem {
  label: string
  href: (slug: string) => string
  icon: React.ElementType
  tourId: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview',     href: (s) => `/${s}/overview`,     icon: SquaresFour, tourId: 'ws-overview'     },
  { label: 'Campaigns',    href: (s) => `/${s}/campaigns`,    icon: Megaphone,   tourId: 'ws-campaigns'    },
  { label: 'Influencers',  href: (s) => `/${s}/influencers`,  icon: Users,       tourId: 'ws-influencers'  },
  { label: 'Analytics',    href: (s) => `/${s}/analytics`,    icon: ChartBar,    tourId: 'ws-analytics'    },
  { label: 'Settings',     href: (s) => `/${s}/settings`,     icon: GearSix,     tourId: 'ws-settings'     },
]

interface AppShellProps {
  children: React.ReactNode
  user: User
  currentWorkspace: Workspace
  currentRole: WorkspaceRole
  allMemberships: Array<{ role: WorkspaceRole; workspaces: Workspace }>
  workspaceSlug: string
  agency?: { id: string; name: string; slug: string; logo_url?: string | null } | null
}

export function AppShell({
  children,
  user,
  currentWorkspace,
  currentRole,
  allMemberships,
  workspaceSlug,
  agency,
}: AppShellProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const { startTour } = useTour()

  const displayName = (user.user_metadata?.full_name as string | undefined) ?? user.email?.split('@')[0] ?? ''
  const avatarUrl = (user.user_metadata?.avatar_url as string | undefined) ?? null

  // Auto-collapse sidebar on small screens
  useEffect(() => {
    const checkWidth = () => setCollapsed(window.innerWidth < 1024)
    checkWidth()
    window.addEventListener('resize', checkWidth)
    return () => window.removeEventListener('resize', checkWidth)
  }, [])

  return (
    <>
    <div className="flex h-screen overflow-hidden bg-background">

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside
        className={cn(
          'relative flex flex-shrink-0 flex-col border-r border-border bg-background-overlay transition-all duration-200 ease-in-out',
          collapsed ? 'w-[56px]' : 'w-[220px]'
        )}
      >
        {/* Logo area */}
        <div
          className={cn(
            'flex h-14 flex-shrink-0 items-center border-b border-border',
            collapsed ? 'justify-center px-0' : 'px-4'
          )}
        >
          <Link href={`/${workspaceSlug}/overview`} className="opacity-100 transition-opacity hover:opacity-75">
            {collapsed
              ? <Image src="/INSTROOM_LOGO.svg" alt="Instroom" width={32} height={32} />
              : <Image src="/POST_TRACKER.svg" alt="Instroom Post Tracker" width={140} height={32} />
            }
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 pt-3">

          {NAV_ITEMS.map((item) => {
            const href = item.href(workspaceSlug)
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link key={item.label} href={href} aria-current={isActive ? 'page' : undefined} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 rounded-lg block">
                <motion.div
                  data-tour={item.tourId}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'mb-0.5 flex items-center rounded-lg px-2.5 py-[7px] text-[12px] transition-colors',
                    collapsed ? 'justify-center gap-0' : 'gap-2.5',
                    isActive
                      ? 'relative bg-background-muted font-medium text-foreground before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-4 before:w-[3px] before:rounded-r-full before:bg-brand'
                      : 'text-foreground-lighter hover:bg-brand-muted hover:text-brand'
                  )}
                >
                  <item.icon
                    size={14}
                    weight={isActive ? 'fill' : 'regular'}
                    className={cn(isActive ? 'text-brand' : '')}
                  />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="overflow-hidden whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            )
          })}

          {/* Tour re-launch button */}
          <div className="mt-2 border-t border-border pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => startTour('workspace')}
              className={cn(
                'w-full text-foreground-muted hover:text-brand',
                collapsed ? 'justify-center px-0' : 'justify-start gap-2'
              )}
            >
              <Question size={14} className="flex-shrink-0" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="overflow-hidden whitespace-nowrap text-[11px]"
                  >
                    Take a tour
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </div>

        </nav>

      </aside>

      {/* ── Main content column ──────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Top bar — sidebar toggle left, controls right */}
        <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border bg-background-surface px-4 shadow-xs">
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-background-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
          >
            <SidebarSimple size={16} weight={collapsed ? 'fill' : 'regular'} />
          </button>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {/* Agency logo / user avatar */}
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg overflow-hidden bg-background-muted ring-1 ring-border"
              title={agency?.name || displayName || user.email}
            >
              {agency?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={agency.logo_url} alt={agency.name} className="h-full w-full object-contain" />
              ) : avatarUrl ? (
                <Image src={avatarUrl} alt={displayName} width={32} height={32} className="rounded-lg object-cover" />
              ) : (
                <span className="text-[11px] font-semibold text-foreground-lighter">
                  {(agency?.name || displayName || user.email?.split('@')[0] || '?').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <WorkspaceSwitcher
              currentWorkspace={currentWorkspace}
              currentRole={currentRole}
              memberships={allMemberships}
              align="right"
              agency={agency ?? null}
              user={{ displayName, email: user.email ?? '', avatarUrl }}
            />
          </div>
        </div>

        {/* Page content */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          {children}
        </div>

      </div>
    </div>
      <TourProvider tourId="workspace" />
      <WorkspaceTourAutoStart />
    </>
  )
}

function WorkspaceTourAutoStart() {
  const { hasSeenWorkspaceTour, startTour } = useTour()
  useEffect(() => {
    if (!hasSeenWorkspaceTour) {
      const t = setTimeout(() => startTour('workspace'), 600)
      return () => clearTimeout(t)
    }
  }, [hasSeenWorkspaceTour, startTour])
  return null
}
