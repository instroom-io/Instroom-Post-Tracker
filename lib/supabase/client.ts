import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}

export async function signInWithGoogle(
  redirectTo?: string,
  accountType?: 'solo' | 'team',
  accountName?: string
) {
  const supabase = createClient()
  const next = redirectTo ?? '/app'
  const url = new URL(`${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`)
  url.searchParams.set('next', next)
  if (accountType) url.searchParams.set('account_type', accountType)
  if (accountName) url.searchParams.set('account_name', accountName)

  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: url.toString() },
  })
}
