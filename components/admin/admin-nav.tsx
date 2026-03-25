'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const LINKS = [
  { label: 'Overview', href: '/admin' },
  { label: 'Agencies', href: '/admin/agencies' },
]

export function AdminNav() {
  const pathname = usePathname()
  return (
    <nav className="flex items-center gap-4">
      {LINKS.map(({ label, href }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
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
