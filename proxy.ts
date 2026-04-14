import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { limiters } from '@/lib/rate-limit'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          )
        },
      },
    }
  )

  // Refresh session — must call getUser() to keep the session alive
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Public paths that don't require auth
  const publicPaths = [
    '/',
    '/login',
    '/signup',
    '/auth/callback',
    '/invite',
    '/brand-invite',
    '/request-access',
    '/upgrade',
    '/onboarding',
    '/no-access',
    '/forgot-password',
    '/reset-password',
  ]

  const isPublicPath =
    publicPaths.some((p) => pathname === p || pathname.startsWith(p + '/')) ||
    pathname.startsWith('/api/dev/')

  // ── Edge rate limit — broad IP throttle on all public paths ─────────────────
  if (isPublicPath && limiters.edgeBroad) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
    const { success } = await limiters.edgeBroad.limit(`edge:${ip}`)
    if (!success) {
      return new NextResponse('Too many requests.', {
        status: 429,
        headers: { 'Retry-After': '60' },
      })
    }
  }

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|ogg|mov)$).*)',
  ],
}
