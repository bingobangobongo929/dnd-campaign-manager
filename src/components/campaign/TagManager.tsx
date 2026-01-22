'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X, Plus, Pencil, Archive, Trash2, ArchiveRestore,
  Tag as TagIcon, Shield, Search, AlertTriangle, Users
} from 'lucide-react'
import { Modal, Input, ColorPicker, IconPicker, getGroupIcon } from '@/components/ui'
import { useSupabase } from '@/hooks'
import { cn, TAG_COLORS } from '@/lib/utils'
import type { Tag } from '@/types/database'

interface TagWithUsage extends Tag {
  usage_count: number
}

interface TagManagerProps {
  campaignId: string
  isOpen: boolean
  onClose: () => void
  onTagsChange?: () => void
}

export function TagManager({ campaignId, isOpen, onClose, onTagsChange }: TagManagerProps) {
  const supabase = useSupabase()
  const [tags, setTags] = useState<TagWithUsage[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  // Edit modal state
  const [editingTag, setEditingTag] = useState<TagWithUsage | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    color: TAG_COLORS[0].value as string,
    icon: 'tag',
    description: '',
    category: 'general' as 'general' | 'faction' | 'relationship'
  })
  const [saving, setSaving] = useState(false)

  // Delete confirmation state
  const [deletingTag, setDeletingTag] = useState<TagWithUsage | null>(null)

  // Create modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    color: TAG_COLORS[0].value as string,
    icon: 'tag',
    description: '',
    category: 'general' as 'general' | 'faction' | 'relationship'
  })

  // Load tags with usage counts
  const loadTags = useCallback(async () => {
    setLoading(true)

    // Get all tags for this campaign
    const { data: tagsData } = await supabase
      .from('tags')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })

    if (!tagsData) {
      setTags([])
      setLoading(false)
      return
    }

    // Get usage counts for each tag
    const { data: usageCounts } = await supabase
      .from('character_tags')
      .select('tag_id')
      .in('tag_id', tagsData.map(t => t.id))

    const countMap = new Map<string, number>()
    usageCounts?.forEach(ct => {
      countMap.set(ct.tag_id, (countMap.get(ct.tag_id) || 0) + 1)
    })

    const tagsWithUsage: TagWithUsage[] = tagsData.map(tag => ({
      ...tag,
      usage_count: countMap.get(tag.id) || 0
    }))

    setTags(tagsWithUsage)
    setLoading(false)
  }, [campaignId, supabase])

  useEffect(() => {
    if (isOpen) {
      loadTags()
    }
  }, [isOpen, loadTags])

  // Filter tags based on search and archived state
  const filteredTags = tags.filter(tag => {
    const matchesSearch = tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tag.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesArchived = showArchived ? tag.is_archived : !tag.is_archived
    return matchesSearch && matchesArchived
  })

  // Group tags by category
  const factionTags = filteredTags.filter(t => t.category === 'faction')
  const relationshipTags = filteredTags.filter(t => t.category === 'relationship')
  const generalTags = filteredTags.filter(t => t.category === 'general')
  const archivedCount = tags.filter(t => t.is_archived).length

  const handleEditClick = (tag: TagWithUsage) => {
    setEditingTag(tag)
    setEditForm({
      name: tag.name,
      color: tag.color,
      icon: tag.icon || 'tag',
      description: tag.description || '',
      category: tag.category as 'general' | 'faction' | 'relationship'
    })
  }

  const handleSaveEdit = async () => {
    if (!editingTag || !editForm.name.trim()) return
    setSaving(true)

    const { error } = await supabase
      .from('tags')
      .update({
        name: editForm.name.trim(),
        color: editForm.color,
        icon: editForm.icon,
        description: editForm.description.trim() || null,
        category: editForm.category,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingTag.id)

    if (!error) {
      setTags(prev => prev.map(t =>
        t.id === editingTag.id
          ? { ...t, name: editForm.name, color: editForm.color, icon: editForm.icon, description: editForm.description, category: editForm.category }
          : t
      ))
      setEditingTag(null)
      onTagsChange?.()
    }

    setSaving(false)
  }

  const handleArchiveTag = async (tag: TagWithUsage) => {
    const { error } = await supabase
      .from('tags')
      .update({
        is_archived: !tag.is_archived,
        updated_at: new Date().toISOString()
      })
      .eq('id', tag.id)

    if (!error) {
      setTags(prev => prev.map(t =>
        t.id === tag.id ? { ...t, is_archived: !t.is_archived } : t
      ))
      onTagsChange?.()
    }
  }

  const handleDeleteTag = async () => {
    if (!deletingTag) return
    setSaving(true)

    // First delete all character_tags using this tag
    await supabase
      .from('character_tags')
      .delete()
      .eq('tag_id', deletingTag.id)

    // Then delete the tag itself
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', deletingTag.id)

    if (!error) {
      setTags(prev => prev.filter(t => t.id !== deletingTag.id))
      setDeletingTag(null)
      onTagsChange?.()
    }

    setSaving(false)
  }

  const handleCreateTag = async () => {
    if (!createForm.name.trim()) return
    setSaving(true)

    const { data, error } = await supabase
      .from('tags')
      .insert({
        campaign_id: campaignId,
        name: createForm.name.trim(),
        color: createForm.color,
        icon: createForm.icon,
        description: createForm.description.trim() || null,
        category: createForm.category,
        display_order: tags.length
      })
      .select()
      .single()

    if (!error && data) {
      setTags(prev => [...prev, { ...data, usage_count: 0 }])
      setCreateForm({ name: '', color: TAG_COLORS[0].value as string, icon: 'tag', description: '', category: 'general' })
      setIsCreateOpen(false)
      onTagsChange?.()
    }

    setSaving(false)
  }

  const renderTagCard = (tag: TagWithUsage) => {
    const IconComponent = getGroupIcon(tag.icon)
    return (
    <div
      key={tag.id}
      className={cn(
        "p-4 rounded-xl bg-white/[0.02] border transition-all",
        tag.is_archived
          ? "border-white/[0.03] opacity-60"
          : "border-white/[0.06] hover:border-white/[0.1]"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${tag.color}20` }}
        >
          <IconComponent className="w-5 h-5" style={{ color: tag.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-white truncate">{tag.name}</h3>
            <span
              className="text-xs px-1.5 py-0.5 rounded-full shrink-0"
              style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
            >
              {tag.category}
            </span>
          </div>
          {tag.description && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{tag.description}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            <Users className="w-3 h-3 inline mr-1" />
            {tag.usage_count} character{tag.usage_count !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => handleEditClick(tag)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors"
            title="Edit tag"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleArchiveTag(tag)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
            title={tag.is_archived ? "Restore tag" : "Archive tag"}
          >
            {tag.is_archived ? (
              <ArchiveRestore className="w-4 h-4" />
            ) : (
              <Archive className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => setDeletingTag(tag)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Delete tag"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )}

  const renderTagSection = (title: string, tagsList: TagWithUsage[], icon: React.ReactNode, emptyMessage: string) => {
    if (tagsList.length === 0) return null

    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          {icon}
          {title}
          <span className="text-xs font-normal text-gray-500">({tagsList.length})</span>
        </h3>
        <div className="space-y-2">
          {tagsList.map(renderTagCard)}
        </div>
      </div>
    )
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Manage Tags"
        description="Edit, archive, or delete campaign tags"
        size="lg"
      >
        <div className="space-y-4">
          {/* Search and Actions */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                className="pl-10"
                placeholder="Search tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="w-4 h-4" />
              New Tag
            </button>
          </div>

          {/* Archived toggle */}
          {archivedCount > 0 && (
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"
            >
              <Archive className="w-4 h-4" />
              {showArchived ? 'Hide' : 'Show'} archived ({archivedCount})
            </button>
          )}

          {/* Tags List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredTags.length === 0 ? (
            <div className="text-center py-12">
              <TagIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">
                {searchQuery ? 'No tags match your search' : 'No tags created yet'}
              </p>
              <button
                className="btn btn-secondary mt-4"
                onClick={() => setIsCreateOpen(true)}
              >
                <Plus className="w-4 h-4" />
                Create First Tag
              </button>
            </div>
          ) : (
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
              {renderTagSection(
                'Factions',
                factionTags,
                <Shield className="w-4 h-4 text-amber-400" />,
                'No faction tags'
              )}
              {renderTagSection(
                'Relationships',
                relationshipTags,
                <Users className="w-4 h-4 text-purple-400" />,
                'No relationship tags'
              )}
              {renderTagSection(
                'General',
                generalTags,
                <TagIcon className="w-4 h-4 text-blue-400" />,
                'No general tags'
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Edit Tag Modal */}
      <Modal
        isOpen={!!editingTag}
        onClose={() => setEditingTag(null)}
        title="Edit Tag"
        size="md"
      >
        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label">Tag Name</label>
            <Input
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              placeholder="Tag name..."
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              placeholder="What does this tag represent?"
              rows={2}
              className="form-textarea"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Category</label>
            <div className="flex gap-2">
              {(['general', 'faction', 'relationship'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setEditForm({ ...editForm, category: cat })}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize",
                    editForm.category === cat
                      ? "bg-purple-500/20 text-purple-400 border border-purple-500/40"
                      : "bg-white/[0.02] text-gray-400 border border-white/[0.06] hover:border-white/[0.1]"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Icon</label>
            <IconPicker
              value={editForm.icon}
              onChange={(icon) => setEditForm({ ...editForm, icon })}
              color={editForm.color}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Color</label>
            <ColorPicker
              value={editForm.color}
              onChange={(color) => setEditForm({ ...editForm, color })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              className="btn btn-secondary"
              onClick={() => setEditingTag(null)}
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
        </div>
      </Modal>

      {/* Create Tag Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false)
          setCreateForm({ name: '', color: TAG_COLORS[0].value as string, icon: 'tag', description: '', category: 'general' })
        }}
        title="Create Tag"
        size="md"
      >
        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label">Tag Name</label>
            <Input
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder="e.g., Ally, Enemy, Noble House..."
              className="form-input"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              placeholder="What does this tag represent?"
              rows={2}
              className="form-textarea"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Category</label>
            <div className="flex gap-2">
              {(['general', 'faction', 'relationship'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setCreateForm({ ...createForm, category: cat })}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize",
                    createForm.category === cat
                      ? "bg-purple-500/20 text-purple-400 border border-purple-500/40"
                      : "bg-white/[0.02] text-gray-400 border border-white/[0.06] hover:border-white/[0.1]"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
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
              onClick={() => {
                setIsCreateOpen(false)
                setCreateForm({ name: '', color: TAG_COLORS[0].value as string, icon: 'tag', description: '', category: 'general' })
              }}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCreateTag}
              disabled={saving || !createForm.name.trim()}
            >
              {saving ? 'Creating...' : 'Create Tag'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingTag}
        onClose={() => setDeletingTag(null)}
        title="Delete Tag"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-white font-medium">
                Are you sure you want to delete "{deletingTag?.name}"?
              </p>
              <p className="text-xs text-gray-400 mt-1">
                This will remove the tag from {deletingTag?.usage_count || 0} character{deletingTag?.usage_count !== 1 ? 's' : ''}.
                This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              className="btn btn-secondary"
              onClick={() => setDeletingTag(null)}
            >
              Cancel
            </button>
            <button
              className="btn bg-red-600 hover:bg-red-500 text-white"
              onClick={handleDeleteTag}
              disabled={saving}
            >
              {saving ? 'Deleting...' : 'Delete Tag'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
