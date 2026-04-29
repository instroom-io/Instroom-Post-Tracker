import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Returns a valid Google access token for the given agency.
 * Reads from the agencies table (separate from personal user credentials).
 * Automatically refreshes if expired (60s buffer).
 * Returns null if the agency has not connected Google Drive.
 */
export async function getAgencyFreshAccessToken(
  agencyId: string,
  supabase: SupabaseClient
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const { data: agency } = await supabase
    .from('agencies')
    .select('google_access_token, google_refresh_token, google_token_expiry')
    .eq('id', agencyId)
    .single()

  if (!agency?.google_refresh_token) return null

  const refreshToken = agency.google_refresh_token as string
  const expiry = agency.google_token_expiry as number | null
  const isExpired = !expiry || expiry <= Math.floor(Date.now() / 1000) + 60

  if (!isExpired && agency.google_access_token) {
    return { accessToken: agency.google_access_token as string, refreshToken }
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(`[tokens] Google token refresh failed for agency ${agencyId}: ${res.status} ${body}`)
    return null
  }

  const tokens = await res.json() as { access_token: string; expires_in: number }
  const newExpiry = Math.floor(Date.now() / 1000) + (tokens.expires_in ?? 3600)

  await supabase
    .from('agencies')
    .update({ google_access_token: tokens.access_token, google_token_expiry: newExpiry })
    .eq('id', agencyId)

  return { accessToken: tokens.access_token, refreshToken }
}

/**
 * Returns a valid Google access token for the given user.
 * Automatically refreshes if expired (60s buffer).
 * Returns null if the user has not connected Google Drive.
 */
export async function getFreshAccessToken(
  userId: string,
  supabase: SupabaseClient
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const { data: profile } = await supabase
    .from('users')
    .select('google_access_token, google_refresh_token, google_token_expiry')
    .eq('id', userId)
    .single()

  if (!profile?.google_refresh_token) return null

  const refreshToken = profile.google_refresh_token as string
  const expiry = profile.google_token_expiry ? new Date(profile.google_token_expiry as string) : null
  const isExpired = !expiry || expiry <= new Date(Date.now() + 60_000)

  if (!isExpired && profile.google_access_token) {
    return { accessToken: profile.google_access_token as string, refreshToken }
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(`[tokens] Google token refresh failed for user ${userId}: ${res.status} ${body}`)
    return null
  }

  const tokens = await res.json() as { access_token: string; expires_in: number }
  const newExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  await supabase
    .from('users')
    .update({
      google_access_token: tokens.access_token,
      google_token_expiry: newExpiry,
    })
    .eq('id', userId)

  return { accessToken: tokens.access_token, refreshToken }
}
