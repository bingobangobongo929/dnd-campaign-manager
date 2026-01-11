'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Plus, FolderPlus } from 'lucide-react'
import { Modal, Input, Dropdown } from '@/components/ui'
import { CampaignCanvas } from '@/components/canvas'
import { CharacterPanel } from '@/components/character'
import { AppLayout } from '@/components/layout/app-layout'
import { useSupabase, useUser } from '@/hooks'
import { useAppStore } from '@/store'
import type { Campaign, Character, Tag, CharacterTag, CanvasGroup } from '@/types/database'

const CHARACTER_TYPES = [
  { value: 'pc', label: 'Player Character (PC)' },
  { value: 'npc', label: 'Non-Player Character (NPC)' },
]

export default function CampaignCanvasPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()
  const { selectedCharacterId, setSelectedCharacterId } = useAppStore()

  const campaignId = params.id as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [characterTags, setCharacterTags] = useState<Map<string, (CharacterTag & { tag: Tag; related_character?: Character | null })[]>>(new Map())
  const [groups, setGroups] = useState<CanvasGroup[]>([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [isCreateCharacterOpen, setIsCreateCharacterOpen] = useState(false)
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false)
  const [characterForm, setCharacterForm] = useState({
    name: '',
    type: 'npc' as 'pc' | 'npc',
  })
  const [groupForm, setGroupForm] = useState({ name: '' })
  const [saving, setSaving] = useState(false)

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

  const handleCharacterSelect = useCallback((id: string | null) => {
    setSelectedCharacterId(id)
  }, [setSelectedCharacterId])

  const handleCharacterDoubleClick = useCallback((id: string) => {
    setSelectedCharacterId(id)
  }, [setSelectedCharacterId])

  const handleCharacterPositionChange = useCallback(async (id: string, x: number, y: number) => {
    await supabase
      .from('characters')
      .update({ position_x: x, position_y: y })
      .eq('id', id)

    setCharacters(prev => prev.map(c =>
      c.id === id ? { ...c, position_x: x, position_y: y } : c
    ))
  }, [supabase])

  const handleGroupUpdate = useCallback(async (id: string, updates: Partial<CanvasGroup>) => {
    await supabase
      .from('canvas_groups')
      .update(updates)
      .eq('id', id)

    setGroups(prev => prev.map(g =>
      g.id === id ? { ...g, ...updates } : g
    ))
  }, [supabase])

  const handleGroupDelete = useCallback(async (id: string) => {
    await supabase
      .from('canvas_groups')
      .delete()
      .eq('id', id)

    setGroups(prev => prev.filter(g => g.id !== id))
  }, [supabase])

  const handleGroupPositionChange = useCallback(async (id: string, x: number, y: number) => {
    await supabase
      .from('canvas_groups')
      .update({ position_x: x, position_y: y })
      .eq('id', id)

    setGroups(prev => prev.map(g =>
      g.id === id ? { ...g, position_x: x, position_y: y } : g
    ))
  }, [supabase])

  const handleCreateCharacter = async () => {
    if (!characterForm.name.trim()) return

    setSaving(true)

    // Find a good position for the new character
    const existingPositions = characters.map(c => ({ x: c.position_x, y: c.position_y }))
    let newX = 100
    let newY = 100

    if (existingPositions.length > 0) {
      const maxX = Math.max(...existingPositions.map(p => p.x))
      newX = maxX + 250
      newY = existingPositions[existingPositions.length - 1].y
    }

    const { data } = await supabase
      .from('characters')
      .insert({
        campaign_id: campaignId,
        name: characterForm.name,
        type: characterForm.type,
        position_x: newX,
        position_y: newY,
      })
      .select()
      .single()

    if (data) {
      setCharacters([...characters, data])
      setCharacterForm({ name: '', type: 'npc' })
      setIsCreateCharacterOpen(false)
      setSelectedCharacterId(data.id)
    }

    setSaving(false)
  }

  const handleCreateGroup = async () => {
    if (!groupForm.name.trim()) return

    setSaving(true)

    const { data } = await supabase
      .from('canvas_groups')
      .insert({
        campaign_id: campaignId,
        name: groupForm.name,
        position_x: 50,
        position_y: 50,
        width: 400,
        height: 300,
      })
      .select()
      .single()

    if (data) {
      setGroups([...groups, data])
      setGroupForm({ name: '' })
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

  const selectedCharacter = characters.find(c => c.id === selectedCharacterId)

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
    <AppLayout campaignId={campaignId} fullBleed transparentTopBar>
      {/* Canvas Toolbar */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <button
          className="btn btn-secondary"
          onClick={() => setIsCreateGroupOpen(true)}
        >
          <FolderPlus className="w-4 h-4" />
          <span className="hidden sm:inline ml-2">Add Group</span>
        </button>
        <button
          className="btn btn-primary"
          onClick={() => setIsCreateCharacterOpen(true)}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline ml-2">Add Character</span>
        </button>
      </div>

      {/* Canvas Area */}
      <div className="h-screen flex">
        <div className="flex-1 relative">
          <CampaignCanvas
            campaignId={campaignId}
            characters={characters}
            characterTags={characterTags}
            groups={groups}
            onCharacterSelect={handleCharacterSelect}
            onCharacterDoubleClick={handleCharacterDoubleClick}
            onCharacterPositionChange={handleCharacterPositionChange}
            onGroupUpdate={handleGroupUpdate}
            onGroupDelete={handleGroupDelete}
            onGroupPositionChange={handleGroupPositionChange}
          />
        </div>

        {/* Character Panel */}
        {selectedCharacter && (
          <CharacterPanel
            character={selectedCharacter}
            tags={characterTags.get(selectedCharacter.id) || []}
            allCharacters={characters}
            campaignId={campaignId}
            onUpdate={handleCharacterUpdate}
            onDelete={handleCharacterDelete}
            onClose={() => setSelectedCharacterId(null)}
            onTagsChange={loadCampaignData}
          />
        )}
      </div>

      {/* Create Character Modal */}
      <Modal
        isOpen={isCreateCharacterOpen}
        onClose={() => {
          setIsCreateCharacterOpen(false)
          setCharacterForm({ name: '', type: 'npc' })
        }}
        title="Add Character"
        description="Create a new character for your campaign"
      >
        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label">Name</label>
            <Input
              className="form-input"
              placeholder="Character name"
              value={characterForm.name}
              onChange={(e) => setCharacterForm({ ...characterForm, name: e.target.value })}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Type</label>
            <Dropdown
              options={CHARACTER_TYPES}
              value={characterForm.type}
              onChange={(value) => setCharacterForm({ ...characterForm, type: value as 'pc' | 'npc' })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button className="btn btn-secondary" onClick={() => setIsCreateCharacterOpen(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCreateCharacter}
              disabled={!characterForm.name.trim() || saving}
            >
              {saving ? 'Creating...' : 'Create Character'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Group Modal */}
      <Modal
        isOpen={isCreateGroupOpen}
        onClose={() => {
          setIsCreateGroupOpen(false)
          setGroupForm({ name: '' })
        }}
        title="Add Group"
        description="Create a group to organize characters on the canvas"
      >
        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label">Group Name</label>
            <Input
              className="form-input"
              placeholder="e.g., The Party, Villains, NPCs..."
              value={groupForm.name}
              onChange={(e) => setGroupForm({ name: e.target.value })}
              autoFocus
            />
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
    </AppLayout>
  )
}
