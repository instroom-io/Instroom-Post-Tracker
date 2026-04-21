// app/api/webhooks/lemonsqueezy/route.ts
// Handles Lemon Squeezy subscription lifecycle events.
// Security: HMAC-SHA256 signature verified against LEMONSQUEEZY_WEBHOOK_SECRET.
// Idempotency: composite key "{event_name}:{data.id}" stored in webhook_events.
// Error handling: always returns 200 to prevent LS retry storms; errors logged only.

import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'
import { toSlug, deduplicateSlug } from '@/lib/utils'
import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/email'
import { getSoloPrice, calcTeamTotal } from '@/lib/billing/pricing'
import {
  subscriptionReceiptEmail,
  subscriptionRenewalEmail,
  subscriptionPaymentFailedEmail,
} from '@/lib/email/templates/subscription-receipt'

// ── Types ─────────────────────────────────────────────────────────────────────

interface LSCustomData {
  user_id: string
  plan_type: string
  billing_period: string
  extra_workspaces: string
}

interface LSSubscriptionAttributes {
  status: string
  renews_at: string | null
  ends_at: string | null
  cancelled: boolean
  updated_at: string
}

interface LSInvoiceAttributes {
  subscription_id: number
  status: string
  renewed_at: string | null
  billing_reason?: 'initial' | 'renewal'
}


interface LSWebhookEvent {
  meta: {
    event_name: string
    custom_data?: LSCustomData
  }
  data: {
    id: string
    type: string
    attributes: LSSubscriptionAttributes & LSInvoiceAttributes
  }
}

type ServiceClient = ReturnType<typeof createServiceClient>

// ── Helpers ───────────────────────────────────────────────────────────────────

function verifySignature(secret: string, rawBody: string, signature: string): boolean {
  if (!signature) return false
  const hmac = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(signature, 'hex'))
  } catch {
    return false
  }
}

async function updateWorkspacePlan(
  serviceClient: ServiceClient,
  userId: string,
  plan: 'pro' | 'free'
) {
  const { data: memberships } = await serviceClient
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
    .eq('role', 'owner')

  const ids = memberships?.map((m) => m.workspace_id) ?? []
  if (ids.length === 0) return
  await serviceClient.from('workspaces').update({ plan }).in('id', ids)
}

async function updateAgencyPlan(
  serviceClient: ServiceClient,
  userId: string,
  plan: 'pro' | 'free'
) {
  await serviceClient.from('agencies').update({ plan }).eq('owner_id', userId)
}

async function ensureAgencyForTeamPlan(
  serviceClient: ServiceClient,
  userId: string,
  workspaceIds: string[]
) {
  const { data: existingAgency } = await serviceClient
    .from('agencies')
    .select('id, slug')
    .eq('owner_id', userId)
    .maybeSingle()

  let agencyId = existingAgency?.id ?? null

  if (!agencyId) {
    const { data: userRow } = await serviceClient
      .from('users')
      .select('full_name, email')
      .eq('id', userId)
      .single()

    const agencyName = userRow?.full_name ?? userRow?.email?.split('@')[0] ?? 'My Team'
    const base = toSlug(agencyName)
    const { data: takenSlugs } = await serviceClient
      .from('agencies')
      .select('slug')
      .ilike('slug', `${base}%`)

    const agencySlug = deduplicateSlug(base, takenSlugs?.map((r) => r.slug) ?? [])
    const { data: newAgency } = await serviceClient
      .from('agencies')
      .insert({ name: agencyName, slug: agencySlug, owner_id: userId, status: 'active' })
      .select('id')
      .single()

    agencyId = newAgency?.id ?? null
  }

  if (agencyId && workspaceIds.length > 0) {
    await serviceClient
      .from('workspaces')
      .update({ agency_id: agencyId })
      .in('id', workspaceIds)
      .is('agency_id', null)
  }
}

// ── Event handlers ────────────────────────────────────────────────────────────

