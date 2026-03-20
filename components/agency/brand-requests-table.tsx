'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, X, ExternalLink } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { approveBrandRequest, rejectBrandRequest } from '@/lib/actions/brand-requests'
import type { BrandRequest, BrandRequestStatus } from '@/lib/types'

const TABS: { label: string; value: BrandRequestStatus | 'all' }[] = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'All', value: 'all' },
]

interface BrandRequestsTableProps {
  requests: BrandRequest[]
  agencySlug: string
}

export function BrandRequestsTable({ requests, agencySlug }: BrandRequestsTableProps) {
  const [activeTab, setActiveTab] = useState<BrandRequestStatus | 'all'>('pending')

  const filtered = activeTab === 'all'
    ? requests
    : requests.filter((r) => r.status === activeTab)

  return (
    <div className="rounded-xl border border-border bg-background-surface shadow-sm">
      {/* Tab filter */}
      <div className="flex gap-0 border-b border-border px-5">
        {TABS.map((tab) => {
          const count = tab.value === 'all'
            ? requests.length
            : requests.filter((r) => r.status === tab.value).length
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'relative px-3 py-2.5 text-[11px] font-medium transition-colors',
                activeTab === tab.value
                  ? 'text-foreground'
                  : 'text-foreground-muted hover:text-foreground-lighter'
              )}
            >
              {tab.label}
              {count > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-background-muted px-1 text-[10px] font-semibold text-foreground-lighter">
                  {count}
                </span>
              )}
              {activeTab === tab.value && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand" />
              )}
            </button>
          )
        })}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <p className="font-display text-[15px] font-bold text-foreground">
            No {activeTab === 'all' ? '' : activeTab} brand requests
          </p>
          <p className="max-w-xs text-[13px] text-foreground-lighter">
            {activeTab === 'pending'
              ? 'New brand requests will appear here when brands submit the request form.'
              : 'No requests match this filter.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                  Brand
                </th>
                <th className="px-5 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                  Contact
                </th>
                <th className="px-5 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                  Description
                </th>
                <th className="px-5 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                  Submitted
                </th>
                {activeTab === 'pending' && (
                  <th className="px-5 py-2.5 text-right text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((request) => (
                <RequestRow key={request.id} request={request} showActions={activeTab === 'pending'} agencySlug={agencySlug} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

interface RequestRowProps {
  request: BrandRequest
  showActions: boolean
  agencySlug: string
}

function RequestRow({ request, showActions, agencySlug }: RequestRowProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleApprove() {
    startTransition(async () => {
      const result = await approveBrandRequest(request.id, agencySlug)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success(`Workspace created for ${request.brand_name}`)
      router.push(`/${result.workspaceSlug}/overview`)
    })
  }

  function handleReject() {
    startTransition(async () => {
      const result = await rejectBrandRequest(request.id, agencySlug)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success(`Request from ${request.brand_name} rejected`)
      router.refresh()
    })
  }

  return (
    <tr className="border-b border-border/50 transition-colors last:border-0 hover:bg-background-muted/40">
      <td className="px-5 py-3.5">
        <div>
          <p className="text-[12px] font-medium text-foreground">{request.brand_name}</p>
          <a
            href={request.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-brand hover:underline"
          >
            {request.website_url.replace(/^https?:\/\//, '')}
            <ExternalLink size={10} />
          </a>
        </div>
      </td>
      <td className="px-5 py-3.5">
        <p className="text-[12px] text-foreground">{request.contact_name}</p>
        <p className="text-[11px] text-foreground-lighter">{request.contact_email}</p>
      </td>
      <td className="max-w-[200px] px-5 py-3">
        <p className="truncate text-[12px] text-foreground-lighter">
          {request.description || '—'}
        </p>
      </td>
      <td className="px-5 py-3.5 text-[12px] text-foreground-lighter">
        {formatDate(request.created_at)}
      </td>
      {showActions && (
        <td className="px-5 py-3.5">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleApprove}
              disabled={isPending}
              className="inline-flex h-7 items-center gap-1.5 rounded-md bg-success/10 px-2.5 text-[11px] font-medium text-success transition-colors hover:bg-success/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check size={12} />
              Approve
            </button>
            <button
              onClick={handleReject}
              disabled={isPending}
              className="inline-flex h-7 items-center gap-1.5 rounded-md bg-destructive/10 px-2.5 text-[11px] font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X size={12} />
              Reject
            </button>
          </div>
        </td>
      )}
    </tr>
  )
}
