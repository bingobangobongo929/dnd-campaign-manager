'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, BookOpen, Trash2, Edit, Copy } from 'lucide-react'
import { Input, Modal, Textarea, Dropdown } from '@/components/ui'
import { AppLayout } from '@/components/layout/app-layout'
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

    const { data: charactersData } = await supabase
      .from('vault_characters')
      .select('*')
      .eq('user_id', user!.id)
      .order('name')

    setVaultCharacters(charactersData || [])

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
    const { data } = await supabase
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
    const { data } = await supabase
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

    const { count } = await supabase
      .from('characters')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', selectedCampaignId)

    const posX = 100 + ((count || 0) % 5) * 250
    const posY = 100 + Math.floor((count || 0) / 5) * 180

    const { data } = await supabase
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
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-10 h-10 border-2 border-[--arcane-purple] border-t-transparent rounded-full spinner" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="page-header flex items-center justify-between">
          <div>
            <h1 className="page-title">Character Vault</h1>
            <p className="page-subtitle">Store characters to reuse across campaigns</p>
          </div>
          <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Add Character
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[--text-tertiary]" />
          <input
            type="text"
            className="form-input pl-12"
            placeholder="Search vault..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Characters Grid */}
        {filteredCharacters.length === 0 ? (
          <div className="empty-state">
            <BookOpen className="empty-state-icon" />
            <h2 className="empty-state-title">
              {searchQuery ? 'No matching characters' : 'Your vault is empty'}
            </h2>
            <p className="empty-state-description">
              {searchQuery
                ? 'Try a different search term'
                : 'Add characters to your vault to reuse them across campaigns'}
            </p>
            {!searchQuery && (
              <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="w-5 h-5" />
                Add Character
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCharacters.map((char, index) => (
              <div
                key={char.id}
                className="card p-4 animate-slide-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className="avatar avatar-lg">
                    {char.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[--text-primary] truncate">
                        {char.name}
                      </h3>
                      <span
                        className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                          char.type === 'pc'
                            ? 'bg-[--arcane-purple]/20 text-[--arcane-purple]'
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
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[--border]">
                  <button
                    className="btn btn-secondary flex-1 text-sm py-2"
                    onClick={() => openCopyModal(char)}
                  >
                    <Copy className="w-4 h-4" />
                    Copy to Campaign
                  </button>
                  <button
                    className="btn-ghost btn-icon w-8 h-8"
                    onClick={() => openEditModal(char)}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    className="btn-ghost btn-icon w-8 h-8 text-[--arcane-ember]"
                    onClick={() => handleDelete(char.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FAB */}
        {filteredCharacters.length > 0 && (
          <button
            className="fab"
            onClick={() => setIsCreateModalOpen(true)}
            aria-label="Add character"
          >
            <Plus className="fab-icon" />
          </button>
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
            <div className="form-group">
              <label className="form-label">Name</label>
              <Input
                className="form-input"
                placeholder="Character name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <Dropdown
                options={CHARACTER_TYPES}
                value={formData.type}
                onChange={(value) => setFormData({ ...formData, type: value as 'pc' | 'npc' })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Summary</label>
              <Textarea
                className="form-textarea"
                placeholder="Brief description..."
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                rows={2}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <Textarea
                className="form-textarea"
                placeholder="Detailed notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button className="btn btn-secondary" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={!formData.name.trim() || saving}
              >
                {saving ? 'Adding...' : 'Add to Vault'}
              </button>
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
            <div className="form-group">
              <label className="form-label">Name</label>
              <Input
                className="form-input"
                placeholder="Character name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <Dropdown
                options={CHARACTER_TYPES}
                value={formData.type}
                onChange={(value) => setFormData({ ...formData, type: value as 'pc' | 'npc' })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Summary</label>
              <Textarea
                className="form-textarea"
                placeholder="Brief description..."
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                rows={2}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <Textarea
                className="form-textarea"
                placeholder="Detailed notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button className="btn btn-secondary" onClick={() => setEditingCharacter(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleUpdate}
                disabled={!formData.name.trim() || saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
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
            <div className="form-group">
              <label className="form-label">Select Campaign</label>
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
            <div className="flex justify-end gap-3 pt-4">
              <button className="btn btn-secondary" onClick={() => setIsCopyModalOpen(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCopyToCampaign}
                disabled={!selectedCampaignId || saving}
              >
                {saving ? 'Copying...' : 'Copy to Campaign'}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  )
}
