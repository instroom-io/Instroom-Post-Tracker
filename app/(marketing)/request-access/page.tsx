import { RequestAccessForm } from './request-access-form'

export const metadata = {
  title: 'Request Access — Instroom',
  description: 'Submit your brand details to connect with Instroom.',
}

export default function RequestAccessPage() {
  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <div className="mb-8 text-center">
        <h1 className="font-display text-[28px] font-bold text-foreground">
          Request Access
        </h1>
        <p className="mt-2 text-[14px] text-foreground-lighter">
          Submit your brand details and our team will review your request.
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-background-surface p-8 shadow-sm">
        <RequestAccessForm />
      </div>
    </div>
  )
}
