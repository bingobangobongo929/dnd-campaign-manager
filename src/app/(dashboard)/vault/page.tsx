'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Trash2, Copy, X, CheckSquare, Square, CopyPlus, Check, LayoutGrid, Grid3X3, PenLine, Sparkles, Star, Play, ChevronRight, User, Eye, BookOpen, Filter } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import { Modal, Dropdown } from '@/components/ui'
import { AppLayout } from '@/components/layout/app-layout'
import { BackToTopButton } from '@/components/ui/back-to-top'
import { CharacterCard } from '@/components/vault/CharacterCard'
import { useSupabase, useUser, useIsMobile } from '@/hooks'
import { VaultPageMobile } from './page.mobile'
import { cn, getInitials } from '@/lib/utils'
import type { VaultCharacter, Campaign } from '@/types/database'

export default function VaultPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()
  const isMobile = useIsMobile()

  const [vaultCharacters, setVaultCharacters] = useState<VaultCharacter[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'pc' | 'npc'>('all')
  const [sortBy, setSortBy] = useState<'updated' | 'name' | 'type' | 'created'>('updated')

  // Pinned characters (stored in localStorage)
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set())

  // Load pinned from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('vault-pinned-characters')
    if (stored) {
      try {
        setPinnedIds(new Set(JSON.parse(stored)))
      } catch {
        // Invalid stored data, ignore
      }
    }
  }, [])

  // Save pinned to localStorage when it changes
  const togglePinned = (id: string) => {
    setPinnedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      localStorage.setItem('vault-pinned-characters', JSON.stringify([...next]))
      return next
    })
  }

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

  // Filter and sort characters
  const filteredCharacters = useMemo(() => {
    let filtered = vaultCharacters.filter((char) => {
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

    // Sort
    filtered.sort((a, b) => {
      // 1. Pinned always first
      const aPinned = pinnedIds.has(a.id)
      const bPinned = pinnedIds.has(b.id)
      if (aPinned && !bPinned) return -1
      if (!aPinned && bPinned) return 1

      // 2. Active status before Retired (case-insensitive)
      const aStatus = (a.status || '').toLowerCase()
      const bStatus = (b.status || '').toLowerCase()
      const aIsActive = aStatus === 'active'
      const bIsActive = bStatus === 'active'
      const aIsRetired = aStatus === 'retired'
      const bIsRetired = bStatus === 'retired'

      // Active comes first
      if (aIsActive && !bIsActive) return -1
      if (!aIsActive && bIsActive) return 1
      // Retired comes last (after everything else)
      if (aIsRetired && !bIsRetired) return 1
      if (!aIsRetired && bIsRetired) return -1

      // 3. Then by selected sort
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'type':
          // PCs first, then NPCs, then alphabetically within type
          if (a.type !== b.type) return a.type === 'pc' ? -1 : 1
          return a.name.localeCompare(b.name)
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'updated':
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      }
    })

    return filtered
  }, [vaultCharacters, searchQuery, statusFilter, typeFilter, sortBy, pinnedIds])

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

  // Mobile state for filter sheet
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-10 h-10 border-2 border-[--arcane-purple] border-t-transparent rounded-full spinner" />
        </div>
      </AppLayout>
    )
  }

  // ============ MOBILE LAYOUT ============
  if (isMobile) {
    return (
      <VaultPageMobile
        filteredCharacters={filteredCharacters}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        availableStatuses={availableStatuses}
        isFilterSheetOpen={isFilterSheetOpen}
        setIsFilterSheetOpen={setIsFilterSheetOpen}
        isAddModalOpen={isAddModalOpen}
        setIsAddModalOpen={setIsAddModalOpen}
        onNavigate={(path) => router.push(path)}
      />
    )
  }

  // ============ DESKTOP LAYOUT ============
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-white">Character Vault</h1>
            <p className="text-gray-400 mt-1">Your characters and their stories</p>
          </div>
          <div className="flex items-center gap-3">
            {/* View mode toggle */}
            {vaultCharacters.length > 0 && (
              <div className="flex items-center gap-1 p-1 bg-gray-900/50 rounded-lg border border-white/[0.06]">
                <button
                  onClick={() => setViewMode('cards')}
                  className={cn(
                    'p-2 rounded transition-colors',
                    viewMode === 'cards' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                  )}
                  title="Card view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('gallery')}
                  className={cn(
                    'p-2 rounded transition-colors',
                    viewMode === 'gallery' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
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
                  "flex items-center gap-2 px-4 py-2.5 bg-gray-900/50 border border-white/[0.06] text-gray-300 font-medium rounded-xl hover:border-purple-500/30 transition-colors",
                  selectionMode && "border-purple-500/50 text-purple-300"
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
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-colors"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus className="w-5 h-5" />
              Add Character
            </button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectionMode && selectedIds.size > 0 && (
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-medium text-purple-400">
                {selectedIds.size} selected
              </span>
              <button
                onClick={selectAll}
                className="text-sm text-gray-400 hover:text-white underline"
              >
                Select all ({filteredCharacters.length})
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-sm text-gray-400 hover:text-white underline"
              >
                Clear selection
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-2 px-4 py-2 bg-gray-900/50 border border-white/[0.06] text-gray-300 font-medium rounded-lg hover:border-purple-500/30 transition-colors"
                onClick={handleBulkDuplicate}
                disabled={saving}
              >
                <CopyPlus className="w-4 h-4" />
                Duplicate
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 font-medium rounded-lg hover:bg-red-500/20 transition-colors"
                onClick={handleBulkDelete}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        {vaultCharacters.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                <input
                  type="text"
                  className="w-full pl-12 pr-4 py-2.5 bg-gray-900/50 border border-white/[0.06] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
                  placeholder="Search by name, race, class..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'all' | 'pc' | 'npc')}
                className="px-4 py-2.5 bg-gray-900/50 border border-white/[0.06] rounded-xl text-gray-300 focus:outline-none focus:border-purple-500/50 cursor-pointer transition-colors"
                style={{ colorScheme: 'dark' }}
              >
                <option value="all" className="bg-gray-900 text-white">All Types</option>
                <option value="pc" className="bg-gray-900 text-white">Player Characters</option>
                <option value="npc" className="bg-gray-900 text-white">NPCs</option>
              </select>

              {/* Status Filter */}
              {availableStatuses.length > 0 && (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2.5 bg-gray-900/50 border border-white/[0.06] rounded-xl text-gray-300 focus:outline-none focus:border-purple-500/50 cursor-pointer transition-colors"
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="all" className="bg-gray-900 text-white">All Statuses</option>
                  {availableStatuses.map(status => (
                    <option key={status} value={status} className="bg-gray-900 text-white">{status}</option>
                  ))}
                </select>
              )}

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'updated' | 'name' | 'type' | 'created')}
                className="px-4 py-2.5 bg-gray-900/50 border border-white/[0.06] rounded-xl text-gray-300 focus:outline-none focus:border-purple-500/50 cursor-pointer transition-colors"
                style={{ colorScheme: 'dark' }}
              >
                <option value="updated" className="bg-gray-900 text-white">Recently Updated</option>
                <option value="created" className="bg-gray-900 text-white">Recently Created</option>
                <option value="name" className="bg-gray-900 text-white">Name (A-Z)</option>
                <option value="type" className="bg-gray-900 text-white">Type (PCs First)</option>
              </select>
            </div>

            {/* Active Filters */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Filters:</span>
                {typeFilter !== 'all' && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-sm">
                    {typeFilter === 'pc' ? 'Player Characters' : 'NPCs'}
                    <button onClick={() => setTypeFilter('all')} className="hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {statusFilter !== 'all' && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-sm">
                    {statusFilter}
                    <button onClick={() => setStatusFilter('all')} className="hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-500 hover:text-gray-300 underline"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}

        {/* Featured Character (Hero) */}
        {filteredCharacters.length > 0 && !searchQuery && !selectionMode && (() => {
          const featuredChar = filteredCharacters[0]
          const heroImageUrl = featuredChar.image_url // Use 16:9 card image for hero
          const summaryText = featuredChar.summary?.replace(/<[^>]*>/g, '') || ''

          return (
            <section className="group relative">
              <button
                onClick={() => router.push(`/vault/${featuredChar.id}`)}
                className="relative block w-full text-left rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-950 border border-white/[0.06] hover:border-purple-500/30 transition-all duration-500"
              >
                <div className="relative h-[300px] md:h-[400px]">
                  {heroImageUrl ? (
                    <>
                      <Image
                        src={heroImageUrl}
                        alt={featuredChar.name}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        priority
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-gray-900 to-gray-950 flex items-center justify-center">
                      <User className="w-32 h-32 text-purple-400/20" />
                    </div>
                  )}

                  {/* Content Overlay */}
                  <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-12">
                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      {featuredChar.status && (
                        <span
                          className="px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full"
                          style={{
                            backgroundColor: featuredChar.status_color || '#8B5CF6',
                            color: 'white',
                          }}
                        >
                          {featuredChar.status}
                        </span>
                      )}
                      {(featuredChar.race || featuredChar.class) && (
                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-white/10 text-gray-300">
                          {[featuredChar.race, featuredChar.class].filter(Boolean).join(' • ')}
                        </span>
                      )}
                    </div>

                    <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-3 group-hover:text-purple-400 transition-colors">
                      {featuredChar.name}
                    </h2>

                    {summaryText && (
                      <p className="text-gray-300 text-base md:text-lg max-w-2xl line-clamp-2 mb-4">
                        {summaryText}
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-purple-400 font-medium">
                      <Eye className="w-5 h-5" />
                      <span>View Character</span>
                      <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </button>

              {/* Quick action buttons */}
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  onClick={(e) => { e.stopPropagation(); router.push(`/vault/${featuredChar.id}/sessions`) }}
                  className="p-2.5 bg-black/70 backdrop-blur-sm rounded-lg hover:bg-purple-500 transition-colors"
                  title="Sessions"
                >
                  <BookOpen className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); togglePinned(featuredChar.id) }}
                  className={cn(
                    "p-2.5 backdrop-blur-sm rounded-lg transition-colors",
                    pinnedIds.has(featuredChar.id)
                      ? "bg-amber-500 hover:bg-amber-600"
                      : "bg-black/70 hover:bg-purple-500"
                  )}
                  title={pinnedIds.has(featuredChar.id) ? "Unpin" : "Pin to top"}
                >
                  <Star className={cn("w-4 h-4 text-white", pinnedIds.has(featuredChar.id) && "fill-current")} />
                </button>
              </div>
            </section>
          )
        })()}

        {/* All Characters Section Header */}
        {filteredCharacters.length > 1 && !searchQuery && !selectionMode && (
          <h3 className="text-xl font-semibold text-white">All Characters</h3>
        )}

        {/* Characters Grid */}
        {filteredCharacters.length === 0 ? (
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-purple-900/20 via-gray-900 to-gray-950 border border-white/[0.06] p-16 text-center">
            {searchQuery ? (
              <>
                <Search className="w-20 h-20 mx-auto mb-6 text-purple-400/50" />
                <h2 className="text-2xl font-display font-bold text-white mb-3">
                  No matching characters
                </h2>
                <p className="text-gray-400 mb-8 max-w-md mx-auto">
                  Try a different search term or adjust your filters.
                </p>
                <button
                  onClick={() => { setSearchQuery(''); clearFilters(); }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                  Clear Search
                </button>
              </>
            ) : (
              <>
                <Sparkles className="w-20 h-20 mx-auto mb-6 text-purple-400/50" />
                <h2 className="text-2xl font-display font-bold text-white mb-3">
                  Your Vault Awaits
                </h2>
                <p className="text-gray-400 mb-8 max-w-md mx-auto">
                  Create characters once and reuse them across all your campaigns. Import from documents or build from scratch.
                </p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add Your First Character
                </button>
              </>
            )}
          </div>
        ) : viewMode === 'cards' ? (
          /* Card View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCharacters.map((char, index) => {
              const isSelected = selectedIds.has(char.id)
              const isPinned = pinnedIds.has(char.id)
              return (
                <div
                  key={char.id}
                  className={cn(
                    "relative",
                    selectionMode && isSelected && "ring-2 ring-purple-500 ring-offset-2 ring-offset-gray-950 rounded-xl"
                  )}
                >
                  {/* Selection checkbox overlay */}
                  {selectionMode && (
                    <button
                      className={cn(
                        "absolute top-3 left-3 z-30 w-6 h-6 rounded-md flex items-center justify-center transition-colors",
                        isSelected ? "bg-purple-500" : "bg-black/70 border-2 border-white/20"
                      )}
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
                    isPinned={isPinned}
                    onClick={() => {
                      if (selectionMode) {
                        toggleSelection(char.id)
                      } else {
                        router.push(`/vault/${char.id}`)
                      }
                    }}
                    onView={() => router.push(`/vault/${char.id}`)}
                    onSessions={() => router.push(`/vault/${char.id}/sessions`)}
                    onPin={() => togglePinned(char.id)}
                    onContextMenu={(e) => !selectionMode && handleContextMenu(e, char)}
                  />
                </div>
              )
            })}
          </div>
        ) : (
          /* Gallery View - Movie Poster Style */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {filteredCharacters.map((char) => {
              const isSelected = selectedIds.has(char.id)
              const isPinned = pinnedIds.has(char.id)
              const imageUrl = (char as any).detail_image_url || char.image_url
              return (
                <div
                  key={char.id}
                  className={cn(
                    "relative group",
                    selectionMode && isSelected && "ring-2 ring-purple-500 ring-offset-2 ring-offset-gray-950 rounded-xl",
                    isPinned && !selectionMode && "ring-2 ring-amber-500/50 rounded-xl"
                  )}
                  onContextMenu={(e) => !selectionMode && handleContextMenu(e, char)}
                >
                  {/* Pinned ribbon */}
                  {isPinned && !selectionMode && (
                    <div className="absolute top-0 left-0 z-10">
                      <div className="w-8 h-8 overflow-hidden">
                        <div className="absolute top-[4px] left-[-14px] w-[40px] bg-amber-500 text-center transform -rotate-45 shadow-sm">
                          <Star className="w-2 h-2 text-white fill-white mx-auto" />
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Selection checkbox overlay */}
                  {selectionMode && (
                    <button
                      className={cn(
                        "absolute top-2 left-2 z-10 w-5 h-5 rounded flex items-center justify-center transition-colors",
                        isSelected ? "bg-purple-500" : "bg-black/70 border-2 border-white/20"
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleSelection(char.id)
                      }}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </button>
                  )}
                  <div
                    className="aspect-[2/3] rounded-xl overflow-hidden bg-gray-900/50 border border-white/[0.06] hover:border-purple-500/40 transition-all cursor-pointer"
                    onClick={() => {
                      if (selectionMode) {
                        toggleSelection(char.id)
                      } else {
                        setLightboxCharacter(char)
                      }
                    }}
                  >
                    {imageUrl ? (
                      <>
                        <Image
                          src={imageUrl}
                          alt={char.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-900/30 to-gray-900">
                        <span className="text-4xl font-bold text-purple-400/30">
                          {getInitials(char.name)}
                        </span>
                      </div>
                    )}

                    {/* Content at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h4 className="font-semibold text-white text-sm line-clamp-2 group-hover:text-purple-300 transition-colors">
                        {char.name}
                      </h4>
                      {(char.race || char.class) && (
                        <p className="text-[11px] text-gray-400 mt-1 line-clamp-1">
                          {[char.race, char.class].filter(Boolean).join(' • ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Context Menu */}
        {contextMenu && (
          <div
            className="fixed z-50 py-2 min-w-[180px] rounded-xl shadow-xl bg-gray-900 border border-white/10"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="w-full px-4 py-2.5 text-left text-sm text-gray-200 hover:bg-white/5 flex items-center gap-3 transition-colors"
              onClick={() => {
                togglePinned(contextMenu.character.id)
                setContextMenu(null)
              }}
            >
              <Star className={cn('w-4 h-4', pinnedIds.has(contextMenu.character.id) ? 'text-amber-400 fill-amber-400' : 'text-gray-500')} />
              {pinnedIds.has(contextMenu.character.id) ? 'Unpin from Top' : 'Pin to Top'}
            </button>
            <button
              className="w-full px-4 py-2.5 text-left text-sm text-gray-200 hover:bg-white/5 flex items-center gap-3 transition-colors"
              onClick={() => openCopyModal(contextMenu.character)}
            >
              <Copy className="w-4 h-4 text-gray-500" />
              Copy to Campaign
            </button>
            <div className="my-1 border-t border-white/[0.06]" />
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
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setLightboxCharacter(null)}
          >
            <button
              onClick={() => setLightboxCharacter(null)}
              className="absolute top-4 right-4 p-2.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
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
                    className="max-w-full max-h-[75vh] object-contain rounded-xl"
                  />
                ) : (
                  <div className="w-64 h-96 bg-gradient-to-br from-purple-900/30 to-gray-900 rounded-xl flex flex-col items-center justify-center">
                    <span className="text-6xl font-bold text-purple-400/30">
                      {getInitials(lightboxCharacter.name)}
                    </span>
                  </div>
                )}
              </div>
              <div className="mt-6 text-center">
                <h3 className="text-2xl font-display font-bold text-white">{lightboxCharacter.name}</h3>
                <p className="text-gray-400 text-sm mt-2">
                  {lightboxCharacter.type === 'pc' ? 'Player Character' : 'NPC'}
                  {lightboxCharacter.race && ` • ${lightboxCharacter.race}`}
                  {lightboxCharacter.class && ` • ${lightboxCharacter.class}`}
                </p>
                <button
                  onClick={() => {
                    setLightboxCharacter(null)
                    router.push(`/vault/${lightboxCharacter.id}`)
                  }}
                  className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-colors"
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
              className="group p-6 rounded-xl border border-white/[0.06] bg-gray-900/50 hover:border-purple-500/30 hover:bg-purple-500/5 transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4 group-hover:bg-purple-500/30 transition-colors">
                <Sparkles className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="font-semibold text-white mb-1">Import with AI</h3>
              <p className="text-sm text-gray-400">
                Upload a document (.docx, .pdf, image) and let AI extract your character data
              </p>
            </button>

            {/* Create from Scratch */}
            <button
              onClick={() => {
                setIsAddModalOpen(false)
                router.push('/vault/new')
              }}
              className="group p-6 rounded-xl border border-white/[0.06] bg-gray-900/50 hover:border-purple-500/30 hover:bg-purple-500/5 transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4 group-hover:bg-emerald-500/30 transition-colors">
                <PenLine className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="font-semibold text-white mb-1">Create from Scratch</h3>
              <p className="text-sm text-gray-400">
                Start with a blank editor and build your character manually
              </p>
            </button>
          </div>
        </Modal>
      </div>
      <BackToTopButton />
    </AppLayout>
  )
}
