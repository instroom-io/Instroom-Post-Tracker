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
    { label: 'Dashboard', href: `/agency/${agencySlug}/dashboard` },
    { label: 'Settings',  href: `/agency/${agencySlug}/settings`  },
  ]

  return (
    <nav className="flex items-center gap-4">
      {links.map(({ label, href }) => {
        const isActive = pathname === href
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'text-[13px] transition-colors',
              isActive
                ? 'font-semibold text-foreground border-b-2 border-brand pb-[1px]'
                : 'font-medium text-foreground-lighter hover:text-foreground'
            )}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
