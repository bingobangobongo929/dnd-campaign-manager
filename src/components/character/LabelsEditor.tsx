'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Tag as TagIcon, Search } from 'lucide-react'
import { useSupabase } from '@/hooks'
import { cn, TAG_COLORS } from '@/lib/utils'
import { Input, Modal, ColorPicker, IconPicker, getGroupIcon } from '@/components/ui'
import type { Character, Tag, CharacterTag } from '@/types/database'

interface LabelWithTag extends CharacterTag {
  tag: Tag
}

interface LabelsEditorProps {
  character: Character
  campaignId: string
  onLabelsChange?: () => void
}

export function LabelsEditor({
  character,
  campaignId,
  onLabelsChange,
}: LabelsEditorProps) {
  const supabase = useSupabase()
  const [characterLabels, setCharacterLabels] = useState<LabelWithTag[]>([])
  const [availableLabels, setAvailableLabels] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isCreateMode, setIsCreateMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Create form state
  const [createForm, setCreateForm] = useState({
    name: '',
    color: TAG_COLORS[0].value as string,
    icon: 'star',
    description: '',
  })
  const [saving, setSaving] = useState(false)

  // Load labels for this character
  const loadCharacterLabels = useCallback(async () => {
    setLoading(true)

    const { data } = await supabase
      .from('character_tags')
      .select(`
        *,
        tag:tags(*)
      `)
      .eq('character_id', character.id)

    // Filter to only general (label) tags
    const labels = (data || []).filter(
      (ct: any) => ct.tag?.category === 'general'
    ) as LabelWithTag[]

    setCharacterLabels(labels)
    setLoading(false)
  }, [character.id, supabase])

  // Load available labels for the campaign
  const loadAvailableLabels = useCallback(async () => {
    const { data } = await supabase
      .from('tags')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('category', 'general')
      .eq('is_archived', false)
      .order('name')

    setAvailableLabels(data || [])
  }, [campaignId, supabase])

  useEffect(() => {
    loadCharacterLabels()
    loadAvailableLabels()
  }, [loadCharacterLabels, loadAvailableLabels])

  const handleAddLabel = async (tagId: string) => {
    setSaving(true)

    const { error } = await supabase
      .from('character_tags')
      .insert({
        character_id: character.id,
        tag_id: tagId,
      })

    if (!error) {
      loadCharacterLabels()
      onLabelsChange?.()
    }

    setSaving(false)
  }

  const handleRemoveLabel = async (characterTagId: string) => {
    await supabase
      .from('character_tags')
      .delete()
      .eq('id', characterTagId)

    loadCharacterLabels()
    onLabelsChange?.()
  }

  const handleCreateLabel = async () => {
    if (!createForm.name.trim()) return
    setSaving(true)

    // Create the tag
    const { data: tag, error: tagError } = await supabase
      .from('tags')
      .insert({
        campaign_id: campaignId,
        name: createForm.name.trim(),
        color: createForm.color,
        icon: createForm.icon,
        description: createForm.description.trim() || null,
        category: 'general',
      })
      .select()
      .single()

    if (!tagError && tag) {
      // Add to character
      await supabase
        .from('character_tags')
        .insert({
          character_id: character.id,
          tag_id: tag.id,
        })

      // Reset form
      setCreateForm({
        name: '',
        color: TAG_COLORS[0].value as string,
        icon: 'star',
        description: '',
      })
      setIsCreateMode(false)
      setIsAddModalOpen(false)
      loadCharacterLabels()
      loadAvailableLabels()
      onLabelsChange?.()
    }

    setSaving(false)
  }

  // Get labels not already on this character
  const unusedLabels = availableLabels.filter(
    label => !characterLabels.some(cl => cl.tag_id === label.id)
  )

  // Filter by search
  const filteredLabels = unusedLabels.filter(label =>
    label.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-wider flex items-center gap-2">
          <TagIcon className="w-4 h-4 text-blue-400" />
          Labels
        </h3>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="btn btn-secondary btn-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>

      {/* Labels list */}
      {characterLabels.length === 0 ? (
        <div className="text-center py-6 bg-white/[0.02] rounded-xl border border-white/[0.06]">
          <TagIcon className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No labels yet</p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn btn-secondary btn-sm mt-3"
          >
            <Plus className="w-3.5 h-3.5" />
            Add First Label
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {characterLabels.map(label => {
            const IconComponent = getGroupIcon(label.tag.icon)
            return (
              <div
                key={label.id}
                className="group flex items-center gap-2 px-3 py-1.5 rounded-full transition-all"
                style={{
                  backgroundColor: `${label.tag.color}20`,
                  border: `1px solid ${label.tag.color}40`,
                }}
              >
                <IconComponent
                  className="w-3.5 h-3.5"
                  style={{ color: label.tag.color }}
                />
                <span
                  className="text-sm font-medium"
                  style={{ color: label.tag.color }}
                >
                  {label.tag.name}
                </span>
                <button
                  onClick={() => handleRemoveLabel(label.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded-full hover:bg-red-500/20 transition-all"
                  title="Remove label"
                >
                  <Trash2 className="w-3 h-3 text-red-400" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Label Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false)
          setIsCreateMode(false)
          setSearchQuery('')
          setCreateForm({
            name: '',
            color: TAG_COLORS[0].value as string,
            icon: 'star',
            description: '',
          })
        }}
        title="Add Label"
      >
        <div className="space-y-4">
          {!isCreateMode ? (
            <>
              {/* Search */}
              {unusedLabels.length > 3 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    className="pl-10"
                    placeholder="Search labels..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              )}

              {/* Existing labels */}
              {filteredLabels.length > 0 ? (
                <div className="space-y-2">
                  <label className="form-label">Available Labels</label>
                  <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto">
                    {filteredLabels.map(label => {
                      const IconComponent = getGroupIcon(label.icon)
                      return (
                        <button
                          key={label.id}
                          onClick={() => {
                            handleAddLabel(label.id)
                            setIsAddModalOpen(false)
                          }}
                          disabled={saving}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
                          style={{
                            backgroundColor: `${label.color}20`,
                            color: label.color,
                            border: `1px solid ${label.color}40`,
                          }}
                        >
                          <IconComponent className="w-4 h-4" />
                          {label.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">
                  {unusedLabels.length === 0
                    ? "No more labels available. Create a new one below."
                    : "No labels match your search."}
                </p>
              )}

              <button
                className="btn btn-secondary w-full"
                onClick={() => setIsCreateMode(true)}
              >
                <Plus className="w-4 h-4" />
                Create New Label
              </button>
            </>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">Label Name</label>
                <Input
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g., Noble, Cursed, Quest Giver..."
                  className="form-input"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="What does this label represent?"
                  rows={2}
                  className="form-textarea"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Icon</label>
                <IconPicker
                  value={createForm.icon}
                  onChange={(icon) => setCreateForm({ ...createForm, icon })}
                  color={createForm.color}
                />
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
                  onClick={() => setIsCreateMode(false)}
                >
                  Back
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleCreateLabel}
                  disabled={saving || !createForm.name.trim()}
                >
                  {saving ? 'Creating...' : 'Create & Add'}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
