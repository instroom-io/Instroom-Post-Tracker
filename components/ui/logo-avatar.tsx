'use client'

import { useState } from 'react'

export function LogoAvatar({ logoUrl, name }: { logoUrl: string | null; name: string }) {
  const [showFallback, setShowFallback] = useState(false)

  if (!logoUrl || showFallback) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-background text-[13px] font-bold">
        {name.charAt(0).toUpperCase()}
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt=""
      width={36}
      height={36}
      className="h-9 w-9 shrink-0 rounded-lg border border-border bg-background-subtle object-contain p-1"
      onError={() => setShowFallback(true)}
    />
  )
}
