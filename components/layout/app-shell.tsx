'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import type { User } from '@supabase/supabase-js'
import {
  LayoutDashboard,
  Megaphone,
  Users,
  FileText,
  BarChart2,
  Settings,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
} from 'lucide-react'
import { useTour } from '@/lib/hooks/use-tour'
import { TourProvider } from '@/components/tour/tour-provider'
import { cn } from '@/lib/utils'
import type { Workspace, WorkspaceRole } from '@/lib/types'
import { WorkspaceSwitcher } from './workspace-switcher'
import { UserMenu } from './user-menu'
import { ThemeToggle } from './theme-toggle'

interface NavItem {
  label: string
  href: (slug: string) => string
  icon: React.ElementType
  tourId: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview',    href: (s) => `/${s}/overview`,    icon: LayoutDashboard, tourId: 'ws-overview'    },
  { label: 'Campaigns',   href: (s) => `/${s}/campaigns`,   icon: Megaphone,       tourId: 'ws-campaigns'   },
  { label: 'Influencers', href: (s) => `/${s}/influencers`, icon: Users,           tourId: 'ws-influencers' },
  { label: 'Posts',       href: (s) => `/${s}/posts`,       icon: FileText,        tourId: 'ws-posts'       },
  { label: 'Analytics',   href: (s) => `/${s}/analytics`,   icon: BarChart2,       tourId: 'ws-analytics'   },
  { label: 'Settings',    href: (s) => `/${s}/settings`,    icon: Settings,        tourId: 'ws-settings'    },
]

interface AppShellProps {
  children: React.ReactNode
  user: User
  currentWorkspace: Workspace
  currentRole: WorkspaceRole
  allMemberships: Array<{ role: WorkspaceRole; workspaces: Workspace }>
  workspaceSlug: string
  agency?: { name: string; slug: string } | null
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
        {/* Toggle button — straddles the sidebar border */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute right-0 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 translate-x-1/2 cursor-pointer items-center justify-center rounded-full border border-border bg-background-surface shadow-sm transition-colors hover:bg-background-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
        >
          {collapsed
            ? <ChevronRight size={10} className="text-foreground-lighter" />
            : <ChevronLeft size={10} className="text-foreground-lighter" />
          }
        </button>

        {/* Logo area */}
        <div
          className={cn(
            'flex h-14 flex-shrink-0 items-center border-b border-border',
            collapsed ? 'justify-center px-0' : 'px-4'
          )}
        >
          {collapsed
            ? <Image src="/INSTROOM_LOGO.svg" alt="Instroom" width={32} height={32} />
            : <Image src="/POST_TRACKER.svg" alt="Instroom Post Tracker" width={140} height={32} />
          }
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 pt-3">

          {/* Agency back-link — only visible to agency owners */}
          {agency && (
            <div className="mb-2">
              <Link
                href={`/agency/${agency.slug}/dashboard`}
                className={cn(
                  'flex items-center rounded-lg px-2.5 py-[7px] text-[11px] text-foreground-muted transition-colors hover:bg-brand-muted hover:text-brand',
                  collapsed ? 'justify-center gap-0' : 'gap-1.5'
                )}
              >
                <ChevronLeft size={12} className="shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="overflow-hidden truncate whitespace-nowrap"
                    >
                      {agency.name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            </div>
          )}

          <AnimatePresence>
            {!collapsed && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-widest text-foreground-muted"
              >
                Menu
              </motion.p>
            )}
          </AnimatePresence>

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
                    className={cn(isActive ? 'text-foreground' : '')}
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
            <button
              onClick={() => startTour('workspace')}
              className={cn(
                'flex w-full items-center rounded-lg px-2.5 py-[7px] text-[11px] text-foreground-muted transition-colors hover:bg-brand-muted hover:text-brand',
                collapsed ? 'justify-center gap-0' : 'gap-2'
              )}
            >
              <HelpCircle size={14} className="flex-shrink-0" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    Take a tour
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>

        </nav>

        {/* User menu — hidden when collapsed */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="border-t border-border p-2.5"
            >
              <UserMenu user={user} />
            </motion.div>
          )}
        </AnimatePresence>
      </aside>

      {/* ── Main content column ──────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Top bar — theme toggle + workspace switcher right-aligned */}
        <div className="flex h-14 flex-shrink-0 items-center justify-end gap-3 border-b border-border bg-background-surface px-6">
          <ThemeToggle />
          <WorkspaceSwitcher
            currentWorkspace={currentWorkspace}
            currentRole={currentRole}
            memberships={allMemberships}
            align="right"
          />
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