async function handleSubscriptionCreated(
  serviceClient: ServiceClient,
  event: LSWebhookEvent
) {
  const lsSubId = event.data.id
  const attrs = event.data.attributes
  const customData = event.meta.custom_data
  if (!customData?.user_id) return

  const userId = customData.user_id
  const planType = customData.plan_type as 'solo' | 'team'
  const extraWorkspaces = parseInt(customData.extra_workspaces ?? '0', 10)

  await serviceClient.from('subscriptions').upsert(
    {
      user_id: userId,
      provider: 'lemonsqueezy',
      provider_subscription_id: lsSubId,
      plan_type: planType,
      status: 'active',
      extra_workspaces: extraWorkspaces,
      current_period_end: attrs.renews_at,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'provider_subscription_id' }
  )

  const { data: memberships } = await serviceClient
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
    .eq('role', 'owner')

  const workspaceIds = memberships?.map((m) => m.workspace_id) ?? []

  if (planType === 'team' && workspaceIds.length > 0) {
    await ensureAgencyForTeamPlan(serviceClient, userId, workspaceIds)
  }

  if (workspaceIds.length > 0) {
    await serviceClient
      .from('workspaces')
      .update({ plan: 'pro', account_type: planType })
      .in('id', workspaceIds)
  }

  await updateAgencyPlan(serviceClient, userId, 'pro')

  // Send subscription confirmation email
  const { data: userRow } = await serviceClient
    .from('users')
    .select('email, full_name')
    .eq('id', userId)
    .single()

  if (userRow?.email) {
    const billingPeriod = (customData.billing_period ?? 'monthly') as 'monthly' | 'annual'
    const monthlyPrice = planType === 'solo'
      ? getSoloPrice(billingPeriod)
      : calcTeamTotal(extraWorkspaces, billingPeriod)
    const totalFormatted = billingPeriod === 'annual'
      ? `$${monthlyPrice * 12}/year`
      : `$${monthlyPrice}/month`
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

    await sendEmail({
      to: userRow.email,
      subject: 'Your Instroom subscription is active',
      html: subscriptionReceiptEmail({
        userName: userRow.full_name || userRow.email,
        planLabel: planType === 'team' ? 'Team Plan' : 'Solo Plan',
        billingLabel: billingPeriod === 'annual' ? 'Annual' : 'Monthly',
        totalFormatted,
        subscriptionRef: lsSubId,
        billingSettingsUrl: `${appUrl}/account/billing`,
      }),
    })
  }

  revalidatePath('/[workspaceSlug]', 'layout')
  revalidatePath('/agency/[agencySlug]', 'layout')
}

async function handleSubscriptionCancelled(
  serviceClient: ServiceClient,
  event: LSWebhookEvent
) {
  const lsSubId = event.data.id

  // Mark cancelled but keep workspace at 'pro' — the subscription continues until ends_at.
  // Access is revoked by subscription_expired, not subscription_cancelled.
  await serviceClient
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('provider', 'lemonsqueezy')
    .eq('provider_subscription_id', lsSubId)
}

async function handleSubscriptionExpired(
  serviceClient: ServiceClient,
  event: LSWebhookEvent
) {
  const lsSubId = event.data.id
  const { data: sub } = await serviceClient
    .from('subscriptions')
    .select('user_id')
    .eq('provider', 'lemonsqueezy')
    .eq('provider_subscription_id', lsSubId)
    .single()
  if (!sub) return

  await serviceClient
    .from('subscriptions')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('provider_subscription_id', lsSubId)

  await updateWorkspacePlan(serviceClient, sub.user_id, 'free')
  await updateAgencyPlan(serviceClient, sub.user_id, 'free')
  revalidatePath('/[workspaceSlug]', 'layout')
  revalidatePath('/agency/[agencySlug]', 'layout')
}

