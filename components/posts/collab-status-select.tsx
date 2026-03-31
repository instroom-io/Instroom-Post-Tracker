'use client'

import { useOptimistic, useTransition } from 'react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { updateCollabStatus } from '@/lib/actions/posts'
import { CaretDown } from '@phosphor-icons/react'
import type { CollabStatus, Platform } from '@/lib/types'

interface CollabStatusSelectProps {
  postId: string
  currentStatus: CollabStatus
  platform: Platform
  canEdit: boolean
}

const statusOptions: { value: Exclude<CollabStatus, 'n/a'>; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'not_added', label: 'Not added' },
]

const statusVariant: Record<
  Exclude<CollabStatus, 'n/a'>,
  'muted' | 'success' | 'destructive'
> = {
  pending: 'muted',
  confirmed: 'success',
  not_added: 'destructive',
}

export function CollabStatusSelect({
  postId,
  currentStatus,
  platform,
  canEdit,
}: CollabStatusSelectProps) {
  const [isPending, startTransition] = useTransition()
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(currentStatus)

  // Only renders for Instagram
  if (platform !== 'instagram' || currentStatus === 'n/a') {
    return <span className="text-[12px] text-foreground-muted">—</span>
  }

  function handleSelect(status: Exclude<CollabStatus, 'n/a'>) {
    startTransition(async () => {
      setOptimisticStatus(status)
      const result = await updateCollabStatus(postId, status)
      if (result?.error) toast.error(result.error)
    })
  }

  if (!canEdit) {
    return (
      <Badge variant={statusVariant[optimisticStatus as Exclude<CollabStatus, 'n/a'>]}>
        {optimisticStatus}
      </Badge>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <button
          type="button"
          disabled={isPending}
          className="flex items-center gap-1 disabled:opacity-50"
        >
          <Badge variant={statusVariant[optimisticStatus as Exclude<CollabStatus, 'n/a'>]}>
            {optimisticStatus}
          </Badge>
          <CaretDown size={11} className="text-foreground-muted" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {statusOptions.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => handleSelect(opt.value)}
          >
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
