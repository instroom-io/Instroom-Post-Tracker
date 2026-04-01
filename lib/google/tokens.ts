import { createServiceClient } from '@/lib/supabase/server'

/**
 * Returns a valid Google access token for the given user.
 * Automatically refreshes if expired (60s buffer).
 * Returns null if the user has not connected Google Drive.
 */
export async function getFreshAccessToken(userId: string): Promise<string | null> {
  const serviceClient = createServiceClient()
  const { data: profile } = await serviceClient
    .from('users')
    .select('google_access_token, google_refresh_token, google_token_expiry')
    .eq('id', userId)
    .single()

  if (!profile?.google_refresh_token) return null

  const expiry = profile.google_token_expiry ? new Date(profile.google_token_expiry) : null
  const isExpired = !expiry || expiry <= new Date(Date.now() + 60_000)

  if (!isExpired && profile.google_access_token) {
    return profile.google_access_token
  }

  // Refresh the token
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      refresh_token: profile.google_refresh_token,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) return null

  const tokens = await res.json() as { access_token: string; expires_in: number }
  const newExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  await serviceClient
    .from('users')
    .update({
      google_access_token: tokens.access_token,
      google_token_expiry: newExpiry,
    })
    .eq('id', userId)

  return tokens.access_token
}
