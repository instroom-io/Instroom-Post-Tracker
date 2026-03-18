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
  Image as ImageIcon,
  BarChart2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Building2,
} from 'lucide-react'
import { Toaster } from 'sonner'
import { cn } from '@/lib/utils'
import type { Workspace, WorkspaceRole } from '@/lib/types'
import { WorkspaceSwitcher } from './workspace-switcher'
import { UserMenu } from './user-menu'
import { ThemeToggle } from './theme-toggle'

interface NavItem {
  label: string
  href: (slug: string) => string
  icon: React.ElementType
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview',    href: (s) => `/${s}/overview`,    icon: LayoutDashboard },
  { label: 'Campaigns',   href: (s) => `/${s}/campaigns`,   icon: Megaphone },
  { label: 'Influencers', href: (s) => `/${s}/influencers`, icon: Users },
  { label: 'Posts',       href: (s) => `/${s}/posts`,       icon: ImageIcon },
  { label: 'Analytics',   href: (s) => `/${s}/analytics`,   icon: BarChart2 },
  { label: 'Settings',    href: (s) => `/${s}/settings`,    icon: Settings },
]

interface AppShellProps {
  children: React.ReactNode
  user: User
  currentWorkspace: Workspace
  currentRole: WorkspaceRole
  allMemberships: Array<{ role: WorkspaceRole; workspaces: Workspace }>
  workspaceSlug: string
  pendingRequestCount?: number
}

export function AppShell({
  children,
  user,
  currentWorkspace,
  currentRole,
  allMemberships,
  workspaceSlug,
  pendingRequestCount,
}: AppShellProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

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
          'relative flex flex-shrink-0 flex-col border-r border-white/10 bg-background-overlay transition-all duration-200 ease-in-out',
          collapsed ? 'w-[56px]' : 'w-[220px]'
        )}
      >
        {/* Toggle button — straddles the sidebar border */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute right-0 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 translate-x-1/2 cursor-pointer items-center justify-center rounded-full border border-border bg-background-surface shadow-sm transition-colors hover:bg-background-muted"
        >
          {collapsed
            ? <ChevronRight size={10} className="text-foreground-lighter" />
            : <ChevronLeft size={10} className="text-foreground-lighter" />
          }
        </button>

        {/* Logo area */}
        <div
          className={cn(
            'flex h-14 flex-shrink-0 items-center border-b border-white/10',
            collapsed ? 'justify-center px-0' : 'px-4'
          )}
        >
          {collapsed
            ? <Image src="/INSTROOM_LOGO.svg" alt="Instroom" width={32} height={32} className="brightness-0 invert" />
            : <Image src="/POST_TRACKER.svg" alt="Instroom Post Tracker" width={140} height={32} className="brightness-0 invert" />
          }
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 pt-4">
          <AnimatePresence>
            {!collapsed && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-widest text-white/35"
              >
                Menu
              </motion.p>
            )}
          </AnimatePresence>

          {NAV_ITEMS.map((item) => {
            const href = item.href(workspaceSlug)
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link key={item.label} href={href}>
                <motion.div
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'mb-0.5 flex items-center rounded-lg px-2.5 py-[7px] text-[12px] transition-colors',
                    collapsed ? 'justify-center gap-0' : 'gap-2.5',
                    isActive
                      ? 'border border-white/15 bg-white/[0.12] font-medium text-white'
                      : 'text-white/55 hover:bg-white/[0.08] hover:text-white/85'
                  )}
                >
                  <item.icon
                    size={14}
                    className={cn(isActive ? 'text-white' : 'text-white/50')}
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

          {/* Agency section — visible only for owners */}
          {currentRole === 'owner' && (
            <>
              <AnimatePresence>
                {!collapsed && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="mb-1.5 mt-4 px-2.5 text-[10px] font-semibold uppercase tracking-widest text-white/35"
                  >
                    Agency
                  </motion.p>
                )}
              </AnimatePresence>
              <Link href="/agency/requests">
                <motion.div
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'mb-0.5 flex items-center rounded-lg px-2.5 py-[7px] text-[12px] transition-colors',
                    collapsed ? 'justify-center gap-0' : 'gap-2.5',
                    pathname === '/agency/requests'
                      ? 'border border-white/15 bg-white/[0.12] font-medium text-white'
                      : 'text-white/55 hover:bg-white/[0.08] hover:text-white/85'
                  )}
                >
                  <Building2
                    size={14}
                    className={cn(pathname === '/agency/requests' ? 'text-white' : 'text-white/50')}
                  />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="overflow-hidden whitespace-nowrap"
                      >
                        Brand Requests
                        {typeof pendingRequestCount === 'number' && pendingRequestCount > 0 && (
                          <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-bold text-white">
                            {pendingRequestCount}
                          </span>
                        )}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            </>
          )}
        </nav>

        {/* User menu — hidden when collapsed */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="border-t border-white/10 p-2.5"
            >
              <UserMenu user={user} />
            </motion.div>
          )}
        </AnimatePresence>
      </aside>

      {/* ── Main content column ──────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Top bar — theme toggle + workspace switcher right-aligned */}
        <div className="flex h-14 flex-shrink-0 items-center justify-end gap-3 border-b border-border bg-background-surface px-5">
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
    <Toaster position="bottom-right" richColors />
    </>
  )
}
