'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ArrowRight, Search, Users, Share2, BarChart3, Download, FileText } from 'lucide-react'
import { PlatformIcon } from '@/components/ui/platform-icon'
import { completeOnboarding } from '@/lib/actions/onboarding'

const STEPS = [
  {
    title: 'How did you hear about us?',
    subtitle: 'Help us understand how you found Instroom.',
    field: 'referral_source' as const,
    type: 'single' as const,
    options: [
      { value: 'google', label: 'Google Search', icon: Search },
      { value: 'social_media', label: 'Social Media', icon: Share2 },
      { value: 'referral', label: 'Referral / Word of Mouth', icon: Users },
      { value: 'event', label: 'Event / Conference', icon: BarChart3 },
    ],
  },
  {
    title: 'How many brands do you manage?',
    subtitle: 'This helps us tailor your experience.',
    field: 'agency_size' as const,
    type: 'single' as const,
    options: [
      { value: '1-5', label: '1 – 5 brands' },
      { value: '6-20', label: '6 – 20 brands' },
      { value: '20+', label: '20+ brands' },
    ],
  },
  {
    title: 'Which platforms do your campaigns run on?',
    subtitle: 'Select all that apply.',
    field: 'platforms' as const,
    type: 'multi' as const,
    options: [
      { value: 'tiktok', label: 'TikTok', platform: 'tiktok' as const },
      { value: 'instagram', label: 'Instagram', platform: 'instagram' as const },
      { value: 'youtube', label: 'YouTube', platform: 'youtube' as const },
    ],
  },
  {
    title: "What's your biggest challenge?",
    subtitle: "We'll prioritise features that matter to you.",
    field: 'main_challenge' as const,
    type: 'single' as const,
    options: [
      { value: 'tracking_posts', label: 'Tracking influencer posts', icon: Search },
      { value: 'measuring_roi', label: 'Measuring ROI & EMV', icon: BarChart3 },
      { value: 'managing_downloads', label: 'Managing content downloads', icon: Download },
      { value: 'reporting', label: 'Reporting to clients', icon: FileText },
    ],
  },
] as const

type Answers = {
  referral_source?: string
  agency_size?: string
  platforms?: string[]
  main_challenge?: string
}

export function OnboardingWelcome() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Answers>({})
  const [isPending, startTransition] = useTransition()
  const [direction, setDirection] = useState(1)

  const currentStep = STEPS[step]
  const isLastStep = step === STEPS.length - 1

  function selectSingle(field: string, value: string) {
    setAnswers((prev) => ({ ...prev, [field]: value }))
  }

  function toggleMulti(field: string, value: string) {
    setAnswers((prev) => {
      const current = (prev[field as keyof Answers] as string[] | undefined) ?? []
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      return { ...prev, [field]: next }
    })
  }

  function handleNext() {
    if (isLastStep) {
      handleComplete()
    } else {
      setDirection(1)
      setStep((s) => s + 1)
    }
  }

  function handleBack() {
    if (step > 0) {
      setDirection(-1)
      setStep((s) => s - 1)
    }
  }

  function handleSkip() {
    if (isLastStep) {
      handleComplete()
    } else {
      setDirection(1)
      setStep((s) => s + 1)
    }
  }

  function handleComplete() {
    startTransition(async () => {
      await completeOnboarding(answers)
      router.push('/app')
    })
  }

  const hasSelection = currentStep.type === 'multi'
    ? ((answers[currentStep.field] as string[] | undefined)?.length ?? 0) > 0
    : !!answers[currentStep.field as keyof Answers]

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Image src="/POST_TRACKER.svg" alt="Instroom Post Tracker" width={160} height={36} priority />
        </div>

        {/* Progress dots */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step
                  ? 'w-6 bg-brand'
                  : i < step
                    ? 'w-1.5 bg-brand/40'
                    : 'w-1.5 bg-border'
              }`}
            />
          ))}
          <span className="ml-2 text-[11px] text-foreground-muted">
            {step + 1} / {STEPS.length}
          </span>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-background-surface p-6 shadow-sm">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              initial={{ opacity: 0, x: direction * 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Question */}
              <h2 className="font-display text-[18px] font-bold text-foreground">
                {currentStep.title}
              </h2>
              <p className="mt-1 text-[13px] text-foreground-lighter">
                {currentStep.subtitle}
              </p>

              {/* Options */}
              <div className={`mt-5 grid gap-2.5 ${
                currentStep.field === 'platforms' ? 'grid-cols-3' : 'grid-cols-1'
              }`}>
                {currentStep.options.map((option) => {
                  const isSelected = currentStep.type === 'multi'
                    ? ((answers[currentStep.field] as string[] | undefined) ?? []).includes(option.value)
                    : answers[currentStep.field as keyof Answers] === option.value

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        currentStep.type === 'multi'
                          ? toggleMulti(currentStep.field, option.value)
                          : selectSingle(currentStep.field, option.value)
                      }
                      className={`group relative flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-[13px] font-medium transition-all ${
                        currentStep.field === 'platforms'
                          ? 'flex-col justify-center text-center py-4'
                          : ''
                      } ${
                        isSelected
                          ? 'border-brand bg-brand/5 text-foreground shadow-sm'
                          : 'border-border bg-background-surface text-foreground-light hover:border-foreground-muted/30 hover:bg-background-muted'
                      }`}
                    >
                      {/* Check indicator for multi-select */}
                      {currentStep.type === 'multi' && isSelected && (
                        <div className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-brand">
                          <Check size={10} className="text-white" />
                        </div>
                      )}

                      {/* Platform icon for platforms step */}
                      {'platform' in option && (
                        <PlatformIcon platform={option.platform} size={24} />
                      )}

                      {/* Lucide icon for other steps */}
                      {'icon' in option && option.icon && (
                        <option.icon
                          size={16}
                          className={isSelected ? 'text-brand' : 'text-foreground-muted'}
                        />
                      )}

                      <span>{option.label}</span>

                      {/* Selected check for single-select */}
                      {currentStep.type === 'single' && isSelected && (
                        <Check size={14} className="ml-auto text-brand" />
                      )}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {step > 0 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-[12px] text-foreground-muted transition-colors hover:text-foreground"
                >
                  &larr; Back
                </button>
              )}
              <button
                type="button"
                onClick={handleSkip}
                className="text-[12px] text-foreground-muted transition-colors hover:text-foreground"
              >
                Skip
              </button>
            </div>

            <button
              type="button"
              onClick={handleNext}
              disabled={isPending}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-semibold transition-colors ${
                hasSelection
                  ? 'bg-brand text-white hover:bg-brand/90'
                  : 'bg-brand/60 text-white/80'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {isPending ? (
                'Saving…'
              ) : isLastStep ? (
                'Get Started'
              ) : (
                <>
                  Next
                  <ArrowRight size={13} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
