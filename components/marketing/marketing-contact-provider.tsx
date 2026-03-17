'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

const MarketingContactContext = createContext<{
  open: boolean
  setOpen: (v: boolean) => void
} | null>(null)

export function MarketingContactProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <MarketingContactContext.Provider value={{ open, setOpen }}>
      {children}
    </MarketingContactContext.Provider>
  )
}

export function useMarketingContact() {
  const ctx = useContext(MarketingContactContext)
  if (!ctx) throw new Error('useMarketingContact must be used within MarketingContactProvider')
  return ctx
}
