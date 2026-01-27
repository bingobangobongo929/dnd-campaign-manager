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
  Sparkles,
  Clock,
  Send,
  ChevronDown,
  UserCircle2,
  ScrollText,
  Map,
  KeyRound,
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
  discord_username: string | null
  role: CampaignMemberRole
  permissions: MemberPermissions | null
  status: 'pending' | 'active' | 'declined' | 'removed'
  character_id: string | null
  vault_character_id: string | null
  joined_at: string | null
  invited_at: string | null
  invite_url: string | null
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
  const [copiedMemberLink, setCopiedMemberLink] = useState(false)
  const [saving, setSaving] = useState(false)

  // Invite form state
  const [inviteMethod, setInviteMethod] = useState<'email' | 'discord'>('email')
  const [inviteForm, setInviteForm] = useState({
    email: '',
    discordId: '',
    role: 'player' as CampaignMemberRole,
    characterId: '',
    permissions: DEFAULT_PERMISSIONS['player'] as MemberPermissions,
  })
  const [showAdvancedPermissions, setShowAdvancedPermissions] = useState(false)
  const [sendingReminder, setSendingReminder] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)

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
    if (inviteMethod === 'email' && !inviteForm.email) {
      toast.error('Please enter an email address')
      return
    }
    if (inviteMethod === 'discord' && !inviteForm.discordId) {
      toast.error('Please enter a Discord username')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteMethod === 'email' ? inviteForm.email : undefined,
          discordUsername: inviteMethod === 'discord' ? inviteForm.discordId : undefined,
          role: inviteForm.role,
          characterId: inviteForm.characterId || undefined,
          permissions: inviteForm.permissions,
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

  const handleCopyMemberInviteLink = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedMemberLink(true)
    toast.success('Invite link copied!')
    setTimeout(() => setCopiedMemberLink(false), 2000)
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

    // Debug logging for character assignment
    console.log('[PartyModal Debug] Saving member update:')
    console.log('[PartyModal Debug] selectedMember.id:', selectedMember.id)
    console.log('[PartyModal Debug] editForm.characterId:', editForm.characterId)
    console.log('[PartyModal Debug] characterId being sent:', editForm.characterId || null)

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

    // Show confirmation modal for linked characters
    if (selectedMember.vault_character_id || selectedMember.character) {
      setShowRemoveConfirm(true)
      return
    }

    await executeRemoveMember()
  }

  const executeRemoveMember = async () => {
    if (!selectedMember) return

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
      setShowRemoveConfirm(false)
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

  const updateInvitePermission = (
    category: keyof MemberPermissions,
    key: string,
    value: boolean
  ) => {
    setInviteForm({
      ...inviteForm,
      permissions: {
        ...inviteForm.permissions,
        [category]: {
          ...inviteForm.permissions[category],
          [key]: value,
        },
      },
    })
  }

  const getDisplayName = (member: CampaignMember) => {
    return member.user_settings?.username ||
      member.email ||
      member.discord_username ||
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
      size="xl"
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
              {/* Header with count and invite button */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">
                  {members.length} member{members.length !== 1 ? 's' : ''} in party
                </p>
                <button
                  onClick={() => {
                    setInviteMethod('email')
                    setInviteForm({
                      email: '',
                      discordId: '',
                      role: 'player',
                      characterId: '',
                      permissions: DEFAULT_PERMISSIONS['player'],
                    })
                    setShowAdvancedPermissions(false)
                    setView('invite')
                  }}
                  className="btn btn-primary btn-sm"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite
                </button>
              </div>

              {/* Member List - cleaner cards */}
              <div className="space-y-2">
                {members.map(member => {
                  const RoleIcon = getRoleIcon(member.role)
                  const displayName = getDisplayName(member)
                  const isCurrentUserOwner = member.role === 'owner'
                  const hasCharacter = !!member.character

                  return (
                    <div
                      key={member.id}
                      className={cn(
                        "flex items-center gap-4 p-3 rounded-lg border transition-all",
                        member.status === 'pending'
                          ? "bg-amber-500/5 border-amber-500/20"
                          : "bg-white/[0.02] border-[--border]",
                        !isCurrentUserOwner && "hover:border-purple-500/30 hover:bg-white/[0.03] cursor-pointer"
                      )}
                      onClick={() => !isCurrentUserOwner && handleSelectMember(member)}
                    >
                      {/* Character Avatar (prominent) or User Avatar */}
                      <div className="relative flex-shrink-0">
                        {hasCharacter && member.character?.image_url ? (
                          <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-purple-500/30">
                            <Image
                              src={member.character.image_url}
                              alt={member.character.name}
                              width={48}
                              height={48}
                              className="object-cover w-full h-full"
                            />
                          </div>
                        ) : hasCharacter ? (
                          <div className="w-12 h-12 rounded-lg bg-purple-600/20 border-2 border-purple-500/30 flex items-center justify-center">
                            <User className="w-5 h-5 text-purple-400" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-800 border border-[--border] flex items-center justify-center">
                            <UserCircle2 className="w-6 h-6 text-gray-500" />
                          </div>
                        )}
                        {/* Small user avatar overlay if character is assigned */}
                        {hasCharacter && member.user_settings?.avatar_url && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[--bg-surface] overflow-hidden">
                            <Image
                              src={member.user_settings.avatar_url}
                              alt={displayName}
                              width={20}
                              height={20}
                              className="object-cover"
                            />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-white text-sm truncate">
                            {displayName}
                          </p>
                          <span className={cn(
                            "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium",
                            getRoleColor(member.role)
                          )}>
                            <RoleIcon className="w-2.5 h-2.5" />
                            {getRoleLabel(member.role)}
                          </span>
                          {member.status === 'pending' && (
                            <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-medium">
                              Pending
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {hasCharacter ? (
                            <>Playing as <span className="text-gray-400">{member.character?.name}</span></>
                          ) : (
                            <span className="text-gray-600">No character assigned</span>
                          )}
                        </p>
                      </div>

                      {/* Edit Arrow */}
                      {!isCurrentUserOwner && (
                        <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
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
            <div className="flex flex-col h-full">
              {/* Back Button */}
              <button
                onClick={() => setView('list')}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-4"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Party
              </button>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto space-y-5 pr-1">
                {/* Member Header - More compact with character avatar */}
                <div className="flex items-center gap-4 p-4 bg-white/[0.02] rounded-lg border border-[--border]">
                  {/* Character or User Avatar */}
                  <div className="relative flex-shrink-0">
                    {selectedMember.character?.image_url ? (
                      <div className="w-14 h-14 rounded-lg overflow-hidden border-2 border-purple-500/30">
                        <Image
                          src={selectedMember.character.image_url}
                          alt={selectedMember.character.name}
                          width={56}
                          height={56}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    ) : selectedMember.character ? (
                      <div className="w-14 h-14 rounded-lg bg-purple-600/20 border-2 border-purple-500/30 flex items-center justify-center">
                        <User className="w-6 h-6 text-purple-400" />
                      </div>
                    ) : selectedMember.user_settings?.avatar_url ? (
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
                    {/* User avatar overlay when character is shown */}
                    {selectedMember.character && selectedMember.user_settings?.avatar_url && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-[--bg-surface] overflow-hidden">
                        <Image
                          src={selectedMember.user_settings.avatar_url}
                          alt={getDisplayName(selectedMember)}
                          width={24}
                          height={24}
                          className="object-cover"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white">{getDisplayName(selectedMember)}</h3>
                    {selectedMember.character && (
                      <p className="text-sm text-purple-400">Playing as {selectedMember.character.name}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      {selectedMember.email && <span>{selectedMember.email}</span>}
                      {selectedMember.discord_username && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                          </svg>
                          {selectedMember.discord_username}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Status badge */}
                  {selectedMember.status === 'pending' ? (
                    <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded font-medium">
                      Pending
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">
                      Joined {selectedMember.joined_at ? new Date(selectedMember.joined_at).toLocaleDateString() : 'N/A'}
                    </span>
                  )}
                </div>

                {/* Invite Link for Pending Members */}
                {selectedMember.status === 'pending' && selectedMember.invite_url && (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-amber-400 font-medium mb-1">Invite Link</p>
                        <p className="text-xs text-gray-400 truncate font-mono">
                          {selectedMember.invite_url}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCopyMemberInviteLink(selectedMember.invite_url!)}
                        className="btn btn-secondary btn-sm flex-shrink-0"
                      >
                        {copiedMemberLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Claim Status for Active Members with Characters */}
                {selectedMember.status === 'active' && selectedMember.character && (
                  <div className={cn(
                    "rounded-lg p-3",
                    selectedMember.vault_character_id
                      ? "bg-green-500/5 border border-green-500/20"
                      : "bg-amber-500/5 border border-amber-500/20"
                  )}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {selectedMember.vault_character_id ? (
                          <Sparkles className="w-4 h-4 text-green-400" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-400" />
                        )}
                        <span className={cn(
                          "text-sm font-medium",
                          selectedMember.vault_character_id ? "text-green-400" : "text-amber-400"
                        )}>
                          {selectedMember.vault_character_id ? 'Character claimed' : 'Awaiting claim'}
                        </span>
                      </div>
                      {!selectedMember.vault_character_id && (selectedMember.email || selectedMember.user_id) && (
                        <button
                          onClick={async () => {
                            setSendingReminder(true)
                            try {
                              const response = await fetch(`/api/campaigns/${campaignId}/members/remind`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  memberId: selectedMember.id,
                                  characterId: selectedMember.character_id,
                                }),
                              })
                              const data = await response.json()
                              if (!response.ok) throw new Error(data.error || 'Failed to send reminder')
                              toast.success(data.message || 'Reminder sent!')
                            } catch (error) {
                              const reminderText = `Hey! Don't forget to claim ${selectedMember.character?.name} to your Character Vault on Multiloop.`
                              navigator.clipboard.writeText(reminderText)
                              toast.info('Reminder copied to clipboard')
                            } finally {
                              setSendingReminder(false)
                            }
                          }}
                          disabled={sendingReminder}
                          className="btn btn-secondary btn-sm"
                        >
                          {sendingReminder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Role & Character - Side by side */}
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

                {/* Permissions - Grouped into Accordions */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-white">Permissions</h4>
                    <button
                      onClick={handleResetPermissions}
                      className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset
                    </button>
                  </div>

                  {/* Accordion Groups */}
                  <PermissionAccordion
                    icon={Users}
                    title="Characters & NPCs"
                    defaultOpen={true}
                  >
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Party Characters</p>
                        <PermissionRow label="Edit own character" checked={editForm.permissions.characters.editOwn} onChange={(v) => updatePermission('characters', 'editOwn', v)} />
                        <PermissionRow label="View party members" checked={editForm.permissions.characters.viewParty} onChange={(v) => updatePermission('characters', 'viewParty', v)} />
                        <PermissionRow label="View full details" checked={editForm.permissions.characters.viewPartyDetails} onChange={(v) => updatePermission('characters', 'viewPartyDetails', v)} />
                        <PermissionRow label="Edit other PCs" checked={editForm.permissions.characters.editParty} onChange={(v) => updatePermission('characters', 'editParty', v)} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-2">NPCs</p>
                        <PermissionRow label="View NPCs" checked={editForm.permissions.npcs.view} onChange={(v) => updatePermission('npcs', 'view', v)} />
                        <PermissionRow label="View details" checked={editForm.permissions.npcs.viewDetails} onChange={(v) => updatePermission('npcs', 'viewDetails', v)} />
                        <PermissionRow label="Add NPCs" checked={editForm.permissions.npcs.add} onChange={(v) => updatePermission('npcs', 'add', v)} />
                        <PermissionRow label="Edit NPCs" checked={editForm.permissions.npcs.edit} onChange={(v) => updatePermission('npcs', 'edit', v)} />
                      </div>
                    </div>
                  </PermissionAccordion>

                  <PermissionAccordion
                    icon={ScrollText}
                    title="Sessions & Notes"
                  >
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Session Notes</p>
                        <PermissionRow label="Add own notes" checked={editForm.permissions.sessionNotes.addOwn} onChange={(v) => updatePermission('sessionNotes', 'addOwn', v)} />
                        <PermissionRow label="View recaps" checked={editForm.permissions.sessionNotes.viewRecaps} onChange={(v) => updatePermission('sessionNotes', 'viewRecaps', v)} />
                        <PermissionRow label="View others' notes" checked={editForm.permissions.sessionNotes.viewOthers} onChange={(v) => updatePermission('sessionNotes', 'viewOthers', v)} />
                        <PermissionRow label="Edit others' notes" checked={editForm.permissions.sessionNotes.editOthers} onChange={(v) => updatePermission('sessionNotes', 'editOthers', v)} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Sessions</p>
                        <PermissionRow label="View sessions" checked={editForm.permissions.sessions.view} onChange={(v) => updatePermission('sessions', 'view', v)} />
                        <PermissionRow label="Add sessions" checked={editForm.permissions.sessions.add} onChange={(v) => updatePermission('sessions', 'add', v)} />
                        <PermissionRow label="Edit sessions" checked={editForm.permissions.sessions.edit} onChange={(v) => updatePermission('sessions', 'edit', v)} />
                        <PermissionRow label="Delete sessions" checked={editForm.permissions.sessions.delete} onChange={(v) => updatePermission('sessions', 'delete', v)} />
                      </div>
                    </div>
                  </PermissionAccordion>

                  <PermissionAccordion
                    icon={Map}
                    title="World & Lore"
                  >
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Timeline</p>
                        <PermissionRow label="View timeline" checked={editForm.permissions.timeline.view} onChange={(v) => updatePermission('timeline', 'view', v)} />
                        <PermissionRow label="View future events" checked={editForm.permissions.timeline.viewFuture} onChange={(v) => updatePermission('timeline', 'viewFuture', v)} />
                        <PermissionRow label="Add events" checked={editForm.permissions.timeline.add} onChange={(v) => updatePermission('timeline', 'add', v)} />
                        <PermissionRow label="Edit events" checked={editForm.permissions.timeline.edit} onChange={(v) => updatePermission('timeline', 'edit', v)} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Factions & Locations</p>
                        <PermissionRow label="View factions" checked={editForm.permissions.factions.view} onChange={(v) => updatePermission('factions', 'view', v)} />
                        <PermissionRow label="Edit factions" checked={editForm.permissions.factions.edit} onChange={(v) => updatePermission('factions', 'edit', v)} />
                        <PermissionRow label="View locations" checked={editForm.permissions.locations.view} onChange={(v) => updatePermission('locations', 'view', v)} />
                        <PermissionRow label="Edit locations" checked={editForm.permissions.locations.edit} onChange={(v) => updatePermission('locations', 'edit', v)} />
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 mb-2 mt-2">Lore</p>
                        <div className="flex flex-wrap gap-4">
                          <PermissionRow label="View" checked={editForm.permissions.lore.view} onChange={(v) => updatePermission('lore', 'view', v)} />
                          <PermissionRow label="Add" checked={editForm.permissions.lore.add} onChange={(v) => updatePermission('lore', 'add', v)} />
                          <PermissionRow label="Edit" checked={editForm.permissions.lore.edit} onChange={(v) => updatePermission('lore', 'edit', v)} />
                          <PermissionRow label="Delete" checked={editForm.permissions.lore.delete} onChange={(v) => updatePermission('lore', 'delete', v)} />
                        </div>
                      </div>
                    </div>
                  </PermissionAccordion>

                  <PermissionAccordion
                    icon={KeyRound}
                    title="Canvas, Maps & Gallery"
                  >
                    <div className="grid grid-cols-3 gap-x-6 gap-y-2">
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Canvas</p>
                        <PermissionRow label="View canvas" checked={editForm.permissions.canvas.view} onChange={(v) => updatePermission('canvas', 'view', v)} />
                        <PermissionRow label="Edit layout" checked={editForm.permissions.canvas.editLayout} onChange={(v) => updatePermission('canvas', 'editLayout', v)} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Maps</p>
                        <PermissionRow label="View maps" checked={editForm.permissions.maps.view} onChange={(v) => updatePermission('maps', 'view', v)} />
                        <PermissionRow label="Add maps" checked={editForm.permissions.maps.add} onChange={(v) => updatePermission('maps', 'add', v)} />
                        <PermissionRow label="View pins" checked={editForm.permissions.mapPins.view} onChange={(v) => updatePermission('mapPins', 'view', v)} />
                        <PermissionRow label="Add pins" checked={editForm.permissions.mapPins.add} onChange={(v) => updatePermission('mapPins', 'add', v)} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Gallery</p>
                        <PermissionRow label="View gallery" checked={editForm.permissions.gallery.view} onChange={(v) => updatePermission('gallery', 'view', v)} />
                        <PermissionRow label="Add images" checked={editForm.permissions.gallery.add} onChange={(v) => updatePermission('gallery', 'add', v)} />
                        <PermissionRow label="Delete images" checked={editForm.permissions.gallery.delete} onChange={(v) => updatePermission('gallery', 'delete', v)} />
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-[--border]">
                      <p className="text-xs text-gray-500 mb-2">Secrets & Visibility</p>
                      <div className="flex flex-wrap gap-4">
                        <PermissionRow label="View party items" checked={editForm.permissions.secrets.viewPartyItems} onChange={(v) => updatePermission('secrets', 'viewPartyItems', v)} />
                        <PermissionRow label="View reveal history" checked={editForm.permissions.secrets.viewRevealHistory} onChange={(v) => updatePermission('secrets', 'viewRevealHistory', v)} />
                      </div>
                    </div>
                  </PermissionAccordion>
                </div>
              </div>

              {/* Sticky Actions */}
              <div className="flex items-center gap-3 pt-4 mt-4 border-t border-[--border] bg-[--bg-surface] sticky bottom-0">
                <button
                  onClick={handleRemoveMember}
                  disabled={saving || selectedMember.role === 'owner'}
                  className="btn btn-secondary text-red-400 hover:text-red-300 hover:border-red-500/30"
                >
                  <Trash2 className="w-4 h-4" />
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

              {/* Invite Method Selection */}
              <div className="form-group">
                <label className="form-label">Invite via</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setInviteMethod('email')}
                    className={cn(
                      "p-3 rounded-lg border text-left transition-colors flex items-center gap-3",
                      inviteMethod === 'email'
                        ? "bg-purple-500/10 border-purple-500/30"
                        : "bg-white/[0.02] border-[--border] hover:border-purple-500/20"
                    )}
                  >
                    <Mail className={cn("w-5 h-5", inviteMethod === 'email' ? "text-purple-400" : "text-gray-500")} />
                    <span className={cn("font-medium text-sm", inviteMethod === 'email' ? "text-white" : "text-gray-400")}>
                      Email
                    </span>
                  </button>
                  <button
                    onClick={() => setInviteMethod('discord')}
                    className={cn(
                      "p-3 rounded-lg border text-left transition-colors flex items-center gap-3",
                      inviteMethod === 'discord'
                        ? "bg-purple-500/10 border-purple-500/30"
                        : "bg-white/[0.02] border-[--border] hover:border-purple-500/20"
                    )}
                  >
                    <svg
                      className={cn("w-5 h-5", inviteMethod === 'discord' ? "text-purple-400" : "text-gray-500")}
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    <span className={cn("font-medium text-sm", inviteMethod === 'discord' ? "text-white" : "text-gray-400")}>
                      Discord
                    </span>
                  </button>
                </div>
              </div>

              {/* Email/Discord Input */}
              {inviteMethod === 'email' ? (
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
              ) : (
                <div className="form-group">
                  <label className="form-label">Discord Username</label>
                  <div className="relative">
                    <svg
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    <Input
                      type="text"
                      placeholder="username or username#1234"
                      value={inviteForm.discordId}
                      onChange={(e) => setInviteForm({ ...inviteForm, discordId: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Enter their Discord username. When they link their Discord account, they'll automatically join.
                  </p>
                </div>
              )}

              {/* Role Selection */}
              <div className="form-group">
                <label className="form-label">Role</label>
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
                        onClick={() => setInviteForm({
                          ...inviteForm,
                          role,
                          permissions: DEFAULT_PERMISSIONS[role],
                        })}
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

              {/* Advanced Permissions Toggle */}
              <div className="border-t border-[--border] pt-4">
                <button
                  onClick={() => setShowAdvancedPermissions(!showAdvancedPermissions)}
                  className="flex items-center justify-between w-full text-sm"
                >
                  <span className="font-medium text-white">Customize Permissions</span>
                  <ChevronRight className={cn(
                    "w-4 h-4 text-gray-400 transition-transform",
                    showAdvancedPermissions && "rotate-90"
                  )} />
                </button>
                <p className="text-xs text-gray-500 mt-1">
                  Fine-tune what this member can do before sending the invite.
                </p>
              </div>

              {/* Advanced Permissions (collapsible) */}
              {showAdvancedPermissions && (
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 border border-[--border] rounded-lg p-4 bg-white/[0.01]">
                  {/* Session Notes */}
                  <PermissionSection title="Session Notes">
                    <PermissionRow
                      label="Add own session notes"
                      checked={inviteForm.permissions.sessionNotes?.addOwn ?? false}
                      onChange={(v) => updateInvitePermission('sessionNotes', 'addOwn', v)}
                    />
                    <PermissionRow
                      label="View session recaps"
                      checked={inviteForm.permissions.sessionNotes?.viewRecaps ?? false}
                      onChange={(v) => updateInvitePermission('sessionNotes', 'viewRecaps', v)}
                    />
                  </PermissionSection>

                  {/* Characters */}
                  <PermissionSection title="Characters">
                    <PermissionRow
                      label="Edit own character"
                      checked={inviteForm.permissions.characters?.editOwn ?? false}
                      onChange={(v) => updateInvitePermission('characters', 'editOwn', v)}
                    />
                    <PermissionRow
                      label="View party members"
                      checked={inviteForm.permissions.characters?.viewParty ?? false}
                      onChange={(v) => updateInvitePermission('characters', 'viewParty', v)}
                    />
                  </PermissionSection>

                  {/* Timeline */}
                  <PermissionSection title="Timeline">
                    <PermissionRow
                      label="View timeline"
                      checked={inviteForm.permissions.timeline?.view ?? false}
                      onChange={(v) => updateInvitePermission('timeline', 'view', v)}
                    />
                    <PermissionRow
                      label="Add events"
                      checked={inviteForm.permissions.timeline?.add ?? false}
                      onChange={(v) => updateInvitePermission('timeline', 'add', v)}
                    />
                  </PermissionSection>

                  {/* Gallery */}
                  <PermissionSection title="Gallery">
                    <PermissionRow
                      label="View gallery"
                      checked={inviteForm.permissions.gallery?.view ?? false}
                      onChange={(v) => updateInvitePermission('gallery', 'view', v)}
                    />
                    <PermissionRow
                      label="Add images"
                      checked={inviteForm.permissions.gallery?.add ?? false}
                      onChange={(v) => updateInvitePermission('gallery', 'add', v)}
                    />
                  </PermissionSection>

                  {/* Maps */}
                  <PermissionSection title="Maps">
                    <PermissionRow
                      label="View maps"
                      checked={inviteForm.permissions.maps?.view ?? false}
                      onChange={(v) => updateInvitePermission('maps', 'view', v)}
                    />
                  </PermissionSection>
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
                  disabled={saving || (inviteMethod === 'email' ? !inviteForm.email : !inviteForm.discordId)}
                  className="btn btn-primary flex-1"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Create Invite
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

      {/* ============================================ */}
      {/* REMOVE MEMBER CONFIRMATION MODAL */}
      {/* ============================================ */}
      {showRemoveConfirm && selectedMember && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
          <div className="bg-[--background] border border-[--border] rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-white">
                Remove {getDisplayName(selectedMember)}?
              </h3>
            </div>

            <p className="text-sm text-gray-400 mb-4">
              This will remove them from the campaign.
            </p>

            {/* Character Impact Warning */}
            {selectedMember.character && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" />
                  Character Impact
                </h4>
                <p className="text-xs text-gray-400 mb-2">
                  {selectedMember.character.name} is {selectedMember.vault_character_id ? 'linked to' : 'designated for'} this player's vault.
                </p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li className="flex items-start gap-2">
                    <span className="text-gray-600">•</span>
                    <span>Player keeps any vault copies already taken</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-600">•</span>
                    <span>Player loses ability to export new snapshots</span>
                  </li>
                  {selectedMember.vault_character_id && (
                    <li className="flex items-start gap-2">
                      <span className="text-gray-600">•</span>
                      <span>Their linked (In-Play) copy becomes read-only archive</span>
                    </li>
                  )}
                  <li className="flex items-start gap-2">
                    <span className="text-gray-600">•</span>
                    <span>The character remains in your campaign</span>
                  </li>
                </ul>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowRemoveConfirm(false)}
                disabled={saving}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={executeRemoveMember}
                disabled={saving}
                className="btn bg-red-500 hover:bg-red-600 text-white flex-1"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove Player
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

// Helper Components

function PermissionAccordion({
  icon: Icon,
  title,
  children,
  defaultOpen = false
}: {
  icon: any
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border border-[--border] rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-3 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
      >
        <Icon className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-medium text-white flex-1 text-left">{title}</span>
        <ChevronDown className={cn(
          "w-4 h-4 text-gray-400 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>
      {isOpen && (
        <div className="p-4 bg-white/[0.01] border-t border-[--border]">
          {children}
        </div>
      )}
    </div>
  )
}

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
