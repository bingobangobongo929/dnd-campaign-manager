'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSupabase, useUser } from './useSupabase'
import type { MemberPermissions, CampaignMemberRole, CampaignMember } from '@/types/database'
import { DEFAULT_PERMISSIONS } from '@/types/database'

export interface PermissionCan {
  // Session Notes
  addOwnSessionNotes: boolean
  viewRecaps: boolean
  viewOthersSessionNotes: boolean
  editOthersSessionNotes: boolean

  // Characters
  editOwnCharacter: boolean
  viewParty: boolean
  viewPartyDetails: boolean
  editPartyCharacters: boolean

  // NPCs
  viewNpcs: boolean
  viewNpcDetails: boolean
  addNpc: boolean
  editNpc: boolean
  deleteNpc: boolean
  viewNpcRelationships: boolean
  editNpcRelationships: boolean

  // Timeline
  viewTimeline: boolean
  viewFutureTimeline: boolean
  addTimeline: boolean
  editTimeline: boolean
  deleteTimeline: boolean

  // Factions
  viewFactions: boolean
  addFaction: boolean
  editFaction: boolean
  deleteFaction: boolean

  // Locations
  viewLocations: boolean
  addLocation: boolean
  editLocation: boolean
  deleteLocation: boolean

  // Lore
  viewLore: boolean
  addLore: boolean
  editLore: boolean
  deleteLore: boolean

  // Maps
  viewMaps: boolean
  addMap: boolean
  deleteMap: boolean

  // Map Pins
  viewPins: boolean
  addPin: boolean
  editPin: boolean
  deletePin: boolean

  // Gallery
  viewGallery: boolean
  addGalleryItem: boolean
  deleteGalleryItem: boolean

  // Canvas
  viewCanvas: boolean
  editCanvasLayout: boolean

  // Sessions
  viewSessions: boolean
  addSession: boolean
  editSession: boolean
  deleteSession: boolean

  // Secrets
  viewPartySecrets: boolean
  viewRevealHistory: boolean
}

export interface UsePermissionsReturn {
  // The raw permissions object
  permissions: MemberPermissions | null

  // User's role in campaign
  role: CampaignMemberRole | null

  // Role-based checks
  isOwner: boolean
  isDm: boolean // owner OR co_dm
  isPlayer: boolean
  isContributor: boolean
  isGuest: boolean
  isMember: boolean // Any valid membership

  // The current member record
  member: CampaignMember | null

  // Computed permission checks
  can: PermissionCan

  // Loading and error states
  loading: boolean
  error: string | null

  // Refresh function
  reload: () => Promise<void>
}

// Cache for permissions by campaignId
const permissionsCache = new Map<string, { permissions: MemberPermissions | null; role: CampaignMemberRole | null; member: CampaignMember | null; isOwner: boolean; timestamp: number }>()
const CACHE_TTL = 60000 // 1 minute cache

