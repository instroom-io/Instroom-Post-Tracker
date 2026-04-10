import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  // State is JSON-encoded { returnTo, agencyId }. Fall back to plain string for safety.
  let returnTo = '/account/settings'
  let agencyId: string | null = null
  let section: string | null = null
  try {
    const parsed = JSON.parse(searchParams.get('state') ?? '{}') as { returnTo?: string; agencyId?: string | null; section?: string | null }
    returnTo = parsed.returnTo ?? returnTo
    agencyId = parsed.agencyId ?? null
    section = parsed.section ?? null
  } catch {
    returnTo = searchParams.get('state') ?? returnTo
  }

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}${returnTo}?error=google_drive_denied`)
  }

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      redirect_uri: `${appUrl}/api/auth/google-drive/callback`,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}/account/settings?error=google_drive_token`)
  }

  const tokens = await tokenRes.json() as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  // Get connected Google email for display
  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  const googleUser = userInfoRes.ok
    ? (await userInfoRes.json() as { email?: string })
    : null

  // Get current Supabase user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${appUrl}/login`)

  // Service client required — RLS blocks users from writing their own token columns.
  const serviceClient = createServiceClient()

  if (agencyId) {
    // Agency flow → store credentials on the agencies table (BIGINT unix seconds for expiry)
    const tokenExpiryEpoch = Math.floor(Date.now() / 1000) + (tokens.expires_in ?? 3600)
    await serviceClient
      .from('agencies')
      .update({
        google_refresh_token: tokens.refresh_token,
        google_access_token: tokens.access_token,
        google_token_expiry: tokenExpiryEpoch,
        google_connected_email: googleUser?.email ?? null,
      })
      .eq('id', agencyId)
  } else {
    // Personal flow → store credentials on the users table (ISO string for expiry)
    const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    await serviceClient
      .from('users')
      .update({
        google_refresh_token: tokens.refresh_token,
        google_access_token: tokens.access_token,
        google_token_expiry: tokenExpiry,
        google_connected_email: googleUser?.email ?? null,
      })
      .eq('id', user.id)
  }

  const redirectUrl = new URL(`${appUrl}${returnTo}`)
  if (section) redirectUrl.searchParams.set('section', section)
  redirectUrl.searchParams.set('connected', 'google_drive')
  return NextResponse.redirect(redirectUrl.toString())
}
