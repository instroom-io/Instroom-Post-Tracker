import { Suspense } from 'react'
import { OnboardingNameForm } from './onboarding-name-form'

export default function OnboardingNamePage() {
  return (
    <Suspense fallback={null}>
      <OnboardingNameForm />
    </Suspense>
  )
}
