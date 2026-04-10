import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/**
 * User-scoped client — uses session cookie, RLS auto-enforced.
 * Use in: Server Components, Server Actions, layouts, pages.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            )
          } catch {
            // setAll called from Server Component — safe to ignore
          }
        },
      },
    }
  )
}

/**
 * Service role client — bypasses ALL RLS.
 * ONLY allowed in:
 *   - lib/actions/workspace.ts (createWorkspace, acceptInvitation)
 *   - lib/actions/agencies.ts (agency creation, brand invite acceptance)
 *   - lib/actions/account.ts (Google OAuth token storage, member folder self-update)
 *   - lib/google/tokens.ts (token refresh — no session cookie available)
 *   - app/api/auth/google-drive/callback/route.ts (OAuth callback token storage)
 * NEVER use in components that render UI.
 */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
