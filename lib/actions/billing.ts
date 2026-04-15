'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { toSlug, deduplicateSlug } from '@/lib/utils'

/**
 * Optimistically activates a subscription after PayPal onApprove fires.
 * Sets plan='pro' on all owned workspaces immediately.
 * The PayPal webhook will independently confirm or correct this state.
 */
export async function activateSubscription(
  paypalSubscriptionId: string,
  planType: 'solo' | 'team',
  extraWorkspaces: number = 0
): Promise<{ error: string } | void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const serviceClient = createServiceClient()

  // Upsert subscription record (status='active' optimistically)
  const { error: subError } = await serviceClient.from('subscriptions').upsert(
    {
      user_id: user.id,
      paypal_subscription_id: paypalSubscriptionId,
      plan_type: planType,
      status: 'active',
      extra_workspaces: extraWorkspaces,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'paypal_subscription_id' }
  )

  if (subError) return { error: 'Failed to save subscription.' }

  // Fetch owned memberships (needed for workspace updates)
  const { data: memberships } = await serviceClient
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('role', 'owner')

  const workspaceIds = memberships?.map((m) => m.workspace_id) ?? []

  // For team upgrades: ensure an agency exists and all owned workspaces are linked
  let agencyId: string | null = null
  if (planType === 'team') {
    const { data: existingAgency } = await serviceClient
      .from('agencies')
      .select('id, slug')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (existingAgency) {
      agencyId = existingAgency.id
    } else {
      // Create agency — name from user profile or first workspace
      const { data: userRow } = await serviceClient
        .from('users')
        .select('full_name, email')
        .eq('id', user.id)
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
        .insert({ name: agencyName, slug: agencySlug, owner_id: user.id, status: 'active' })
        .select('id')
        .single()

      agencyId = newAgency?.id ?? null
    }

    // Link all owned workspaces to this agency
    if (agencyId && workspaceIds.length > 0) {
      await serviceClient
        .from('workspaces')
        .update({ agency_id: agencyId })
        .in('id', workspaceIds)
        .is('agency_id', null)
    }
  }

  // Update all owned workspaces to plan='pro' and account_type=planType
  if (workspaceIds.length > 0) {
    await serviceClient
      .from('workspaces')
      .update({ plan: 'pro', account_type: planType })
      .in('id', workspaceIds)
  }

  revalidatePath('/[workspaceSlug]', 'layout')
}
