import { SiInstagram, SiTiktok, SiYoutube } from '@icons-pack/react-simple-icons'

type Platform = 'instagram' | 'tiktok' | 'youtube'

interface PlatformIconProps {
  platform: Platform
  size?: number
  className?: string
}

const PLATFORM_COLORS: Record<Platform, string> = {
  instagram: '#A855F7',
  tiktok:    '#3B82F6',
  youtube:   '#EF4444',
}

const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: 'Instagram',
  tiktok:    'TikTok',
  youtube:   'YouTube',
}

const PLATFORM_ICONS = {
  instagram: SiInstagram,
  tiktok:    SiTiktok,
  youtube:   SiYoutube,
}

/** Renders the platform's logo icon at the given size using the project's platform color. */
export function PlatformIcon({ platform, size = 16, className }: PlatformIconProps) {
  const Icon = PLATFORM_ICONS[platform]
  return <Icon size={size} color={PLATFORM_COLORS[platform]} className={className} aria-label={PLATFORM_LABELS[platform]} />
}

/** Renders the platform logo + name side by side — use in form labels and footers. */
export function PlatformLogo({ platform, size = 14, className }: PlatformIconProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className ?? ''}`}>
      <PlatformIcon platform={platform} size={size} />
      <span>{PLATFORM_LABELS[platform]}</span>
    </span>
  )
}
