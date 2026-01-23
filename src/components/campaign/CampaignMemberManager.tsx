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
  MoreVertical,
  Crown,
  Shield,
  User,
  Eye,
  Loader2,
  Link as LinkIcon,
} from 'lucide-react'
import { Modal, Input } from '@/components/ui'
import { toast } from 'sonner'
import { cn, getInitials } from '@/lib/utils'
import type { CampaignMemberRole, Character } from '@/types/database'

interface CampaignMember {
  id: string
  campaign_id: string
  user_id: string | null
  email: string | null
  discord_id: string | null
  role: CampaignMemberRole
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

interface CampaignMemberManagerProps {
  campaignId: string
  characters: Character[]
  isOpen: boolean
  onClose: () => void
}

export function CampaignMemberManager({
  campaignId,
  characters,
  isOpen,
  onClose,
}: CampaignMemberManagerProps) {
  const [members, setMembers] = useState<CampaignMember[]>([])
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    discordId: '',
    role: 'player' as CampaignMemberRole,
    characterId: '',
  })
  const [inviting, setInviting] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [actionMemberId, setActionMemberId] = useState<string | null>(null)

  // Load members
  useEffect(() => {
    if (isOpen) {
      loadMembers()
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

    setInviting(true)
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteForm.email || undefined,
          discordId: inviteForm.discordId || undefined,
          role: inviteForm.role,
          characterId: inviteForm.characterId || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to send invite')
        return
      }

      toast.success('Invite created!')
      setInviteUrl(data.inviteUrl)
      loadMembers()
    } catch (error) {
      console.error('Failed to invite:', error)
      toast.error('Failed to send invite')
    } finally {
      setInviting(false)
    }
  }

  const handleCopyLink = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/members?memberId=${memberId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || 'Failed to remove member')
        return
      }

      toast.success('Member removed')
      loadMembers()
      setActionMemberId(null)
    } catch (error) {
      console.error('Failed to remove member:', error)
      toast.error('Failed to remove member')
    }
  }

  const handleUpdateRole = async (memberId: string, role: CampaignMemberRole) => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, role }),
      })

      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || 'Failed to update role')
        return
      }

      toast.success('Role updated')
      loadMembers()
      setActionMemberId(null)
    } catch (error) {
      console.error('Failed to update role:', error)
      toast.error('Failed to update role')
    }
  }

  const getRoleIcon = (role: CampaignMemberRole) => {
    switch (role) {
      case 'owner':
        return Crown
      case 'co_dm':
        return Shield
      case 'player':
        return User
      case 'contributor':
        return User
      case 'guest':
        return Eye
      default:
        return User
    }
  }

  const getRoleLabel = (role: CampaignMemberRole) => {
    switch (role) {
      case 'owner':
        return 'Owner'
      case 'co_dm':
        return 'Co-DM'
      case 'player':
        return 'Player'
      case 'contributor':
        return 'Contributor'
      case 'guest':
        return 'Guest'
      default:
        return role
    }
  }

  const getRoleColor = (role: CampaignMemberRole) => {
    switch (role) {
      case 'owner':
        return 'text-amber-400 bg-amber-500/10'
      case 'co_dm':
        return 'text-purple-400 bg-purple-500/10'
      case 'player':
        return 'text-blue-400 bg-blue-500/10'
      case 'contributor':
        return 'text-green-400 bg-green-500/10'
      case 'guest':
        return 'text-gray-400 bg-gray-500/10'
      default:
        return 'text-gray-400 bg-gray-500/10'
    }
  }

  // Available characters for assignment (PCs not already assigned)
  const assignedCharacterIds = members
    .filter(m => m.character_id)
    .map(m => m.character_id)
  const availableCharacters = characters.filter(
    c => c.type === 'pc' && !assignedCharacterIds.includes(c.id)
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Campaign Members"
      description="Manage who has access to this campaign"
      size="lg"
    >
      <div className="space-y-6">
        {/* Invite Button */}
        <button
          onClick={() => {
            setInviteForm({ email: '', discordId: '', role: 'player', characterId: '' })
            setInviteUrl(null)
            setInviteModalOpen(true)
          }}
          className="btn btn-primary w-full"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Member
        </button>

        {/* Member List */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No members yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {members.map(member => {
              const RoleIcon = getRoleIcon(member.role)
              const displayName = member.user_settings?.username ||
                member.email ||
                member.discord_id ||
                'Unknown'

              return (
                <div
                  key={member.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border",
                    member.status === 'pending'
                      ? "bg-amber-500/5 border-amber-500/20"
                      : "bg-white/[0.02] border-[--border]"
                  )}
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
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn(
                        "inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded",
                        getRoleColor(member.role)
                      )}>
                        <RoleIcon className="w-3 h-3" />
                        {getRoleLabel(member.role)}
                      </span>
                      {member.character && (
                        <span className="text-xs text-gray-500 truncate">
                          as {member.character.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {member.role !== 'owner' && (isOwner || member.role !== 'co_dm') && (
                    <div className="relative">
                      <button
                        onClick={() => setActionMemberId(
                          actionMemberId === member.id ? null : member.id
                        )}
                        className="p-2 hover:bg-white/[0.05] rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-500" />
                      </button>

                      {actionMemberId === member.id && (
                        <div className="absolute right-0 top-full mt-1 w-40 bg-[#12121a] border border-[--border] rounded-lg shadow-xl z-10 py-1">
                          {isOwner && member.role !== 'co_dm' && (
                            <button
                              onClick={() => handleUpdateRole(member.id, 'co_dm')}
                              className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-white/[0.05]"
                            >
                              Promote to Co-DM
                            </button>
                          )}
                          {member.role === 'co_dm' && (
                            <button
                              onClick={() => handleUpdateRole(member.id, 'player')}
                              className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-white/[0.05]"
                            >
                              Demote to Player
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-white/[0.05]"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Invite Member"
        description="Invite someone to join your campaign"
        size="md"
      >
        <div className="space-y-4">
          {inviteUrl ? (
            // Show invite link
            <div className="space-y-4">
              <p className="text-gray-400 text-sm">
                Share this link with the person you want to invite:
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 bg-white/[0.05] rounded-lg font-mono text-sm text-gray-300 truncate">
                  {inviteUrl}
                </div>
                <button
                  onClick={handleCopyLink}
                  className={cn(
                    "btn btn-sm",
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
                  setInviteModalOpen(false)
                }}
                className="btn btn-secondary w-full"
              >
                Done
              </button>
            </div>
          ) : (
            // Show invite form
            <>
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

              {/* Discord ID (optional) */}
              <div className="form-group">
                <label className="form-label">
                  Or Discord ID <span className="text-gray-500 text-xs">(optional)</span>
                </label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    placeholder="username#1234"
                    value={inviteForm.discordId}
                    onChange={(e) => setInviteForm({ ...inviteForm, discordId: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Role */}
              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({
                    ...inviteForm,
                    role: e.target.value as CampaignMemberRole
                  })}
                  className="form-input"
                >
                  <option value="player">Player</option>
                  <option value="contributor">Contributor (can add notes)</option>
                  <option value="guest">Guest (view only)</option>
                  {isOwner && <option value="co_dm">Co-DM</option>}
                </select>
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
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setInviteModalOpen(false)}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInvite}
                  disabled={inviting || (!inviteForm.email && !inviteForm.discordId)}
                  className="btn btn-primary flex-1"
                >
                  {inviting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Send Invite
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </Modal>
  )
}
