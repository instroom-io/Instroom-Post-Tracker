'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import type { User } from '@supabase/supabase-js'
import { Question, SquaresFour, Megaphone, Users, ChartBar, GearSix, SidebarSimple, List } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useTour } from '@/lib/hooks/use-tour'
import { TourProvider } from '@/components/tour/tour-provider'
import { cn } from '@/lib/utils'
import type { Workspace, WorkspaceRole } from '@/lib/types'
import { WorkspaceSwitcher } from './workspace-switcher'
import { ThemeToggle } from './theme-toggle'
import { TrialBanner } from './trial-banner'
import type { PlanType } from '@/lib/utils/plan'

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

interface NavItemsProps {
  workspaceSlug: string
  pathname: string
  isCollapsed: boolean
  startTour: (tourId: 'agency' | 'workspace' | 'campaign' | 'campaigns-list') => void
  onItemClick?: () => void
}

function NavItems({ workspaceSlug, pathname, isCollapsed, startTour, onItemClick }: NavItemsProps) {
  return (
    <>
      {NAV_ITEMS.map((item) => {
        const href = item.href(workspaceSlug)
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link key={item.label} href={href} aria-current={isActive ? 'page' : undefined} onClick={onItemClick} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 rounded-lg block">
            <motion.div
              data-tour={item.tourId}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'mb-0.5 flex items-center rounded-lg px-2.5 py-[7px] text-[12px] transition-colors',
                isCollapsed ? 'justify-center gap-0' : 'gap-2.5',
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
                {!isCollapsed && (
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
          onClick={() => { startTour('workspace'); onItemClick?.() }}
          className={cn(
            'w-full text-foreground-muted hover:text-brand',
            isCollapsed ? 'justify-center px-0' : 'justify-start gap-2'
          )}
        >
          <Question size={14} className="flex-shrink-0" />
          <AnimatePresence>
            {!isCollapsed && (
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
    </>
  )
}

interface AppShellProps {
  children: React.ReactNode
  user: User
  currentWorkspace: Workspace
  currentRole: WorkspaceRole
  allMemberships: Array<{ role: WorkspaceRole; workspaces: Workspace }>
  workspaceSlug: string
  agency?: { id: string; name: string; slug: string; logo_url?: string | null } | null
  plan?: PlanType
  /** Pre-computed server-side via computeDaysRemaining() — keeps Date.now() out of client render. */
  daysRemaining?: number
}

export function AppShell({
  children,
  user,
  currentWorkspace,
  currentRole,
  allMemberships,
  workspaceSlug,
  agency,
  plan,
  daysRemaining,
}: AppShellProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { startTour } = useTour()

  const displayName = (user.user_metadata?.full_name as string | undefined) ?? user.email?.split('@')[0] ?? ''
  const avatarUrl = (user.user_metadata?.avatar_url as string | undefined) ?? null

  // Auto-collapse sidebar on small screens; close mobile drawer when resizing up
  useEffect(() => {
    const checkWidth = () => {
      setCollapsed(window.innerWidth < 1024)
      if (window.innerWidth >= 768) setMobileNavOpen(false)
    }
    checkWidth()
    window.addEventListener('resize', checkWidth)
    return () => window.removeEventListener('resize', checkWidth)
  }, [])

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname])

  return (
    <>
    <div className="flex h-dvh flex-col overflow-hidden bg-background">

      {/* ── Trial banner — full-width above sidebar+content ──────────────────── */}
      {plan !== undefined && daysRemaining !== undefined && (
        <TrialBanner
          plan={plan}
          daysRemaining={daysRemaining}
          upgradeHref="/account/upgrade"
          role={currentRole}
        />
      )}

      {/* ── Sidebar + content row ─────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

      {/* ── Mobile overlay drawer ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
              onClick={() => setMobileNavOpen(false)}
            />
            {/* Drawer panel */}
            <motion.aside
              initial={{ x: -220 }}
              animate={{ x: 0 }}
              exit={{ x: -220 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="fixed left-0 top-0 bottom-0 z-50 flex w-[220px] flex-col border-r border-border bg-background-overlay md:hidden"
            >
              <div className="flex h-14 flex-shrink-0 items-center border-b border-border px-4">
                <Link href={`/${workspaceSlug}/overview`} onClick={() => setMobileNavOpen(false)} className="opacity-100 transition-opacity hover:opacity-75">
                  <Image src="/POST_TRACKER.svg" alt="Instroom Post Tracker" width={140} height={32} />
                </Link>
              </div>
              <nav className="flex-1 overflow-y-auto px-2 pt-3">
                <NavItems workspaceSlug={workspaceSlug} pathname={pathname} isCollapsed={false} startTour={startTour} onItemClick={() => setMobileNavOpen(false)} />
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Sidebar (tablet + desktop only) ──────────────────────────────────── */}
      <aside
        className={cn(
          'relative hidden md:flex flex-shrink-0 flex-col border-r border-border bg-background-overlay transition-all duration-200 ease-in-out',
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
          <NavItems workspaceSlug={workspaceSlug} pathname={pathname} isCollapsed={collapsed} startTour={startTour} />
        </nav>

      </aside>

      {/* ── Main content column ──────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Top bar — sidebar toggle left, controls right */}
        <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border bg-background-surface px-4 shadow-xs">
          {/* Mobile: hamburger to open drawer */}
          <button
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-background-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 md:hidden"
          >
            <List size={16} />
          </button>
          {/* Tablet/desktop: collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden md:flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-background-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
          >
            <SidebarSimple size={16} weight={collapsed ? 'fill' : 'regular'} />
          </button>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {/* Agency logo — only shown for agency members; solo/team profile is in the workspace switcher dropdown */}
            {agency?.logo_url && (
              <div
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg overflow-hidden bg-background-muted ring-1 ring-border"
                title={agency.name}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={agency.logo_url} alt={agency.name} className="h-full w-full object-contain" />
              </div>
            )}
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

      </div>{/* end sidebar+content row */}
    </div>{/* end outer flex-col */}
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
