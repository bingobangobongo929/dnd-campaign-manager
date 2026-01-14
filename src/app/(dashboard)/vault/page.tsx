'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, BookOpen, Trash2, Copy, Filter, X } from 'lucide-react'
import { Modal, Dropdown } from '@/components/ui'
import { AppLayout } from '@/components/layout/app-layout'
import { CharacterCard } from '@/components/vault/CharacterCard'
import { useSupabase, useUser } from '@/hooks'
import type { VaultCharacter, Campaign } from '@/types/database'

export default function VaultPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()

  const [vaultCharacters, setVaultCharacters] = useState<VaultCharacter[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'pc' | 'npc'>('all')

  // Copy to campaign modal state
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false)
  const [copyingCharacter, setCopyingCharacter] = useState<VaultCharacter | null>(null)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('')
  const [saving, setSaving] = useState(false)

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    character: VaultCharacter
  } | null>(null)

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  const loadData = async () => {
    // Only show loading spinner on initial load, not refetches
    if (!hasLoadedOnce) {
      setLoading(true)
    }

    const { data: charactersData } = await supabase
      .from('vault_characters')
      .select('*')
      .eq('user_id', user!.id)
      .order('updated_at', { ascending: false })

    setVaultCharacters(charactersData || [])

    const { data: campaignsData } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', user!.id)
      .order('name')

    setCampaigns(campaignsData || [])

    setLoading(false)
    setHasLoadedOnce(true)
  }

  // Get unique statuses from characters
  const availableStatuses = useMemo(() => {
    const statuses = new Set<string>()
    vaultCharacters.forEach(char => {
      if (char.status) statuses.add(char.status)
    })
    return Array.from(statuses)
  }, [vaultCharacters])

  const filteredCharacters = vaultCharacters.filter((char) => {
    // Text search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        char.name.toLowerCase().includes(query) ||
        char.summary?.toLowerCase().includes(query) ||
        char.race?.toLowerCase().includes(query) ||
        char.class?.toLowerCase().includes(query)
      if (!matchesSearch) return false
    }

    // Status filter
    if (statusFilter !== 'all' && char.status !== statusFilter) {
      return false
    }

    // Type filter
    if (typeFilter !== 'all' && char.type !== typeFilter) {
      return false
    }

    return true
  })

  const hasActiveFilters = statusFilter !== 'all' || typeFilter !== 'all'

  const clearFilters = () => {
    setStatusFilter('all')
    setTypeFilter('all')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this character from your vault?')) return

    await supabase.from('vault_characters').delete().eq('id', id)
    setVaultCharacters(vaultCharacters.filter((c) => c.id !== id))
    setContextMenu(null)
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

  const openCopyModal = (char: VaultCharacter) => {
    setCopyingCharacter(char)
    setIsCopyModalOpen(true)
    setContextMenu(null)
  }

  const handleContextMenu = (e: React.MouseEvent, char: VaultCharacter) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      character: char,
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
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="page-header flex items-center justify-between">
          <div>
            <h1 className="page-title">Character Vault</h1>
            <p className="page-subtitle">Store characters to reuse across campaigns</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => router.push('/vault/new')}
          >
            <Plus className="w-4 h-4" />
            Add Character
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-4 mb-10">
          <div className="flex gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[--text-tertiary] pointer-events-none" />
              <input
                type="text"
                className="form-input w-full"
                style={{ paddingLeft: '48px' }}
                placeholder="Search by name, race, class..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | 'pc' | 'npc')}
              className="px-4 py-2.5 bg-[--bg-elevated] border border-[--border] rounded-xl text-[--text-primary] focus:outline-none focus:border-[--arcane-purple] cursor-pointer"
              style={{ colorScheme: 'dark' }}
            >
              <option value="all" className="bg-[#1a1a24] text-white">All Types</option>
              <option value="pc" className="bg-[#1a1a24] text-white">Player Characters</option>
              <option value="npc" className="bg-[#1a1a24] text-white">NPCs</option>
            </select>

            {/* Status Filter */}
            {availableStatuses.length > 0 && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 bg-[--bg-elevated] border border-[--border] rounded-xl text-[--text-primary] focus:outline-none focus:border-[--arcane-purple] cursor-pointer"
                style={{ colorScheme: 'dark' }}
              >
                <option value="all" className="bg-[#1a1a24] text-white">All Statuses</option>
                {availableStatuses.map(status => (
                  <option key={status} value={status} className="bg-[#1a1a24] text-white">{status}</option>
                ))}
              </select>
            )}
          </div>

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-[--text-tertiary]">Filters:</span>
              {typeFilter !== 'all' && (
                <span className="flex items-center gap-1 px-2 py-1 bg-[--arcane-purple]/20 text-[--arcane-purple] rounded-lg text-sm">
                  {typeFilter === 'pc' ? 'Player Characters' : 'NPCs'}
                  <button onClick={() => setTypeFilter('all')} className="hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="flex items-center gap-1 px-2 py-1 bg-[--arcane-purple]/20 text-[--arcane-purple] rounded-lg text-sm">
                  {statusFilter}
                  <button onClick={() => setStatusFilter('all')} className="hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                onClick={clearFilters}
                className="text-sm text-[--text-tertiary] hover:text-[--text-secondary] underline"
              >
                Clear all
              </button>
            </div>
          )}
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
              <button
                className="btn btn-primary"
                onClick={() => router.push('/vault/new')}
              >
                <Plus className="w-5 h-5" />
                Add Character
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCharacters.map((char, index) => (
              <div
                key={char.id}
                className="animate-slide-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
                onContextMenu={(e) => handleContextMenu(e, char)}
              >
                <CharacterCard
                  character={char}
                  onClick={() => router.push(`/vault/${char.id}`)}
                />
              </div>
            ))}
          </div>
        )}

        {/* FAB */}
        {filteredCharacters.length > 0 && (
          <button
            className="fab"
            onClick={() => router.push('/vault/new')}
            aria-label="Add character"
          >
            <Plus className="fab-icon" />
          </button>
        )}

        {/* Context Menu */}
        {contextMenu && (
          <div
            className="fixed z-50 py-2 min-w-[180px] rounded-xl shadow-xl"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
              backgroundColor: '#1a1a24',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="w-full px-4 py-2.5 text-left text-sm text-[--text-primary] hover:bg-[--bg-hover] flex items-center gap-3 transition-colors"
              onClick={() => openCopyModal(contextMenu.character)}
            >
              <Copy className="w-4 h-4 text-[--text-secondary]" />
              Copy to Campaign
            </button>
            <div className="my-1 border-t border-[--border]" />
            <button
              className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-3 transition-colors"
              onClick={() => handleDelete(contextMenu.character.id)}
            >
              <Trash2 className="w-4 h-4" />
              Delete Character
            </button>
          </div>
        )}

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
