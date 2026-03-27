'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface TourStore {
  isActive: boolean
  currentStep: number
  tourId: 'agency' | 'workspace' | null
  hasSeenAgencyTour: boolean
  hasSeenWorkspaceTour: boolean

  startTour: (tourId: 'agency' | 'workspace') => void
  nextStep: () => void
  prevStep: () => void
  endTour: () => void
  skipTour: () => void
}

export const useTour = create<TourStore>()(
  persist(
    (set, get) => ({
      isActive: false,
      currentStep: 0,
      tourId: null,
      hasSeenAgencyTour: false,
      hasSeenWorkspaceTour: false,

      startTour: (tourId) => set({ isActive: true, currentStep: 0, tourId }),

      nextStep: () => set((s) => ({ currentStep: s.currentStep + 1 })),

      prevStep: () => set((s) => ({ currentStep: Math.max(0, s.currentStep - 1) })),

      endTour: () =>
        set((s) => ({
          isActive: false,
          currentStep: 0,
          hasSeenAgencyTour: s.tourId === 'agency' ? true : s.hasSeenAgencyTour,
          hasSeenWorkspaceTour: s.tourId === 'workspace' ? true : s.hasSeenWorkspaceTour,
          tourId: null,
        })),

      skipTour: () => get().endTour(),
    }),
    {
      name: 'instroom-tour',
      partialize: (s) => ({
        hasSeenAgencyTour: s.hasSeenAgencyTour,
        hasSeenWorkspaceTour: s.hasSeenWorkspaceTour,
      }),
    }
  )
)
