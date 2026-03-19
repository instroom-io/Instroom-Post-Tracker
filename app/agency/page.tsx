import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AgencyIndexPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: agency } = await supabase
    .from('agencies')
    .select('slug')
    .eq('owner_id', user.id)
    .eq('status', 'active')
    .single()

  if (agency) redirect(`/agency/${agency.slug}/dashboard`)
  redirect('/app')
}
