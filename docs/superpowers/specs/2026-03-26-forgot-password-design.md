# Forgot Password Flow — Design Spec
Date: 2026-03-26

## Context
The app uses email/password + Google OAuth for authentication. There is currently no way for email/password users to recover a forgotten password. This adds a standard two-page reset flow using Supabase's built-in password recovery.

---

## User Journey

1. User visits `/login`, clicks **"Forgot password?"** link below the password field
2. Redirected to `/forgot-password` — enters their work email, submits
3. Success state shown: "Check your email" (same pattern as signup confirmation)
4. Supabase sends a recovery email with a reset link pointing to `/auth/callback?next=/reset-password`
5. User clicks link → `/auth/callback` exchanges the code for a session → redirects to `/reset-password`
6. User enters and confirms new password → `updatePassword` action called → redirected to `/app`

---

## New Files

### `app/(auth)/forgot-password/page.tsx`
Server component. Same layout/style as login and signup pages (centered card, logo, heading). Passes `redirectTo` param if present.

### `app/(auth)/forgot-password/forgot-password-form.tsx`
Client component using `useActionState`. Single **Work email** input field. On success shows "Check your email" state (same envelope icon + message pattern as signup). No redirect on success — user stays on the confirmation state.

### `app/(auth)/reset-password/page.tsx`
Server component. Same card layout. Heading: "Set new password".

### `app/(auth)/reset-password/reset-password-form.tsx`
Client component using `useActionState`. Two fields: **New password** + **Confirm password** (both with show/hide toggle). Validates passwords match client-side before submitting. On success: redirects to `/app`.

---

## Server Actions (added to `lib/actions/auth.ts`)

### `requestPasswordReset(prevState, formData)`
1. Validates email with new `forgotPasswordSchema` (email-only — `signInSchema` requires password too)
2. Blocks personal email domains (same `isPersonalEmail` check as sign-in)
3. Calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: NEXT_PUBLIC_APP_URL + '/auth/callback?next=/reset-password' })`
4. Always returns `{ success: true, email }` — never reveals whether email exists (security)

### `updatePassword(prevState, formData)`
1. Validates new password (min 8 chars via Zod)
2. Validates `confirmPassword` matches `password`
3. Calls `supabase.auth.updateUser({ password })`
4. On success: `revalidatePath('/', 'layout')` + `redirect('/app')`
5. On error: returns `{ error: 'Failed to update password. Please try again.' }`

---

## Validation (`lib/validations/index.ts`)

Add `forgotPasswordSchema`:
```ts
z.object({
  email: z.string().email('Please enter a valid email address'),
})
```

Add `resetPasswordSchema`:
```ts
z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})
```

---

## Auth Callback (`app/auth/callback/route.ts`)

No changes needed. The existing PKCE code exchange already handles recovery links — it exchanges the code for a session and redirects to `next` (`/reset-password`). The recovery session is active until `updateUser` is called.

---

## Login Form Change (`app/(auth)/login/login-form.tsx`)

Add "Forgot password?" link below the password label (right-aligned):
```tsx
<div className="flex items-center justify-between">
  <label ...>Password</label>
  <Link href="/forgot-password" className="text-[11px] text-foreground-muted hover:text-foreground">
    Forgot password?
  </Link>
</div>
```

---

## Proxy Middleware (`proxy.ts`)

Add `/forgot-password` and `/reset-password` to the public paths list (no auth required).

---

## Security Notes
- `requestPasswordReset` always returns success regardless of whether the email exists — prevents email enumeration
- Work email check still applies — personal emails are rejected with the same error as sign-in
- `/reset-password` page relies on Supabase's recovery session being active (set by the callback). If user navigates there without a valid session, `updateUser` will fail with an auth error and show the error state.

---

## Out of Scope
- Rate limiting on reset requests (Supabase handles this internally)
- "Back to login" link on both new pages — included as standard nav
