'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface AgencyNavProps {
  agencySlug: string
}

export function AgencyNav({ agencySlug }: AgencyNavProps) {
  const pathname = usePathname()

  const links = [
    { label: 'Dashboard', href: `/agency/${agencySlug}/dashboard`, tourId: 'agency-dashboard' as string | null },
    { label: 'Brands',    href: `/agency/${agencySlug}/brands`,    tourId: 'agency-brands'    as string | null },
    { label: 'Requests',  href: `/agency/${agencySlug}/requests`,  tourId: 'agency-requests'  as string | null },
    { label: 'Settings',  href: `/agency/${agencySlug}/settings`,  tourId: 'agency-settings'  as string | null },
  ]

  return (
    <nav className="flex items-center gap-1 border-b border-border px-6">
      {links.map(({ label, href, tourId }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            {...(tourId ? { 'data-tour': tourId } : {})}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'inline-flex items-center border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors',
              isActive
                ? 'border-brand text-foreground'
                : 'border-transparent text-foreground-muted hover:text-foreground'
            )}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
