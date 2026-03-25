'use client'

import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex h-32 items-center justify-center rounded-xl border border-border bg-background-surface text-[13px] text-foreground-muted">
            Failed to load — refresh to retry.
          </div>
        )
      )
    }
    return this.props.children
  }
}
