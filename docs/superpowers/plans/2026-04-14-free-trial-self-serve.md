# Free Trial Self-Serve Signup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace manual approval-gated signup with a self-serve PLG free trial: click → signup → email verify → dashboard, with 14-day full access that degrades to a permanent feature-limited free tier.

**Architecture:** New `plan_type` enum + trial columns + `account_type` + `workspace_quota` on `workspaces` only (migration 0031 — no changes to `agencies`). Auth callback replaces invite-only gate with idempotent auto-create-workspace logic for both Solo and Team account types, reading `account_name` from `user_metadata`. `lib/utils/plan.ts` is the single source of truth for all plan feature gate logic; workspace creation is additionally gated by `workspace_quota`. `UpgradeGate` wraps any locked UI element; `TrialBanner` renders in the workspace dashboard layout as first child.

**Tech Stack:** Next.js 16 (App Router), Supabase (Postgres + Auth + RLS + pg_cron), TypeScript strict, Railway workers (Node.js), SendGrid, Upstash Redis (rate limiting already in place)

**Spec file:** `docs/superpowers/specs/2026-04-13-free-trial-self-serve-design.md`

---

## File Map

### New files
| File | Purpose |
|------|---------|
| `supabase/migrations/0031_trial_and_plan.sql` | plan_type enum + trial columns + account_type + workspace_quota on workspaces + manager role + pg_cron expiry (workspaces only, no agencies) |
| `lib/utils/plan.ts` | `canUseFeature()`, `trialDaysRemaining()`, `isTrialExpiring()` — single source of truth |
| `components/ui/upgrade-gate.tsx` | Reusable locked-feature wrapper with lock icon + upgrade CTA |
| `components/layout/trial-banner.tsx` | Dismissible trial countdown banner (client component) |
| `workers/src/trial-worker.ts` | Daily Railway worker: sends reminder emails + marks timestamps |
| `app/upgrade/page.tsx` | Public upgrade request page with feature comparison + form |
| `lib/actions/upgrade.ts` | `submitUpgradeRequest()` Server Action |
| `lib/actions/admin.ts` | `setPlan()` admin-only Server Action |
| `app/onboarding/name/page.tsx` | Google OAuth fallback: collects account_name when missing from metadata |

### Modified files
| File | Change summary |
|------|---------------|
| `lib/types/index.ts` | Add `PlanType`, add `plan` + `trial_ends_at` to `Workspace` |
| `lib/utils/index.ts` | Add `deduplicateSlug()` pure helper |
| `lib/validations/index.ts` | Add `account_name` to `signUpSchema`; add `upgradeRequestSchema` |
| `lib/actions/auth.ts` | Remove personal email hard blocks (signIn/signUp/requestPasswordReset); add `account_name` to user_metadata in signUp |
| `app/auth/callback/route.ts` | Replace invite-only gate with auto-create-agency/workspace for new users; add new-user detection to token_hash (email OTP) path |
| `app/(auth)/signup/signup-form.tsx` | Add `account_name` field; soft email warning for agency + personal email |
| `components/marketing/hero-section.tsx` | href `/request-access` → `/signup` |
| `components/marketing/marketing-nav.tsx` | href → `/signup` (desktop + mobile) |
| `components/marketing/pricing-section.tsx` | href → `/signup` (all CTAs) |
| `components/marketing/cta-section.tsx` | href → `/signup` |
| `app/(marketing)/layout.tsx` | footer CTA href → `/signup` |
| `app/(app)/[workspaceSlug]/(dashboard)/layout.tsx` | Add `plan, trial_ends_at` to workspace select; render `<TrialBanner>` as first child of AppShell |
| `lib/actions/workspace.ts` | Add workspace quota check to `createWorkspace()` |
| `app/(app)/[workspaceSlug]/(dashboard)/analytics/page.tsx` | Add `plan` to workspace select; pass to `AnalyticsClient` |
| `components/analytics/analytics-client.tsx` | Accept `plan: PlanType` prop; wrap EMV/ER/leaderboard with `<UpgradeGate>` |
| `lib/actions/download.ts` | Check `canUseFeature(plan, 'drive_download')` before processing |
| `lib/actions/workspace.ts` | Check `canUseFeature(plan, 'team_members')` in `inviteMember()` |
| `lib/actions/agencies.ts` | Remove `multi_brand` gate from `inviteBrand()` (action deprecated in v2.0) |
| `app/admin/page.tsx` | Import + use `setPlan` from `lib/actions/admin.ts`; pass to `AgenciesTable` |
| `components/admin/agencies-table.tsx` | Add plan badge + inline plan dropdown using `setPlan` |

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/0031_trial_and_plan.sql`

> ⚠️ Migration number is **0031** — `0030_remove_tiktok_backfill.sql` already exists.

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/0031_trial_and_plan.sql

-- Plan enum
CREATE TYPE plan_type AS ENUM ('trial', 'free', 'pro');

-- workspaces: add plan, trial tracking, and v2.0 account model columns
ALTER TABLE workspaces
  ADD COLUMN plan plan_type NOT NULL DEFAULT 'free',
  ADD COLUMN trial_started_at TIMESTAMPTZ,
  ADD COLUMN trial_ends_at TIMESTAMPTZ,
  ADD COLUMN trial_reminder_7_sent_at TIMESTAMPTZ,
  ADD COLUMN trial_reminder_12_sent_at TIMESTAMPTZ,
  ADD COLUMN trial_ended_notified_at TIMESTAMPTZ,
  ADD COLUMN account_type TEXT NOT NULL DEFAULT 'team',
  ADD COLUMN workspace_quota INT NOT NULL DEFAULT 3;

-- Note: DEFAULT 'free' (not 'trial') — existing workspaces are pre-trial legacy accounts.
-- New signups set plan='trial' and trial_ends_at explicitly in handlePostAuth().

-- Add 'manager' to workspace_role enum (v2.0 preferred term for new invites; 'editor' kept for data safety)
ALTER TYPE workspace_role ADD VALUE IF NOT EXISTS 'manager';

-- pg_cron: expire trials once daily at 00:30 UTC
SELECT cron.schedule(
  'expire-trials',
  '30 0 * * *',
  $$
    UPDATE workspaces
    SET plan = 'free'
    WHERE plan = 'trial'
      AND trial_ends_at < NOW();
  $$
);
```

- [ ] **Step 2: Apply the migration**

Run via Supabase MCP tool (`apply_migration`) or:
```bash
npm run db:push
```
Expected: migration applied, `plan_type` enum exists, both tables have the 6 new columns.

- [ ] **Step 3: Regenerate Supabase types**

```bash
npm run db:generate
```
Expected: `lib/types/supabase.ts` updated with `plan_type` enum and new columns.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0031_trial_and_plan.sql lib/types/supabase.ts
git commit -m "04142026 - add plan_type, trial tracking, account_type, workspace_quota to workspaces"
```

---

## Task 2: Foundation — Types, Plan Utility, deduplicateSlug

**Files:**
- Modify: `lib/types/index.ts`
- Create: `lib/utils/plan.ts`
- Modify: `lib/utils/index.ts`

- [ ] **Step 1: Create `lib/utils/plan.ts`** (must exist before `lib/types/index.ts` can import from it)

```typescript
// lib/utils/plan.ts
// Single source of truth for all plan feature gate logic.
// Import this in both app code and worker code.

