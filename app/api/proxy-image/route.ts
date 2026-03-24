import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_DOMAINS = ['cdninstagram.com', 'fbcdn.net', 'instagram.com']

export async function GET(request: NextRequest) {
  const imageUrl = request.nextUrl.searchParams.get('url')
  if (!imageUrl) return new NextResponse('Missing url', { status: 400 })

  if (!ALLOWED_DOMAINS.some((d) => imageUrl.includes(d))) {
    return new NextResponse('Domain not allowed', { status: 403 })
  }

  try {
    const res = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible)',
        Accept: 'image/*',
      },
    })
    if (!res.ok) return new NextResponse('Upstream error', { status: 502 })

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
