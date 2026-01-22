'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Tag as TagIcon, Search, Check, Settings } from 'lucide-react'
import { useSupabase } from '@/hooks'
import { cn, TAG_COLORS } from '@/lib/utils'
import { Input, Modal, ColorPicker, IconPicker, getGroupIcon } from '@/components/ui'
import { TagManager } from '@/components/campaign/TagManager'
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

  // Modal states - separate for Add, Create, Manage
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isManageModalOpen, setIsManageModalOpen] = useState(false)
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
      setIsCreateModalOpen(false)
      loadCharacterLabels()
      loadAvailableLabels()
      onLabelsChange?.()
    }

    setSaving(false)
  }

  const handleManageClose = () => {
    setIsManageModalOpen(false)
    // Reload labels in case any were edited/deleted
    loadAvailableLabels()
    loadCharacterLabels()
  }

  // Get labels not already on this character
  const unusedLabels = availableLabels.filter(
    label => !characterLabels.some(cl => cl.tag_id === label.id)
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <h3 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-wider flex items-center gap-2">
        <TagIcon className="w-4 h-4 text-blue-400" />
        Labels
      </h3>

      {/* Labels list */}
      {characterLabels.length === 0 ? (
        <div className="text-center py-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
          <TagIcon className="w-6 h-6 text-gray-600 mx-auto mb-1" />
          <p className="text-xs text-gray-400">No labels assigned</p>
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
                  className="p-0.5 rounded-full hover:bg-red-500/20 transition-all text-gray-400 hover:text-red-400"
                  title="Remove label"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Action Buttons - 3 buttons at bottom */}
      <div className="flex gap-2">
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex-1 btn btn-secondary btn-sm justify-center"
        >
          <Plus className="w-4 h-4" />
          Add
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

      {/* Add Label Modal - Select from existing */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false)
          setSearchQuery('')
        }}
        title="Add Label"
      >
        <div className="space-y-4">
          {/* Search */}
          {availableLabels.length > 3 && (
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

          {/* Available labels */}
          {availableLabels.length > 0 ? (
            <div className="space-y-2">
              <label className="form-label">Available Labels</label>
              <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto">
                {availableLabels
                  .filter(label => label.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(label => {
                    const IconComponent = getGroupIcon(label.icon)
                    const isAlreadyAdded = characterLabels.some(cl => cl.tag_id === label.id)
                    return (
                      <button
                        key={label.id}
                        onClick={() => {
                          if (!isAlreadyAdded) {
                            handleAddLabel(label.id)
                            setIsAddModalOpen(false)
                          }
                        }}
                        disabled={saving || isAlreadyAdded}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                          isAlreadyAdded
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:scale-105"
                        )}
                        style={{
                          backgroundColor: `${label.color}20`,
                          color: label.color,
                          border: `1px solid ${label.color}40`,
                        }}
                      >
                        {isAlreadyAdded ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <IconComponent className="w-4 h-4" />
                        )}
                        {label.name}
                      </button>
                    )
                  })}
              </div>
              {characterLabels.length > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  Labels with checkmark are already assigned
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <TagIcon className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No labels exist yet</p>
              <button
                className="btn btn-primary btn-sm mt-3"
                onClick={() => {
                  setIsAddModalOpen(false)
                  setIsCreateModalOpen(true)
                }}
              >
                <Plus className="w-4 h-4" />
                Create First Label
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Create Label Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setCreateForm({
            name: '',
            color: TAG_COLORS[0].value as string,
            icon: 'star',
            description: '',
          })
        }}
        title="Create New Label"
      >
        <div className="space-y-4">
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
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCreateLabel}
              disabled={saving || !createForm.name.trim()}
            >
              {saving ? 'Creating...' : 'Create & Assign'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Manage Labels Modal (TagManager) */}
      <TagManager
        campaignId={campaignId}
        isOpen={isManageModalOpen}
        onClose={handleManageClose}
        onTagsChange={onLabelsChange}
      />
    </div>
  )
}
