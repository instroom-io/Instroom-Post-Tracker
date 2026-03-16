'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { brandRequestSchema } from '@/lib/validations'
import { toSlug } from '@/lib/utils'
import type { BrandRequest, BrandRequestStatus } from '@/lib/types'

/**
 * Submit a brand connection request (public — no auth required).
 * Uses service client because the form is unauthenticated.
 */
export async function submitBrandRequest(
  data: unknown
): Promise<{ success: true } | { error: string }> {
  const parsed = brandRequestSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const serviceClient = createServiceClient()

  const { error } = await serviceClient.from('brand_requests').insert({
    brand_name: parsed.data.brand_name,
    website_url: parsed.data.website_url,
    contact_name: parsed.data.contact_name,
    contact_email: parsed.data.contact_email,
    description: parsed.data.description || null,
    status: 'pending',
  })

  if (error) return { error: 'Failed to submit request. Please try again.' }

  return { success: true }
}

/**
 * Approve a brand request — agency only, uses service client.
 * Auto-creates workspace + membership + EMV defaults.
 */
export async function approveBrandRequest(
  requestId: string
): Promise<{ workspaceSlug: string } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const serviceClient = createServiceClient()

  // 1. Re-validate request is still pending (race condition guard)
  const { data: request } = await serviceClient
    .from('brand_requests')
    .select('*')
    .eq('id', requestId)
    .eq('status', 'pending')
    .single()

  if (!request) return { error: 'Request not found or already processed.' }

  // 2. Generate unique slug
  let slug = toSlug(request.brand_name)
  const { data: existing } = await serviceClient
    .from('workspaces')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`
  }

  // 3. Create workspace
  const { data: workspace, error: wsError } = await serviceClient
    .from('workspaces')
    .insert({ name: request.brand_name, slug })
    .select('id, slug')
    .single()

  if (wsError || !workspace) {
    return { error: 'Failed to create workspace. Please try again.' }
  }

  // 4. Add approving user as owner
  const { error: memberError } = await serviceClient
    .from('workspace_members')
    .insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: 'owner',
    })

  if (memberError) {
    return { error: 'Failed to set up workspace membership.' }
  }

  // 5. Seed default EMV config
  await serviceClient.rpc('seed_workspace_defaults', {
    p_workspace_id: workspace.id,
  })

  // 6. Mark request as approved
  await serviceClient
    .from('brand_requests')
    .update({
      status: 'approved',
      workspace_id: workspace.id,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  revalidatePath('/agency/requests', 'page')

  return { workspaceSlug: workspace.slug }
}

/**
 * Reject a brand request — agency only, uses service client.
 */
export async function rejectBrandRequest(
  requestId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const serviceClient = createServiceClient()

  // Verify still pending
  const { data: request } = await serviceClient
    .from('brand_requests')
    .select('id, status')
    .eq('id', requestId)
    .eq('status', 'pending')
    .single()

  if (!request) return { error: 'Request not found or already processed.' }

  const { error } = await serviceClient
    .from('brand_requests')
    .update({
      status: 'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  if (error) return { error: 'Failed to reject request.' }

  revalidatePath('/agency/requests', 'page')

  return { success: true }
}

/**
 * Get brand requests — agency only, user-scoped client (RLS: any authed user can SELECT).
 */
export async function getBrandRequests(
  status?: BrandRequestStatus
): Promise<BrandRequest[]> {
  const supabase = await createClient()

  let query = supabase
    .from('brand_requests')
    .select('id, brand_name, website_url, contact_name, contact_email, description, status, workspace_id, reviewed_by, reviewed_at, created_at')
    .order('created_at', { ascending: true })

  if (status) {
    query = query.eq('status', status)
  }

  const { data } = await query

  return (data ?? []) as BrandRequest[]
}