export function usePermissions(campaignId: string | null): UsePermissionsReturn {
  const supabase = useSupabase()
  const { user, loading: userLoading } = useUser()

  const [permissions, setPermissions] = useState<MemberPermissions | null>(null)
  const [role, setRole] = useState<CampaignMemberRole | null>(null)
  const [member, setMember] = useState<CampaignMember | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPermissions = useCallback(async () => {
    if (!user || !campaignId) {
      setPermissions(null)
      setRole(null)
      setMember(null)
      setIsOwner(false)
      setLoading(false)
      return
    }

    // Check cache
    const cached = permissionsCache.get(campaignId)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setPermissions(cached.permissions)
      setRole(cached.role)
      setMember(cached.member)
      setIsOwner(cached.isOwner)
      setLoading(false)
      return
    }

    try {
      setError(null)

      // First, check if user is campaign owner
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('user_id')
        .eq('id', campaignId)
        .single()

      if (campaignError) {
        throw new Error('Campaign not found')
      }

      const ownerCheck = campaign?.user_id === user.id
      setIsOwner(ownerCheck)

      // If owner, they have full permissions
      if (ownerCheck) {
        const ownerPermissions = DEFAULT_PERMISSIONS.owner
        setPermissions(ownerPermissions)
        setRole('owner')
        setMember(null) // Owner might not have a member record

        // Update cache
        permissionsCache.set(campaignId, {
          permissions: ownerPermissions,
          role: 'owner',
          member: null,
          isOwner: true,
          timestamp: Date.now()
        })

        setLoading(false)
        return
      }

      // Not owner, fetch membership - first try by user_id
      let membership = null
      let memberError = null

      const { data: memberByUserId, error: userIdError } = await supabase
        .from('campaign_members')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (memberByUserId) {
        membership = memberByUserId
      } else if (user.email) {
        // Fallback: try finding by email (handles case where user_id wasn't set during invite acceptance)
        const { data: memberByEmail, error: emailError } = await supabase
          .from('campaign_members')
          .select('*')
          .eq('campaign_id', campaignId)
          .eq('email', user.email.toLowerCase())
          .eq('status', 'active')
          .single()

        if (memberByEmail) {
          membership = memberByEmail
          // If found by email but user_id not set, update it
          if (!memberByEmail.user_id) {
            console.log('[usePermissions] Fixing missing user_id on membership record')
            await supabase
              .from('campaign_members')
              .update({ user_id: user.id })
              .eq('id', memberByEmail.id)
          }
        } else {
          memberError = userIdError || emailError
        }
      } else {
        memberError = userIdError
      }

      if (memberError || !membership) {
        // User is not a member of this campaign
        setPermissions(null)
        setRole(null)
        setMember(null)
        setError('Not a member of this campaign')

        // Update cache with null values
        permissionsCache.set(campaignId, {
          permissions: null,
          role: null,
          member: null,
          isOwner: false,
          timestamp: Date.now()
        })

        setLoading(false)
        return
      }

      // Get permissions from membership record, or fall back to defaults
      const memberRole = membership.role as CampaignMemberRole
      const memberPermissions = (membership.permissions as MemberPermissions) || DEFAULT_PERMISSIONS[memberRole]

      setPermissions(memberPermissions)
      setRole(memberRole)
      setMember(membership as CampaignMember)

      // Update cache
      permissionsCache.set(campaignId, {
        permissions: memberPermissions,
        role: memberRole,
        member: membership as CampaignMember,
        isOwner: false,
        timestamp: Date.now()
      })

    } catch (err) {
      console.error('Failed to fetch permissions:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch permissions')
      setPermissions(null)
      setRole(null)
      setMember(null)
    } finally {
      setLoading(false)
    }
  }, [user, campaignId, supabase])

  useEffect(() => {
    if (!userLoading) {
      fetchPermissions()
    }
  }, [userLoading, fetchPermissions])

  const reload = useCallback(async () => {
    // Clear cache for this campaign
    if (campaignId) {
      permissionsCache.delete(campaignId)
    }
    setLoading(true)
    await fetchPermissions()
  }, [campaignId, fetchPermissions])

  // Compute derived permission flags
  const can = useMemo<PermissionCan>(() => {
    const p = permissions
    const owner = isOwner

    // If owner, all permissions are true
    if (owner) {
      return {
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
    }

    // No permissions if not a member
    if (!p) {
      return {
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
    }

    // Map from MemberPermissions to PermissionCan
    return {
      // Session Notes
      addOwnSessionNotes: p.sessionNotes?.addOwn ?? false,
      viewRecaps: p.sessionNotes?.viewRecaps ?? false,
      viewOthersSessionNotes: p.sessionNotes?.viewOthers ?? false,
      editOthersSessionNotes: p.sessionNotes?.editOthers ?? false,

      // Characters
      editOwnCharacter: p.characters?.editOwn ?? false,
      viewParty: p.characters?.viewParty ?? false,
      viewPartyDetails: p.characters?.viewPartyDetails ?? false,
      editPartyCharacters: p.characters?.editParty ?? false,

      // NPCs
      viewNpcs: p.npcs?.view ?? false,
      viewNpcDetails: p.npcs?.viewDetails ?? false,
      addNpc: p.npcs?.add ?? false,
      editNpc: p.npcs?.edit ?? false,
      deleteNpc: p.npcs?.delete ?? false,
      viewNpcRelationships: p.npcs?.viewRelationships ?? false,
      editNpcRelationships: p.npcs?.editRelationships ?? false,

      // Timeline
      viewTimeline: p.timeline?.view ?? false,
      viewFutureTimeline: p.timeline?.viewFuture ?? false,
      addTimeline: p.timeline?.add ?? false,
      editTimeline: p.timeline?.edit ?? false,
      deleteTimeline: p.timeline?.delete ?? false,

      // Factions
      viewFactions: p.factions?.view ?? false,
      addFaction: p.factions?.add ?? false,
      editFaction: p.factions?.edit ?? false,
      deleteFaction: p.factions?.delete ?? false,

      // Locations
      viewLocations: p.locations?.view ?? false,
      addLocation: p.locations?.add ?? false,
      editLocation: p.locations?.edit ?? false,
      deleteLocation: p.locations?.delete ?? false,

      // Lore
      viewLore: p.lore?.view ?? false,
      addLore: p.lore?.add ?? false,
      editLore: p.lore?.edit ?? false,
      deleteLore: p.lore?.delete ?? false,

      // Maps
      viewMaps: p.maps?.view ?? false,
      addMap: p.maps?.add ?? false,
      deleteMap: p.maps?.delete ?? false,

      // Map Pins
      viewPins: p.mapPins?.view ?? false,
      addPin: p.mapPins?.add ?? false,
      editPin: p.mapPins?.edit ?? false,
      deletePin: p.mapPins?.delete ?? false,

      // Gallery
      viewGallery: p.gallery?.view ?? false,
      addGalleryItem: p.gallery?.add ?? false,
      deleteGalleryItem: p.gallery?.delete ?? false,

      // Canvas
      viewCanvas: p.canvas?.view ?? false,
      editCanvasLayout: p.canvas?.editLayout ?? false,

      // Sessions
      viewSessions: p.sessions?.view ?? false,
      addSession: p.sessions?.add ?? false,
      editSession: p.sessions?.edit ?? false,
      deleteSession: p.sessions?.delete ?? false,

      // Secrets
      viewPartySecrets: p.secrets?.viewPartyItems ?? false,
      viewRevealHistory: p.secrets?.viewRevealHistory ?? false,
    }
  }, [permissions, isOwner])

  // Derived role flags
  const isDm = isOwner || role === 'co_dm'
  const isPlayer = role === 'player'
  const isContributor = role === 'contributor'
  const isGuest = role === 'guest'
  const isMember = isOwner || role !== null

  return {
    permissions,
    role,
    isOwner,
    isDm,
    isPlayer,
    isContributor,
    isGuest,
    isMember,
    member,
    can,
    loading: userLoading || loading,
    error,
    reload,
  }
}

// Helper to clear the permissions cache (e.g., after permission changes)
export function clearPermissionsCache(campaignId?: string) {
  if (campaignId) {
    permissionsCache.delete(campaignId)
  } else {
    permissionsCache.clear()
  }
}
