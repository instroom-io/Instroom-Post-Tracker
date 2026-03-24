'use client'

import { useState } from 'react'

interface AgencyLogoImageProps {
  src: string
  alt: string
  className?: string
}

export function AgencyLogoImage({ src, alt, className }: AgencyLogoImageProps) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />
  )
}
