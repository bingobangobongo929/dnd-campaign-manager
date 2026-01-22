'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X, Plus, Pencil, Trash2, Users, Shield, Search,
  AlertTriangle, Building2, ChevronRight, ChevronDown,
  Crown, Swords, Book, Coins, Church, Skull, GraduationCap, HelpCircle
} from 'lucide-react'
import { Modal, Input, ColorPicker } from '@/components/ui'
import { useSupabase } from '@/hooks'
import { cn } from '@/lib/utils'
import type { CampaignFaction, FactionMembership, Character, FactionType, FactionStatus } from '@/types/database'

interface FactionWithMembers extends CampaignFaction {
  members: (FactionMembership & { character: Character })[]
  child_factions: CampaignFaction[]
}

interface FactionManagerProps {
  campaignId: string
  characters: Character[]
  isOpen: boolean
  onClose: () => void
  onFactionsChange?: () => void
}

const FACTION_TYPES: { value: FactionType; label: string; icon: React.ReactNode }[] = [
  { value: 'guild', label: 'Guild', icon: <Users className="w-4 h-4" /> },
  { value: 'kingdom', label: 'Kingdom', icon: <Crown className="w-4 h-4" /> },
  { value: 'military', label: 'Military', icon: <Swords className="w-4 h-4" /> },
  { value: 'criminal', label: 'Criminal', icon: <Skull className="w-4 h-4" /> },
  { value: 'religious', label: 'Religious', icon: <Church className="w-4 h-4" /> },
  { value: 'merchant', label: 'Merchant', icon: <Coins className="w-4 h-4" /> },
  { value: 'academic', label: 'Academic', icon: <GraduationCap className="w-4 h-4" /> },
  { value: 'family', label: 'Family', icon: <Users className="w-4 h-4" /> },
  { value: 'cult', label: 'Cult', icon: <Book className="w-4 h-4" /> },
  { value: 'other', label: 'Other', icon: <HelpCircle className="w-4 h-4" /> },
]

const FACTION_STATUSES: { value: FactionStatus; label: string; color: string }[] = [
  { value: 'active', label: 'Active', color: '#10B981' },
  { value: 'secret', label: 'Secret', color: '#8B5CF6' },
  { value: 'disbanded', label: 'Disbanded', color: '#6B7280' },
  { value: 'destroyed', label: 'Destroyed', color: '#EF4444' },
]

