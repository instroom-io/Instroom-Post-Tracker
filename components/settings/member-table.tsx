'use client'

import { useTransition } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { removeMember } from '@/lib/actions/workspace'
import { getInitials } from '@/lib/utils'
import { DotsThree } from '@phosphor-icons/react'
import type { WorkspaceRole } from '@/lib/types'

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
}

const roleVariant: Record<WorkspaceRole, 'success' | 'info' | 'muted' | 'active'> = {
  owner: 'success',
  admin: 'info',
  editor: 'muted',
  viewer: 'muted',
}

export function MemberTable({
  members,
  currentUserId,
  currentRole,
  workspaceId,
}: MemberTableProps) {
  const [isPending, startTransition] = useTransition()

  const canManage = currentRole === 'owner' || currentRole === 'admin'

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

  if (members.length === 0) {
    return (
      <div className="py-10 text-center text-[12px] text-foreground-muted">
        No members found.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-foreground-lighter">
              Member
            </th>
            <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-foreground-lighter">
              Email
            </th>
            <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-foreground-lighter">
              Role
            </th>
            <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-foreground-lighter">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => {
            const isOwner = member.role === 'owner'
            const isSelf = member.user_id === currentUserId
            const canRemove = canManage && !isOwner && !isSelf

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
                  <Badge variant={roleVariant[member.role]}>{member.role}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  {canRemove && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted hover:bg-background-muted hover:text-foreground transition-colors"
                          disabled={isPending}
                        >
                          <DotsThree size={14} />
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
  )
}
