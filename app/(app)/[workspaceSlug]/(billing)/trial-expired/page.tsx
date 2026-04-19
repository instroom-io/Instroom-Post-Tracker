import { redirect } from 'next/navigation'

export default function OldTrialExpiredPage() {
  redirect('/account/upgrade')
}
