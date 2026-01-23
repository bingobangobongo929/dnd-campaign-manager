'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  Users,
  UserPlus,
  Mail,
  Copy,
  Check,
  X,
  Crown,
  Shield,
  User,
  Eye,
  Loader2,
  Link as LinkIcon,
  ChevronLeft,
  ChevronRight,
  Pencil,
  RotateCcw,
  Trash2,
  Lock,
} from 'lucide-react'
import { Modal, Input } from '@/components/ui'
import { toast } from 'sonner'
import { cn, getInitials } from '@/lib/utils'
import type {
  CampaignMemberRole,
  Character,
  MemberPermissions,
} from '@/types/database'
import { DEFAULT_PERMISSIONS } from '@/types/database'

interface CampaignMember {
  id: string
  campaign_id: string
  user_id: string | null
  email: string | null
  discord_id: string | null
  role: CampaignMemberRole
  permissions: MemberPermissions | null
  status: 'pending' | 'active' | 'declined' | 'removed'
  character_id: string | null
  vault_character_id: string | null
  joined_at: string | null
  invited_at: string | null
  user_settings?: {
    username: string | null
    avatar_url: string | null
  } | null
  character?: Character | null
}

interface PartyModalProps {
  campaignId: string
  characters: Character[]
  isOpen: boolean
  onClose: () => void
}

type ModalView = 'list' | 'member-detail' | 'invite' | 'invite-success'

