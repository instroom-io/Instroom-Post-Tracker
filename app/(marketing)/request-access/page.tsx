import { getActiveAgenciesPublic } from '@/lib/actions/agencies'
import { RequestAccessTabs } from './request-access-tabs'

export const metadata = {
  title: 'Request Access — Instroom',
  description: 'Submit your details to connect with Instroom.',
}

export default async function RequestAccessPage() {
  const agencies = await getActiveAgenciesPublic()

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <div className="mb-8 text-center">
        <h1 className="font-display text-[28px] font-bold text-foreground">
          Request Access
        </h1>
        <p className="mt-2 text-[14px] text-foreground-lighter">
          Tell us who you are and we&apos;ll review your request.
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-background-surface p-8 shadow-sm">
        <RequestAccessTabs agencies={agencies} />
      </div>
    </div>
  )
}
