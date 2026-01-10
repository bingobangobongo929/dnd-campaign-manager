'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, BookOpen, Trash2, Edit, Copy, Upload } from 'lucide-react'
import {
  Button,
  Input,
  Card,
  CardContent,
  Modal,
  Textarea,
  Dropdown,
  Avatar,
  EmptyState,
} from '@/components/ui'
import { DashboardLayout } from '@/components/layout'
import { useSupabase, useUser } from '@/hooks'
import { formatDate } from '@/lib/utils'
import type { VaultCharacter, Campaign } from '@/types/database'

const CHARACTER_TYPES = [
  { value: 'pc', label: 'Player Character (PC)' },
  { value: 'npc', label: 'Non-Player Character (NPC)' },
]

export default function VaultPage() {
  const supabase = useSupabase()
  const { user } = useUser()

  const [vaultCharacters, setVaultCharacters] = useState<VaultCharacter[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingCharacter, setEditingCharacter] = useState<VaultCharacter | null>(null)
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false)
  const [copyingCharacter, setCopyingCharacter] = useState<VaultCharacter | null>(null)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('')
  const [formData, setFormData] = useState({
    name: '',
    type: 'npc' as 'pc' | 'npc',
    summary: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    setLoading(true)

    // Load vault characters
    const { data: charactersData } = await supabase
      .from('vault_characters')
      .select('*')
      .eq('user_id', user!.id)
      .order('name')

    setVaultCharacters(charactersData || [])

    // Load campaigns for copy-to feature
    const { data: campaignsData } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', user!.id)
      .order('name')

    setCampaigns(campaignsData || [])

    setLoading(false)
  }

  const filteredCharacters = vaultCharacters.filter((char) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      char.name.toLowerCase().includes(query) ||
      char.summary?.toLowerCase().includes(query) ||
      char.type.toLowerCase().includes(query)
    )
  })

  const handleCreate = async () => {
    if (!formData.name.trim()) return

    setSaving(true)
    const { data, error } = await supabase
      .from('vault_characters')
      .insert({
        user_id: user!.id,
        name: formData.name,
        type: formData.type,
        summary: formData.summary || null,
        notes: formData.notes || null,
      })
      .select()
      .single()

    if (data) {
      setVaultCharacters([...vaultCharacters, data].sort((a, b) => a.name.localeCompare(b.name)))
      setIsCreateModalOpen(false)
      resetForm()
    }
    setSaving(false)
  }

  const handleUpdate = async () => {
    if (!formData.name.trim() || !editingCharacter) return

    setSaving(true)
    const { data, error } = await supabase
      .from('vault_characters')
      .update({
        name: formData.name,
        type: formData.type,
        summary: formData.summary || null,
        notes: formData.notes || null,
      })
      .eq('id', editingCharacter.id)
      .select()
      .single()

    if (data) {
      setVaultCharacters(
        vaultCharacters
          .map((c) => (c.id === data.id ? data : c))
          .sort((a, b) => a.name.localeCompare(b.name))
      )
      setEditingCharacter(null)
      resetForm()
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this character from your vault?')) return

    await supabase.from('vault_characters').delete().eq('id', id)
    setVaultCharacters(vaultCharacters.filter((c) => c.id !== id))
  }

  const handleCopyToCampaign = async () => {
    if (!copyingCharacter || !selectedCampaignId) return

    setSaving(true)

    // Get count of existing characters in campaign for positioning
    const { count } = await supabase
      .from('characters')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', selectedCampaignId)

    const posX = 100 + ((count || 0) % 5) * 250
    const posY = 100 + Math.floor((count || 0) / 5) * 180

    const { data, error } = await supabase
      .from('characters')
      .insert({
        campaign_id: selectedCampaignId,
        name: copyingCharacter.name,
        type: copyingCharacter.type,
        summary: copyingCharacter.summary,
        notes: copyingCharacter.notes,
        image_url: copyingCharacter.image_url,
        position_x: posX,
        position_y: posY,
      })
      .select()
      .single()

    if (data) {
      setCopyingCharacter(null)
      setIsCopyModalOpen(false)
      setSelectedCampaignId('')
      alert(`${copyingCharacter.name} has been copied to the campaign!`)
    }
    setSaving(false)
  }

  const openEditModal = (char: VaultCharacter) => {
    setFormData({
      name: char.name,
      type: char.type,
      summary: char.summary || '',
      notes: char.notes || '',
    })
    setEditingCharacter(char)
  }

  const openCopyModal = (char: VaultCharacter) => {
    setCopyingCharacter(char)
    setIsCopyModalOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'npc',
      summary: '',
      notes: '',
    })
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-2 border-[--accent-primary] border-t-transparent rounded-full spinner" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[--text-primary]">Character Vault</h1>
            <p className="text-[--text-secondary]">
              Store characters here to use across multiple campaigns
            </p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Character
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[--text-tertiary]" />
          <Input
            placeholder="Search vault..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Characters Grid */}
        {filteredCharacters.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-12 w-12" />}
            title={searchQuery ? 'No matching characters' : 'Your vault is empty'}
            description={
              searchQuery
                ? 'Try a different search term'
                : 'Add characters to your vault to reuse them across campaigns'
            }
            action={
              !searchQuery && (
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Character
                </Button>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCharacters.map((char) => (
              <Card key={char.id} className="group">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Avatar src={char.image_url} name={char.name} size="lg" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-[--text-primary] truncate">
                          {char.name}
                        </h3>
                        <span
                          className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                            char.type === 'pc'
                              ? 'bg-[--accent-primary]/10 text-[--accent-primary]'
                              : 'bg-[--text-tertiary]/20 text-[--text-secondary]'
                          }`}
                        >
                          {char.type.toUpperCase()}
                        </span>
                      </div>
                      {char.summary && (
                        <p className="text-sm text-[--text-secondary] line-clamp-2">
                          {char.summary}
                        </p>
                      )}
                      <p className="text-xs text-[--text-tertiary] mt-2">
                        Added {formatDate(char.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 mt-4 pt-4 border-t border-[--border]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => openCopyModal(char)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy to Campaign
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditModal(char)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-[--accent-danger]"
                      onClick={() => handleDelete(char.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false)
            resetForm()
          }}
          title="Add to Vault"
          description="Create a new character for your vault"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[--text-primary]">Name</label>
              <Input
                placeholder="Character name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[--text-primary]">Type</label>
              <Dropdown
                options={CHARACTER_TYPES}
                value={formData.type}
                onChange={(value) => setFormData({ ...formData, type: value as 'pc' | 'npc' })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[--text-primary]">Summary</label>
              <Textarea
                placeholder="Brief description..."
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[--text-primary]">Notes</label>
              <Textarea
                placeholder="Detailed notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} loading={saving} disabled={!formData.name.trim()}>
                Add to Vault
              </Button>
            </div>
          </div>
        </Modal>

        {/* Edit Modal */}
        <Modal
          isOpen={!!editingCharacter}
          onClose={() => {
            setEditingCharacter(null)
            resetForm()
          }}
          title="Edit Character"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[--text-primary]">Name</label>
              <Input
                placeholder="Character name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[--text-primary]">Type</label>
              <Dropdown
                options={CHARACTER_TYPES}
                value={formData.type}
                onChange={(value) => setFormData({ ...formData, type: value as 'pc' | 'npc' })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[--text-primary]">Summary</label>
              <Textarea
                placeholder="Brief description..."
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[--text-primary]">Notes</label>
              <Textarea
                placeholder="Detailed notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" onClick={() => setEditingCharacter(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} loading={saving} disabled={!formData.name.trim()}>
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>

        {/* Copy to Campaign Modal */}
        <Modal
          isOpen={isCopyModalOpen}
          onClose={() => {
            setIsCopyModalOpen(false)
            setCopyingCharacter(null)
            setSelectedCampaignId('')
          }}
          title="Copy to Campaign"
          description={`Copy "${copyingCharacter?.name}" to a campaign`}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[--text-primary]">
                Select Campaign
              </label>
              {campaigns.length === 0 ? (
                <p className="text-sm text-[--text-secondary]">
                  You don't have any campaigns yet. Create a campaign first.
                </p>
              ) : (
                <Dropdown
                  options={campaigns.map((c) => ({ value: c.id, label: c.name }))}
                  value={selectedCampaignId}
                  onChange={setSelectedCampaignId}
                  placeholder="Choose a campaign..."
                />
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" onClick={() => setIsCopyModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCopyToCampaign}
                loading={saving}
                disabled={!selectedCampaignId}
              >
                Copy to Campaign
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  )
}
