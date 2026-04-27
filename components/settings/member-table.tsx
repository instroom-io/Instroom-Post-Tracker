'use client'

import { useTransition, useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { removeMember, approveJoinRequest, denyJoinRequest, revokeInvitation, resendInvitation } from '@/lib/actions/workspace'
import { getInitials } from '@/lib/utils'
import { DotsThree, Link as LinkIcon, Check, Clock, UserPlus, EnvelopeSimple } from '@phosphor-icons/react'
import type { WorkspaceRole, WorkspaceJoinRequest, Invitation } from '@/lib/types'

interface Member {
  id: string
  user_id: string
  role: WorkspaceRole
  user: {
    full_name: string | null
    email: string
    avatar_url: string | null
  } | null
}

interface MemberTableProps {
  members: Member[]
  currentUserId: string
  currentRole: WorkspaceRole
  workspaceId: string
  workspaceSlug?: string
  joinRequests?: WorkspaceJoinRequest[]
  invitations?: Invitation[]
}

const roleVariant: Record<WorkspaceRole, 'success' | 'info' | 'muted' | 'active'> = {
  owner: 'success',
  admin: 'info',
  editor: 'muted',
  manager: 'muted',
  viewer: 'muted',
}

const roleLabel: Record<WorkspaceRole, string> = {
  owner: 'Admin',
  admin: 'Admin',
  editor: 'Editor',
  manager: 'Manager',
  viewer: 'Viewer',
}

function JoinLinkCopy({ workspaceSlug }: { workspaceSlug: string }) {
  const [copied, setCopied] = useState(false)
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '')
  const joinUrl = `${appUrl}/join/${workspaceSlug}`

  function handleCopy() {
    navigator.clipboard.writeText(joinUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex items-center gap-2 border-b border-border px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-foreground-lighter mb-0.5">
          Join link
        </p>
        <p className="text-[11px] text-foreground-muted truncate">{joinUrl}</p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-border bg-background-surface px-2.5 text-[11px] font-medium text-foreground-light shadow-sm transition-colors hover:bg-background-muted hover:text-foreground"
      >
        {copied ? (
          <>
            <Check size={12} weight="bold" className="text-brand" />
            Copied
          </>
        ) : (
          <>
            <LinkIcon size={12} />
            Copy link
          </>
        )}
      </button>
    </div>
  )
}

function PendingRequestsSection({
  joinRequests,
  workspaceId,
}: {
  joinRequests: WorkspaceJoinRequest[]
  workspaceId: string
}) {
  const [isPending, startTransition] = useTransition()
  const [handledIds, setHandledIds] = useState<Set<string>>(new Set())

  const visible = joinRequests.filter((r) => !handledIds.has(r.id))

  if (visible.length === 0) return null

  function handleApprove(requestId: string) {
    startTransition(async () => {
      const result = await approveJoinRequest(requestId)
      if (result?.error) {
        toast.error(result.error)
      } else {
        setHandledIds((prev) => new Set([...prev, requestId]))
        toast.success('Request approved — member added as Manager.')
      }
    })
  }

  function handleDeny(requestId: string) {
    startTransition(async () => {
      const result = await denyJoinRequest(requestId)
      if (result?.error) {
        toast.error(result.error)
      } else {
        setHandledIds((prev) => new Set([...prev, requestId]))
        toast.success('Request denied.')
      }
    })
  }

  return (
    <div className="border-b border-border">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50/60">
        <Clock size={13} className="text-amber-600 shrink-0" />
        <span className="text-[11px] font-semibold text-amber-700">
          Pending requests ({visible.length})
        </span>
      </div>
      {visible.map((request) => {
        const requester = request.requester as { full_name: string | null; email: string; avatar_url: string | null } | null
        const name = requester?.full_name ?? requester?.email ?? 'Unknown'
        const email = requester?.email ?? ''
        const date = new Date(request.requested_at).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
        })

        return (
          <div
            key={request.id}
            className="flex items-center gap-3 border-b border-border/50 px-4 py-3 last:border-0"
          >
            {requester?.avatar_url ? (
              <Image
                src={requester.avatar_url}
                alt={name}
                width={28}
                height={28}
                className="rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-700 flex-shrink-0">
                {getInitials(name)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-foreground truncate">{name}</p>
              <p className="text-[11px] text-foreground-lighter truncate">{email} · {date}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleApprove(request.id)}
                disabled={isPending}
                className="flex h-7 items-center gap-1 rounded-md bg-brand px-2.5 text-[11px] font-semibold text-white transition-colors hover:bg-brand/90 disabled:opacity-50"
              >
                <UserPlus size={12} />
                Approve
              </button>
              <button
                type="button"
                onClick={() => handleDeny(request.id)}
                disabled={isPending}
                className="flex h-7 items-center rounded-md border border-border bg-background-surface px-2.5 text-[11px] font-medium text-foreground-light transition-colors hover:bg-background-muted hover:text-foreground disabled:opacity-50"
              >
                Deny
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function InvitedMembersSection({
  invitations,
  workspaceId,
}: {
  invitations: Invitation[]
  workspaceId: string
}) {
  const [transitionPending, startTransition] = useTransition()
  const [revokedIds, setRevokedIds] = useState<Set<string>>(new Set())
  const [resentIds, setResentIds] = useState<Set<string>>(new Set())
  const now = new Date()

  const visible = invitations.filter((inv) => !revokedIds.has(inv.id))
  if (visible.length === 0) return null

  function handleRevoke(invitationId: string) {
    startTransition(async () => {
      const result = await revokeInvitation(invitationId)
      if (result?.error) {
        toast.error(result.error)
      } else {
        setRevokedIds((prev) => new Set([...prev, invitationId]))
        toast.success('Invitation revoked.')
      }
    })
  }

  function handleResend(invitationId: string) {
    startTransition(async () => {
      const result = await resendInvitation(invitationId)
      if (result && 'error' in result) {
        toast.error(result.error)
      } else if (result && 'warning' in result) {
        toast.warning(result.warning)
      } else {
        setResentIds((prev) => new Set([...prev, invitationId]))
        toast.success('Invitation email resent.')
      }
    })
  }

  return (
    <div className="border-b border-border">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-background-subtle">
        <EnvelopeSimple size={13} className="text-foreground-lighter shrink-0" />
        <span className="text-[11px] font-semibold text-foreground-lighter">
          Invitations ({visible.length})
        </span>
      </div>
      {visible.map((inv) => {
        const isAccepted = !!inv.accepted_at
        const isPendingInv = !inv.accepted_at && new Date(inv.expires_at) > now
        const isExpired = !inv.accepted_at && new Date(inv.expires_at) <= now
        const dateLabel = isAccepted
          ? `Accepted ${new Date(inv.accepted_at!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
          : isPendingInv
          ? `Expires ${new Date(inv.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
          : `Expired ${new Date(inv.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`

        return (
          <div
            key={inv.id}
            className="flex items-center gap-3 border-b border-border/50 px-4 py-3 last:border-0"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-background-muted border border-border text-[11px] font-bold text-foreground-lighter shrink-0">
              {inv.email.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-foreground truncate">{inv.email}</p>
              <p className="text-[11px] text-foreground-lighter">
                <span className="capitalize">{inv.role}</span>
                {' · '}
                {dateLabel}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isAccepted && (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                  Accepted
                </span>
              )}
              {isExpired && (
                <span className="inline-flex items-center rounded-full bg-background-muted px-2 py-0.5 text-[10px] font-semibold text-foreground-muted">
                  Expired
                </span>
              )}
              {isPendingInv && (
                <>
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                    Awaiting
                  </span>
                  <button
                    type="button"
                    onClick={() => handleResend(inv.id)}
                    disabled={transitionPending || resentIds.has(inv.id)}
                    className="flex h-7 items-center rounded-md border border-border bg-background-surface px-2.5 text-[11px] font-medium text-foreground-light transition-colors hover:bg-background-muted hover:text-foreground disabled:opacity-50"
                  >
                    {resentIds.has(inv.id) ? 'Resent' : 'Resend'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRevoke(inv.id)}
                    disabled={transitionPending}
                    className="flex h-7 items-center rounded-md border border-border bg-background-surface px-2.5 text-[11px] font-medium text-foreground-light transition-colors hover:bg-destructive/5 hover:text-destructive hover:border-destructive/20 disabled:opacity-50"
                  >
                    Revoke
                  </button>
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function MemberTable({
  members,
  currentUserId,
  currentRole,
  workspaceId,
  workspaceSlug,
  joinRequests = [],
  invitations = [],
}: MemberTableProps) {
  const [isPending, startTransition] = useTransition()

  const canManage = currentRole === 'owner' || currentRole === 'admin'
  const isOwner = currentRole === 'owner'

  function handleRemove(memberId: string) {
    startTransition(async () => {
      const result = await removeMember(workspaceId, memberId)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Member removed.')
      }
    })
  }

  return (
    <div>
      {/* Join link — owner only */}
      {isOwner && workspaceSlug && <JoinLinkCopy workspaceSlug={workspaceSlug} />}

      {/* Pending requests — owner only */}
      {isOwner && joinRequests.length > 0 && (
        <PendingRequestsSection joinRequests={joinRequests} workspaceId={workspaceId} />
      )}

      {/* Invitations — owner only */}
      {isOwner && invitations.length > 0 && (
        <InvitedMembersSection invitations={invitations} workspaceId={workspaceId} />
      )}

      {/* Members table */}
      {members.length === 0 ? (
        <div className="py-10 text-center text-[12px] text-foreground-muted">
          No members found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-foreground-lighter">
                  Member
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-foreground-lighter">
                  Email
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-foreground-lighter">
                  Role
                </th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const isOwnerMember = member.role === 'owner'
                const isSelf = member.user_id === currentUserId
                const canRemove = canManage && !isOwnerMember && !isSelf

                return (
                  <tr
                    key={member.id}
                    className="border-b border-border/50 last:border-0 transition-colors hover:bg-background-muted/30"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {member.user?.avatar_url ? (
                          <Image
                            src={member.user.avatar_url}
                            alt={member.user.full_name ?? member.user.email}
                            width={28}
                            height={28}
                            className="rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/15 text-[11px] font-bold text-brand flex-shrink-0">
                            {getInitials(member.user?.full_name ?? member.user?.email ?? '?')}
                          </div>
                        )}
                        <span className="text-[12px] font-medium text-foreground">
                          {member.user?.full_name ?? '—'}
                          {isSelf && (
                            <span className="ml-1 text-[10px] text-foreground-muted">(you)</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-foreground-lighter">
                      {member.user?.email ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={roleVariant[member.role]}>
                        {roleLabel[member.role] ?? member.role}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-right w-10">
                      {canRemove && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background-surface text-foreground-light shadow-sm transition-colors hover:bg-background-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                              disabled={isPending}
                            >
                              <DotsThree size={16} weight="bold" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => handleRemove(member.id)}
                            >
                              Remove member
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
