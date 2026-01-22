'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Shield, EyeOff, Pencil, Settings } from 'lucide-react'
import { useSupabase } from '@/hooks'
import { cn } from '@/lib/utils'
import { Input, Modal, ColorPicker } from '@/components/ui'
import { FactionManager } from '@/components/campaign/FactionManager'
import type { Character, CampaignFaction, FactionMembership, FactionType } from '@/types/database'

interface MembershipWithFaction extends FactionMembership {
  faction: CampaignFaction
}

interface FactionMembershipEditorProps {
  character: Character
  campaignId: string
  allCharacters: Character[]
  onMembershipsChange?: () => void
}

const FACTION_TYPES: { value: FactionType; label: string }[] = [
  { value: 'guild', label: 'Guild' },
  { value: 'kingdom', label: 'Kingdom' },
  { value: 'military', label: 'Military' },
  { value: 'criminal', label: 'Criminal' },
  { value: 'religious', label: 'Religious' },
  { value: 'merchant', label: 'Merchant' },
  { value: 'academic', label: 'Academic' },
  { value: 'family', label: 'Family' },
  { value: 'cult', label: 'Cult' },
  { value: 'other', label: 'Other' },
]

export function FactionMembershipEditor({
  character,
  campaignId,
  allCharacters,
  onMembershipsChange,
}: FactionMembershipEditorProps) {
  const supabase = useSupabase()
  const [memberships, setMemberships] = useState<MembershipWithFaction[]>([])
  const [availableFactions, setAvailableFactions] = useState<CampaignFaction[]>([])
  const [loading, setLoading] = useState(true)

  // Modal states - separate for Join, Create, Manage
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isManageModalOpen, setIsManageModalOpen] = useState(false)

  // Form state for joining existing faction
  const [selectedFactionId, setSelectedFactionId] = useState<string>('')
  const [membershipRole, setMembershipRole] = useState('')
  const [membershipTitle, setMembershipTitle] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [saving, setSaving] = useState(false)

  // Create faction form state
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    color: '#8B5CF6',
    faction_type: 'guild' as FactionType,
  })

  // Edit state
  const [editingMembership, setEditingMembership] = useState<MembershipWithFaction | null>(null)
  const [editRole, setEditRole] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editIsPublic, setEditIsPublic] = useState(true)

  // Load memberships for this character
  const loadMemberships = useCallback(async () => {
    setLoading(true)

    const { data } = await supabase
      .from('faction_memberships')
      .select(`
        *,
        faction:campaign_factions(*)
      `)
      .eq('character_id', character.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    setMemberships((data || []) as MembershipWithFaction[])
    setLoading(false)
  }, [character.id, supabase])

  // Load available factions for the campaign
  const loadFactions = useCallback(async () => {
    const { data } = await supabase
      .from('campaign_factions')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('name')

    setAvailableFactions(data || [])
  }, [campaignId, supabase])

  useEffect(() => {
    loadMemberships()
    loadFactions()
  }, [loadMemberships, loadFactions])

  const handleAddMembership = async () => {
    if (!selectedFactionId) return

    setSaving(true)

    const { error } = await supabase
      .from('faction_memberships')
      .insert({
        faction_id: selectedFactionId,
        character_id: character.id,
        role: membershipRole || null,
        title: membershipTitle || null,
        is_public: isPublic,
        is_active: true,
      })

    if (!error) {
      // Reset form
      setSelectedFactionId('')
      setMembershipRole('')
      setMembershipTitle('')
      setIsPublic(true)
      setIsJoinModalOpen(false)
      loadMemberships()
      onMembershipsChange?.()
    }

    setSaving(false)
  }

  const handleRemoveMembership = async (membershipId: string) => {
    await supabase
      .from('faction_memberships')
      .delete()
      .eq('id', membershipId)

    loadMemberships()
    onMembershipsChange?.()
  }

  const handleEditClick = (membership: MembershipWithFaction) => {
    setEditingMembership(membership)
    setEditRole(membership.role || '')
    setEditTitle(membership.title || '')
    setEditIsPublic(membership.is_public)
  }

  const handleSaveEdit = async () => {
    if (!editingMembership) return
    setSaving(true)

    const { error } = await supabase
      .from('faction_memberships')
      .update({
        role: editRole || null,
        title: editTitle || null,
        is_public: editIsPublic,
      })
      .eq('id', editingMembership.id)

    if (!error) {
      setEditingMembership(null)
      loadMemberships()
      onMembershipsChange?.()
    }

    setSaving(false)
  }

  const handleCreateFaction = async () => {
    if (!createForm.name.trim()) return
    setSaving(true)

    // Create the faction
    const { data: faction, error: factionError } = await supabase
      .from('campaign_factions')
      .insert({
        campaign_id: campaignId,
        name: createForm.name.trim(),
        description: createForm.description.trim() || null,
        color: createForm.color,
        faction_type: createForm.faction_type,
      })
      .select()
      .single()

    if (!factionError && faction) {
      // Auto-join the character to this faction
      await supabase
        .from('faction_memberships')
        .insert({
          faction_id: faction.id,
          character_id: character.id,
          is_public: true,
          is_active: true,
        })

      // Reset form
      setCreateForm({
        name: '',
        description: '',
        color: '#8B5CF6',
        faction_type: 'guild',
      })
      setIsCreateModalOpen(false)
      loadMemberships()
      loadFactions()
      onMembershipsChange?.()
    }

    setSaving(false)
  }

  const handleManageClose = () => {
    setIsManageModalOpen(false)
    // Reload factions in case any were edited/deleted
    loadFactions()
    loadMemberships()
  }

  // Get factions this character isn't already a member of
  const joinableFactions = availableFactions.filter(
    f => !memberships.some(m => m.faction_id === f.id)
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <h3 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-wider flex items-center gap-2">
        <Shield className="w-4 h-4 text-[--arcane-gold]" />
        Factions
      </h3>

      {/* Memberships list */}
      {memberships.length === 0 ? (
        <div className="text-center py-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
          <Shield className="w-6 h-6 text-gray-600 mx-auto mb-1" />
          <p className="text-xs text-gray-400">Not a member of any faction</p>
        </div>
      ) : (
        <div className="space-y-2">
          {memberships.map(membership => (
            <div
              key={membership.id}
              className="group flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-all"
            >
              {/* Faction icon */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: membership.faction.color + '20' }}
              >
                <Shield
                  className="w-4 h-4"
                  style={{ color: membership.faction.color }}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="text-sm font-medium"
                    style={{ color: membership.faction.color }}
                  >
                    {membership.faction.name}
                  </span>
                  {!membership.is_public && (
                    <span title="Secret membership">
                      <EyeOff className="w-3 h-3 text-gray-500" />
                    </span>
                  )}
                </div>
                {(membership.role || membership.title) && (
                  <p className="text-xs text-gray-400">
                    {membership.title && <span className="font-medium">{membership.title}</span>}
                    {membership.title && membership.role && ' • '}
                    {membership.role}
                  </p>
                )}
              </div>

              {/* Action buttons - always visible */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleEditClick(membership)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                  title="Edit membership"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleRemoveMembership(membership.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  title="Leave faction"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons - 3 buttons at bottom */}
      <div className="flex gap-2">
        <button
          onClick={() => setIsJoinModalOpen(true)}
          className="flex-1 btn btn-secondary btn-sm justify-center"
        >
          <Plus className="w-4 h-4" />
          Join
        </button>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex-1 btn btn-secondary btn-sm justify-center"
        >
          <Plus className="w-4 h-4" />
          Create
        </button>
        <button
          onClick={() => setIsManageModalOpen(true)}
          className="flex-1 btn btn-secondary btn-sm justify-center"
        >
          <Settings className="w-4 h-4" />
          Manage
        </button>
      </div>

      {/* Join Faction Modal - Select from existing */}
      <Modal
        isOpen={isJoinModalOpen}
        onClose={() => {
          setIsJoinModalOpen(false)
          setSelectedFactionId('')
          setMembershipRole('')
          setMembershipTitle('')
          setIsPublic(true)
        }}
        title="Join Faction"
      >
        <div className="space-y-4">
          {/* Faction selection */}
          <div className="form-group">
            <label className="form-label">Select Faction</label>
            {joinableFactions.length === 0 ? (
              <p className="text-sm text-gray-400">
                {availableFactions.length === 0
                  ? "No factions exist yet. Create factions from the canvas toolbar."
                  : "Already a member of all factions."}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {joinableFactions.map(faction => (
                  <button
                    key={faction.id}
                    onClick={() => setSelectedFactionId(faction.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                      selectedFactionId === faction.id
                        ? "ring-2 ring-offset-2 ring-offset-[--bg-surface]"
                        : "hover:scale-105"
                    )}
                    style={{
                      backgroundColor: `${faction.color}20`,
                      color: faction.color,
                      border: `1px solid ${faction.color}40`,
                      '--tw-ring-color': faction.color,
                    } as React.CSSProperties}
                  >
                    <Shield className="w-4 h-4" />
                    {faction.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedFactionId && (
            <>
              {/* Role */}
              <div className="form-group">
                <label className="form-label">Role (optional)</label>
                <Input
                  value={membershipRole}
                  onChange={(e) => setMembershipRole(e.target.value)}
                  placeholder="e.g., Spy, Enforcer, Advisor..."
                  className="form-input"
                />
              </div>

              {/* Title */}
              <div className="form-group">
                <label className="form-label">Title (optional)</label>
                <Input
                  value={membershipTitle}
                  onChange={(e) => setMembershipTitle(e.target.value)}
                  placeholder="e.g., Guildmaster, Initiate, Captain..."
                  className="form-input"
                />
              </div>

              {/* Public/Secret toggle */}
              <div className="form-group">
                <label className="form-label">Visibility</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsPublic(true)}
                    className={cn(
                      "flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors",
                      isPublic
                        ? "bg-green-500/20 border-green-500 text-green-400"
                        : "bg-white/[0.03] border-white/[0.08] text-[--text-secondary] hover:bg-white/[0.05]"
                    )}
                  >
                    Public
                  </button>
                  <button
                    onClick={() => setIsPublic(false)}
                    className={cn(
                      "flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center justify-center gap-1.5",
                      !isPublic
                        ? "bg-purple-500/20 border-purple-500 text-purple-400"
                        : "bg-white/[0.03] border-white/[0.08] text-[--text-secondary] hover:bg-white/[0.05]"
                    )}
                  >
                    <EyeOff className="w-4 h-4" />
                    Secret
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Secret memberships aren't visible to players
                </p>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              className="btn btn-secondary"
              onClick={() => setIsJoinModalOpen(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                handleAddMembership()
                setIsJoinModalOpen(false)
              }}
              disabled={!selectedFactionId || saving}
            >
              {saving ? 'Joining...' : 'Join Faction'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Faction Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setCreateForm({
            name: '',
            description: '',
            color: '#8B5CF6',
            faction_type: 'guild',
          })
        }}
        title="Create New Faction"
      >
        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label">Faction Name</label>
            <Input
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder="e.g., The Silver Hand, Black Dagger Guild..."
              className="form-input"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <textarea
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              placeholder="What is this faction's purpose?"
              rows={2}
              className="form-textarea"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Type</label>
            <div className="flex flex-wrap gap-2">
              {FACTION_TYPES.map(type => (
                <button
                  key={type.value}
                  onClick={() => setCreateForm({ ...createForm, faction_type: type.value })}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                    createForm.faction_type === type.value
                      ? "bg-[--arcane-gold]/20 border-[--arcane-gold] text-[--arcane-gold]"
                      : "bg-white/[0.03] border-white/[0.08] text-[--text-secondary] hover:bg-white/[0.05]"
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Color</label>
            <ColorPicker
              value={createForm.color}
              onChange={(color) => setCreateForm({ ...createForm, color })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              className="btn btn-secondary"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCreateFaction}
              disabled={saving || !createForm.name.trim()}
            >
              {saving ? 'Creating...' : 'Create & Join'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Manage Factions Modal (FactionManager) */}
      <FactionManager
        campaignId={campaignId}
        characters={allCharacters}
        isOpen={isManageModalOpen}
        onClose={handleManageClose}
        onFactionsChange={onMembershipsChange}
      />

      {/* Edit Membership Modal */}
      <Modal
        isOpen={!!editingMembership}
        onClose={() => setEditingMembership(null)}
        title={`Edit ${editingMembership?.faction.name} Membership`}
      >
        <div className="space-y-4">
          {/* Role */}
          <div className="form-group">
            <label className="form-label">Role</label>
            <Input
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
              placeholder="e.g., Spy, Enforcer, Advisor..."
              className="form-input"
            />
          </div>

          {/* Title */}
          <div className="form-group">
            <label className="form-label">Title</label>
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="e.g., Guildmaster, Initiate, Captain..."
              className="form-input"
            />
          </div>

          {/* Public/Secret toggle */}
          <div className="form-group">
            <label className="form-label">Visibility</label>
            <div className="flex gap-2">
              <button
                onClick={() => setEditIsPublic(true)}
                className={cn(
                  "flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors",
                  editIsPublic
                    ? "bg-green-500/20 border-green-500 text-green-400"
                    : "bg-white/[0.03] border-white/[0.08] text-[--text-secondary] hover:bg-white/[0.05]"
                )}
              >
                Public
              </button>
              <button
                onClick={() => setEditIsPublic(false)}
                className={cn(
                  "flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center justify-center gap-1.5",
                  !editIsPublic
                    ? "bg-purple-500/20 border-purple-500 text-purple-400"
                    : "bg-white/[0.03] border-white/[0.08] text-[--text-secondary] hover:bg-white/[0.05]"
                )}
              >
                <EyeOff className="w-4 h-4" />
                Secret
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              className="btn btn-secondary"
              onClick={() => setEditingMembership(null)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSaveEdit}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