async function handlePaymentSuccess(
  serviceClient: ServiceClient,
  event: LSWebhookEvent
) {
  const lsSubId = String(event.data.attributes.subscription_id)
  const renewedAt = event.data.attributes.renewed_at
  const billingReason = event.data.attributes.billing_reason

  await serviceClient
    .from('subscriptions')
    .update({
      current_period_end: renewedAt,
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('provider', 'lemonsqueezy')
    .eq('provider_subscription_id', lsSubId)

  // Only send renewal email for actual renewals — LS also fires this event for the
  // initial payment. Use billing_reason when available; fall back to renewed_at being
  // non-null (initial payments have renewed_at = null).
  const isRenewal = billingReason ? billingReason === 'renewal' : renewedAt !== null
  if (!isRenewal) return

  // Send renewal notification email
  const { data: sub } = await serviceClient
    .from('subscriptions')
    .select('user_id, plan_type')
    .eq('provider', 'lemonsqueezy')
    .eq('provider_subscription_id', lsSubId)
    .single()

  if (sub) {
    const { data: userRow } = await serviceClient
      .from('users')
      .select('email, full_name')
      .eq('id', sub.user_id)
      .single()

    if (userRow?.email) {
      const nextDate = renewedAt
        ? new Date(renewedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : 'your next billing date'
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
      await sendEmail({
        to: userRow.email,
        subject: 'Your Instroom subscription has been renewed',
        html: subscriptionRenewalEmail({
          userName: userRow.full_name || userRow.email,
          planLabel: sub.plan_type === 'team' ? 'Team Plan' : 'Solo Plan',
          nextBillingDate: nextDate,
          billingSettingsUrl: `${appUrl}/account/billing`,
        }),
      })
    }
  }
}

async function handlePaymentFailed(
  serviceClient: ServiceClient,
  event: LSWebhookEvent
) {
  const lsSubId = String(event.data.attributes.subscription_id)
  const { data: sub } = await serviceClient
    .from('subscriptions')
    .select('user_id, plan_type')
    .eq('provider', 'lemonsqueezy')
    .eq('provider_subscription_id', lsSubId)
    .single()
  if (!sub) return

  await serviceClient
    .from('subscriptions')
    .update({ status: 'suspended', updated_at: new Date().toISOString() })
    .eq('provider_subscription_id', lsSubId)

  await updateWorkspacePlan(serviceClient, sub.user_id, 'free')
  await updateAgencyPlan(serviceClient, sub.user_id, 'free')
  revalidatePath('/[workspaceSlug]', 'layout')
  revalidatePath('/agency/[agencySlug]', 'layout')

  // Send payment failed alert
  const { data: userRow } = await serviceClient
    .from('users')
    .select('email, full_name')
    .eq('id', sub.user_id)
    .single()

  if (userRow?.email) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    await sendEmail({
      to: userRow.email,
      subject: 'Action required: your Instroom payment failed',
      html: subscriptionPaymentFailedEmail({
        userName: userRow.full_name || userRow.email,
        planLabel: sub.plan_type === 'team' ? 'Team Plan' : 'Solo Plan',
        updatePaymentUrl: `${appUrl}/account/billing`,
      }),
    })
  }
}

async function handlePaymentRecovered(
  serviceClient: ServiceClient,
  event: LSWebhookEvent
) {
  const lsSubId = String(event.data.attributes.subscription_id)
  const { data: sub } = await serviceClient
    .from('subscriptions')
    .select('user_id')
    .eq('provider', 'lemonsqueezy')
    .eq('provider_subscription_id', lsSubId)
    .single()
  if (!sub) return

  await serviceClient
    .from('subscriptions')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('provider_subscription_id', lsSubId)

  await updateWorkspacePlan(serviceClient, sub.user_id, 'pro')
  await updateAgencyPlan(serviceClient, sub.user_id, 'pro')
  revalidatePath('/[workspaceSlug]', 'layout')
  revalidatePath('/agency/[agencySlug]', 'layout')
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-signature') ?? ''

  // 1. Verify signature
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET
  if (!secret || !verifySignature(secret, rawBody, signature)) {
    console.error('[LS Webhook] Signature verification failed')
    return new Response('Unauthorized', { status: 401 })
  }

  // 2. Parse event
  let event: LSWebhookEvent
  try {
    event = JSON.parse(rawBody) as LSWebhookEvent
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const serviceClient = createServiceClient()
  const eventName = event.meta.event_name

  // 3. Idempotency guard — composite key prevents duplicate processing
  const idempotencyKey = `${eventName}:${event.data.id}`
  const { error: dupError } = await serviceClient
    .from('webhook_events')
    .insert({ id: idempotencyKey, provider: 'lemonsqueezy', event_type: eventName })

  if (dupError?.code === '23505') {
    // Already processed — idempotent no-op
    return new Response('OK', { status: 200 })
  }
  if (dupError) {
    // Transient DB error — bail out; return 200 to avoid LS retry storm
    console.error('[LS Webhook] Failed to record idempotency key:', dupError.message)
    return new Response('OK', { status: 200 })
  }

  // 4. Route to handler
  try {
    switch (eventName) {
      case 'subscription_created':
        await handleSubscriptionCreated(serviceClient, event)
        break
      case 'subscription_cancelled':
        await handleSubscriptionCancelled(serviceClient, event)
        break
      case 'subscription_expired':
        await handleSubscriptionExpired(serviceClient, event)
        break
      case 'subscription_payment_success':
        await handlePaymentSuccess(serviceClient, event)
        break
      case 'subscription_payment_failed':
        await handlePaymentFailed(serviceClient, event)
        break
      case 'subscription_payment_recovered':
        await handlePaymentRecovered(serviceClient, event)
        break
      // subscription_updated: no action needed
    }
  } catch (err) {
    console.error(`[LS Webhook] Handler error for ${eventName}:`, err)
    // Always return 200 — never trigger LS retry storm on our DB errors
  }

  return new Response('OK', { status: 200 })
}
