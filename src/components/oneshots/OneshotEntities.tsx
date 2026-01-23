'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  Users,
  Swords,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  User,
  Target,
  Map,
  Link as LinkIcon,
} from 'lucide-react'
import { Modal, Input } from '@/components/ui'
import { toast } from 'sonner'
import { cn, getInitials } from '@/lib/utils'
import type { OneshotNpc, OneshotEncounter, OneshotLocation } from '@/types/database'

// ===== NPCs Component =====

interface OneshotNpcsProps {
  oneshotId: string
  className?: string
}

export function OneshotNpcs({ oneshotId, className }: OneshotNpcsProps) {
  const [npcs, setNpcs] = useState<OneshotNpc[]>([])
  const [loading, setLoading] = useState(true)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedNpc, setSelectedNpc] = useState<OneshotNpc | null>(null)
  const [saving, setSaving] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [form, setForm] = useState({
    name: '',
    description: '',
    appearance: '',
    personality: '',
    motivation: '',
    statBlock: '',
    externalLink: '',
  })

  useEffect(() => {
    loadNpcs()
  }, [oneshotId])

  const loadNpcs = async () => {
    try {
      const response = await fetch(`/api/oneshots/${oneshotId}/npcs`)
      const data = await response.json()
      if (response.ok) {
        setNpcs(data.npcs || [])
      }
    } catch (error) {
      console.error('Failed to load NPCs:', error)
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setSelectedNpc(null)
    setForm({
      name: '',
      description: '',
      appearance: '',
      personality: '',
      motivation: '',
      statBlock: '',
      externalLink: '',
    })
    setEditModalOpen(true)
  }

  const openEdit = (npc: OneshotNpc) => {
    setSelectedNpc(npc)
    setForm({
      name: npc.name,
      description: npc.description || '',
      appearance: npc.appearance || '',
      personality: npc.personality || '',
      motivation: npc.motivation || '',
      statBlock: npc.stat_block || '',
      externalLink: npc.external_link || '',
    })
    setEditModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/oneshots/${oneshotId}/npcs`, {
        method: selectedNpc ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedNpc ? {
          npcId: selectedNpc.id,
          ...form,
        } : form),
      })

      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || 'Failed to save NPC')
        return
      }

      toast.success(selectedNpc ? 'NPC updated!' : 'NPC created!')
      setEditModalOpen(false)
      loadNpcs()
    } catch (error) {
      console.error('Failed to save NPC:', error)
      toast.error('Failed to save NPC')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (npcId: string) => {
    if (!confirm('Delete this NPC?')) return

    try {
      const response = await fetch(`/api/oneshots/${oneshotId}/npcs?npcId=${npcId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        toast.error('Failed to delete NPC')
        return
      }

      toast.success('NPC deleted')
      loadNpcs()
    } catch (error) {
      console.error('Failed to delete NPC:', error)
      toast.error('Failed to delete NPC')
    }
  }

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedIds)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedIds(newExpanded)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-400" />
          <h3 className="font-medium text-white">NPCs</h3>
          <span className="text-xs text-gray-500">({npcs.length})</span>
        </div>
        <button onClick={openCreate} className="btn btn-sm btn-primary">
          <Plus className="w-3 h-3 mr-1" />
          Add NPC
        </button>
      </div>

      {/* List */}
      {npcs.length === 0 ? (
        <div className="text-center py-8 bg-white/[0.02] rounded-lg border border-[--border]">
          <User className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No NPCs yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {npcs.map(npc => (
            <div
              key={npc.id}
              className="bg-white/[0.02] border border-[--border] rounded-lg overflow-hidden"
            >
              <button
                onClick={() => toggleExpanded(npc.id)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/[0.02]"
              >
                {npc.image_url ? (
                  <Image
                    src={npc.image_url}
                    alt={npc.name}
                    width={40}
                    height={40}
                    className="rounded-lg"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center text-purple-400 font-medium text-sm">
                    {getInitials(npc.name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{npc.name}</p>
                  {npc.description && (
                    <p className="text-xs text-gray-500 truncate">{npc.description}</p>
                  )}
                </div>
                {expandedIds.has(npc.id) ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
              </button>

              {expandedIds.has(npc.id) && (
                <div className="px-3 pb-3 space-y-2 border-t border-[--border] pt-3">
                  {npc.appearance && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Appearance</p>
                      <p className="text-sm text-gray-300">{npc.appearance}</p>
                    </div>
                  )}
                  {npc.personality && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Personality</p>
                      <p className="text-sm text-gray-300">{npc.personality}</p>
                    </div>
                  )}
                  {npc.motivation && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Motivation</p>
                      <p className="text-sm text-gray-300">{npc.motivation}</p>
                    </div>
                  )}
                  {npc.stat_block && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Stat Block</p>
                      <p className="text-sm text-gray-300 font-mono whitespace-pre-wrap">{npc.stat_block}</p>
                    </div>
                  )}
                  {npc.external_link && (
                    <a
                      href={npc.external_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View stat block
                    </a>
                  )}
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => openEdit(npc)}
                      className="btn btn-sm btn-secondary"
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(npc.id)}
                      className="btn btn-sm btn-secondary text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={selectedNpc ? 'Edit NPC' : 'Add NPC'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label">Name *</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Bartender Tom"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Brief role description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Appearance</label>
              <textarea
                value={form.appearance}
                onChange={(e) => setForm({ ...form, appearance: e.target.value })}
                placeholder="What they look like..."
                rows={3}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Personality</label>
              <textarea
                value={form.personality}
                onChange={(e) => setForm({ ...form, personality: e.target.value })}
                placeholder="How they act..."
                rows={3}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Motivation</label>
            <textarea
              value={form.motivation}
              onChange={(e) => setForm({ ...form, motivation: e.target.value })}
              placeholder="What drives them..."
              rows={2}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Stat Block Reference</label>
            <textarea
              value={form.statBlock}
              onChange={(e) => setForm({ ...form, statBlock: e.target.value })}
              placeholder="Quick reference stats..."
              rows={3}
              className="form-input font-mono text-sm"
            />
          </div>

          <div className="form-group">
            <label className="form-label">External Link (D&D Beyond, etc.)</label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                value={form.externalLink}
                onChange={(e) => setForm({ ...form, externalLink: e.target.value })}
                placeholder="https://..."
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setEditModalOpen(false)}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="btn btn-primary flex-1"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ===== Encounters Component =====

interface OneshotEncountersProps {
  oneshotId: string
  className?: string
}

export function OneshotEncounters({ oneshotId, className }: OneshotEncountersProps) {
  const [encounters, setEncounters] = useState<OneshotEncounter[]>([])
  const [loading, setLoading] = useState(true)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedEncounter, setSelectedEncounter] = useState<OneshotEncounter | null>(null)
  const [saving, setSaving] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [form, setForm] = useState({
    name: '',
    description: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard' | 'deadly',
    tactics: '',
    terrain: '',
    rewards: '',
  })

  useEffect(() => {
    loadEncounters()
  }, [oneshotId])

  const loadEncounters = async () => {
    try {
      const response = await fetch(`/api/oneshots/${oneshotId}/encounters`)
      const data = await response.json()
      if (response.ok) {
        setEncounters(data.encounters || [])
      }
    } catch (error) {
      console.error('Failed to load encounters:', error)
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setSelectedEncounter(null)
    setForm({
      name: '',
      description: '',
      difficulty: 'medium',
      tactics: '',
      terrain: '',
      rewards: '',
    })
    setEditModalOpen(true)
  }

  const openEdit = (encounter: OneshotEncounter) => {
    setSelectedEncounter(encounter)
    setForm({
      name: encounter.name,
      description: encounter.description || '',
      difficulty: (encounter.difficulty as typeof form.difficulty) || 'medium',
      tactics: encounter.tactics || '',
      terrain: encounter.terrain || '',
      rewards: encounter.rewards || '',
    })
    setEditModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/oneshots/${oneshotId}/encounters`, {
        method: selectedEncounter ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedEncounter ? {
          encounterId: selectedEncounter.id,
          ...form,
        } : form),
      })

      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || 'Failed to save encounter')
        return
      }

      toast.success(selectedEncounter ? 'Encounter updated!' : 'Encounter created!')
      setEditModalOpen(false)
      loadEncounters()
    } catch (error) {
      console.error('Failed to save encounter:', error)
      toast.error('Failed to save encounter')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (encounterId: string) => {
    if (!confirm('Delete this encounter?')) return

    try {
      const response = await fetch(`/api/oneshots/${oneshotId}/encounters?encounterId=${encounterId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        toast.error('Failed to delete encounter')
        return
      }

      toast.success('Encounter deleted')
      loadEncounters()
    } catch (error) {
      console.error('Failed to delete encounter:', error)
      toast.error('Failed to delete encounter')
    }
  }

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedIds)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedIds(newExpanded)
  }

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'easy': return 'text-green-400 bg-green-500/10'
      case 'medium': return 'text-yellow-400 bg-yellow-500/10'
      case 'hard': return 'text-orange-400 bg-orange-500/10'
      case 'deadly': return 'text-red-400 bg-red-500/10'
      default: return 'text-gray-400 bg-gray-500/10'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Swords className="w-5 h-5 text-red-400" />
          <h3 className="font-medium text-white">Encounters</h3>
          <span className="text-xs text-gray-500">({encounters.length})</span>
        </div>
        <button onClick={openCreate} className="btn btn-sm btn-primary">
          <Plus className="w-3 h-3 mr-1" />
          Add Encounter
        </button>
      </div>

      {encounters.length === 0 ? (
        <div className="text-center py-8 bg-white/[0.02] rounded-lg border border-[--border]">
          <Target className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No encounters yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {encounters.map(encounter => (
            <div
              key={encounter.id}
              className="bg-white/[0.02] border border-[--border] rounded-lg overflow-hidden"
            >
              <button
                onClick={() => toggleExpanded(encounter.id)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/[0.02]"
              >
                <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center">
                  <Swords className="w-5 h-5 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white truncate">{encounter.name}</p>
                    <span className={cn(
                      "text-xs px-1.5 py-0.5 rounded capitalize",
                      getDifficultyColor(encounter.difficulty || 'medium')
                    )}>
                      {encounter.difficulty || 'medium'}
                    </span>
                  </div>
                  {encounter.description && (
                    <p className="text-xs text-gray-500 truncate">{encounter.description}</p>
                  )}
                </div>
                {expandedIds.has(encounter.id) ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
              </button>

              {expandedIds.has(encounter.id) && (
                <div className="px-3 pb-3 space-y-2 border-t border-[--border] pt-3">
                  {encounter.tactics && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Tactics</p>
                      <p className="text-sm text-gray-300">{encounter.tactics}</p>
                    </div>
                  )}
                  {encounter.terrain && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Terrain</p>
                      <p className="text-sm text-gray-300">{encounter.terrain}</p>
                    </div>
                  )}
                  {encounter.rewards && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Rewards</p>
                      <p className="text-sm text-gray-300">{encounter.rewards}</p>
                    </div>
                  )}
                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={() => openEdit(encounter)} className="btn btn-sm btn-secondary">
                      <Edit2 className="w-3 h-3 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(encounter.id)}
                      className="btn btn-sm btn-secondary text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={selectedEncounter ? 'Edit Encounter' : 'Add Encounter'}
        size="md"
      >
        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label">Name *</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Goblin Ambush"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What triggers this encounter..."
              rows={2}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Difficulty</label>
            <select
              value={form.difficulty}
              onChange={(e) => setForm({ ...form, difficulty: e.target.value as typeof form.difficulty })}
              className="form-input"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="deadly">Deadly</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Tactics</label>
            <textarea
              value={form.tactics}
              onChange={(e) => setForm({ ...form, tactics: e.target.value })}
              placeholder="How enemies behave..."
              rows={3}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Terrain</label>
            <textarea
              value={form.terrain}
              onChange={(e) => setForm({ ...form, terrain: e.target.value })}
              placeholder="Environmental factors..."
              rows={2}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Rewards</label>
            <textarea
              value={form.rewards}
              onChange={(e) => setForm({ ...form, rewards: e.target.value })}
              placeholder="Loot, XP, etc..."
              rows={2}
              className="form-input"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setEditModalOpen(false)} className="btn btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="btn btn-primary flex-1"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ===== Locations Component =====

interface OneshotLocationsProps {
  oneshotId: string
  className?: string
}

export function OneshotLocations({ oneshotId, className }: OneshotLocationsProps) {
  const [locations, setLocations] = useState<OneshotLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<OneshotLocation | null>(null)
  const [saving, setSaving] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [form, setForm] = useState({
    name: '',
    description: '',
    features: '',
  })

  useEffect(() => {
    loadLocations()
  }, [oneshotId])

  const loadLocations = async () => {
    try {
      const response = await fetch(`/api/oneshots/${oneshotId}/locations`)
      const data = await response.json()
      if (response.ok) {
        setLocations(data.locations || [])
      }
    } catch (error) {
      console.error('Failed to load locations:', error)
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setSelectedLocation(null)
    setForm({ name: '', description: '', features: '' })
    setEditModalOpen(true)
  }

  const openEdit = (location: OneshotLocation) => {
    setSelectedLocation(location)
    setForm({
      name: location.name,
      description: location.description || '',
      features: location.features || '',
    })
    setEditModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/oneshots/${oneshotId}/locations`, {
        method: selectedLocation ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedLocation ? {
          locationId: selectedLocation.id,
          ...form,
        } : form),
      })

      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || 'Failed to save location')
        return
      }

      toast.success(selectedLocation ? 'Location updated!' : 'Location created!')
      setEditModalOpen(false)
      loadLocations()
    } catch (error) {
      console.error('Failed to save location:', error)
      toast.error('Failed to save location')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (locationId: string) => {
    if (!confirm('Delete this location?')) return

    try {
      const response = await fetch(`/api/oneshots/${oneshotId}/locations?locationId=${locationId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        toast.error('Failed to delete location')
        return
      }

      toast.success('Location deleted')
      loadLocations()
    } catch (error) {
      console.error('Failed to delete location:', error)
      toast.error('Failed to delete location')
    }
  }

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedIds)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedIds(newExpanded)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-green-400" />
          <h3 className="font-medium text-white">Locations</h3>
          <span className="text-xs text-gray-500">({locations.length})</span>
        </div>
        <button onClick={openCreate} className="btn btn-sm btn-primary">
          <Plus className="w-3 h-3 mr-1" />
          Add Location
        </button>
      </div>

      {locations.length === 0 ? (
        <div className="text-center py-8 bg-white/[0.02] rounded-lg border border-[--border]">
          <Map className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No locations yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {locations.map(location => (
            <div
              key={location.id}
              className="bg-white/[0.02] border border-[--border] rounded-lg overflow-hidden"
            >
              <button
                onClick={() => toggleExpanded(location.id)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/[0.02]"
              >
                <div className="w-10 h-10 rounded-lg bg-green-600/20 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{location.name}</p>
                  {location.description && (
                    <p className="text-xs text-gray-500 truncate">{location.description}</p>
                  )}
                </div>
                {expandedIds.has(location.id) ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
              </button>

              {expandedIds.has(location.id) && (
                <div className="px-3 pb-3 space-y-2 border-t border-[--border] pt-3">
                  {location.features && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Features</p>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">{location.features}</p>
                    </div>
                  )}
                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={() => openEdit(location)} className="btn btn-sm btn-secondary">
                      <Edit2 className="w-3 h-3 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(location.id)}
                      className="btn btn-sm btn-secondary text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={selectedLocation ? 'Edit Location' : 'Add Location'}
        size="md"
      >
        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label">Name *</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., The Rusty Flask Inn"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What is this place..."
              rows={3}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Features</label>
            <textarea
              value={form.features}
              onChange={(e) => setForm({ ...form, features: e.target.value })}
              placeholder="Notable features, points of interest..."
              rows={4}
              className="form-input"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setEditModalOpen(false)} className="btn btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="btn btn-primary flex-1"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
