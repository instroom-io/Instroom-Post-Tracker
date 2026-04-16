'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { signInSchema, signUpSchema, forgotPasswordSchema, resetPasswordSchema } from '@/lib/validations'
import { checkActionLimit, getRequestIp, limiters } from '@/lib/rate-limit'
import { toSlug, deduplicateSlug } from '@/lib/utils'

export async function signIn(
  _prevState: unknown,
  formData: FormData
): Promise<{ error: string } | void> {
  const ip = await getRequestIp()
  const email = (formData.get('email') as string | null) ?? ''

  const [ipLimit, emailLimit] = await Promise.all([
    checkActionLimit(`signin:ip:${ip}`, limiters.signinByIp),
    checkActionLimit(`signin:email:${email.toLowerCase()}`, limiters.signinByEmail),
  ])
  if (ipLimit) return ipLimit
  if (emailLimit) return emailLimit

  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const redirectTo = formData.get('redirectTo')
  const destination = typeof redirectTo === 'string' && redirectTo.startsWith('/') ? redirectTo : '/app'

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    return { error: 'Invalid email or password.' }
  }

  revalidatePath('/', 'layout')
  redirect(destination)
}

export async function signUp(
  _prevState: unknown,
  formData: FormData
): Promise<{ error: string } | { success: true; email: string } | void> {
  const ip = await getRequestIp()
  const limited = await checkActionLimit(`signup:ip:${ip}`, limiters.signup)
  if (limited) return limited

  const parsed = signUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    full_name: formData.get('full_name') ?? undefined,
    account_type: formData.get('account_type') ?? 'solo',
    account_name: (formData.get('account_name') as string) ?? '',
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const redirectTo = formData.get('redirectTo')
  const nextPath = typeof redirectTo === 'string' && redirectTo.startsWith('/') ? redirectTo : '/app'
  const emailRedirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=${encodeURIComponent(nextPath)}`

  const websiteUrl = (formData.get('website_url') as string | null) || undefined

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.full_name,
        account_type: parsed.data.account_type,
        account_name: parsed.data.account_name,
        ...(websiteUrl ? { website_url: websiteUrl } : {}),
      },
      emailRedirectTo,
    },
  })

  if (error) {
    if (error.message.includes('already registered') || error.message.includes('already been registered')) {
      return { error: 'An account with this email already exists.' }
    }
    return { error: 'Failed to create account. Please try again.' }
  }

  return { success: true, email: parsed.data.email }
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function requestPasswordReset(
  _prevState: unknown,
  formData: FormData
): Promise<{ error: string } | { success: true; email: string }> {
  const ip = await getRequestIp()
  const limited = await checkActionLimit(`pwreset:ip:${ip}`, limiters.passwordReset)
  if (limited) return limited

  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get('email'),
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const supabase = await createClient()
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=${encodeURIComponent('/reset-password')}`

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: resetUrl,
  })

  // Always return success — never reveal whether email exists
  return { success: true, email: parsed.data.email }
}

export async function updatePassword(
  _prevState: unknown,
  formData: FormData
): Promise<{ error: string } | void> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })

  if (error) {
    return { error: 'Failed to update password. The reset link may have expired. Please request a new one.' }
  }

  revalidatePath('/', 'layout')
  redirect('/app')
}

export async function saveOnboardingName(
  accountType: 'solo' | 'team',
  accountName: string,
  websiteUrl?: string
): Promise<{ error: string } | { redirectTo: string }> {
  const nameParsed = signUpSchema.shape.account_name.safeParse(accountName.trim())
  if (!nameParsed.success) return { error: nameParsed.error.errors[0].message }
  if (!['solo', 'team'].includes(accountType)) return { error: 'Invalid account type.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase.auth.updateUser({
    data: {
      account_type: accountType,
      account_name: nameParsed.data,
    },
  })

  const serviceClient = createServiceClient()

  // Check for an existing workspace (idempotent — handles re-submission)
  const { data: existingMember } = await serviceClient
    .from('workspace_members')
    .select('workspace_id, workspaces(slug)')
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .maybeSingle()

  if (existingMember) {
    const s = (existingMember.workspaces as unknown as { slug: string }).slug
    return { redirectTo: `/${s}/overview` }
  }

  const base = toSlug(nameParsed.data)
  const { data: takenRows } = await serviceClient
    .from('workspaces')
    .select('slug')
    .ilike('slug', `${base}%`)
  const slug = deduplicateSlug(base, takenRows?.map((r) => r.slug) ?? [])

  const trialStartedAt = new Date()
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

  let logoUrl: string | null = null
  if (websiteUrl) {
    try {
      const domain = new URL(websiteUrl).hostname
      logoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
    } catch { /* invalid URL — ignore */ }
  }

  const { data: ws } = await serviceClient
    .from('workspaces')
    .insert({
      name: nameParsed.data,
      slug,
      plan: 'trial',
      trial_started_at: trialStartedAt.toISOString(),
      trial_ends_at: trialEndsAt.toISOString(),
      account_type: accountType,
      workspace_quota: 1,
      ...(logoUrl ? { logo_url: logoUrl } : {}),
    })
    .select('id')
    .single()

  if (!ws) return { error: 'Failed to create workspace. Please try again.' }

  await serviceClient.from('workspace_members').insert({
    workspace_id: ws.id,
    user_id: user.id,
    role: 'owner',
  })

  return { redirectTo: `/${slug}/overview` }
}
