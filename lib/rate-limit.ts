import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

type Duration = `${number} ${'ms' | 's' | 'm' | 'h' | 'd'}`

// Initialize Redis — gracefully skip if env vars are missing
let redis: Redis | null = null
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
}

function rl(requests: number, window: Duration): Ratelimit | null {
  if (!redis) return null
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    ephemeralCache: new Map(),
  })
}

export const limiters = {
  // Edge layer — applied in proxy.ts
  edgeBroad:         rl(60,  '1 m'),
  // Auth
  signinByIp:        rl(5,   '5 m'),
  signinByEmail:     rl(10,  '15 m'),
  signup:            rl(3,   '1 h'),
  passwordReset:     rl(5,   '1 h'),
  // Public forms
  agencyRequest:     rl(3,   '1 h'),
  contactInquiry:    rl(10,  '1 h'),
  brandInviteAccept: rl(5,   '1 h'),
  // API proxies
  proxyImage:        rl(500, '1 h'),
  proxyDrive:        rl(100, '1 h'),
  // Expensive Drive operations (by user ID)
  triggerDownload:   rl(30,  '1 h'),
  saveToUserDrive:   rl(50,  '1 h'),
  // Authenticated actions (by user ID)
  inviteBrand:       rl(50,  '1 h'),
  uploadLogo:        rl(20,  '1 h'),
  // Public reads
  agenciesPublic:    rl(300, '1 h'),
} as const

/**
 * Extract the client IP from request headers.
 * For use in Server Actions and Node.js Route Handlers only.
 * proxy.ts (Edge) must extract IP directly from the NextRequest object.
 */
export async function getRequestIp(): Promise<string> {
  try {
    const { headers } = await import('next/headers')
    const h = await headers()
    return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
  } catch {
    return '127.0.0.1'
  }
}

/**
 * Rate limit check for Server Actions.
 * Returns { error } if rate limited, null if the request is allowed.
 * Fails open if Upstash is unavailable.
 */
export async function checkActionLimit(
  identifier: string,
  limiter: Ratelimit | null
): Promise<{ error: string } | null> {
  if (!limiter) return null
  try {
    const { success } = await limiter.limit(identifier)
    if (!success) return { error: 'Too many requests. Please try again later.' }
  } catch {
    // Fail open — Upstash downtime must not break the app
  }
  return null
}

/**
 * Rate limit check for API Route Handlers.
 * Returns a 429 Response if rate limited, null if allowed.
 * Fails open if Upstash is unavailable.
 */
export async function checkRouteLimit(
  identifier: string,
  limiter: Ratelimit | null
): Promise<Response | null> {
  if (!limiter) return null
  try {
    const { success, reset } = await limiter.limit(identifier)
    if (!success) {
      const retryAfter = Math.max(Math.ceil((reset - Date.now()) / 1000), 1)
      return new Response('Too many requests.', {
        status: 429,
        headers: { 'Retry-After': String(retryAfter) },
      })
    }
  } catch {
    // Fail open
  }
  return null
}
