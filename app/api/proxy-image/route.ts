import { NextRequest, NextResponse } from 'next/server'
import { checkRouteLimit, limiters } from '@/lib/rate-limit'

const ALLOWED_DOMAINS = [
  'cdninstagram.com',
  'fbcdn.net',
  'instagram.com',
  'tiktokcdn.com',       // p16-sign-*.tiktokcdn.com, p16-common-sign.tiktokcdn-eu.com, etc.
  'tiktokcdn-eu.com',
  'tiktokcdn-us.com',
]

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
  const rateLimitRes = await checkRouteLimit(`proxyimg:ip:${ip}`, limiters.proxyImage)
  if (rateLimitRes) return rateLimitRes

  const imageUrl = request.nextUrl.searchParams.get('url')
  if (!imageUrl) return new NextResponse('Missing url', { status: 400 })

  if (!ALLOWED_DOMAINS.some((d) => imageUrl.includes(d))) {
    return new NextResponse('Domain not allowed', { status: 403 })
  }

  const isTikTok = imageUrl.includes('tiktokcdn')
  try {
    const res = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        // TikTok CDN validates Referer — must appear to come from TikTok itself.
        ...(isTikTok && { Referer: 'https://www.tiktok.com/' }),
      },
    })
    if (!res.ok) {
      // CDN blocked the server-side fetch (403) — redirect browser to try the URL directly.
      // Browsers can load Instagram/Facebook CDN images directly even when Vercel IPs cannot.
      if (res.status === 403) return NextResponse.redirect(imageUrl)
      return new NextResponse('Upstream error', { status: 502 })
    }

    return new NextResponse(res.body, {
      headers: {
        'Content-Type': res.headers.get('Content-Type') ?? 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
      },
    })
  } catch {
    return new NextResponse('Failed', { status: 502 })
  }
}
