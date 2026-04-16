import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr'
import { ForgotPasswordForm } from './forgot-password-form'

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="mx-auto mb-4 flex justify-center opacity-100 transition-opacity hover:opacity-75">
            <Image src="/POST_TRACKER.svg" alt="Instroom Post Tracker" width={180} height={40} priority />
          </Link>
          <h1 className="font-display text-[22px] font-extrabold text-foreground">
            Reset your password
          </h1>
          <p className="mt-1 text-[13px] text-foreground-lighter">
            Enter your email and we&apos;ll send you a reset link
          </p>
          <div className="mt-3 flex justify-center">
            <Link href="/login" className="inline-flex items-center gap-1 text-[12px] text-foreground-muted transition-colors hover:text-foreground">
              <ArrowLeft className="h-3 w-3" />
              Back to sign in
            </Link>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-background-surface p-6 shadow-sm">
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  )
}
