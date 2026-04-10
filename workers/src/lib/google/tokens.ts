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
): Promise<string | null> {
  const { data: agency } = await supabase
    .from('agencies')
    .select('google_access_token, google_refresh_token, google_token_expiry')
    .eq('id', agencyId)
    .single()

  if (!agency?.google_refresh_token) return null

  const expiry = agency.google_token_expiry as number | null
  const isExpired = !expiry || expiry <= Math.floor(Date.now() / 1000) + 60

  if (!isExpired && agency.google_access_token) {
    return agency.google_access_token as string
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      refresh_token: agency.google_refresh_token as string,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) return null

  const tokens = await res.json() as { access_token: string; expires_in: number }
  const newExpiry = Math.floor(Date.now() / 1000) + (tokens.expires_in ?? 3600)

  await supabase
    .from('agencies')
    .update({ google_access_token: tokens.access_token, google_token_expiry: newExpiry })
    .eq('id', agencyId)

  return tokens.access_token
}

/**
 * Returns a valid Google access token for the given user.
 * Automatically refreshes if expired (60s buffer).
 * Returns null if the user has not connected Google Drive.
 */
export async function getFreshAccessToken(
  userId: string,
  supabase: SupabaseClient
): Promise<string | null> {
  const { data: profile } = await supabase
    .from('users')
    .select('google_access_token, google_refresh_token, google_token_expiry')
    .eq('id', userId)
    .single()

  if (!profile?.google_refresh_token) return null

  const expiry = profile.google_token_expiry ? new Date(profile.google_token_expiry as string) : null
  const isExpired = !expiry || expiry <= new Date(Date.now() + 60_000)

  if (!isExpired && profile.google_access_token) {
    return profile.google_access_token as string
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      refresh_token: profile.google_refresh_token as string,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) return null

  const tokens = await res.json() as { access_token: string; expires_in: number }
  const newExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  await supabase
    .from('users')
    .update({
      google_access_token: tokens.access_token,
      google_token_expiry: newExpiry,
    })
    .eq('id', userId)

  return tokens.access_token
}
