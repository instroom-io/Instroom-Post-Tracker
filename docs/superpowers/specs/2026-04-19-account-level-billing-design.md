# Account-Level Billing — Design Spec
**Date:** 2026-04-19
**Status:** Approved

---

## Context

The upgrade page lived at `/{workspaceSlug}/upgrade`, which had two problems:

1. **Conceptual mismatch** — Solo/Team is an account-level subscription (tied to the user), not a per-workspace subscription. The URL implied you were upgrading a specific brand, not your account.
2. **Data bug** — The LemonSqueezy webhook activated `plan='pro'` only on the one workspace that initiated checkout. A Team user with 3 workspaces would find their other 2 workspaces still on `free`.

This spec moves billing to `/account/upgrade`, fixes the webhook to apply plan changes to all owned workspaces, and removes two dead empty directories.

---

## Route Structure

### New routes

| Path | File | Notes |
|------|------|-------|
| `/account/upgrade` | `app/(account)/upgrade/page.tsx` | Server component — fetches user + plan state |
| `/account/upgrade` (client) | `app/(account)/upgrade/upgrade-client.tsx` | Moved from workspace scope, unchanged logic |
| `/account/layout.tsx` | `app/(account)/layout.tsx` | Minimal centered layout, auth required, no sidebar |

The `(account)` route group sits at the app root alongside `(auth)` and `(marketing)`.

### Old routes (replaced)

| Old file | Action |
|----------|--------|
| `app/(app)/[workspaceSlug]/(billing)/upgrade/page.tsx` | Replace with `redirect('/account/upgrade')` |
| `app/(app)/[workspaceSlug]/(billing)/trial-expired/page.tsx` | Replace with `redirect('/account/upgrade?expired=true')` |
| `app/(app)/[workspaceSlug]/(billing)/layout.tsx` | Delete |

---

## Webhook Fix

**File:** `app/api/webhooks/lemonsqueezy/route.ts`

All plan-state events (`subscription_created`, `subscription_cancelled`, `subscription_expired`, `subscription_payment_failed`, `subscription_payment_recovered`) switch from updating by `workspace_slug` to updating all workspaces owned by `user_id`:

```ts
// Find all owned workspaces
const { data: memberships } = await supabase
  .from('workspace_members')
  .select('workspace_id')
  .eq('user_id', user_id)
  .eq('role', 'owner')

// Apply plan change to all of them
await supabase
  .from('workspaces')
  .update({ plan: newPlan })
  .in('id', memberships.map(m => m.workspace_id))
```

The `workspace_slug` field is removed from `checkout_data.custom` in `lib/billing/lemonsqueezy.ts` — it is no longer needed. `user_id` is the only identifier required.

---

## Checkout Action Changes

**File:** `lib/billing/lemonsqueezy.ts`
- Remove `workspaceSlug` from `CreateCheckoutOptions`
- Remove `workspace_slug` from `checkout_data.custom`

**File:** `lib/actions/billing.ts`
- Remove `workspaceSlug` parameter from `createCheckoutSession`
- `redirectUrl` becomes: `${NEXT_PUBLIC_APP_URL}/account/upgrade?success=true&type=...&period=...&total=...`

---

## Success Flow

After checkout, `/account/upgrade?success=true` polls every 2s until `plan='pro'` (45s timeout). On activation:
- Fetch the user's first owned workspace via `workspace_members` (role='owner')
- Redirect to `/{workspaceSlug}/overview`
- If no workspace found, redirect to `/app`

The success confirmation card shows: plan type, workspace count, and billing amount — same as current implementation.

---

## URL Updates

All "upgrade" links across the app point to `/account/upgrade`:

| File | Change |
|------|--------|
| `components/layout/trial-banner.tsx` | `upgradeHref` prop default → `/account/upgrade` |
| `components/billing/billing-status-card.tsx` | Upgrade/Reactivate CTA → `/account/upgrade` |
| `app/(app)/[workspaceSlug]/(dashboard)/layout.tsx` | Hard-gate redirect: `/${workspaceSlug}/trial-expired` → `/account/upgrade` |
| `proxy.ts` | Verify `/account` is NOT in `publicPaths` — it requires auth; middleware already redirects unauthenticated users to `/login?redirectTo=...` |

---

## Cleanup

Delete these empty dead directories:

- `app/api/cron/` — Workers migrated to Railway in March 2026; directory was left behind
- `app/api/webhooks/ensemble/` — Ensemble is a pull-only polling API; this placeholder was never implemented

---

## Verification

1. Sign up as a new user → workspace auto-created with `plan='trial'`
2. Navigate to `/account/upgrade` directly — page loads without workspace context
3. Complete a test checkout (use LS test mode) → webhook fires → **both** owned workspaces (if Team) show `plan='pro'` in Supabase
4. Old URL `/{workspaceSlug}/upgrade` → confirms redirect to `/account/upgrade`
5. Old URL `/{workspaceSlug}/trial-expired` → confirms redirect to `/account/upgrade`
6. Trial banner "Compare plans" link → `/account/upgrade`
7. Settings billing tab "Upgrade Now" → `/account/upgrade`
8. `app/api/cron/` and `app/api/webhooks/ensemble/` no longer exist in the repo