export type PlanFeature =
  | 'drive_download'
  | 'emv_reporting'
  | 'advanced_analytics'
  | 'team_members'

export type PlanType = 'trial' | 'free' | 'pro'

const PLAN_FEATURES: Record<PlanFeature, PlanType[]> = {
  drive_download:     ['trial', 'pro'],
  emv_reporting:      ['trial', 'pro'],
  advanced_analytics: ['trial', 'pro'],
  team_members:       ['trial', 'pro'],
  // multi_brand removed — workspace creation gated by workspace_quota, not a feature flag
}

/** Returns true if the given plan can access the given feature. */
export function canUseFeature(plan: PlanType, feature: PlanFeature): boolean {
  return PLAN_FEATURES[feature].includes(plan)
}

/** Returns the number of trial days remaining (0 if expired or no date). */
export function trialDaysRemaining(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0
  return Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000))
}

/** Returns true if trial ends in 3 days or fewer. */
export function isTrialExpiring(trialEndsAt: string | null): boolean {
  return trialDaysRemaining(trialEndsAt) <= 3
}
```

- [ ] **Step 2: Update `lib/types/index.ts` — re-export `PlanType` and add fields to `Agency` + `Workspace`**

`PlanType` is defined in `lib/utils/plan.ts` (Step 1). Re-export it from `lib/types/index.ts` instead of redefining it.

After the existing `DriveConnectionType` line (line 20), add:
```typescript
export type { PlanType } from '@/lib/utils/plan'
```

Add `plan` and `trial_ends_at` to the `Agency` interface (after `google_connected_email` line):
```typescript
  plan: PlanType
  trial_ends_at: string | null
```

Add `plan` and `trial_ends_at` to the `Workspace` interface (after `assigned_member_id` line):
```typescript
  plan: PlanType
  trial_ends_at: string | null
```

- [ ] **Step 3: Add `deduplicateSlug()` to `lib/utils/index.ts`**

Append to the end of the file (after the `extractDriveFolderId` function):

```typescript
// ─── Slug Utilities ───────────────────────────────────────────────────────────

/**
 * Returns `base` if not in `taken`, otherwise appends `-2`, `-3`, etc.
 * Pure function — caller is responsible for fetching taken slugs from DB.
 */
export function deduplicateSlug(base: string, taken: string[]): string {
  if (!taken.includes(base)) return base
  let i = 2
  while (taken.includes(`${base}-${i}`)) i++
  return `${base}-${i}`
}
```

- [ ] **Step 4: Run type check**

```bash
npm run type-check
```
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add lib/types/index.ts lib/utils/plan.ts lib/utils/index.ts
git commit -m "04142026 - add PlanType, canUseFeature utility, and deduplicateSlug helper"
```

---

## Task 3: Validation Schema Updates

**Files:**
- Modify: `lib/validations/index.ts`

- [ ] **Step 1: Add `account_name` to `signUpSchema`**

Replace the existing `signUpSchema` (lines 18–23 of `lib/validations/index.ts`):

```typescript
export const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(2).max(100).optional(),
  account_type: z.enum(['solo', 'team']).default('team'),
  account_name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(60, 'Name must be under 60 characters')
    .trim(),
})
```

- [ ] **Step 2: Add `upgradeRequestSchema` after the auth schemas section**

Add after the `resetPasswordSchema` block:

```typescript
// ─── Upgrade ──────────────────────────────────────────────────────────────────

export const upgradeRequestSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email address'),
  account_name: z.string().min(2).max(100),
  message: z.string().max(1000).optional(),
})

export type UpgradeRequestInput = z.infer<typeof upgradeRequestSchema>
```

- [ ] **Step 3: Run type check**

```bash
npm run type-check
```
Expected: 0 errors (signUp form will error until Task 5 adds the field — that's expected if running incrementally).

- [ ] **Step 4: Commit**

```bash
git add lib/validations/index.ts
git commit -m "04142026 - add account_name to signUpSchema, add upgradeRequestSchema"
```

---

## Task 4: Auth Action Updates

**Files:**
- Modify: `lib/actions/auth.ts`

Three targeted changes: remove personal email hard blocks from all three functions, add `account_name` to metadata in `signUp`.

- [ ] **Step 1: Remove personal email block from `signIn()`**

In `lib/actions/auth.ts`, delete lines 37–42 (the `isInviteFlow` + `isAdmin` + `isPersonalEmail` block):

```typescript
// DELETE these lines from signIn():
  const isInviteFlow = destination.startsWith('/invite/')
  const adminEmail = process.env.ADMIN_EMAIL
  const isAdmin = adminEmail && parsed.data.email.toLowerCase() === adminEmail.toLowerCase()
  if (!isAdmin && !isInviteFlow && isPersonalEmail(parsed.data.email)) {
    return { error: 'Please use a work email address to sign in.' }
  }
```

- [ ] **Step 2: Remove personal email block from `signUp()` and add `account_name` to metadata**

In `signUp()`:

**a)** Update `signUpSchema.safeParse()` call to include `account_name` (lines ~63-68):
```typescript
  const parsed = signUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    full_name: formData.get('full_name') ?? undefined,
    account_type: formData.get('account_type') ?? 'team',
    account_name: (formData.get('account_name') as string) ?? '',
  })
```

**b)** Delete lines 77–83 (the personal email block in signUp):
```typescript
// DELETE these lines from signUp():
  const isInviteFlow = nextPath.startsWith('/invite/')
  const adminEmail = process.env.ADMIN_EMAIL
  const isAdmin = adminEmail && parsed.data.email.toLowerCase() === adminEmail.toLowerCase()
  if (!isAdmin && !isInviteFlow && isPersonalEmail(parsed.data.email)) {
    return { error: 'Please use a work email address to sign up.' }
  }
```

**c)** Add `account_name` to `options.data` (inside `supabase.auth.signUp()`):
```typescript
      options: {
        data: {
          full_name: parsed.data.full_name,
          account_type: parsed.data.account_type,
          account_name: parsed.data.account_name,
        },
        emailRedirectTo,
      },
```

- [ ] **Step 3: Remove personal email block from `requestPasswordReset()`**

Delete lines 133–136:
```typescript
// DELETE these lines from requestPasswordReset():
  const adminEmail = process.env.ADMIN_EMAIL
  const isAdmin = adminEmail && parsed.data.email.toLowerCase() === adminEmail.toLowerCase()
  if (!isAdmin && isPersonalEmail(parsed.data.email)) {
    return { error: 'Please use a work email address.' }
  }
```

The `isPersonalEmail` import at line 7 can be removed too if no other usages remain in this file (check with grep).

- [ ] **Step 4: Run type check**

```bash
npm run type-check
```
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add lib/actions/auth.ts
git commit -m "04142026 - remove personal email gate from auth actions, add account_name to signup metadata"
```

---

## Task 5: Auth Callback — Auto-Create Logic

**Files:**
- Modify: `app/auth/callback/route.ts`

This is the largest change. The invite-only gate (lines 55–99) is replaced with an idempotent auto-create function called from both the OAuth `code` path and the email OTP `token_hash` path.

- [ ] **Step 1: Replace the entire file with the new implementation**

```typescript
// app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { toSlug, deduplicateSlug } from '@/lib/utils'
import type { EmailOtpType, User } from '@supabase/supabase-js'

