'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, BookOpen, Trash2, Copy, Filter, X, CheckSquare, Square, CopyPlus, Check, LayoutGrid, Grid3X3, User, FileUp, PenLine, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import { Modal, Dropdown } from '@/components/ui'
import { AppLayout } from '@/components/layout/app-layout'
import { CharacterCard } from '@/components/vault/CharacterCard'
import { useSupabase, useUser } from '@/hooks'
import { cn, getInitials } from '@/lib/utils'
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

  // Multi-select state
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // View mode state
  const [viewMode, setViewMode] = useState<'cards' | 'gallery'>('cards')

  // Gallery lightbox state
  const [lightboxCharacter, setLightboxCharacter] = useState<VaultCharacter | null>(null)

  // Add character modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

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

  // Multi-select handlers
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectAll = () => {
    setSelectedIds(new Set(filteredCharacters.map(c => c.id)))
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
    setSelectionMode(false)
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return

    const count = selectedIds.size
    if (!confirm(`Are you sure you want to delete ${count} character${count === 1 ? '' : 's'} from your vault?`)) return

    const ids = Array.from(selectedIds)
    await supabase.from('vault_characters').delete().in('id', ids)
    setVaultCharacters(prev => prev.filter(c => !selectedIds.has(c.id)))
    toast.success(`Deleted ${count} character${count === 1 ? '' : 's'}`)
    clearSelection()
  }

  const handleBulkDuplicate = async () => {
    if (selectedIds.size === 0) return

    setSaving(true)
    const charactersToDuplicate = vaultCharacters.filter(c => selectedIds.has(c.id))

    const duplicates = charactersToDuplicate.map(char => ({
      user_id: user!.id,
      name: `${char.name} (Copy)`,
      type: char.type,
      summary: char.summary,
      notes: char.notes,
      image_url: char.image_url,
      detail_image_url: (char as any).detail_image_url,
      race: char.race,
      class: char.class,
      status: char.status,
    }))

    const { data, error } = await supabase
      .from('vault_characters')
      .insert(duplicates)
      .select()

    if (!error && data) {
      setVaultCharacters(prev => [...data, ...prev])
      toast.success(`Duplicated ${data.length} character${data.length === 1 ? '' : 's'}`)
      clearSelection()
    } else {
      toast.error('Failed to duplicate characters')
    }
    setSaving(false)
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
          <div className="flex items-center gap-3">
            {/* View mode toggle */}
            {vaultCharacters.length > 0 && (
              <div className="flex items-center gap-1 p-1 bg-[--bg-elevated] rounded-lg border border-[--border]">
                <button
                  onClick={() => setViewMode('cards')}
                  className={cn(
                    'p-2 rounded transition-colors',
                    viewMode === 'cards' ? 'bg-[--arcane-purple] text-white' : 'text-[--text-secondary] hover:text-[--text-primary]'
                  )}
                  title="Card view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('gallery')}
                  className={cn(
                    'p-2 rounded transition-colors',
                    viewMode === 'gallery' ? 'bg-[--arcane-purple] text-white' : 'text-[--text-secondary] hover:text-[--text-primary]'
                  )}
                  title="Gallery view"
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
              </div>
            )}
            {vaultCharacters.length > 0 && (
              <button
                className={cn(
                  "btn btn-secondary",
                  selectionMode && "ring-2 ring-[--arcane-purple] ring-offset-2 ring-offset-[--bg-base]"
                )}
                onClick={() => {
                  if (selectionMode) {
                    clearSelection()
                  } else {
                    setSelectionMode(true)
                  }
                }}
              >
                {selectionMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                {selectionMode ? 'Cancel' : 'Select'}
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Add Character
            </button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectionMode && selectedIds.size > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-[--arcane-purple]/10 border border-[--arcane-purple]/30 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-medium text-[--arcane-purple]">
                {selectedIds.size} selected
              </span>
              <button
                onClick={selectAll}
                className="text-sm text-[--text-secondary] hover:text-[--text-primary] underline"
              >
                Select all ({filteredCharacters.length})
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-sm text-[--text-secondary] hover:text-[--text-primary] underline"
              >
                Clear selection
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="btn btn-secondary flex items-center gap-2"
                onClick={handleBulkDuplicate}
                disabled={saving}
              >
                <CopyPlus className="w-4 h-4" />
                Duplicate
              </button>
              <button
                className="btn bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 flex items-center gap-2"
                onClick={handleBulkDelete}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        )}

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
                onClick={() => setIsAddModalOpen(true)}
              >
                <Plus className="w-5 h-5" />
                Add Character
              </button>
            )}
          </div>
        ) : viewMode === 'cards' ? (
          /* Card View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCharacters.map((char, index) => {
              const isSelected = selectedIds.has(char.id)
              return (
                <div
                  key={char.id}
                  className={cn(
                    "animate-slide-in-up relative",
                    selectionMode && isSelected && "ring-2 ring-[--arcane-purple] ring-offset-2 ring-offset-[--bg-base] rounded-xl"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                  onContextMenu={(e) => !selectionMode && handleContextMenu(e, char)}
                >
                  {/* Selection checkbox overlay */}
                  {selectionMode && (
                    <button
                      className="absolute top-3 left-3 z-10 w-6 h-6 rounded-md flex items-center justify-center transition-colors"
                      style={{
                        backgroundColor: isSelected ? 'var(--arcane-purple)' : 'rgba(26, 26, 36, 0.9)',
                        border: isSelected ? 'none' : '2px solid rgba(255, 255, 255, 0.2)',
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleSelection(char.id)
                      }}
                    >
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </button>
                  )}
                  <CharacterCard
                    character={char}
                    onClick={() => {
                      if (selectionMode) {
                        toggleSelection(char.id)
                      } else {
                        router.push(`/vault/${char.id}`)
                      }
                    }}
                  />
                </div>
              )
            })}
          </div>
        ) : (
          /* Gallery View */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredCharacters.map((char, index) => {
              const isSelected = selectedIds.has(char.id)
              const imageUrl = (char as any).detail_image_url || char.image_url
              return (
                <div
                  key={char.id}
                  className={cn(
                    "animate-slide-in-up relative group",
                    selectionMode && isSelected && "ring-2 ring-[--arcane-purple] ring-offset-2 ring-offset-[--bg-base] rounded-xl"
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
                  onContextMenu={(e) => !selectionMode && handleContextMenu(e, char)}
                >
                  {/* Selection checkbox overlay */}
                  {selectionMode && (
                    <button
                      className="absolute top-2 left-2 z-10 w-5 h-5 rounded flex items-center justify-center transition-colors"
                      style={{
                        backgroundColor: isSelected ? 'var(--arcane-purple)' : 'rgba(26, 26, 36, 0.9)',
                        border: isSelected ? 'none' : '2px solid rgba(255, 255, 255, 0.2)',
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleSelection(char.id)
                      }}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </button>
                  )}
                  <div
                    className="aspect-[2/3] rounded-xl overflow-hidden bg-[--bg-elevated] border border-[--border] hover:border-[--arcane-purple]/50 transition-all cursor-pointer"
                    onClick={() => {
                      if (selectionMode) {
                        toggleSelection(char.id)
                      } else {
                        setLightboxCharacter(char)
                      }
                    }}
                  >
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={char.name}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-[--bg-hover]">
                        <User className="w-12 h-12 text-[--text-tertiary] mb-2" />
                        <span className="text-2xl font-bold text-[--text-tertiary]">
                          {getInitials(char.name)}
                        </span>
                      </div>
                    )}
                    {/* Hover overlay with name */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="text-white text-sm font-medium truncate">{char.name}</p>
                        <p className="text-white/70 text-xs">{char.type === 'pc' ? 'PC' : 'NPC'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* FAB */}
        {filteredCharacters.length > 0 && (
          <button
            className="fab"
            onClick={() => setIsAddModalOpen(true)}
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

        {/* Gallery Lightbox */}
        {lightboxCharacter && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightboxCharacter(null)}
          >
            <button
              onClick={() => setLightboxCharacter(null)}
              className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <div
              className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                {((lightboxCharacter as any).detail_image_url || lightboxCharacter.image_url) ? (
                  <img
                    src={(lightboxCharacter as any).detail_image_url || lightboxCharacter.image_url}
                    alt={lightboxCharacter.name}
                    className="max-w-full max-h-[75vh] object-contain rounded-lg"
                  />
                ) : (
                  <div className="w-64 h-96 bg-[--bg-elevated] rounded-lg flex flex-col items-center justify-center">
                    <User className="w-24 h-24 text-[--text-tertiary] mb-4" />
                    <span className="text-4xl font-bold text-[--text-tertiary]">
                      {getInitials(lightboxCharacter.name)}
                    </span>
                  </div>
                )}
              </div>
              <div className="mt-4 text-center">
                <h3 className="text-xl font-semibold text-white">{lightboxCharacter.name}</h3>
                <p className="text-white/70 text-sm mt-1">
                  {lightboxCharacter.type === 'pc' ? 'Player Character' : 'NPC'}
                  {lightboxCharacter.race && ` • ${lightboxCharacter.race}`}
                  {lightboxCharacter.class && ` • ${lightboxCharacter.class}`}
                </p>
                <button
                  onClick={() => {
                    setLightboxCharacter(null)
                    router.push(`/vault/${lightboxCharacter.id}`)
                  }}
                  className="mt-4 btn btn-primary"
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Character Modal */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Add Character"
          description="How would you like to create your character?"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Import with AI */}
            <button
              onClick={() => {
                setIsAddModalOpen(false)
                router.push('/vault/import')
              }}
              className="group p-6 rounded-xl border border-[--border] bg-[--bg-elevated] hover:border-[--arcane-purple]/50 hover:bg-[--arcane-purple]/5 transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-[--arcane-purple]/20 flex items-center justify-center mb-4 group-hover:bg-[--arcane-purple]/30 transition-colors">
                <Sparkles className="w-6 h-6 text-[--arcane-purple]" />
              </div>
              <h3 className="font-semibold text-[--text-primary] mb-1">Import with AI</h3>
              <p className="text-sm text-[--text-secondary]">
                Upload a document (.docx, .pdf, image) and let AI extract your character data
              </p>
            </button>

            {/* Create from Scratch */}
            <button
              onClick={() => {
                setIsAddModalOpen(false)
                router.push('/vault/new')
              }}
              className="group p-6 rounded-xl border border-[--border] bg-[--bg-elevated] hover:border-[--arcane-purple]/50 hover:bg-[--arcane-purple]/5 transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4 group-hover:bg-emerald-500/30 transition-colors">
                <PenLine className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="font-semibold text-[--text-primary] mb-1">Create from Scratch</h3>
              <p className="text-sm text-[--text-secondary]">
                Start with a blank editor and build your character manually
              </p>
            </button>
          </div>
        </Modal>
      </div>
    </AppLayout>
  )
}
