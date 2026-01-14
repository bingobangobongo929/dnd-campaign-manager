'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Plus, FolderPlus, Scaling, Trash2, Brain } from 'lucide-react'
import { Modal, Input, ColorPicker, IconPicker, getGroupIcon } from '@/components/ui'
import { CampaignCanvas, ResizeToolbar, DEFAULT_CARD_WIDTH, DEFAULT_CARD_HEIGHT } from '@/components/canvas'
import { CharacterModal, CharacterViewModal } from '@/components/character'
import { AppLayout } from '@/components/layout/app-layout'
import { useSupabase, useUser } from '@/hooks'
import { useAppStore } from '@/store'
import type { Campaign, Character, Tag, CharacterTag, CanvasGroup } from '@/types/database'

// Type for undo history
interface UndoAction {
  type: 'delete'
  characters: Character[]
  groups: CanvasGroup[]
  characterTags: Map<string, (CharacterTag & { tag: Tag; related_character?: Character | null })[]>
}

export default function CampaignCanvasPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()
  const { selectedCharacterId, setSelectedCharacterId, aiEnabled } = useAppStore()

  const campaignId = params.id as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [characterTags, setCharacterTags] = useState<Map<string, (CharacterTag & { tag: Tag; related_character?: Character | null })[]>>(new Map())
  const [groups, setGroups] = useState<CanvasGroup[]>([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [isCreateCharacterModalOpen, setIsCreateCharacterModalOpen] = useState(false)
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false)
  const [isResizeToolbarOpen, setIsResizeToolbarOpen] = useState(false)
  const [viewingCharacterId, setViewingCharacterId] = useState<string | null>(null)
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null)
  const [groupForm, setGroupForm] = useState({ name: '', color: '#8B5CF6', icon: 'users' })
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editGroupForm, setEditGroupForm] = useState({ name: '', color: '#8B5CF6', icon: 'users' })
  const [saving, setSaving] = useState(false)

  // Character size overrides from resize toolbar
  const [characterSizeOverrides, setCharacterSizeOverrides] = useState<Map<string, { width: number; height: number }>>(new Map())

  // Multi-select and deletion state
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([])
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<{ characterIds: string[]; groupIds: string[] } | null>(null)
  const [undoStack, setUndoStack] = useState<UndoAction[]>([])
  const MAX_UNDO_STACK = 10

  // Load campaign data
  useEffect(() => {
    if (user && campaignId) {
      loadCampaignData()
    }
  }, [user, campaignId])

  const loadCampaignData = async () => {
    setLoading(true)

    // Load campaign
    const { data: campaignData } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (!campaignData) {
      router.push('/campaigns')
      return
    }
    setCampaign(campaignData)

    // Load characters
    const { data: charactersData } = await supabase
      .from('characters')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('name')

    const loadedCharacters: Character[] = charactersData || []
    setCharacters(loadedCharacters)

    // Load character tags with related data
    const characterIds = loadedCharacters.map(c => c.id)
    const { data: tagsData } = characterIds.length > 0
      ? await supabase
          .from('character_tags')
          .select(`
            *,
            tag:tags(*),
            related_character:characters!character_tags_related_character_id_fkey(*)
          `)
          .in('character_id', characterIds)
      : { data: null }

    // Group tags by character
    type TagWithRelations = CharacterTag & { tag: Tag; related_character?: Character | null }
    const tagMap = new Map<string, TagWithRelations[]>()
    const loadedTags = (tagsData || []) as TagWithRelations[]
    for (const tag of loadedTags) {
      const existing = tagMap.get(tag.character_id) || []
      existing.push(tag)
      tagMap.set(tag.character_id, existing)
    }
    setCharacterTags(tagMap)

    // Load groups
    const { data: groupsData } = await supabase
      .from('canvas_groups')
      .select('*')
      .eq('campaign_id', campaignId)

    setGroups(groupsData || [])

    setLoading(false)
  }

  const handleCharacterPreview = useCallback((id: string) => {
    setSelectedCharacterId(id)
    setViewingCharacterId(id)
  }, [setSelectedCharacterId])

  const handleCharacterEdit = useCallback((id: string) => {
    setSelectedCharacterId(id)
    setViewingCharacterId(null)
    setEditingCharacterId(id)
  }, [setSelectedCharacterId])

  const handleCharacterPositionChange = useCallback(async (id: string, x: number, y: number) => {
    // Update local state
    setCharacters(prev => prev.map(c =>
      c.id === id ? { ...c, position_x: x, position_y: y } : c
    ))

    // Persist to database
    await supabase
      .from('characters')
      .update({ position_x: x, position_y: y })
      .eq('id', id)
  }, [supabase])

  // Handle individual card resize (from hover icon)
  const handleCharacterSizeChange = useCallback(async (id: string, width: number, height: number) => {
    // Update local state
    setCharacters(prev => prev.map(c =>
      c.id === id ? { ...c, canvas_width: width, canvas_height: height } : c
    ))

    // Persist to database
    await supabase
      .from('characters')
      .update({ canvas_width: width, canvas_height: height })
      .eq('id', id)
  }, [supabase])

  // Handle batch resize from toolbar - updates state for live preview
  // width/height can be null to indicate "don't change this dimension"
  const handleBatchResize = useCallback((characterIds: string[], width: number | null, height: number | null) => {
    setCharacterSizeOverrides(prev => {
      const newOverrides = new Map(prev)
      for (const id of characterIds) {
        const existing = prev.get(id)
        const char = characters.find(c => c.id === id)
        // Use new value if provided, otherwise keep existing override or fall back to character's current value
        const newWidth = width ?? existing?.width ?? char?.canvas_width ?? DEFAULT_CARD_WIDTH
        const newHeight = height ?? existing?.height ?? char?.canvas_height ?? DEFAULT_CARD_HEIGHT
        newOverrides.set(id, { width: newWidth, height: newHeight })
      }
      return newOverrides
    })
  }, [characters])

  // Save sizes to database when toolbar closes
  const handleResizeToolbarClose = useCallback(async () => {
    // Save all overrides to database
    const savePromises = Array.from(characterSizeOverrides.entries()).map(([id, size]) =>
      supabase
        .from('characters')
        .update({ canvas_width: size.width, canvas_height: size.height })
        .eq('id', id)
    )
    await Promise.all(savePromises)

    // Update local characters state with new sizes
    setCharacters(prev => prev.map(c => {
      const override = characterSizeOverrides.get(c.id)
      if (override) {
        return { ...c, canvas_width: override.width, canvas_height: override.height }
      }
      return c
    }))

    // Clear overrides and close toolbar
    setCharacterSizeOverrides(new Map())
    setIsResizeToolbarOpen(false)
  }, [characterSizeOverrides, supabase])

  const handleGroupUpdate = useCallback(async (id: string, updates: Partial<CanvasGroup>) => {
    setGroups(prev => prev.map(g =>
      g.id === id ? { ...g, ...updates } : g
    ))

    await supabase
      .from('canvas_groups')
      .update(updates)
      .eq('id', id)
  }, [supabase])

  const handleGroupDelete = useCallback(async (id: string) => {
    setGroups(prev => prev.filter(g => g.id !== id))

    await supabase
      .from('canvas_groups')
      .delete()
      .eq('id', id)
  }, [supabase])

  const handleGroupEdit = useCallback((id: string) => {
    const group = groups.find(g => g.id === id)
    if (group) {
      setEditGroupForm({
        name: group.name,
        color: group.color || '#8B5CF6',
        icon: group.icon || 'users',
      })
      setEditingGroupId(id)
    }
  }, [groups])

  const handleUpdateGroup = async () => {
    if (!editGroupForm.name.trim() || !editingGroupId) return

    setSaving(true)

    const { data } = await supabase
      .from('canvas_groups')
      .update({
        name: editGroupForm.name,
        color: editGroupForm.color,
        icon: editGroupForm.icon,
      })
      .eq('id', editingGroupId)
      .select()
      .single()

    if (data) {
      setGroups(prev => prev.map(g => g.id === editingGroupId ? data : g))
      setEditingGroupId(null)
      setEditGroupForm({ name: '', color: '#8B5CF6', icon: 'users' })
    }

    setSaving(false)
  }

  const handleGroupPositionChange = useCallback(async (id: string, x: number, y: number) => {
    setGroups(prev => prev.map(g =>
      g.id === id ? { ...g, position_x: x, position_y: y } : g
    ))

    await supabase
      .from('canvas_groups')
      .update({ position_x: x, position_y: y })
      .eq('id', id)
  }, [supabase])

  // Handle character creation from CharacterModal in create mode
  const handleCharacterCreate = useCallback((newCharacter: Character) => {
    setCharacters(prev => [...prev, newCharacter])
    setSelectedCharacterId(newCharacter.id)
  }, [setSelectedCharacterId])

  const handleCloseCreateCharacterModal = useCallback(() => {
    setIsCreateCharacterModalOpen(false)
    setSelectedCharacterId(null)
  }, [setSelectedCharacterId])

  const handleCreateGroup = async () => {
    if (!groupForm.name.trim()) return

    setSaving(true)

    const { data } = await supabase
      .from('canvas_groups')
      .insert({
        campaign_id: campaignId,
        name: groupForm.name,
        color: groupForm.color,
        icon: groupForm.icon,
        position_x: 50,
        position_y: 50,
        width: 400,
        height: 300,
      })
      .select()
      .single()

    if (data) {
      setGroups([...groups, data])
      setGroupForm({ name: '', color: '#8B5CF6', icon: 'users' })
      setIsCreateGroupOpen(false)
    }

    setSaving(false)
  }

  const handleCharacterUpdate = useCallback((updatedCharacter: Character) => {
    setCharacters(prev => prev.map(c =>
      c.id === updatedCharacter.id ? updatedCharacter : c
    ))
  }, [])

  const handleCharacterDelete = useCallback((id: string) => {
    setCharacters(prev => prev.filter(c => c.id !== id))
    setSelectedCharacterId(null)
  }, [setSelectedCharacterId])

  // Handle selection changes from canvas
  const handleSelectionChange = useCallback((charIds: string[], grpIds: string[]) => {
    setSelectedCharacterIds(charIds)
    setSelectedGroupIds(grpIds)
  }, [])

  // Handle delete request from canvas (triggered by DEL key)
  const handleDeleteSelected = useCallback((characterIds: string[], groupIds: string[]) => {
    const totalCount = characterIds.length + groupIds.length
    if (totalCount === 0) return

    // If 5 or more items, show confirmation modal
    if (totalCount >= 5) {
      setPendingDelete({ characterIds, groupIds })
      setDeleteConfirmOpen(true)
    } else {
      // Directly delete without confirmation
      performDelete(characterIds, groupIds)
    }
  }, [])

  // Actually perform the deletion
  const performDelete = useCallback(async (characterIds: string[], groupIds: string[]) => {
    // Save to undo stack before deleting
    const deletedCharacters = characters.filter(c => characterIds.includes(c.id))
    const deletedGroups = groups.filter(g => groupIds.includes(g.id))
    const deletedCharacterTags = new Map<string, (CharacterTag & { tag: Tag; related_character?: Character | null })[]>()
    characterIds.forEach(id => {
      const tags = characterTags.get(id)
      if (tags) deletedCharacterTags.set(id, tags)
    })

    setUndoStack(prev => {
      const newStack = [...prev, {
        type: 'delete' as const,
        characters: deletedCharacters,
        groups: deletedGroups,
        characterTags: deletedCharacterTags,
      }]
      // Keep only last N actions
      return newStack.slice(-MAX_UNDO_STACK)
    })

    // Delete characters from state and database
    for (const id of characterIds) {
      setCharacters(prev => prev.filter(c => c.id !== id))
      await supabase.from('characters').delete().eq('id', id)
    }

    // Delete groups from state and database
    for (const id of groupIds) {
      setGroups(prev => prev.filter(g => g.id !== id))
      await supabase.from('canvas_groups').delete().eq('id', id)
    }

    // Clear selection
    setSelectedCharacterIds([])
    setSelectedGroupIds([])
    setSelectedCharacterId(null)
    setDeleteConfirmOpen(false)
    setPendingDelete(null)
  }, [characters, groups, characterTags, supabase, setSelectedCharacterId])

  // Confirm delete from modal
  const confirmDelete = useCallback(() => {
    if (pendingDelete) {
      performDelete(pendingDelete.characterIds, pendingDelete.groupIds)
    }
  }, [pendingDelete, performDelete])

  // Undo last deletion
  const handleUndo = useCallback(async () => {
    if (undoStack.length === 0) return

    const lastAction = undoStack[undoStack.length - 1]
    setUndoStack(prev => prev.slice(0, -1))

    if (lastAction.type === 'delete') {
      // Restore characters
      for (const char of lastAction.characters) {
        const { data } = await supabase
          .from('characters')
          .insert(char)
          .select()
          .single()
        if (data) {
          setCharacters(prev => [...prev, data])
        }
      }

      // Restore groups
      for (const group of lastAction.groups) {
        const { data } = await supabase
          .from('canvas_groups')
          .insert(group)
          .select()
          .single()
        if (data) {
          setGroups(prev => [...prev, data])
        }
      }

      // Restore character tags
      lastAction.characterTags.forEach((tags, charId) => {
        setCharacterTags(prev => {
          const newMap = new Map(prev)
          newMap.set(charId, tags)
          return newMap
        })
      })
    }
  }, [undoStack, supabase])

  // Keyboard shortcut for CTRL+Z undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo])

  const viewingCharacter = characters.find(c => c.id === viewingCharacterId)
  const editingCharacter = characters.find(c => c.id === editingCharacterId)

  const handleViewToEdit = useCallback(() => {
    if (viewingCharacterId) {
      setEditingCharacterId(viewingCharacterId)
      setViewingCharacterId(null)
    }
  }, [viewingCharacterId])

  const handleCloseViewModal = useCallback(() => {
    setViewingCharacterId(null)
    setSelectedCharacterId(null)
  }, [setSelectedCharacterId])

  const handleCloseEditModal = useCallback(() => {
    setEditingCharacterId(null)
    setSelectedCharacterId(null)
  }, [setSelectedCharacterId])

  // Canvas toolbar actions for the top bar
  const canvasActions = (
    <>
      {aiEnabled && (
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => router.push(`/campaigns/${campaignId}/intelligence`)}
          title="Open Campaign Intelligence"
        >
          <Brain className="w-4 h-4" />
          <span className="hidden sm:inline ml-1.5">Intelligence</span>
        </button>
      )}
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => setIsResizeToolbarOpen(true)}
      >
        <Scaling className="w-4 h-4" />
        <span className="hidden sm:inline ml-1.5">Resize</span>
      </button>
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => setIsCreateGroupOpen(true)}
      >
        <FolderPlus className="w-4 h-4" />
        <span className="hidden sm:inline ml-1.5">Add Group</span>
      </button>
      <button
        className="btn btn-primary btn-sm"
        onClick={() => setIsCreateCharacterModalOpen(true)}
      >
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline ml-1.5">Add Character</span>
      </button>
    </>
  )

  if (loading) {
    return (
      <AppLayout campaignId={campaignId} fullBleed transparentTopBar>
        <div className="flex items-center justify-center h-screen">
          <div className="w-10 h-10 border-2 border-[--arcane-purple] border-t-transparent rounded-full spinner" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout campaignId={campaignId} fullBleed transparentTopBar topBarActions={canvasActions}>
      {/* Canvas Area */}
      <div className="h-screen">
        <CampaignCanvas
          campaignId={campaignId}
          characters={characters}
          characterTags={characterTags}
          groups={groups}
          characterSizeOverrides={characterSizeOverrides}
          onCharacterPreview={handleCharacterPreview}
          onCharacterEdit={handleCharacterEdit}
          onCharacterPositionChange={handleCharacterPositionChange}
          onCharacterSizeChange={handleCharacterSizeChange}
          onGroupUpdate={handleGroupUpdate}
          onGroupDelete={handleGroupDelete}
          onGroupEdit={handleGroupEdit}
          onGroupPositionChange={handleGroupPositionChange}
          onDeleteSelected={handleDeleteSelected}
          onSelectionChange={handleSelectionChange}
        />
      </div>

      {/* Resize Toolbar */}
      {isResizeToolbarOpen && (
        <ResizeToolbar
          characters={characters}
          onResize={handleBatchResize}
          onClose={handleResizeToolbarClose}
        />
      )}

      {/* Character View Modal (Read-only) */}
      {viewingCharacter && (
        <CharacterViewModal
          character={viewingCharacter}
          tags={characterTags.get(viewingCharacter.id) || []}
          onEdit={handleViewToEdit}
          onClose={handleCloseViewModal}
        />
      )}

      {/* Character Edit Modal */}
      {editingCharacter && (
        <CharacterModal
          character={editingCharacter}
          tags={characterTags.get(editingCharacter.id) || []}
          allCharacters={characters}
          campaignId={campaignId}
          onUpdate={handleCharacterUpdate}
          onDelete={handleCharacterDelete}
          onClose={handleCloseEditModal}
          onTagsChange={loadCampaignData}
        />
      )}

      {/* Create Character Modal (Full Editor) */}
      {isCreateCharacterModalOpen && (
        <CharacterModal
          character={null}
          tags={[]}
          allCharacters={characters}
          campaignId={campaignId}
          onUpdate={handleCharacterUpdate}
          onCreate={handleCharacterCreate}
          onDelete={handleCharacterDelete}
          onClose={handleCloseCreateCharacterModal}
          onTagsChange={loadCampaignData}
        />
      )}

      {/* Create Group Modal */}
      <Modal
        isOpen={isCreateGroupOpen}
        onClose={() => {
          setIsCreateGroupOpen(false)
          setGroupForm({ name: '', color: '#8B5CF6', icon: 'users' })
        }}
        title="Add Group"
        description="Create a group to organize characters on the canvas"
        size="lg"
      >
        <div className="space-y-6">
          <div className="form-group mb-6">
            <label className="form-label">Group Name</label>
            <Input
              className="form-input"
              placeholder="e.g., The Party, Villains, NPCs..."
              value={groupForm.name}
              onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
              autoFocus
            />
          </div>
          <div className="form-group mb-6">
            <label className="form-label mb-4">Group Color</label>
            <ColorPicker
              value={groupForm.color}
              onChange={(color) => setGroupForm({ ...groupForm, color })}
            />
          </div>
          <div className="form-group mb-4">
            <label className="form-label mb-3">Group Icon</label>
            <IconPicker
              value={groupForm.icon}
              onChange={(icon) => setGroupForm({ ...groupForm, icon })}
              color={groupForm.color}
            />
          </div>
          {/* Preview */}
          <div className="form-group mt-6">
            <label className="form-label mb-3">Preview</label>
            {(() => {
              const GroupIcon = getGroupIcon(groupForm.icon)
              return (
                <div
                  className="h-16 rounded-xl flex items-center justify-center gap-3 text-2xl font-bold tracking-tight"
                  style={{
                    backgroundColor: `${groupForm.color}15`,
                    border: `2px solid ${groupForm.color}50`,
                    color: groupForm.color,
                  }}
                >
                  <GroupIcon className="w-6 h-6" />
                  {groupForm.name || 'Group Name'}
                </div>
              )
            })()}
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button className="btn btn-secondary" onClick={() => setIsCreateGroupOpen(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCreateGroup}
              disabled={!groupForm.name.trim() || saving}
            >
              {saving ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Group Modal */}
      <Modal
        isOpen={!!editingGroupId}
        onClose={() => {
          setEditingGroupId(null)
          setEditGroupForm({ name: '', color: '#8B5CF6', icon: 'users' })
        }}
        title="Edit Group"
        description="Update the group's name, color, and icon"
        size="lg"
      >
        <div className="space-y-6">
          <div className="form-group mb-6">
            <label className="form-label">Group Name</label>
            <Input
              className="form-input"
              placeholder="e.g., The Party, Villains, NPCs..."
              value={editGroupForm.name}
              onChange={(e) => setEditGroupForm({ ...editGroupForm, name: e.target.value })}
              autoFocus
            />
          </div>
          <div className="form-group mb-6">
            <label className="form-label mb-4">Group Color</label>
            <ColorPicker
              value={editGroupForm.color}
              onChange={(color) => setEditGroupForm({ ...editGroupForm, color })}
            />
          </div>
          <div className="form-group mb-4">
            <label className="form-label mb-3">Group Icon</label>
            <IconPicker
              value={editGroupForm.icon}
              onChange={(icon) => setEditGroupForm({ ...editGroupForm, icon })}
              color={editGroupForm.color}
            />
          </div>
          {/* Preview */}
          <div className="form-group mt-6">
            <label className="form-label mb-3">Preview</label>
            {(() => {
              const GroupIcon = getGroupIcon(editGroupForm.icon)
              return (
                <div
                  className="h-16 rounded-xl flex items-center justify-center gap-3 text-2xl font-bold tracking-tight"
                  style={{
                    backgroundColor: `${editGroupForm.color}15`,
                    border: `2px solid ${editGroupForm.color}50`,
                    color: editGroupForm.color,
                  }}
                >
                  <GroupIcon className="w-6 h-6" />
                  {editGroupForm.name || 'Group Name'}
                </div>
              )
            })()}
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button className="btn btn-secondary" onClick={() => setEditingGroupId(null)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleUpdateGroup}
              disabled={!editGroupForm.name.trim() || saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false)
          setPendingDelete(null)
        }}
        title="Delete Selected Items"
        description={`Are you sure you want to delete ${pendingDelete ? pendingDelete.characterIds.length + pendingDelete.groupIds.length : 0} items? This action can be undone with Ctrl+Z.`}
      >
        <div className="space-y-4 py-4">
          {pendingDelete && pendingDelete.characterIds.length > 0 && (
            <div>
              <p className="text-sm text-gray-400 mb-2">Characters ({pendingDelete.characterIds.length}):</p>
              <div className="flex flex-wrap gap-2">
                {pendingDelete.characterIds.slice(0, 10).map(id => {
                  const char = characters.find(c => c.id === id)
                  return char ? (
                    <span key={id} className="px-2 py-1 bg-white/[0.05] rounded text-sm text-gray-300">
                      {char.name}
                    </span>
                  ) : null
                })}
                {pendingDelete.characterIds.length > 10 && (
                  <span className="px-2 py-1 text-sm text-gray-500">
                    +{pendingDelete.characterIds.length - 10} more
                  </span>
                )}
              </div>
            </div>
          )}
          {pendingDelete && pendingDelete.groupIds.length > 0 && (
            <div>
              <p className="text-sm text-gray-400 mb-2">Groups ({pendingDelete.groupIds.length}):</p>
              <div className="flex flex-wrap gap-2">
                {pendingDelete.groupIds.slice(0, 5).map(id => {
                  const grp = groups.find(g => g.id === id)
                  return grp ? (
                    <span key={id} className="px-2 py-1 bg-white/[0.05] rounded text-sm text-gray-300">
                      {grp.name}
                    </span>
                  ) : null
                })}
                {pendingDelete.groupIds.length > 5 && (
                  <span className="px-2 py-1 text-sm text-gray-500">
                    +{pendingDelete.groupIds.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
          <button
            className="btn btn-secondary"
            onClick={() => {
              setDeleteConfirmOpen(false)
              setPendingDelete(null)
            }}
          >
            Cancel
          </button>
          <button
            className="btn bg-red-600 hover:bg-red-500 text-white"
            onClick={confirmDelete}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete {pendingDelete ? pendingDelete.characterIds.length + pendingDelete.groupIds.length : 0} Items
          </button>
        </div>
      </Modal>

    </AppLayout>
  )
}