function makeRedirect(request: NextRequest, path: string): NextResponse {
  const { origin } = new URL(request.url)
  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocalEnv = process.env.NODE_ENV === 'development'
  if (isLocalEnv) return NextResponse.redirect(`${origin}${path}`)
  if (forwardedHost) return NextResponse.redirect(`https://${forwardedHost}${path}`)
  return NextResponse.redirect(`${origin}${path}`)
}

/**
 * Runs after every successful auth event (OAuth exchange OR email OTP verify).
 * - Upserts the public.users row.
 * - Ensures platform admin flag is set for the admin email.
 * - For new users: auto-creates an agency or workspace based on user_metadata,
 *   then redirects to the correct dashboard.
 * - For returning users: returns null (caller falls through to normal redirect).
 */
async function handlePostAuth(
  user: User,
  request: NextRequest
): Promise<NextResponse | null> {
  const serviceClient = createServiceClient()

  // 1. Ensure public.users row always exists (DB trigger may fail silently)
  await serviceClient.from('users').upsert(
    {
      id: user.id,
      email: user.email!,
      full_name: user.user_metadata?.full_name ?? null,
      avatar_url: user.user_metadata?.avatar_url ?? null,
    },
    { onConflict: 'id', ignoreDuplicates: false }
  )

  // 2. Platform admin: always ensure flag is set
  const adminEmail = process.env.ADMIN_EMAIL
  const email = user.email!
  const isAdmin = adminEmail && email.toLowerCase() === adminEmail.toLowerCase()

  if (isAdmin) {
    await serviceClient.from('users').update({ is_platform_admin: true }).eq('id', user.id)
    return null // Admin uses normal /app dispatcher
  }

  // 3. Detect new user: created_at and last_sign_in_at within 10 seconds
  const createdAt = new Date(user.created_at).getTime()
  const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : createdAt
  const isNewUser = Math.abs(createdAt - lastSignIn) < 10000

  if (!isNewUser) return null // Returning user — /app dispatcher handles routing

  // 4. Auto-create workspace for new users
  const { account_name, account_type } = user.user_metadata ?? {}

  // account_name missing (Google OAuth without pre-filled form) → collect it
  if (!account_name) return makeRedirect(request, '/onboarding/name')

  const workspaceQuota = account_type === 'solo' ? 1 : 3
  const trialStartedAt = new Date()
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

  // Idempotent: if workspace already exists for this owner, just redirect
  const { data: existingMember } = await serviceClient
    .from('workspace_members')
    .select('workspace_id, workspaces(slug)')
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .maybeSingle()

  if (existingMember) {
    const slug = (existingMember.workspaces as { slug: string }).slug
    return makeRedirect(request, `/${slug}/overview`)
  }

  const base = toSlug(account_name as string)
  const { data: takenRows } = await serviceClient
    .from('workspaces')
    .select('slug')
    .ilike('slug', `${base}%`)

  const workspaceSlug = deduplicateSlug(base, takenRows?.map((r) => r.slug) ?? [])

  const { data: ws } = await serviceClient
    .from('workspaces')
    .insert({
      name: account_name,
      slug: workspaceSlug,
      plan: 'trial',
      trial_started_at: trialStartedAt.toISOString(),
      trial_ends_at: trialEndsAt.toISOString(),
      account_type: account_type ?? 'team',
      workspace_quota: workspaceQuota,
    })
    .select('id')
    .single()

  if (!ws) return makeRedirect(request, '/onboarding/name')

  await serviceClient.from('workspace_members').insert({
    workspace_id: ws.id,
    user_id: user.id,
    role: 'owner',
  })

  return makeRedirect(request, `/${workspaceSlug}/overview`)
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/app'

  // OAuth / PKCE code exchange (Google, etc.)
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const response = await handlePostAuth(user, request)
        if (response) return response
      }

      return makeRedirect(request, next)
    }
  }

  // Email OTP / magic link verification
  if (token_hash && type) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.verifyOtp({ token_hash, type })

    if (!error) {
      if (data.user) {
        const response = await handlePostAuth(data.user, request)
        if (response) return response
      }
      return makeRedirect(request, next)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
```

- [ ] **Step 2: Run type check**

```bash
npm run type-check
```
Expected: 0 errors. If `deduplicateSlug` import errors, verify Task 2 is applied first.

- [ ] **Step 3: Commit**

```bash
git add app/auth/callback/route.ts
git commit -m "04142026 - replace invite-only gate with self-serve auto-create in auth callback"
```

---

## Task 6: Signup Form UI

**Files:**
- Modify: `app/(auth)/signup/signup-form.tsx`

Add the `account_name` field (between toggle and email) and soft email warning for agency users.

- [ ] **Step 1: Add `accountName` input state and email watch state**

In the `SignupForm` component, add state hooks (after the existing `accountType` state):

```typescript
  const [emailValue, setEmailValue] = useState('')
```

- [ ] **Step 2: Add the `account_name` field block after the account type toggle div**

Insert this block after the closing `</div>` of the toggle (after line 80 of current file):

```tsx
      {/* Account name */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="account_name"
          className="text-[12px] font-medium text-foreground-light"
        >
          {accountType === 'team' ? 'Agency / team name' : 'Workspace name'}
        </label>
        <input
          id="account_name"
          name="account_name"
          type="text"
          autoComplete="organization"
          required
          minLength={2}
          maxLength={60}
          placeholder={accountType === 'team' ? 'e.g. Armful Media' : 'e.g. NovaSkin Beauty'}
          className="h-10 w-full rounded-lg border border-border bg-background-surface px-3 text-[13px] text-foreground placeholder:text-foreground-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors"
        />
      </div>
```

- [ ] **Step 3: Update the email label and add `onChange` + soft warning**

Replace the existing email field block (starting at the `<div className="flex flex-col gap-1.5">` before `<label htmlFor="email"`):

```tsx
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="email"
          className="text-[12px] font-medium text-foreground-light"
        >
          {accountType === 'team' ? 'Work email' : 'Email'}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder={accountType === 'team' ? 'hello@youragency.com' : 'you@example.com'}
          onChange={(e) => setEmailValue(e.target.value)}
          className="h-10 w-full rounded-lg border border-border bg-background-surface px-3 text-[13px] text-foreground placeholder:text-foreground-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors"
        />
        {accountType === 'team' && isPersonalEmail(emailValue) && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400">
            We recommend a work email for team accounts.
          </p>
        )}
      </div>
```

- [ ] **Step 4: Add `isPersonalEmail` import**

At top of the file, add:
```typescript
import { isPersonalEmail } from '@/lib/utils'
```

- [ ] **Step 5: Run type check**

```bash
npm run type-check
```
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add app/(auth)/signup/signup-form.tsx
git commit -m "04142026 - add account_name field and soft email warning to signup form"
```

---

## Task 7: Marketing CTA Updates

**Files:**
- Modify: `components/marketing/hero-section.tsx`
- Modify: `components/marketing/marketing-nav.tsx`
- Modify: `components/marketing/pricing-section.tsx`
- Modify: `components/marketing/cta-section.tsx`
- Modify: `app/(marketing)/layout.tsx`

Change all "Start free trial" / "Request Access" CTAs from `/request-access` to `/signup`. `/request-access` is kept (for enterprise contact).

- [ ] **Step 1: Read each file and find the href**

Read each file to locate the exact string to change. The pattern to find in each:
- `href="/request-access"` → change to `href="/signup"`

Run this grep first to confirm locations:
```bash
grep -rn "request-access" components/marketing/ app/\(marketing\)/layout.tsx
```

- [ ] **Step 2: Apply href changes in each file**

For each file found in Step 1, change `href="/request-access"` to `href="/signup"`.

Note: `components/marketing/marketing-nav.tsx` has this in both desktop nav and mobile nav — change both occurrences.

Note: `components/marketing/pricing-section.tsx` has multiple plan buttons — change the Starter and Growth "Get Started" buttons. Leave the Enterprise "Contact Us" button pointing to the contact modal (it's a different CTA).

- [ ] **Step 3: Verify no request-access links remain in marketing**

```bash
grep -rn "request-access" components/marketing/ app/\(marketing\)/layout.tsx
```
Expected: only legitimate non-CTA references (if any). The `/request-access` page itself is NOT deleted.

- [ ] **Step 4: Commit**

```bash
git add components/marketing/ app/\(marketing\)/layout.tsx
git commit -m "04142026 - route marketing CTAs from /request-access to /signup"
```

---

## Task 8: UpgradeGate Component

**Files:**
- Create: `components/ui/upgrade-gate.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/ui/upgrade-gate.tsx
'use client'

import Link from 'next/link'
import { Lock } from '@phosphor-icons/react'
import type { PlanFeature, PlanType } from '@/lib/utils/plan'
import { canUseFeature } from '@/lib/utils/plan'

interface UpgradeGateProps {
  plan: PlanType
  feature: PlanFeature
  children: React.ReactNode
  /** Optional: minimum height for the locked placeholder. Default: none. */
  minHeight?: string
}

export function UpgradeGate({ plan, feature, children, minHeight }: UpgradeGateProps) {
  if (canUseFeature(plan, feature)) return <>{children}</>

  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-background-surface p-8 text-center"
      style={minHeight ? { minHeight } : undefined}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-background-muted">
        <Lock size={16} className="text-foreground-muted" weight="fill" />
      </div>
      <div>
        <p className="text-[13px] font-medium text-foreground">Upgrade to unlock</p>
        <p className="mt-0.5 text-[12px] text-foreground-lighter">
          This feature is available on Pro plans.
        </p>
      </div>
      <Link
        href="/upgrade"
        className="mt-1 inline-flex h-8 items-center rounded-lg bg-brand px-4 text-[12px] font-semibold text-white hover:bg-brand/90 transition-colors"
      >
        View upgrade options
      </Link>
    </div>
  )
}
```

- [ ] **Step 2: Run type check**

```bash
npm run type-check
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add components/ui/upgrade-gate.tsx
git commit -m "04142026 - add UpgradeGate component for locked feature UI"
```

---

## Task 9: TrialBanner Component

**Files:**
- Create: `components/layout/trial-banner.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/layout/trial-banner.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X } from '@phosphor-icons/react'
import type { PlanType } from '@/lib/utils/plan'
import { trialDaysRemaining, isTrialExpiring } from '@/lib/utils/plan'

interface TrialBannerProps {
  plan: PlanType
  trialEndsAt: string | null
}

export function TrialBanner({ plan, trialEndsAt }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || plan !== 'trial') return null

  const days = trialDaysRemaining(trialEndsAt)
  const expiring = isTrialExpiring(trialEndsAt)
  const expired = days === 0 && trialEndsAt !== null

  if (expired) {
    return (
      <div className="flex items-center justify-between gap-4 border-b border-destructive/20 bg-destructive/10 px-5 py-2.5">
        <p className="text-[12px] font-medium text-destructive">
          Your trial has ended.{' '}
          <Link href="/upgrade" className="underline hover:no-underline">
            Upgrade to restore full access
          </Link>
        </p>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="shrink-0 text-destructive/60 transition-colors hover:text-destructive"
        >
          <X size={14} />
        </button>
      </div>
    )
  }

  if (!trialEndsAt) return null

  const bannerCls = expiring
    ? 'border-b border-amber-500/20 bg-amber-50 dark:bg-amber-950/30'
    : 'border-b border-brand/10 bg-brand/5'
  const textCls = expiring ? 'text-amber-700 dark:text-amber-400' : 'text-foreground-light'

  return (
    <div className={`flex items-center justify-between gap-4 px-5 py-2.5 ${bannerCls}`}>
      <p className={`text-[12px] font-medium ${textCls}`}>
        {expiring
          ? `Your trial ends in ${days} day${days !== 1 ? 's' : ''} — `
          : `Free trial · ${days} day${days !== 1 ? 's' : ''} remaining. `}
        <Link href="/upgrade" className="underline hover:no-underline">
          Upgrade to keep full access
        </Link>
      </p>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className={`shrink-0 transition-opacity ${textCls} opacity-50 hover:opacity-100`}
      >
        <X size={14} />
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/layout/trial-banner.tsx
git commit -m "04142026 - add TrialBanner component for trial countdown display"
```

---

## Task 10: Workspace Layout — TrialBanner Integration

**Files:**
- Modify: `app/(app)/[workspaceSlug]/(dashboard)/layout.tsx`

- [ ] **Step 1: Add `plan` and `trial_ends_at` to the workspace query**

In the workspace select (line 24 of current file), change:
```typescript
    .select('id, name, slug, logo_url, agency_id, drive_folder_id, drive_connection_type, drive_oauth_token, created_at')
```
to:
```typescript
    .select('id, name, slug, logo_url, agency_id, drive_folder_id, drive_connection_type, drive_oauth_token, created_at, plan, trial_ends_at')
```

- [ ] **Step 2: Add `TrialBanner` import at top of the layout file**

```typescript
import { TrialBanner } from '@/components/layout/trial-banner'
import type { PlanType } from '@/lib/utils/plan'
```

- [ ] **Step 3: Render `TrialBanner` as first child of `AppShell`**

The layout currently returns:
```tsx
  return (
    <AppShell ...>
      {children}
    </AppShell>
  )
```

Change to:
```tsx
  return (
    <AppShell ...>
      <TrialBanner
        plan={(workspace as unknown as { plan: PlanType }).plan ?? 'trial'}
        trialEndsAt={(workspace as unknown as { trial_ends_at: string | null }).trial_ends_at ?? null}
      />
      {children}
    </AppShell>
  )
```

> Note: The `workspace` object is typed as `Workspace` from `lib/types`. After Task 2, `Workspace` includes `plan` and `trial_ends_at`, so the casts above become unnecessary — remove them and use `workspace.plan` and `workspace.trial_ends_at` directly once TS picks up the updated type.

- [ ] **Step 4: Run type check**

```bash
npm run type-check
```
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/\[workspaceSlug\]/\(dashboard\)/layout.tsx
git commit -m "04142026 - render TrialBanner in workspace dashboard layout"
```

---

## Task 11: Analytics Page — Plan Gating

**Files:**
- Modify: `app/(app)/[workspaceSlug]/(dashboard)/analytics/page.tsx`
- Modify: `components/analytics/analytics-client.tsx`

- [ ] **Step 1: Add `plan` to the workspace select in `analytics/page.tsx`**

In `AnalyticsPage`, the workspace query (line 120):
```typescript
    supabase.from('workspaces').select('id').eq('slug', workspaceSlug).single(),
```
Change to:
```typescript
    supabase.from('workspaces').select('id, plan').eq('slug', workspaceSlug).single(),
```

- [ ] **Step 2: Pass `plan` to `AnalyticsBody` and `AnalyticsEmvSection`**

Update `AnalyticsBody` to accept and pass `plan`:
```typescript
async function AnalyticsBody({
  workspaceId,
  campaigns,
  defaultFilters,
  timezone,
  plan,
}: {
  workspaceId: string
  campaigns: { id: string; name: string }[]
  defaultFilters: AnalyticsFilters
  timezone: string
  plan: string
}) {
```

In `AnalyticsPage`, pass plan to AnalyticsBody:
```tsx
            <AnalyticsBody
              workspaceId={workspace.id}
              campaigns={campaigns ?? []}
              defaultFilters={defaultFilters}
              timezone={timezone}
              plan={workspace.plan ?? 'trial'}
            />
```

Then in `AnalyticsBody`, pass `plan` to `AnalyticsClient`:
```tsx
  return (
    <AnalyticsClient
      metrics={metricsData}
      campaigns={campaigns}
      defaultFilters={defaultFilters}
      timezone={timezone}
      plan={plan as import('@/lib/utils/plan').PlanType}
    />
  )
```

- [ ] **Step 3: Update `AnalyticsClient` props interface and wrap premium charts**

In `components/analytics/analytics-client.tsx`, add `plan` to the props interface:
```typescript
import type { PlanType } from '@/lib/utils/plan'
import { UpgradeGate } from '@/components/ui/upgrade-gate'

interface AnalyticsClientProps {
  metrics: PostMetricRow[]
  campaigns: Campaign[]
  defaultFilters: AnalyticsFilters
  timezone: string
  plan: PlanType
}
```

In the component's JSX, locate where `<EmvChart>`, `<ErBenchmarkChart>`, and `<InfluencerLeaderboard>` are rendered and wrap each:

```tsx
{/* EMV chart — pro only */}
<UpgradeGate plan={plan} feature="emv_reporting" minHeight="200px">
  <EmvChart ... />
</UpgradeGate>

{/* ER benchmark — pro only */}
<UpgradeGate plan={plan} feature="advanced_analytics" minHeight="200px">
  <ErBenchmarkChart ... />
</UpgradeGate>

{/* Influencer leaderboard — pro only */}
<UpgradeGate plan={plan} feature="advanced_analytics" minHeight="200px">
  <InfluencerLeaderboard ... />
</UpgradeGate>
```

`<PostVolumeChart>` and `<PlatformBreakdown>` are NOT wrapped — they remain visible on all plans.

- [ ] **Step 4: Run type check**

```bash
npm run type-check
```
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/\[workspaceSlug\]/\(dashboard\)/analytics/page.tsx components/analytics/analytics-client.tsx
git commit -m "04142026 - gate EMV, ER, and leaderboard analytics behind plan check"
```

---

## Task 12: Server Action Feature Gates

**Files:**
- Modify: `lib/actions/download.ts`
- Modify: `lib/actions/workspace.ts`

- [ ] **Step 1: Gate `triggerPostDownload()` in `lib/actions/download.ts`**

After the role check (after `if (!member || !['owner', 'admin', 'editor'].includes(member.role))` block), add a plan check:

```typescript
  import { canUseFeature } from '@/lib/utils/plan'
  import type { PlanType } from '@/lib/utils/plan'

  // ... existing role check ...

  // 3. Plan check — drive download requires trial or pro
  const { data: workspaceRow } = await supabase
    .from('workspaces')
    .select('plan')
    .eq('id', workspaceId)
    .single()

  if (!canUseFeature((workspaceRow?.plan ?? 'free') as PlanType, 'drive_download')) {
    return { error: 'Drive download is not available on your current plan. Upgrade to unlock.' }
  }
```

> Add imports at top of file.

- [ ] **Step 2: Gate `inviteMember()` in `lib/actions/workspace.ts`**

After the existing role check (after `if (!member || !['owner', 'admin'].includes(member.role))`), add:

```typescript
  import { canUseFeature } from '@/lib/utils/plan'
  import type { PlanType } from '@/lib/utils/plan'

  // ... existing role check ...

  // Plan check — team member invites require trial or pro
  const { data: workspaceRow } = await supabase
    .from('workspaces')
    .select('plan')
    .eq('id', workspaceId)
    .single()

  if (!canUseFeature((workspaceRow?.plan ?? 'free') as PlanType, 'team_members')) {
    return { error: 'Team member invites are not available on your current plan. Upgrade to unlock.' }
  }
```

- [ ] **Step 3: Add workspace quota gate to `createWorkspace()` in `lib/actions/workspace.ts`**

After the auth check in `createWorkspace()`, add:

```typescript
  import { canUseFeature } from '@/lib/utils/plan'
  import type { PlanType } from '@/lib/utils/plan'

  // Count workspaces the user already owns
  const { data: ownedMemberships } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('role', 'owner')

  // Get quota from any owned workspace (all share the same account's quota)
  const firstOwnedId = ownedMemberships?.[0]?.workspace_id
  const { data: quotaRow } = firstOwnedId
    ? await supabase
        .from('workspaces')
        .select('workspace_quota, plan')
        .eq('id', firstOwnedId)
        .single()
    : { data: null }

  const ownedCount = ownedMemberships?.length ?? 0
  const quota = quotaRow?.workspace_quota ?? 1
  const plan = (quotaRow?.plan ?? 'free') as PlanType

  if (ownedCount >= quota) {
    return { error: `You've reached your workspace limit (${quota}). Contact us to expand your plan.` }
  }
```

- [ ] **Step 4: Run type check**

```bash
npm run type-check
```
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add lib/actions/download.ts lib/actions/workspace.ts
git commit -m "04142026 - add plan gates to download, inviteMember, and workspace creation"
```

---

## Task 13: Google OAuth Name Fallback — `/onboarding/name`

**Files:**
- Create: `app/onboarding/name/page.tsx`

This page collects `account_name` for users who signed up via Google OAuth (where `account_name` wasn't in the pre-filled form). After submission, it calls a Server Action that updates `user_metadata` and then runs the same auto-create logic as the callback.

- [ ] **Step 1: Add `saveOnboardingName` Server Action to `lib/actions/auth.ts`**

First, update the import at the top of `lib/actions/auth.ts` to add `toSlug` and `deduplicateSlug`:
```typescript
import { toSlug, deduplicateSlug } from '@/lib/utils'
```
(If `isPersonalEmail` was removed in Task 4, the `@/lib/utils` import line now reads: `import { toSlug, deduplicateSlug } from '@/lib/utils'`)

Append to `lib/actions/auth.ts`:

```typescript
export async function saveOnboardingName(
  accountType: 'solo' | 'team',
  accountName: string
): Promise<{ error: string } | { redirectTo: string }> {
  // Reuse the account_name schema field from signUpSchema (already has the same constraints)
  const nameParsed = signUpSchema.shape.account_name.safeParse(accountName.trim())
  if (!nameParsed.success) return { error: nameParsed.error.errors[0].message }
  if (!['solo', 'team'].includes(accountType)) return { error: 'Invalid account type.' }

  const parsed = { data: { accountType: accountType as 'solo' | 'team', accountName: nameParsed.data } }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Update user_metadata so the callback logic can use it
  await supabase.auth.updateUser({
    data: {
      account_type: parsed.data.accountType,
      account_name: parsed.data.accountName,
    },
  })

  // Run the same create logic directly (user is already verified)
  const serviceClient = createServiceClient()
  const workspaceQuota = accountType === 'solo' ? 1 : 3
  const trialStartedAt = new Date()
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

  // Idempotent: if workspace already exists for this owner, just redirect
  const { data: existingMember } = await serviceClient
    .from('workspace_members')
    .select('workspace_id, workspaces(slug)')
    .eq('user_id', user.id).eq('role', 'owner').maybeSingle()

  if (existingMember) {
    const s = (existingMember.workspaces as { slug: string }).slug
    return { redirectTo: `/${s}/overview` }
  }

  const base = toSlug(parsed.data.accountName)
  const { data: takenRows } = await serviceClient
    .from('workspaces').select('slug').ilike('slug', `${base}%`)
  const slug = deduplicateSlug(base, takenRows?.map(r => r.slug) ?? [])

  const { data: ws } = await serviceClient
    .from('workspaces')
    .insert({
      name: parsed.data.accountName,
      slug,
      plan: 'trial',
      trial_started_at: trialStartedAt.toISOString(),
      trial_ends_at: trialEndsAt.toISOString(),
      account_type: accountType,
      workspace_quota: workspaceQuota,
    })
    .select('id').single()

  if (!ws) return { error: 'Failed to create workspace. Please try again.' }

  await serviceClient.from('workspace_members').insert({
    workspace_id: ws.id,
    user_id: user.id,
    role: 'owner',
  })

  return { redirectTo: `/${slug}/overview` }
}
```

Add `import { z } from 'zod'` to the imports at the top of `lib/actions/auth.ts` if not already there.

- [ ] **Step 2: Create the page**

```tsx
// app/onboarding/name/page.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { saveOnboardingName } from '@/lib/actions/auth'

export default function OnboardingNamePage() {
  const [accountType, setAccountType] = useState<'team' | 'solo'>('team')
  const [accountName, setAccountName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await saveOnboardingName(accountType, accountName)
      if ('error' in result) {
        setError(result.error)
        return
      }
      router.push(result.redirectTo)
    })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Image src="/POST_TRACKER.svg" alt="Instroom Post Tracker" width={140} height={32} priority />
        </div>

        <div className="rounded-xl border border-border bg-background-surface p-6 shadow-sm">
          <h1 className="mb-1 text-[16px] font-bold text-foreground">One more thing</h1>
          <p className="mb-6 text-[12px] text-foreground-lighter">
            What should we call your account?
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Account type toggle */}
            <div className="flex rounded-lg border border-border bg-background-muted p-0.5">
              {(['team', 'solo'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setAccountType(type)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
                    accountType === type
                      ? 'bg-brand text-white shadow-sm'
                      : 'text-foreground-muted hover:text-foreground'
                  }`}
                >
                  {type === 'team' ? 'Team' : 'Solo'}
                </button>
              ))}
            </div>

            {/* Name field */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="account_name" className="text-[12px] font-medium text-foreground-light">
                {accountType === 'team' ? 'Agency / team name' : 'Workspace name'}
              </label>
              <input
                id="account_name"
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                required
                minLength={2}
                maxLength={60}
                placeholder={accountType === 'team' ? 'e.g. Armful Media' : 'e.g. NovaSkin Beauty'}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-foreground-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors"
              />
            </div>

            {error && <p className="text-[11px] text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={isPending || accountName.length < 2}
              className="h-10 w-full rounded-lg bg-brand px-4 text-[12px] font-semibold text-white transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? 'Setting up your account…' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add `/onboarding/name` to public paths in `proxy.ts`**

In `proxy.ts`, find the `publicPaths` array and add `'/onboarding/name'`.

- [ ] **Step 4: Run type check**

```bash
npm run type-check
```
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add app/onboarding/name/page.tsx lib/actions/auth.ts proxy.ts
git commit -m "04142026 - add /onboarding/name fallback page for Google OAuth users"
```

---

## Task 14: Upgrade Page + Action

**Files:**
- Create: `lib/actions/upgrade.ts`
- Create: `app/upgrade/page.tsx`

- [ ] **Step 1: Create `lib/actions/upgrade.ts`**

```typescript
// lib/actions/upgrade.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { sendEmail, escapeHtml } from '@/lib/email'
import { checkActionLimit, getRequestIp, limiters } from '@/lib/rate-limit'
import { upgradeRequestSchema } from '@/lib/validations'
import type { UpgradeRequestInput } from '@/lib/validations'

export async function submitUpgradeRequest(
  data: UpgradeRequestInput
): Promise<{ error: string } | { success: true }> {
  const ip = await getRequestIp()
  const limited = await checkActionLimit(`upgrade:ip:${ip}`, limiters.signup) // reuse signup limiter (3/hr)
  if (limited) return limited

  const parsed = upgradeRequestSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const notifyEmail = process.env.AGENCY_NOTIFICATION_EMAIL
  if (!notifyEmail) {
    console.warn('[upgrade] AGENCY_NOTIFICATION_EMAIL not set — skipping notification')
    return { success: true }
  }

  const { name, email, account_name, message } = parsed.data

  await sendEmail({
    to: notifyEmail,
    subject: `Upgrade request from ${escapeHtml(account_name)}`,
    html: `
      <p><strong>New upgrade request</strong></p>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Account:</strong> ${escapeHtml(account_name)}</p>
      ${message ? `<p><strong>Message:</strong> ${escapeHtml(message)}</p>` : ''}
    `,
  })

  return { success: true }
}
```

- [ ] **Step 2: Create `app/upgrade/page.tsx`**

```tsx
// app/upgrade/page.tsx
'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { CheckCircle } from '@phosphor-icons/react'
import { submitUpgradeRequest } from '@/lib/actions/upgrade'

const FEATURES = [
  { label: 'Campaigns + influencer tracking', trial: true, free: true, pro: true },
  { label: 'Post detection', trial: true, free: true, pro: true },
  { label: 'Basic post list + metrics', trial: true, free: true, pro: true },
  { label: 'Drive download', trial: true, free: false, pro: true },
  { label: 'EMV reporting', trial: true, free: false, pro: true },
  { label: 'Advanced analytics', trial: true, free: false, pro: true },
  { label: 'Team member invites', trial: true, free: false, pro: true },
  { label: 'Multiple brand workspaces', trial: true, free: false, pro: true },
]

export default function UpgradePage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [accountName, setAccountName] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await submitUpgradeRequest({ name, email, account_name: accountName, message: message || undefined })
      if ('error' in result) {
        setError(result.error)
        return
      }
      setSuccess(true)
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border px-6 py-4">
        <Link href="/app">
          <Image src="/POST_TRACKER.svg" alt="Instroom Post Tracker" width={130} height={30} priority />
        </Link>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-[24px] font-bold text-foreground">Upgrade to Pro</h1>
        <p className="mt-2 text-[14px] text-foreground-lighter">
          Get full access to Drive downloads, EMV reporting, advanced analytics, and unlimited team collaboration.
        </p>

        {/* Feature comparison table */}
        <div className="mt-8 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-background-muted">
                <th className="px-4 py-3 text-left font-medium text-foreground">Feature</th>
                <th className="px-4 py-3 text-center font-medium text-foreground">Trial</th>
                <th className="px-4 py-3 text-center font-medium text-foreground">Free</th>
                <th className="px-4 py-3 text-center font-medium text-brand">Pro</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((f, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 text-foreground-light">{f.label}</td>
                  {(['trial', 'free', 'pro'] as const).map((plan) => (
                    <td key={plan} className="px-4 py-2.5 text-center">
                      {f[plan] ? (
                        <CheckCircle size={16} className="mx-auto text-brand" weight="fill" />
                      ) : (
                        <span className="text-foreground-muted">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Request form */}
        <div className="mt-8 rounded-xl border border-border bg-background-surface p-6">
          <h2 className="mb-4 text-[15px] font-semibold text-foreground">Request upgrade</h2>
          <p className="mb-6 text-[12px] text-foreground-lighter">
            Fill in the form below and we'll get back to you within 1 business day.
          </p>

          {success ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle size={32} className="text-brand" weight="fill" />
              <p className="text-[14px] font-semibold text-foreground">Request received!</p>
              <p className="text-[12px] text-foreground-lighter">We'll be in touch soon.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-medium text-foreground-light">Your name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-10 rounded-lg border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-foreground-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-medium text-foreground-light">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 rounded-lg border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-foreground-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-foreground-light">Agency or workspace name</label>
                <input
                  type="text"
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="h-10 rounded-lg border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-foreground-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-foreground-light">Message (optional)</label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2.5 text-[13px] text-foreground placeholder:text-foreground-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none"
                />
              </div>
              {error && <p className="text-[11px] text-destructive">{error}</p>}
              <button
                type="submit"
                disabled={isPending}
                className="h-10 w-full rounded-lg bg-brand px-4 text-[12px] font-semibold text-white transition-colors hover:bg-brand/90 disabled:opacity-60"
              >
                {isPending ? 'Sending…' : 'Send request'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add `/upgrade` to public paths in `proxy.ts`**

In `proxy.ts`, add `'/upgrade'` to the `publicPaths` array.

- [ ] **Step 4: Run type check**

```bash
npm run type-check
```
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add lib/actions/upgrade.ts app/upgrade/page.tsx proxy.ts
git commit -m "04142026 - add upgrade page and submitUpgradeRequest action"
```

---

## Task 15: Admin Plan Management

**Files:**
- Create: `lib/actions/admin.ts`
- Modify: `app/admin/page.tsx`
- Modify: `components/admin/agencies-table.tsx`

- [ ] **Step 1: Create `lib/actions/admin.ts`**

```typescript
// lib/actions/admin.ts
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { PlanType } from '@/lib/utils/plan'

export async function setWorkspacePlan(
  workspaceId: string,
  plan: PlanType,
  quota?: number
): Promise<{ error: string } | void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRecord } = await supabase
    .from('users')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!userRecord?.is_platform_admin) return { error: 'Unauthorized.' }

  const serviceClient = createServiceClient()
  const updates: Record<string, unknown> = { plan }
  if (quota !== undefined) updates.workspace_quota = quota

  const { error } = await serviceClient.from('workspaces').update(updates).eq('id', workspaceId)

  if (error) return { error: 'Failed to update plan.' }

  revalidatePath('/admin', 'layout')
}
```

- [ ] **Step 2: Update admin page and table to show workspace plan**

In `app/admin/page.tsx`: change query from `agencies` to `workspaces` with owner join. Select: `id, name, slug, plan, workspace_quota, account_type, trial_ends_at, workspace_members(user_id, role, users(email))`.

In `components/admin/agencies-table.tsx` → rename conceptually to a workspaces table. Show columns: workspace name, owner email, account type, plan (dropdown), workspace quota (editable input).

Add a `PlanDropdown` component that calls `setWorkspacePlan`:

```tsx
// In components/admin/agencies-table.tsx — add to imports:
import { useState, useTransition } from 'react'
import { setWorkspacePlan } from '@/lib/actions/admin'
import type { PlanType } from '@/lib/utils/plan'

function PlanDropdown({ workspaceId, currentPlan }: { workspaceId: string; currentPlan: PlanType }) {
  const [plan, setPlanState] = useState<PlanType>(currentPlan)
  const [isPending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newPlan = e.target.value as PlanType
    setPlanState(newPlan)
    startTransition(async () => {
      await setWorkspacePlan(workspaceId, newPlan)
    })
  }

  return (
    <select
      value={plan}
      onChange={handleChange}
      disabled={isPending}
      onClick={(e) => e.stopPropagation()}
      className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
    >
      <option value="trial">trial</option>
      <option value="free">free</option>
      <option value="pro">pro</option>
    </select>
  )
}
```

In the workspace row JSX, add `<PlanDropdown workspaceId={workspace.id} currentPlan={workspace.plan ?? 'free'} />` in the plan column.

- [ ] **Step 3: Run type check**

```bash
npm run type-check
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add lib/actions/admin.ts app/admin/page.tsx components/admin/agencies-table.tsx
git commit -m "04142026 - add setWorkspacePlan admin action and workspace plan management table"
```

---

## Task 16: Trial Worker

**Files:**
- Create: `workers/src/trial-worker.ts`

Follows the same structure as `workers/src/followup-worker.ts`.

- [ ] **Step 1: Create `workers/src/trial-worker.ts`**

```typescript
// workers/src/trial-worker.ts
import { createServiceClient } from './lib/supabase'
import { sendEmail, escapeHtml } from './lib/email'

function trialDaysRemaining(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0
  return Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000))
}

function trialReminder7Html(accountName: string): string {
  return `
    <p>Hi there,</p>
    <p>Your Instroom free trial for <strong>${escapeHtml(accountName)}</strong> ends in <strong>7 days</strong>.</p>
    <p>You still have full access to Drive downloads, EMV reporting, advanced analytics, and team collaboration.</p>
    <p>Upgrade before your trial ends to keep these features:</p>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/upgrade" style="color:#16a34a;">View upgrade options →</a></p>
    <p style="color:#888;font-size:12px;">This is your 7-day trial reminder.</p>
  `
}

function trialReminder2Html(accountName: string): string {
  return `
    <p>Hi there,</p>
    <p>Just 2 days left in your Instroom trial for <strong>${escapeHtml(accountName)}</strong>.</p>
    <p>After your trial ends, Drive downloads, EMV reporting, advanced analytics, and team invites will be locked.</p>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/upgrade" style="color:#16a34a;">Upgrade now to keep full access →</a></p>
    <p style="color:#888;font-size:12px;">This is your 2-day trial reminder.</p>
  `
}

function trialEndedHtml(accountName: string): string {
  return `
    <p>Hi there,</p>
    <p>Your Instroom free trial for <strong>${escapeHtml(accountName)}</strong> has ended.</p>
    <p>Your account is now on the free plan. Core features (campaigns, influencers, post detection) remain active.</p>
    <p>Upgrade to restore Drive downloads, EMV reporting, advanced analytics, and team collaboration:</p>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/upgrade" style="color:#16a34a;">View upgrade options →</a></p>
  `
}

async function processWorkspaces(
  supabase: ReturnType<typeof createServiceClient>
) {
  const { data: rows, error } = await supabase
    .from('workspaces')
    .select(`
      id,
      name,
      plan,
      trial_ends_at,
      trial_reminder_7_sent_at,
      trial_reminder_12_sent_at,
      trial_ended_notified_at
    `)
    .eq('plan', 'trial')

  if (error) {
    console.error('[trial-worker] Failed to load workspaces:', error)
    return { processed: 0, emailsSent: 0, errors: [error.message] }
  }

  if (!rows || rows.length === 0) return { processed: 0, emailsSent: 0, errors: [] }

  let emailsSent = 0
  const errors: string[] = []

  for (const row of rows) {
    try {
      const days = trialDaysRemaining(row.trial_ends_at as string | null)

      // Fetch owner email
      const { data: member } = await supabase
        .from('workspace_members')
        .select('user_id, users!workspace_members_user_id_fkey(email)')
        .eq('workspace_id', row.id as string)
        .eq('role', 'owner')
        .single()
      const ownerEmail = (member?.users as unknown as { email: string } | null)?.email ?? null

      if (!ownerEmail) {
        errors.push(`[workspace ${row.id}] No owner email found`)
        continue
      }

      const name = escapeHtml(row.name as string)

      // Day 7 reminder
      if (days <= 7 && !row.trial_reminder_7_sent_at) {
        await sendEmail({
          to: ownerEmail,
          subject: 'Your Instroom trial ends in 7 days',
          html: trialReminder7Html(name),
        })
        await supabase
          .from('workspaces')
          .update({ trial_reminder_7_sent_at: new Date().toISOString() })
          .eq('id', row.id)
        emailsSent++
        console.log(`[trial-worker] Day-7 reminder sent to ${ownerEmail} (workspace ${row.id})`)
      }

      // Day 2 reminder
      if (days <= 2 && !row.trial_reminder_12_sent_at) {
        await sendEmail({
          to: ownerEmail,
          subject: '2 days left in your Instroom trial',
          html: trialReminder2Html(name),
        })
        await supabase
          .from('workspaces')
          .update({ trial_reminder_12_sent_at: new Date().toISOString() })
          .eq('id', row.id)
        emailsSent++
        console.log(`[trial-worker] Day-2 reminder sent to ${ownerEmail} (workspace ${row.id})`)
      }

      // Trial ended notification
      if (days === 0 && row.trial_ends_at && !row.trial_ended_notified_at) {
        await sendEmail({
          to: ownerEmail,
          subject: 'Your Instroom trial has ended',
          html: trialEndedHtml(name),
        })
        await supabase
          .from('workspaces')
          .update({ trial_ended_notified_at: new Date().toISOString() })
          .eq('id', row.id)
        emailsSent++
        console.log(`[trial-worker] Trial-ended email sent to ${ownerEmail} (workspace ${row.id})`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      errors.push(`[workspace ${row.id}] ${msg}`)
    }
  }

  return { processed: rows.length, emailsSent, errors }
}

async function main() {
  const supabase = createServiceClient()
  const result = await processWorkspaces(supabase)

  console.log(JSON.stringify({
    processed: result.processed,
    emailsSent: result.emailsSent,
    ...(result.errors.length > 0 && { errors: result.errors }),
  }))

  process.exit(result.errors.length > 0 && result.processed === 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 2: Add the worker to Railway cron config**

In your Railway project, add a new cron job for `trial-worker` with schedule `0 9 * * *` (9 AM UTC = 5 PM PHT). The entry command should match the pattern of other workers (e.g., `npx ts-node workers/src/trial-worker.ts` or via npm script).

- [ ] **Step 3: Commit**

```bash
git add workers/src/trial-worker.ts
git commit -m "04142026 - add trial-worker for daily reminder + expiry notification emails"
```

---

## Verification

### Self-Serve Signup
1. Click "Start free trial" → lands on `/signup` (not `/request-access`)
2. **Email + Solo**: fill account_name "NovaSkin Beauty", submit → verify email → lands on `/novaskin-beauty/overview`. In Supabase: `workspaces.plan = 'trial'`, `trial_ends_at` ≈ NOW() + 14 days, `account_type = 'solo'`, `workspace_quota = 1`
3. **Email + Team**: fill account_name "Armful Media", submit → verify → lands on `/armful-media/overview`. In Supabase: `workspaces.plan = 'trial'`, `workspace_quota = 3`
4. **Personal email for team**: soft warning shown below email field; form still submits
5. **Duplicate slug**: sign up "NovaSkin Beauty" twice → second gets slug `novaskin-beauty-2`, no error
6. **Re-click verify link**: no duplicate rows (idempotent check)
7. **Google OAuth**: no account_name pre-filled → redirected to `/onboarding/name` → fills form → lands on `/[slug]/overview`

### Feature Gates
8. **Trial user**: Drive download button present, all analytics charts visible, invite member works
9. **Set `plan='free'`** in Supabase directly → Drive download returns error; EMV/ER/leaderboard show UpgradeGate; inviteMember returns error
10. **Set `plan='pro'`** → all features restored

### Trial Banner
11. Trial user → banner visible in app shell with days remaining
12. Set `trial_ends_at = NOW() + '2 days'::interval` → banner turns amber
13. Set `trial_ends_at = NOW() - '1 day'::interval` → banner turns red "trial ended"

### Trial Emails (test manually)
14. In Supabase: set `trial_ends_at = NOW() + '7 days'::interval`, `trial_reminder_7_sent_at = NULL` on a workspace → run `npx ts-node workers/src/trial-worker.ts` → email sent, `trial_reminder_7_sent_at` set
15. Run again → email NOT re-sent (idempotent)
16. pg_cron at 00:30 UTC → `plan = 'free'` set on any expired trial rows

### Upgrade
17. `/upgrade` accessible without auth → form submits → email received at `AGENCY_NOTIFICATION_EMAIL`
18. Admin visits `/admin` → sees plan dropdown on workspace row → sets `plan='pro'` → user refreshes → full access restored

### Regressions
19. `/invite/[token]` team invite flow still works (no gate in that path)
20. `arjay09.adr43@gmail.com` (platform admin) still routes to `/admin`
21. Existing workspaces (plan defaults to `'free'`, `trial_ends_at = NULL`) — banner does **not** appear for them (the `if (!trialEndsAt) return null` guard fires). They retain core features only. Admin can manually set `plan='pro'` to restore full access. This is intentional — the migration doesn't expose a misleading "trial ending" message to existing accounts.
