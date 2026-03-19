// DEV-ONLY: Temporary seed endpoint for E2E testing — DELETE before production
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Dev only' }, { status: 403 })
  }

  const supabase = createServiceClient()
  const results: Record<string, string> = {}

  const users = [
    { email: 'arjay09.adr43@gmail.com', password: 'Instroom2026!', full_name: 'Arjay' },
    { email: 'team@armfulmedia.com', password: 'Instroom2026!', full_name: 'Armful Media Team' },
    { email: 'sophiadechosa12@gmail.com', password: 'Instroom2026!', full_name: 'Sophia' },
  ]

  for (const u of users) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.full_name },
    })
    results[u.email] = error ? `ERROR: ${error.message}` : `OK: ${data.user.id}`
  }

  return NextResponse.json(results)
}
