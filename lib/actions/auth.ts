'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { signInSchema, signUpSchema, forgotPasswordSchema, resetPasswordSchema } from '@/lib/validations'
import { isPersonalEmail } from '@/lib/utils'

export async function signIn(
  _prevState: unknown,
  formData: FormData
): Promise<{ error: string } | void> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const redirectTo = formData.get('redirectTo')
  const destination = typeof redirectTo === 'string' && redirectTo.startsWith('/') ? redirectTo : '/app'

  // Bypass personal email block for invite links
  const isInviteFlow = destination.startsWith('/invite/')
  const adminEmail = process.env.ADMIN_EMAIL
  const isAdmin = adminEmail && parsed.data.email.toLowerCase() === adminEmail.toLowerCase()
  if (!isAdmin && !isInviteFlow && isPersonalEmail(parsed.data.email)) {
    return { error: 'Please use a work email address to sign in.' }
  }

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
  const parsed = signUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    full_name: formData.get('full_name') ?? undefined,
    account_type: formData.get('account_type') ?? 'agency',
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const redirectTo = formData.get('redirectTo')
  const nextPath = typeof redirectTo === 'string' && redirectTo.startsWith('/') ? redirectTo : '/app'

  // Bypass personal email block for invite links
  const isInviteFlow = nextPath.startsWith('/invite/')
  const adminEmail = process.env.ADMIN_EMAIL
  const isAdmin = adminEmail && parsed.data.email.toLowerCase() === adminEmail.toLowerCase()
  if (!isAdmin && !isInviteFlow && isPersonalEmail(parsed.data.email)) {
    return { error: 'Please use a work email address to sign up.' }
  }
  const emailRedirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=${encodeURIComponent(nextPath)}`

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.full_name,
        account_type: parsed.data.account_type,
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
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get('email'),
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  // Block personal email domains (except admin)
  const adminEmail = process.env.ADMIN_EMAIL
  const isAdmin = adminEmail && parsed.data.email.toLowerCase() === adminEmail.toLowerCase()
  if (!isAdmin && isPersonalEmail(parsed.data.email)) {
    return { error: 'Please use a work email address.' }
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
