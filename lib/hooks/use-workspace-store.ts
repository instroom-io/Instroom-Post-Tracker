'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WorkspaceRole } from '@/lib/types'

interface WorkspaceMembership {
  workspace_id: string
  workspace_name: string
  workspace_slug: string
  workspace_logo_url: string | null
  role: WorkspaceRole
}

interface WorkspaceStore {
  currentWorkspaceId: string | null
  currentWorkspaceSlug: string | null
  currentWorkspaceName: string | null
  currentWorkspaceLogoUrl: string | null
  currentRole: WorkspaceRole | null
  allMemberships: WorkspaceMembership[]

  setWorkspace: (data: {
    id: string
    slug: string
    name: string
    logo_url: string | null
    role: WorkspaceRole
  }) => void
  setAllMemberships: (memberships: WorkspaceMembership[]) => void
  clearWorkspace: () => void
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set) => ({
      currentWorkspaceId: null,
      currentWorkspaceSlug: null,
      currentWorkspaceName: null,
      currentWorkspaceLogoUrl: null,
      currentRole: null,
      allMemberships: [],

      setWorkspace: (data) =>
        set({
          currentWorkspaceId: data.id,
          currentWorkspaceSlug: data.slug,
          currentWorkspaceName: data.name,
          currentWorkspaceLogoUrl: data.logo_url,
          currentRole: data.role,
        }),

      setAllMemberships: (memberships) =>
        set({ allMemberships: memberships }),

      clearWorkspace: () =>
        set({
          currentWorkspaceId: null,
          currentWorkspaceSlug: null,
          currentWorkspaceName: null,
          currentWorkspaceLogoUrl: null,
          currentRole: null,
          allMemberships: [],
        }),
    }),
    {
      name: 'instroom-workspace',
    }
  )
)
