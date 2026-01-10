'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Plus, Users, FolderPlus, ArrowLeft, Settings } from 'lucide-react'
import { Button, Modal, Input, Dropdown } from '@/components/ui'
import { CampaignCanvas } from '@/components/canvas'
import { CharacterPanel } from '@/components/character'
import { AIAssistant } from '@/components/ai'
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
    // Could open full editor here
  }, [setSelectedCharacterId])

  const handleCharacterPositionChange = useCallback(async (id: string, x: number, y: number) => {
    await supabase
      .from('characters')
      .update({ position_x: x, position_y: y } as any)
      .eq('id', id)

    setCharacters(prev => prev.map(c =>
      c.id === id ? { ...c, position_x: x, position_y: y } : c
    ))
  }, [supabase])

  const handleGroupUpdate = useCallback(async (id: string, updates: Partial<CanvasGroup>) => {
    await supabase
      .from('canvas_groups')
      .update(updates as any)
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
      .update({ position_x: x, position_y: y } as any)
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
      // Place to the right of the rightmost character
      const maxX = Math.max(...existingPositions.map(p => p.x))
      newX = maxX + 250
      newY = existingPositions[existingPositions.length - 1].y
    }

    const { data, error } = await supabase
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

    const { data, error } = await supabase
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
      <div className="flex items-center justify-center h-screen bg-[--bg-base]">
        <div className="w-8 h-8 border-2 border-[--accent-primary] border-t-transparent rounded-full spinner" />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-[--bg-base]">
      {/* Canvas Header */}
      <header className="h-14 border-b border-[--border] bg-[--bg-surface] flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/campaigns')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-semibold text-[--text-primary]">{campaign?.name}</h1>
            <p className="text-xs text-[--text-secondary]">{campaign?.game_system}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsCreateGroupOpen(true)}
          >
            <FolderPlus className="h-4 w-4 mr-2" />
            Add Group
          </Button>
          <Button
            size="sm"
            onClick={() => setIsCreateCharacterOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Character
          </Button>
        </div>
      </header>

      {/* Canvas Area */}
      <div className="flex-1 flex overflow-hidden">
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
          <div className="space-y-2">
            <label className="text-sm font-medium text-[--text-primary]">Name</label>
            <Input
              placeholder="Character name"
              value={characterForm.name}
              onChange={(e) => setCharacterForm({ ...characterForm, name: e.target.value })}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[--text-primary]">Type</label>
            <Dropdown
              options={CHARACTER_TYPES}
              value={characterForm.type}
              onChange={(value) => setCharacterForm({ ...characterForm, type: value as 'pc' | 'npc' })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setIsCreateCharacterOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateCharacter}
              loading={saving}
              disabled={!characterForm.name.trim()}
            >
              Create Character
            </Button>
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
          <div className="space-y-2">
            <label className="text-sm font-medium text-[--text-primary]">Group Name</label>
            <Input
              placeholder="e.g., The Party, Villains, NPCs..."
              value={groupForm.name}
              onChange={(e) => setGroupForm({ name: e.target.value })}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setIsCreateGroupOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateGroup}
              loading={saving}
              disabled={!groupForm.name.trim()}
            >
              Create Group
            </Button>
          </div>
        </div>
      </Modal>

      {/* AI Assistant */}
      <AIAssistant
        campaignContext={{
          campaignName: campaign?.name || '',
          gameSystem: campaign?.game_system || '',
          characters: characters.map((c) => ({
            name: c.name,
            type: c.type,
            summary: c.summary || undefined,
          })),
          recentSessions: [], // TODO: Load recent sessions
        }}
      />
    </div>
  )
}
