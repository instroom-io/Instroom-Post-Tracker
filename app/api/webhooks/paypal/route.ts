// app/api/webhooks/paypal/route.ts
// Handles PayPal subscription lifecycle events.
// Security: signature verified via PayPal's verify-webhook-signature API.
// Idempotency: each event ID stored in paypal_webhook_events — duplicates are silently dropped.
// Error handling: always returns 200 to prevent PayPal retry storms; errors are logged only.

import { createServiceClient } from '@/lib/supabase/server'

const PAYPAL_API_BASE =
  process.env.PAYPAL_MODE === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com'

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getPayPalAccessToken(): Promise<string> {
  const credentials = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  const data = await res.json() as { access_token: string }
  return data.access_token
}

async function verifyWebhookSignature(
  accessToken: string,
  headers: Record<string, string>,
  rawBody: string
): Promise<boolean> {
  const res = await fetch(
    `${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_algo: headers['paypal-auth-algo'],
        cert_url: headers['paypal-cert-url'],
        transmission_id: headers['paypal-transmission-id'],
        transmission_sig: headers['paypal-transmission-sig'],
        transmission_time: headers['paypal-transmission-time'],
        webhook_id: process.env.PAYPAL_WEBHOOK_ID,
        webhook_event: JSON.parse(rawBody),
      }),
    }
  )

  const data = await res.json() as { verification_status: string }
  return data.verification_status === 'SUCCESS'
}

type ServiceClient = ReturnType<typeof createServiceClient>

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

// ── Event handlers ────────────────────────────────────────────────────────────

async function handleActivated(
  serviceClient: ServiceClient,
  resource: Record<string, unknown>
) {
  const subscriptionId = resource.id as string
  const { data: sub } = await serviceClient
    .from('subscriptions')
    .select('user_id')
    .eq('paypal_subscription_id', subscriptionId)
    .single()
  if (!sub) return

  await serviceClient
    .from('subscriptions')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('paypal_subscription_id', subscriptionId)

  await updateWorkspacePlan(serviceClient, sub.user_id, 'pro')
}

async function handleCancelled(
  serviceClient: ServiceClient,
  resource: Record<string, unknown>
) {
  const subscriptionId = resource.id as string
  const { data: sub } = await serviceClient
    .from('subscriptions')
    .select('user_id')
    .eq('paypal_subscription_id', subscriptionId)
    .single()
  if (!sub) return

  await serviceClient
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('paypal_subscription_id', subscriptionId)

  await updateWorkspacePlan(serviceClient, sub.user_id, 'free')
}

async function handleSuspended(
  serviceClient: ServiceClient,
  resource: Record<string, unknown>
) {
  const subscriptionId = resource.id as string
  const { data: sub } = await serviceClient
    .from('subscriptions')
    .select('user_id')
    .eq('paypal_subscription_id', subscriptionId)
    .single()
  if (!sub) return

  await serviceClient
    .from('subscriptions')
    .update({ status: 'suspended', updated_at: new Date().toISOString() })
    .eq('paypal_subscription_id', subscriptionId)

  await updateWorkspacePlan(serviceClient, sub.user_id, 'free')
}

async function handleReactivated(
  serviceClient: ServiceClient,
  resource: Record<string, unknown>
) {
  const subscriptionId = resource.id as string
  const { data: sub } = await serviceClient
    .from('subscriptions')
    .select('user_id')
    .eq('paypal_subscription_id', subscriptionId)
    .single()
  if (!sub) return

  await serviceClient
    .from('subscriptions')
    .update({
      status: 'active',
      cancelled_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('paypal_subscription_id', subscriptionId)

  await updateWorkspacePlan(serviceClient, sub.user_id, 'pro')
}

async function handleSaleCompleted(
  serviceClient: ServiceClient,
  resource: Record<string, unknown>
) {
  // billing_agreement_id is the subscription ID on recurring sale events
  const subscriptionId = (resource.billing_agreement_id ?? resource.id) as string
  const nextBillingTime = resource.create_time as string | undefined
  if (!nextBillingTime) return

  await serviceClient
    .from('subscriptions')
    .update({
      current_period_end: nextBillingTime,
      updated_at: new Date().toISOString(),
    })
    .eq('paypal_subscription_id', subscriptionId)
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const rawBody = await request.text()

  const sigHeaders = {
    'paypal-auth-algo': request.headers.get('paypal-auth-algo') ?? '',
    'paypal-cert-url': request.headers.get('paypal-cert-url') ?? '',
    'paypal-transmission-id': request.headers.get('paypal-transmission-id') ?? '',
    'paypal-transmission-sig': request.headers.get('paypal-transmission-sig') ?? '',
    'paypal-transmission-time': request.headers.get('paypal-transmission-time') ?? '',
  }

  // 1. Verify signature
  try {
    const token = await getPayPalAccessToken()
    const valid = await verifyWebhookSignature(token, sigHeaders, rawBody)
    if (!valid) {
      console.error('[PayPal Webhook] Signature verification failed')
      return new Response('Unauthorized', { status: 400 })
    }
  } catch (err) {
    console.error('[PayPal Webhook] Verification error:', err)
    return new Response('Verification error', { status: 400 })
  }

  // 2. Parse event
  let event: { id: string; event_type: string; resource: Record<string, unknown> }
  try {
    event = JSON.parse(rawBody) as typeof event
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const serviceClient = createServiceClient()

  // 3. Idempotency guard — insert event; conflict means already processed
  const { error: dupError } = await serviceClient
    .from('paypal_webhook_events')
    .insert({ id: event.id, event_type: event.event_type })

  if (dupError?.code === '23505') {
    // Duplicate delivery — already processed
    return new Response('OK', { status: 200 })
  }

  // 4. Route to handler
  try {
    switch (event.event_type) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        await handleActivated(serviceClient, event.resource)
        break
      case 'BILLING.SUBSCRIPTION.CANCELLED':
        await handleCancelled(serviceClient, event.resource)
        break
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        await handleSuspended(serviceClient, event.resource)
        break
      case 'BILLING.SUBSCRIPTION.RE-ACTIVATED':
        await handleReactivated(serviceClient, event.resource)
        break
      case 'PAYMENT.SALE.COMPLETED':
        await handleSaleCompleted(serviceClient, event.resource)
        break
    }
  } catch (err) {
    // Log but always return 200 — never trigger PayPal retry storm on our DB errors
    console.error(`[PayPal Webhook] Handler error for ${event.event_type}:`, err)
  }

  return new Response('OK', { status: 200 })
}
