import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// ─── Class Name Utility ───────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Influencer Helpers ───────────────────────────────────────────────────────

export function getInfluencerLabel(inf: {
  tiktok_handle?: string | null
  ig_handle?: string | null
  youtube_handle?: string | null
}): string {
  return inf.tiktok_handle || inf.ig_handle || inf.youtube_handle || 'Unknown'
}

// ─── Date Formatters ──────────────────────────────────────────────────────────

export function formatDate(date: string | Date, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(timeZone ? { timeZone } : {}),
  }).format(new Date(date))
}

export function formatRelativeDate(date: string | Date, timeZone?: string): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return formatDate(date, timeZone)
}

export function formatDateRange(startDate: string, endDate: string | null): string {
  const start = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(startDate))
  if (!endDate) return `${start} – ongoing`
  const end = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(endDate))
  return `${start} – ${end}`
}

// ─── Number Formatters ────────────────────────────────────────────────────────

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export function formatEMV(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

// ─── Email Utilities ──────────────────────────────────────────────────────────

const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'yahoo.co.uk', 'yahoo.com.ph',
  'hotmail.com', 'hotmail.co.uk', 'outlook.com', 'outlook.ph',
  'live.com', 'icloud.com', 'me.com', 'mac.com',
  'aol.com', 'protonmail.com', 'proton.me',
  'gmx.com', 'gmx.net', 'yandex.com', 'mail.com',
])

export function isPersonalEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  return domain ? PERSONAL_EMAIL_DOMAINS.has(domain) : false
}

// ─── String Utilities ─────────────────────────────────────────────────────────

export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ─── Google Drive Utilities ───────────────────────────────────────────────────

export function extractDriveFolderId(input: string): string {
  const match = input.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : input.trim()
}

// ─── Slug Utilities ───────────────────────────────────────────────────────────

/**
 * Returns `base` if not in `taken`, otherwise appends `-2`, `-3`, etc.
 * Pure function — caller is responsible for fetching taken slugs from DB.
 */
export function deduplicateSlug(base: string, taken: string[]): string {
  if (!taken.includes(base)) return base
  let i = 2
  while (taken.includes(`${base}-${i}`)) i++
  return `${base}-${i}`
}

/** Normalizes any URL-like string to https://. Accepts https://x, http://x, www.x, or bare x.com */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return trimmed
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

