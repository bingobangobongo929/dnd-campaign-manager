'use client'

import { useMemo } from 'react'
import { useContent } from './useContent'
import { usePermissions, UsePermissionsReturn, PermissionCan } from './usePermissions'

/**
 * Unified permissions hook that works for both campaigns and oneshots.
 *
 * For campaigns: Uses the full campaign_members permission system
 * For oneshots: Owner has full permissions, everyone else has none (no members system for oneshots yet)
 *
 * Usage:
 * ```tsx
 * // Inside a ContentProvider
 * const { can, isOwner, isDm, loading } = useContentPermissions()
 * ```
 */
export function useContentPermissions(): UsePermissionsReturn {
  const { campaignId, oneshotId, contentType, isOwner, loading: contentLoading } = useContent()

  // For campaigns, use the full permissions system
  const campaignPermissions = usePermissions(campaignId)

  // For oneshots, create owner-only permissions
  const oneshotPermissions = useMemo<UsePermissionsReturn>(() => {
    // All permissions for owner
    const ownerCan: PermissionCan = {
      addOwnSessionNotes: true,
      viewRecaps: true,
      viewOthersSessionNotes: true,
      editOthersSessionNotes: true,
      editOwnCharacter: true,
      viewParty: true,
      viewPartyDetails: true,
      editPartyCharacters: true,
      viewNpcs: true,
      viewNpcDetails: true,
      addNpc: true,
      editNpc: true,
      deleteNpc: true,
      viewNpcRelationships: true,
      editNpcRelationships: true,
      viewTimeline: true,
      viewFutureTimeline: true,
      addTimeline: true,
      editTimeline: true,
      deleteTimeline: true,
      viewFactions: true,
      addFaction: true,
      editFaction: true,
      deleteFaction: true,
      viewLocations: true,
      addLocation: true,
      editLocation: true,
      deleteLocation: true,
      viewLore: true,
      addLore: true,
      editLore: true,
      deleteLore: true,
      viewMaps: true,
      addMap: true,
      deleteMap: true,
      viewPins: true,
      addPin: true,
      editPin: true,
      deletePin: true,
      viewGallery: true,
      addGalleryItem: true,
      deleteGalleryItem: true,
      viewCanvas: true,
      editCanvasLayout: true,
      viewSessions: true,
      addSession: true,
      editSession: true,
      deleteSession: true,
      viewPartySecrets: true,
      viewRevealHistory: true,
    }

    // No permissions for non-owners
    const noCan: PermissionCan = {
      addOwnSessionNotes: false,
      viewRecaps: false,
      viewOthersSessionNotes: false,
      editOthersSessionNotes: false,
      editOwnCharacter: false,
      viewParty: false,
      viewPartyDetails: false,
      editPartyCharacters: false,
      viewNpcs: false,
      viewNpcDetails: false,
      addNpc: false,
      editNpc: false,
      deleteNpc: false,
      viewNpcRelationships: false,
      editNpcRelationships: false,
      viewTimeline: false,
      viewFutureTimeline: false,
      addTimeline: false,
      editTimeline: false,
      deleteTimeline: false,
      viewFactions: false,
      addFaction: false,
      editFaction: false,
      deleteFaction: false,
      viewLocations: false,
      addLocation: false,
      editLocation: false,
      deleteLocation: false,
      viewLore: false,
      addLore: false,
      editLore: false,
      deleteLore: false,
      viewMaps: false,
      addMap: false,
      deleteMap: false,
      viewPins: false,
      addPin: false,
      editPin: false,
      deletePin: false,
      viewGallery: false,
      addGalleryItem: false,
      deleteGalleryItem: false,
      viewCanvas: false,
      editCanvasLayout: false,
      viewSessions: false,
      addSession: false,
      editSession: false,
      deleteSession: false,
      viewPartySecrets: false,
      viewRevealHistory: false,
    }

    return {
      permissions: isOwner ? null : null, // Oneshots don't use MemberPermissions structure
      role: isOwner ? 'owner' : null,
      isOwner,
      isDm: isOwner, // For oneshots, owner is always DM
      isPlayer: false,
      isContributor: false,
      isGuest: !isOwner,
      isMember: isOwner,
      member: null,
      can: isOwner ? ownerCan : noCan,
      loading: contentLoading,
      error: null,
      reload: async () => {},
    }
  }, [isOwner, contentLoading])

  // Return the appropriate permissions based on content type
  if (contentType === 'campaign') {
    return campaignPermissions
  }

  if (contentType === 'oneshot') {
    return oneshotPermissions
  }

  // No content type - return loading state
  return {
    permissions: null,
    role: null,
    isOwner: false,
    isDm: false,
    isPlayer: false,
    isContributor: false,
    isGuest: false,
    isMember: false,
    member: null,
    can: oneshotPermissions.can, // Will be noCan since isOwner is false
    loading: true,
    error: null,
    reload: async () => {},
  }
}

export default useContentPermissions