export function PartyModal({
  campaignId,
  characters,
  isOpen,
  onClose,
}: PartyModalProps) {
  const [members, setMembers] = useState<CampaignMember[]>([])
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [view, setView] = useState<ModalView>('list')
  const [selectedMember, setSelectedMember] = useState<CampaignMember | null>(null)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)

  // Invite form state
  const [inviteForm, setInviteForm] = useState({
    email: '',
    discordId: '',
    role: 'player' as CampaignMemberRole,
    characterId: '',
  })

  // Member edit state
  const [editForm, setEditForm] = useState<{
    role: CampaignMemberRole
    characterId: string
    permissions: MemberPermissions
  } | null>(null)

  // Load members when modal opens
  useEffect(() => {
    if (isOpen) {
      loadMembers()
      setView('list')
      setSelectedMember(null)
    }
  }, [isOpen, campaignId])

  const loadMembers = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/members`)
      const data = await response.json()

      if (response.ok) {
        setMembers(data.members || [])
        setIsOwner(data.isOwner || false)
      }
    } catch (error) {
      console.error('Failed to load members:', error)
      toast.error('Failed to load members')
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async () => {
    if (!inviteForm.email && !inviteForm.discordId) {
      toast.error('Please enter an email or Discord ID')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteForm.email || undefined,
          discordId: inviteForm.discordId || undefined,
          role: inviteForm.role,
          characterId: inviteForm.characterId || undefined,
          permissions: DEFAULT_PERMISSIONS[inviteForm.role],
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to send invite')
        return
      }

      toast.success('Invite created!')
      setInviteUrl(data.inviteUrl)
      setView('invite-success')
      loadMembers()
    } catch (error) {
      console.error('Failed to invite:', error)
      toast.error('Failed to send invite')
    } finally {
      setSaving(false)
    }
  }

  const handleCopyLink = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSelectMember = (member: CampaignMember) => {
    setSelectedMember(member)
    setEditForm({
      role: member.role,
      characterId: member.character_id || '',
      permissions: member.permissions || DEFAULT_PERMISSIONS[member.role],
    })
    setView('member-detail')
  }

  const handleUpdateMember = async () => {
    if (!selectedMember || !editForm) return

    setSaving(true)
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: selectedMember.id,
          role: editForm.role,
          characterId: editForm.characterId || null,
          permissions: editForm.permissions,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || 'Failed to update member')
        return
      }

      toast.success('Member updated')
      loadMembers()
      setView('list')
    } catch (error) {
      console.error('Failed to update member:', error)
      toast.error('Failed to update member')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveMember = async () => {
    if (!selectedMember) return

    if (!confirm(`Remove ${getDisplayName(selectedMember)} from the campaign?`)) {
      return
    }

    setSaving(true)
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/members?memberId=${selectedMember.id}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || 'Failed to remove member')
        return
      }

      toast.success('Member removed')
      loadMembers()
      setView('list')
    } catch (error) {
      console.error('Failed to remove member:', error)
      toast.error('Failed to remove member')
    } finally {
      setSaving(false)
    }
  }

  const handleResetPermissions = () => {
    if (!editForm) return
    setEditForm({
      ...editForm,
      permissions: DEFAULT_PERMISSIONS[editForm.role],
    })
    toast.success('Reset to default permissions')
  }

  const updatePermission = (
    category: keyof MemberPermissions,
    key: string,
    value: boolean
  ) => {
    if (!editForm) return
    setEditForm({
      ...editForm,
      permissions: {
        ...editForm.permissions,
        [category]: {
          ...editForm.permissions[category],
          [key]: value,
        },
      },
    })
  }

  const getDisplayName = (member: CampaignMember) => {
    return member.user_settings?.username ||
      member.email ||
      member.discord_id ||
      'Unknown'
  }

  const getRoleIcon = (role: CampaignMemberRole) => {
    switch (role) {
      case 'owner': return Crown
      case 'co_dm': return Shield
      case 'player': return User
      case 'contributor': return Pencil
      case 'guest': return Eye
      default: return User
    }
  }

  const getRoleLabel = (role: CampaignMemberRole) => {
    switch (role) {
      case 'owner': return 'Owner'
      case 'co_dm': return 'Co-DM'
      case 'player': return 'Player'
      case 'contributor': return 'Contributor'
      case 'guest': return 'Guest'
      default: return role
    }
  }

  const getRoleColor = (role: CampaignMemberRole) => {
    switch (role) {
      case 'owner': return 'text-amber-400 bg-amber-500/10'
      case 'co_dm': return 'text-purple-400 bg-purple-500/10'
      case 'player': return 'text-blue-400 bg-blue-500/10'
      case 'contributor': return 'text-green-400 bg-green-500/10'
      case 'guest': return 'text-gray-400 bg-gray-500/10'
      default: return 'text-gray-400 bg-gray-500/10'
    }
  }

  // Available characters for assignment
  const assignedCharacterIds = members
    .filter(m => m.character_id && m.id !== selectedMember?.id)
    .map(m => m.character_id)
  const availableCharacters = characters.filter(
    c => c.type === 'pc' && !assignedCharacterIds.includes(c.id)
  )

  const getModalTitle = () => {
    switch (view) {
      case 'list': return 'Campaign Party'
      case 'member-detail': return selectedMember ? getDisplayName(selectedMember) : 'Member'
      case 'invite': return 'Invite Member'
      case 'invite-success': return 'Invite Created'
      default: return 'Campaign Party'
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getModalTitle()}
      size="lg"
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
        </div>
      ) : (
        <>
          {/* ============================================ */}
          {/* LIST VIEW */}
          {/* ============================================ */}
          {view === 'list' && (
            <div className="space-y-4">
              {/* Invite Button */}
              <button
                onClick={() => {
                  setInviteForm({ email: '', discordId: '', role: 'player', characterId: '' })
                  setView('invite')
                }}
                className="btn btn-primary w-full"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Member
              </button>

              {/* Member Count */}
              <div className="text-sm text-gray-500">
                {members.length} member{members.length !== 1 ? 's' : ''}
              </div>

              {/* Member List */}
              <div className="space-y-2">
                {members.map(member => {
                  const RoleIcon = getRoleIcon(member.role)
                  const displayName = getDisplayName(member)
                  const isCurrentUserOwner = member.role === 'owner'

                  return (
                    <div
                      key={member.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                        member.status === 'pending'
                          ? "bg-amber-500/5 border-amber-500/20"
                          : "bg-white/[0.02] border-[--border]",
                        !isCurrentUserOwner && "hover:border-purple-500/30 cursor-pointer"
                      )}
                      onClick={() => !isCurrentUserOwner && handleSelectMember(member)}
                    >
                      {/* Avatar */}
                      {member.user_settings?.avatar_url ? (
                        <Image
                          src={member.user_settings.avatar_url}
                          alt={displayName}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400 font-medium text-sm">
                          {getInitials(displayName)}
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-white text-sm truncate">
                            {displayName}
                          </p>
                          {member.status === 'pending' && (
                            <span className="text-xs text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                              Pending
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className={cn(
                            "inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded",
                            getRoleColor(member.role)
                          )}>
                            <RoleIcon className="w-3 h-3" />
                            {getRoleLabel(member.role)}
                          </span>
                          {member.character && (
                            <span className="text-xs text-gray-500">
                              as {member.character.name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Edit Arrow */}
                      {!isCurrentUserOwner && (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ============================================ */}
          {/* MEMBER DETAIL VIEW */}
          {/* ============================================ */}
          {view === 'member-detail' && selectedMember && editForm && (
            <div className="space-y-6">
              {/* Back Button */}
              <button
                onClick={() => setView('list')}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Party
              </button>

              {/* Member Header */}
              <div className="flex items-center gap-4 p-4 bg-white/[0.02] rounded-lg border border-[--border]">
                {selectedMember.user_settings?.avatar_url ? (
                  <Image
                    src={selectedMember.user_settings.avatar_url}
                    alt={getDisplayName(selectedMember)}
                    width={56}
                    height={56}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400 font-bold text-lg">
                    {getInitials(getDisplayName(selectedMember))}
                  </div>
                )}
                <div>
                  <h3 className="font-medium text-white">{getDisplayName(selectedMember)}</h3>
                  {selectedMember.email && (
                    <p className="text-sm text-gray-500">{selectedMember.email}</p>
                  )}
                  {selectedMember.joined_at && (
                    <p className="text-xs text-gray-600">
                      Joined {new Date(selectedMember.joined_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Role & Character */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-white">Role & Character</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <select
                      value={editForm.role}
                      onChange={(e) => {
                        const newRole = e.target.value as CampaignMemberRole
                        setEditForm({
                          ...editForm,
                          role: newRole,
                          permissions: DEFAULT_PERMISSIONS[newRole],
                        })
                      }}
                      className="form-input"
                      disabled={selectedMember.role === 'owner'}
                    >
                      <option value="player">Player</option>
                      <option value="contributor">Contributor</option>
                      <option value="guest">Guest</option>
                      {isOwner && <option value="co_dm">Co-DM</option>}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Character</label>
                    <select
                      value={editForm.characterId}
                      onChange={(e) => setEditForm({ ...editForm, characterId: e.target.value })}
                      className="form-input"
                    >
                      <option value="">No character</option>
                      {selectedMember.character && (
                        <option value={selectedMember.character.id}>
                          {selectedMember.character.name}
                        </option>
                      )}
                      {availableCharacters.map(char => (
                        <option key={char.id} value={char.id}>
                          {char.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Permissions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-white">Permissions</h4>
                  <button
                    onClick={handleResetPermissions}
                    className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset to Default
                  </button>
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {/* Session Notes */}
                  <PermissionSection title="Session Notes">
                    <PermissionRow
                      label="Add own session notes"
                      checked={editForm.permissions.sessionNotes.addOwn}
                      onChange={(v) => updatePermission('sessionNotes', 'addOwn', v)}
                    />
                    <PermissionRow
                      label="View session recaps"
                      checked={editForm.permissions.sessionNotes.viewRecaps}
                      onChange={(v) => updatePermission('sessionNotes', 'viewRecaps', v)}
                    />
                    <PermissionRow
                      label="View other players' notes"
                      checked={editForm.permissions.sessionNotes.viewOthers}
                      onChange={(v) => updatePermission('sessionNotes', 'viewOthers', v)}
                    />
                    <PermissionRow
                      label="Edit other players' notes"
                      checked={editForm.permissions.sessionNotes.editOthers}
                      onChange={(v) => updatePermission('sessionNotes', 'editOthers', v)}
                    />
                  </PermissionSection>

                  {/* Characters */}
                  <PermissionSection title="Characters">
                    <PermissionRow
                      label="Edit own character"
                      checked={editForm.permissions.characters.editOwn}
                      onChange={(v) => updatePermission('characters', 'editOwn', v)}
                    />
                    <PermissionRow
                      label="View party members"
                      checked={editForm.permissions.characters.viewParty}
                      onChange={(v) => updatePermission('characters', 'viewParty', v)}
                    />
                    <PermissionRow
                      label="View full PC details"
                      checked={editForm.permissions.characters.viewPartyDetails}
                      onChange={(v) => updatePermission('characters', 'viewPartyDetails', v)}
                    />
                    <PermissionRow
                      label="Edit other party members"
                      checked={editForm.permissions.characters.editParty}
                      onChange={(v) => updatePermission('characters', 'editParty', v)}
                    />
                  </PermissionSection>

                  {/* NPCs */}
                  <PermissionSection title="NPCs">
                    <PermissionGrid
                      permissions={[
                        { label: 'View', checked: editForm.permissions.npcs.view, onChange: (v) => updatePermission('npcs', 'view', v) },
                        { label: 'View Details', checked: editForm.permissions.npcs.viewDetails, onChange: (v) => updatePermission('npcs', 'viewDetails', v) },
                        { label: 'Add', checked: editForm.permissions.npcs.add, onChange: (v) => updatePermission('npcs', 'add', v) },
                        { label: 'Edit', checked: editForm.permissions.npcs.edit, onChange: (v) => updatePermission('npcs', 'edit', v) },
                        { label: 'Delete', checked: editForm.permissions.npcs.delete, onChange: (v) => updatePermission('npcs', 'delete', v) },
                      ]}
                    />
                    <PermissionRow
                      label="View relationships"
                      checked={editForm.permissions.npcs.viewRelationships}
                      onChange={(v) => updatePermission('npcs', 'viewRelationships', v)}
                    />
                    <PermissionRow
                      label="Edit relationships"
                      checked={editForm.permissions.npcs.editRelationships}
                      onChange={(v) => updatePermission('npcs', 'editRelationships', v)}
                    />
                  </PermissionSection>

                  {/* Timeline */}
                  <PermissionSection title="Timeline">
                    <PermissionGrid
                      permissions={[
                        { label: 'View', checked: editForm.permissions.timeline.view, onChange: (v) => updatePermission('timeline', 'view', v) },
                        { label: 'Add', checked: editForm.permissions.timeline.add, onChange: (v) => updatePermission('timeline', 'add', v) },
                        { label: 'Edit', checked: editForm.permissions.timeline.edit, onChange: (v) => updatePermission('timeline', 'edit', v) },
                        { label: 'Delete', checked: editForm.permissions.timeline.delete, onChange: (v) => updatePermission('timeline', 'delete', v) },
                      ]}
                    />
                    <PermissionRow
                      label="View future/planned events"
                      checked={editForm.permissions.timeline.viewFuture}
                      onChange={(v) => updatePermission('timeline', 'viewFuture', v)}
                    />
                  </PermissionSection>

                  {/* Factions */}
                  <PermissionSection title="Factions">
                    <PermissionGrid
                      permissions={[
                        { label: 'View', checked: editForm.permissions.factions.view, onChange: (v) => updatePermission('factions', 'view', v) },
                        { label: 'Add', checked: editForm.permissions.factions.add, onChange: (v) => updatePermission('factions', 'add', v) },
                        { label: 'Edit', checked: editForm.permissions.factions.edit, onChange: (v) => updatePermission('factions', 'edit', v) },
                        { label: 'Delete', checked: editForm.permissions.factions.delete, onChange: (v) => updatePermission('factions', 'delete', v) },
                      ]}
                    />
                  </PermissionSection>

                  {/* Locations */}
                  <PermissionSection title="Locations">
                    <PermissionGrid
                      permissions={[
                        { label: 'View', checked: editForm.permissions.locations.view, onChange: (v) => updatePermission('locations', 'view', v) },
                        { label: 'Add', checked: editForm.permissions.locations.add, onChange: (v) => updatePermission('locations', 'add', v) },
                        { label: 'Edit', checked: editForm.permissions.locations.edit, onChange: (v) => updatePermission('locations', 'edit', v) },
                        { label: 'Delete', checked: editForm.permissions.locations.delete, onChange: (v) => updatePermission('locations', 'delete', v) },
                      ]}
                    />
                  </PermissionSection>

                  {/* Lore */}
                  <PermissionSection title="Lore">
                    <PermissionGrid
                      permissions={[
                        { label: 'View', checked: editForm.permissions.lore.view, onChange: (v) => updatePermission('lore', 'view', v) },
                        { label: 'Add', checked: editForm.permissions.lore.add, onChange: (v) => updatePermission('lore', 'add', v) },
                        { label: 'Edit', checked: editForm.permissions.lore.edit, onChange: (v) => updatePermission('lore', 'edit', v) },
                        { label: 'Delete', checked: editForm.permissions.lore.delete, onChange: (v) => updatePermission('lore', 'delete', v) },
                      ]}
                    />
                  </PermissionSection>

                  {/* Maps */}
                  <PermissionSection title="Maps">
                    <PermissionGrid
                      permissions={[
                        { label: 'View', checked: editForm.permissions.maps.view, onChange: (v) => updatePermission('maps', 'view', v) },
                        { label: 'Add', checked: editForm.permissions.maps.add, onChange: (v) => updatePermission('maps', 'add', v) },
                        { label: 'Delete', checked: editForm.permissions.maps.delete, onChange: (v) => updatePermission('maps', 'delete', v) },
                      ]}
                    />
                  </PermissionSection>

                  {/* Map Pins */}
                  <PermissionSection title="Map Pins">
                    <PermissionGrid
                      permissions={[
                        { label: 'View', checked: editForm.permissions.mapPins.view, onChange: (v) => updatePermission('mapPins', 'view', v) },
                        { label: 'Add', checked: editForm.permissions.mapPins.add, onChange: (v) => updatePermission('mapPins', 'add', v) },
                        { label: 'Edit', checked: editForm.permissions.mapPins.edit, onChange: (v) => updatePermission('mapPins', 'edit', v) },
                        { label: 'Delete', checked: editForm.permissions.mapPins.delete, onChange: (v) => updatePermission('mapPins', 'delete', v) },
                      ]}
                    />
                  </PermissionSection>

                  {/* Gallery */}
                  <PermissionSection title="Gallery">
                    <PermissionGrid
                      permissions={[
                        { label: 'View', checked: editForm.permissions.gallery.view, onChange: (v) => updatePermission('gallery', 'view', v) },
                        { label: 'Add', checked: editForm.permissions.gallery.add, onChange: (v) => updatePermission('gallery', 'add', v) },
                        { label: 'Delete', checked: editForm.permissions.gallery.delete, onChange: (v) => updatePermission('gallery', 'delete', v) },
                      ]}
                    />
                  </PermissionSection>

                  {/* Canvas */}
                  <PermissionSection title="Canvas">
                    <PermissionRow
                      label="View canvas"
                      checked={editForm.permissions.canvas.view}
                      onChange={(v) => updatePermission('canvas', 'view', v)}
                    />
                    <PermissionRow
                      label="Edit layout"
                      checked={editForm.permissions.canvas.editLayout}
                      onChange={(v) => updatePermission('canvas', 'editLayout', v)}
                    />
                  </PermissionSection>

                  {/* Sessions */}
                  <PermissionSection title="Sessions">
                    <PermissionGrid
                      permissions={[
                        { label: 'View', checked: editForm.permissions.sessions.view, onChange: (v) => updatePermission('sessions', 'view', v) },
                        { label: 'Add', checked: editForm.permissions.sessions.add, onChange: (v) => updatePermission('sessions', 'add', v) },
                        { label: 'Edit', checked: editForm.permissions.sessions.edit, onChange: (v) => updatePermission('sessions', 'edit', v) },
                        { label: 'Delete', checked: editForm.permissions.sessions.delete, onChange: (v) => updatePermission('sessions', 'delete', v) },
                      ]}
                    />
                  </PermissionSection>

                  {/* Secrets */}
                  <PermissionSection title="Secrets & Visibility">
                    <PermissionRow
                      label="View 'Party' visibility items"
                      checked={editForm.permissions.secrets.viewPartyItems}
                      onChange={(v) => updatePermission('secrets', 'viewPartyItems', v)}
                    />
                    <PermissionRow
                      label="View reveal history"
                      checked={editForm.permissions.secrets.viewRevealHistory}
                      onChange={(v) => updatePermission('secrets', 'viewRevealHistory', v)}
                    />
                  </PermissionSection>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-[--border]">
                <button
                  onClick={handleRemoveMember}
                  disabled={saving || selectedMember.role === 'owner'}
                  className="btn btn-secondary text-red-400 hover:text-red-300 hover:border-red-500/30"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => setView('list')}
                  disabled={saving}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateMember}
                  disabled={saving}
                  className="btn btn-primary"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ============================================ */}
          {/* INVITE VIEW */}
          {/* ============================================ */}
          {view === 'invite' && (
            <div className="space-y-4">
              {/* Back Button */}
              <button
                onClick={() => setView('list')}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Party
              </button>

              {/* Email */}
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    type="email"
                    placeholder="player@example.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Discord ID */}
              <div className="form-group">
                <label className="form-label">
                  Or Discord Username <span className="text-gray-500 text-xs">(optional)</span>
                </label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    placeholder="username"
                    value={inviteForm.discordId}
                    onChange={(e) => setInviteForm({ ...inviteForm, discordId: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="form-group">
                <label className="form-label">Role & Starting Permissions</label>
                <div className="space-y-2">
                  {(['player', 'contributor', 'guest', ...(isOwner ? ['co_dm'] : [])] as CampaignMemberRole[]).map((role) => {
                    const RoleIcon = getRoleIcon(role)
                    const descriptions: Record<string, string> = {
                      co_dm: 'Full access to everything except delete campaign',
                      player: 'See party, timeline, maps. Add session notes. Edit their own character.',
                      contributor: 'Add session notes only. Limited visibility.',
                      guest: 'View only. No editing capabilities.',
                    }
                    return (
                      <button
                        key={role}
                        onClick={() => setInviteForm({ ...inviteForm, role })}
                        className={cn(
                          "w-full p-3 rounded-lg border text-left transition-colors",
                          inviteForm.role === role
                            ? "bg-purple-500/10 border-purple-500/30"
                            : "bg-white/[0.02] border-[--border] hover:border-purple-500/20"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <RoleIcon className={cn(
                            "w-5 h-5",
                            inviteForm.role === role ? "text-purple-400" : "text-gray-500"
                          )} />
                          <div className="flex-1">
                            <p className="font-medium text-white text-sm">{getRoleLabel(role)}</p>
                            <p className="text-xs text-gray-500">{descriptions[role]}</p>
                          </div>
                          {inviteForm.role === role && (
                            <Check className="w-4 h-4 text-purple-400" />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  You can customize their exact permissions after inviting.
                </p>
              </div>

              {/* Character Assignment */}
              {availableCharacters.length > 0 && (
                <div className="form-group">
                  <label className="form-label">
                    Assign to Character <span className="text-gray-500 text-xs">(optional)</span>
                  </label>
                  <select
                    value={inviteForm.characterId}
                    onChange={(e) => setInviteForm({ ...inviteForm, characterId: e.target.value })}
                    className="form-input"
                  >
                    <option value="">No character</option>
                    {availableCharacters.map(char => (
                      <option key={char.id} value={char.id}>
                        {char.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Only this person can claim this character to their vault.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setView('list')}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInvite}
                  disabled={saving || (!inviteForm.email && !inviteForm.discordId)}
                  className="btn btn-primary flex-1"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Send Invite
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ============================================ */}
          {/* INVITE SUCCESS VIEW */}
          {/* ============================================ */}
          {view === 'invite-success' && inviteUrl && (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-400" />
              </div>

              <div>
                <h3 className="text-lg font-medium text-white">Invite Created!</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Share this link with the person you want to invite:
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 bg-white/[0.05] rounded-lg font-mono text-sm text-gray-300 truncate text-left">
                  {inviteUrl}
                </div>
                <button
                  onClick={handleCopyLink}
                  className={cn(
                    "btn",
                    copied ? "btn-primary" : "btn-secondary"
                  )}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </>
                  )}
                </button>
              </div>

              <button
                onClick={() => {
                  setInviteUrl(null)
                  setView('list')
                }}
                className="btn btn-secondary w-full"
              >
                Done
              </button>
            </div>
          )}
        </>
      )}
    </Modal>
  )
}

// Helper Components

function PermissionSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h5 className="text-xs font-medium text-gray-400 uppercase tracking-wider">{title}</h5>
      <div className="bg-white/[0.02] rounded-lg border border-[--border] p-3 space-y-2">
        {children}
      </div>
    </div>
  )
}

function PermissionRow({
  label,
  checked,
  onChange
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/50"
      />
      <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
        {label}
      </span>
    </label>
  )
}

function PermissionGrid({
  permissions
}: {
  permissions: { label: string; checked: boolean; onChange: (value: boolean) => void }[]
}) {
  return (
    <div className="flex flex-wrap gap-4">
      {permissions.map((perm, i) => (
        <label key={i} className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={perm.checked}
            onChange={(e) => perm.onChange(e.target.checked)}
            className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/50"
          />
          <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
            {perm.label}
          </span>
        </label>
      ))}
    </div>
  )
}
