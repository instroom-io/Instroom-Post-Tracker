'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'

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

  // Update all owned workspaces to plan='pro' and account_type=planType
  const { data: memberships } = await serviceClient
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('role', 'owner')

  const workspaceIds = memberships?.map((m) => m.workspace_id) ?? []

  if (workspaceIds.length > 0) {
    await serviceClient
      .from('workspaces')
      .update({ plan: 'pro', account_type: planType })
      .in('id', workspaceIds)
  }

  revalidatePath('/[workspaceSlug]', 'layout')
}