export function FactionManager({ campaignId, characters, isOpen, onClose, onFactionsChange }: FactionManagerProps) {
  const supabase = useSupabase()
  const [factions, setFactions] = useState<FactionWithMembers[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedFactions, setExpandedFactions] = useState<Set<string>>(new Set())

  // Create modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    color: '#8B5CF6',
    faction_type: 'guild' as FactionType,
    status: 'active' as FactionStatus,
    parent_faction_id: null as string | null,
    is_known_to_party: true,
  })

  // Edit modal state
  const [editingFaction, setEditingFaction] = useState<FactionWithMembers | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    color: '#8B5CF6',
    faction_type: 'guild' as FactionType,
    status: 'active' as FactionStatus,
    parent_faction_id: null as string | null,
    is_known_to_party: true,
  })

  // Add member modal state
  const [addingMemberToFaction, setAddingMemberToFaction] = useState<FactionWithMembers | null>(null)
  const [memberForm, setMemberForm] = useState({
    character_id: '',
    role: '',
    title: '',
  })

  // Delete confirmation
  const [deletingFaction, setDeletingFaction] = useState<FactionWithMembers | null>(null)
  const [saving, setSaving] = useState(false)

  // Load factions with members
  const loadFactions = useCallback(async () => {
    setLoading(true)

    // Get all factions for this campaign
    const { data: factionsData } = await supabase
      .from('campaign_factions')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })

    if (!factionsData) {
      setFactions([])
      setLoading(false)
      return
    }

    // Get memberships with character data
    const { data: membershipsData } = await supabase
      .from('faction_memberships')
      .select(`
        *,
        character:characters(*)
      `)
      .in('faction_id', factionsData.map(f => f.id))

    // Build faction tree
    const factionsWithMembers: FactionWithMembers[] = factionsData.map(faction => ({
      ...faction,
      members: (membershipsData?.filter(m => m.faction_id === faction.id) || []) as (FactionMembership & { character: Character })[],
      child_factions: factionsData.filter(f => f.parent_faction_id === faction.id),
    }))

    setFactions(factionsWithMembers)
    setLoading(false)
  }, [campaignId, supabase])

  useEffect(() => {
    if (isOpen) {
      loadFactions()
    }
  }, [isOpen, loadFactions])

  // Filter factions based on search
  const filteredFactions = factions.filter(faction =>
    faction.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faction.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Get root factions (no parent)
  const rootFactions = filteredFactions.filter(f => !f.parent_faction_id)

  const toggleExpanded = (factionId: string) => {
    setExpandedFactions(prev => {
      const next = new Set(prev)
      if (next.has(factionId)) {
        next.delete(factionId)
      } else {
        next.add(factionId)
      }
      return next
    })
  }

  const handleCreateFaction = async () => {
    if (!createForm.name.trim()) return
    setSaving(true)

    const { data, error } = await supabase
      .from('campaign_factions')
      .insert({
        campaign_id: campaignId,
        name: createForm.name.trim(),
        description: createForm.description.trim() || null,
        color: createForm.color,
        faction_type: createForm.faction_type,
        status: createForm.status,
        parent_faction_id: createForm.parent_faction_id,
        is_known_to_party: createForm.is_known_to_party,
        display_order: factions.length,
      })
      .select()
      .single()

    if (!error && data) {
      await loadFactions()
      setCreateForm({
        name: '',
        description: '',
        color: '#8B5CF6',
        faction_type: 'guild',
        status: 'active',
        parent_faction_id: null,
        is_known_to_party: true,
      })
      setIsCreateOpen(false)
      onFactionsChange?.()
    }

    setSaving(false)
  }

  const handleEditClick = (faction: FactionWithMembers) => {
    setEditingFaction(faction)
    setEditForm({
      name: faction.name,
      description: faction.description || '',
      color: faction.color,
      faction_type: faction.faction_type,
      status: faction.status,
      parent_faction_id: faction.parent_faction_id,
      is_known_to_party: faction.is_known_to_party,
    })
  }

  const handleSaveEdit = async () => {
    if (!editingFaction || !editForm.name.trim()) return
    setSaving(true)

    const { error } = await supabase
      .from('campaign_factions')
      .update({
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        color: editForm.color,
        faction_type: editForm.faction_type,
        status: editForm.status,
        parent_faction_id: editForm.parent_faction_id,
        is_known_to_party: editForm.is_known_to_party,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingFaction.id)

    if (!error) {
      await loadFactions()
      setEditingFaction(null)
      onFactionsChange?.()
    }

    setSaving(false)
  }

  const handleDeleteFaction = async () => {
    if (!deletingFaction) return
    setSaving(true)

    // Delete all memberships first
    await supabase
      .from('faction_memberships')
      .delete()
      .eq('faction_id', deletingFaction.id)

    // Delete the faction
    const { error } = await supabase
      .from('campaign_factions')
      .delete()
      .eq('id', deletingFaction.id)

    if (!error) {
      await loadFactions()
      setDeletingFaction(null)
      onFactionsChange?.()
    }

    setSaving(false)
  }

  const handleAddMember = async () => {
    if (!addingMemberToFaction || !memberForm.character_id) return
    setSaving(true)

    const { error } = await supabase
      .from('faction_memberships')
      .insert({
        faction_id: addingMemberToFaction.id,
        character_id: memberForm.character_id,
        role: memberForm.role.trim() || null,
        title: memberForm.title.trim() || null,
      })

    if (!error) {
      await loadFactions()
      setMemberForm({ character_id: '', role: '', title: '' })
      setAddingMemberToFaction(null)
      onFactionsChange?.()
    }

    setSaving(false)
  }

  const handleRemoveMember = async (membershipId: string) => {
    const { error } = await supabase
      .from('faction_memberships')
      .delete()
      .eq('id', membershipId)

    if (!error) {
      await loadFactions()
      onFactionsChange?.()
    }
  }

  const getFactionTypeIcon = (type: FactionType) => {
    const typeConfig = FACTION_TYPES.find(t => t.value === type)
    return typeConfig?.icon || <Shield className="w-4 h-4" />
  }

  const getStatusConfig = (status: FactionStatus) => {
    return FACTION_STATUSES.find(s => s.value === status) || FACTION_STATUSES[0]
  }

  // Get characters not already in the faction
  const getAvailableCharacters = (faction: FactionWithMembers) => {
    const memberIds = new Set(faction.members.map(m => m.character_id))
    return characters.filter(c => !memberIds.has(c.id))
  }

  const renderFactionCard = (faction: FactionWithMembers, depth = 0) => {
    const hasChildren = faction.child_factions.length > 0
    const isExpanded = expandedFactions.has(faction.id)
    const statusConfig = getStatusConfig(faction.status)

    return (
      <div key={faction.id} className={cn("space-y-2", depth > 0 && "ml-6")}>
        <div
          className={cn(
            "p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] transition-all hover:border-white/[0.1]",
            depth > 0 && "border-l-2"
          )}
          style={depth > 0 ? { borderLeftColor: faction.color } : undefined}
        >
          <div className="flex items-start gap-3">
            {/* Expand toggle for factions with children */}
            {hasChildren ? (
              <button
                onClick={() => toggleExpanded(faction.id)}
                className="p-1 rounded hover:bg-white/[0.05] transition-colors mt-0.5"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </button>
            ) : (
              <div className="w-6" />
            )}

            {/* Faction icon */}
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${faction.color}20` }}
            >
              <div style={{ color: faction.color }}>
                {getFactionTypeIcon(faction.faction_type)}
              </div>
            </div>

            {/* Faction info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-medium text-white">{faction.name}</h3>
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full capitalize"
                  style={{ backgroundColor: `${statusConfig.color}20`, color: statusConfig.color }}
                >
                  {faction.status}
                </span>
                {!faction.is_known_to_party && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-500/20 text-gray-400">
                    Hidden from party
                  </span>
                )}
              </div>
              {faction.description && (
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{faction.description}</p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                <span className="capitalize">{faction.faction_type}</span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {faction.members.length} member{faction.members.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setAddingMemberToFaction(faction)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-green-400 hover:bg-green-500/10 transition-colors"
                title="Add member"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleEditClick(faction)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors"
                title="Edit faction"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDeletingFaction(faction)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Delete faction"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Members list */}
          {faction.members.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/[0.06]">
              <div className="flex flex-wrap gap-2">
                {faction.members.map(member => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/[0.03] text-xs group"
                  >
                    <span className="text-white">{member.character.name}</span>
                    {member.title && (
                      <span className="text-gray-500">({member.title})</span>
                    )}
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Render children if expanded */}
        {hasChildren && isExpanded && (
          <div className="space-y-2">
            {faction.child_factions.map(child => {
              const childWithMembers = factions.find(f => f.id === child.id)
              if (childWithMembers) {
                return renderFactionCard(childWithMembers, depth + 1)
              }
              return null
            })}
          </div>
        )}
      </div>
    )
  }

  const renderFactionForm = (
    form: typeof createForm | typeof editForm,
    setForm: typeof setCreateForm | typeof setEditForm,
    excludeFactionId?: string
  ) => (
    <div className="space-y-4">
      <div className="form-group">
        <label className="form-label">Faction Name</label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g., The Silver Hand"
          className="form-input"
          autoFocus
        />
      </div>

      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Brief description of the faction..."
          rows={2}
          className="form-textarea"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="form-group">
          <label className="form-label">Type</label>
          <select
            value={form.faction_type}
            onChange={(e) => setForm({ ...form, faction_type: e.target.value as FactionType })}
            className="form-input"
          >
            {FACTION_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as FactionStatus })}
            className="form-input"
          >
            {FACTION_STATUSES.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Parent Faction (optional)</label>
        <select
          value={form.parent_faction_id || ''}
          onChange={(e) => setForm({ ...form, parent_faction_id: e.target.value || null })}
          className="form-input"
        >
          <option value="">None (root faction)</option>
          {factions
            .filter(f => f.id !== excludeFactionId)
            .map(faction => (
              <option key={faction.id} value={faction.id}>{faction.name}</option>
            ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Color</label>
        <ColorPicker
          value={form.color}
          onChange={(color) => setForm({ ...form, color })}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_known_to_party"
          checked={form.is_known_to_party}
          onChange={(e) => setForm({ ...form, is_known_to_party: e.target.checked })}
          className="rounded border-gray-600 bg-white/[0.05] text-purple-500 focus:ring-purple-500"
        />
        <label htmlFor="is_known_to_party" className="text-sm text-gray-300">
          Known to the party
        </label>
      </div>
    </div>
  )

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Manage Factions"
        description="Create and organize factions for your campaign"
        size="lg"
      >
        <div className="space-y-4">
          {/* Search and Actions */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                className="pl-10"
                placeholder="Search factions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="w-4 h-4" />
              New Faction
            </button>
          </div>

          {/* Factions List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : rootFactions.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">
                {searchQuery ? 'No factions match your search' : 'No factions created yet'}
              </p>
              <button
                className="btn btn-secondary mt-4"
                onClick={() => setIsCreateOpen(true)}
              >
                <Plus className="w-4 h-4" />
                Create First Faction
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {rootFactions.map(faction => renderFactionCard(faction))}
            </div>
          )}
        </div>
      </Modal>

      {/* Create Faction Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false)
          setCreateForm({
            name: '',
            description: '',
            color: '#8B5CF6',
            faction_type: 'guild',
            status: 'active',
            parent_faction_id: null,
            is_known_to_party: true,
          })
        }}
        title="Create Faction"
        size="md"
      >
        {renderFactionForm(createForm, setCreateForm)}
        <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-white/[0.06]">
          <button
            className="btn btn-secondary"
            onClick={() => setIsCreateOpen(false)}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleCreateFaction}
            disabled={saving || !createForm.name.trim()}
          >
            {saving ? 'Creating...' : 'Create Faction'}
          </button>
        </div>
      </Modal>

      {/* Edit Faction Modal */}
      <Modal
        isOpen={!!editingFaction}
        onClose={() => setEditingFaction(null)}
        title="Edit Faction"
        size="md"
      >
        {renderFactionForm(editForm, setEditForm, editingFaction?.id)}
        <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-white/[0.06]">
          <button
            className="btn btn-secondary"
            onClick={() => setEditingFaction(null)}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSaveEdit}
            disabled={saving || !editForm.name.trim()}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </Modal>

      {/* Add Member Modal */}
      <Modal
        isOpen={!!addingMemberToFaction}
        onClose={() => {
          setAddingMemberToFaction(null)
          setMemberForm({ character_id: '', role: '', title: '' })
        }}
        title={`Add Member to ${addingMemberToFaction?.name || 'Faction'}`}
        size="sm"
      >
        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label">Character</label>
            <select
              value={memberForm.character_id}
              onChange={(e) => setMemberForm({ ...memberForm, character_id: e.target.value })}
              className="form-input"
            >
              <option value="">Select a character...</option>
              {addingMemberToFaction && getAvailableCharacters(addingMemberToFaction).map(char => (
                <option key={char.id} value={char.id}>
                  {char.name} ({char.type.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Title (optional)</label>
            <Input
              value={memberForm.title}
              onChange={(e) => setMemberForm({ ...memberForm, title: e.target.value })}
              placeholder="e.g., Guildmaster, Knight, Initiate..."
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Role (optional)</label>
            <Input
              value={memberForm.role}
              onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
              placeholder="e.g., Leader, Member, Spy..."
              className="form-input"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              className="btn btn-secondary"
              onClick={() => {
                setAddingMemberToFaction(null)
                setMemberForm({ character_id: '', role: '', title: '' })
              }}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleAddMember}
              disabled={saving || !memberForm.character_id}
            >
              {saving ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingFaction}
        onClose={() => setDeletingFaction(null)}
        title="Delete Faction"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-white font-medium">
                Are you sure you want to delete "{deletingFaction?.name}"?
              </p>
              <p className="text-xs text-gray-400 mt-1">
                This will also remove {deletingFaction?.members.length || 0} member{deletingFaction?.members.length !== 1 ? 's' : ''} from this faction.
                This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              className="btn btn-secondary"
              onClick={() => setDeletingFaction(null)}
            >
              Cancel
            </button>
            <button
              className="btn bg-red-600 hover:bg-red-500 text-white"
              onClick={handleDeleteFaction}
              disabled={saving}
            >
              {saving ? 'Deleting...' : 'Delete Faction'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
