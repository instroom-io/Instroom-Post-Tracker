import { google } from 'googleapis'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Returns a short-lived access token for the Google service account.
 * Used to read files from the Shared Drive when re-saving to a user's personal Drive.
 * Returns null if GOOGLE_SERVICE_ACCOUNT_JSON_B64 is not configured.
 */
export async function getServiceAccountAccessToken(): Promise<string | null> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64) return null
  try {
    const json = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64, 'base64').toString('utf-8')
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(json) as object,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    })
    const client = await auth.getClient() as { getAccessToken(): Promise<{ token?: string | null }> }
    const { token } = await client.getAccessToken()
    return token ?? null
  } catch {
    return null
  }
}

/**
 * Returns a valid Google access token for the given agency.
 * Reads credentials from the agencies table (separate from personal user OAuth).
 * Automatically refreshes if expired (60s buffer).
 */
export async function getAgencyFreshAccessToken(agencyId: string): Promise<string | null> {
  const serviceClient = createServiceClient()
  const { data: agency } = await serviceClient
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

  await serviceClient
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
