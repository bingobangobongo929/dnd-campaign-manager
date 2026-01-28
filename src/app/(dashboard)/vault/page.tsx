'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Trash2, Copy, X, CheckSquare, Square, CopyPlus, Check, LayoutGrid, Grid3X3, PenLine, Sparkles, Star, Play, ChevronRight, User, Eye, BookOpen, Filter, Bookmark, RotateCcw, Swords, Users, Settings, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import { Modal, Dropdown, PageCustomizeModal } from '@/components/ui'
import type { TabConfig as ModalTabConfig, PagePreferences as ModalPagePreferences } from '@/components/ui/PageCustomizeModal'
import { AppLayout } from '@/components/layout/app-layout'
import { BackToTopButton } from '@/components/ui/back-to-top'
import { CharacterCard } from '@/components/vault/CharacterCard'
import { InPlayTabView } from '@/components/vault/InPlayTabView'
import { useSupabase, useUser, useIsMobile } from '@/hooks'
import { useCanUseAI } from '@/store'
import { VaultPageMobile } from './page.mobile'
import { cn, getInitials, formatDate } from '@/lib/utils'
import type { VaultCharacter, Campaign, ContentSave, VaultPagePreferences, VaultPageTabId } from '@/types/database'
import { DEFAULT_VAULT_PAGE_PREFERENCES } from '@/types/database'
import { TemplateStateBadge } from '@/components/templates'
import { TabNavigation, VAULT_TABS, type ContentTab } from '@/components/navigation'

interface TemplateSnapshot {
  id: string
  content_id: string
  version: number
  version_name?: string
  is_public: boolean
  published_at: string
  save_count: number
  view_count?: number
  snapshot_data: any
}

export default function VaultPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()
  const isMobile = useIsMobile()
  const canUseAI = useCanUseAI()

  const [vaultCharacters, setVaultCharacters] = useState<VaultCharacter[]>([])
  const [savedCharacters, setSavedCharacters] = useState<ContentSave[]>([])
  const [templateSnapshots, setTemplateSnapshots] = useState<TemplateSnapshot[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [activeTab, setActiveTab] = useState<ContentTab>('all')
  const [subFilter, setSubFilter] = useState<ContentTab>('my-templates')
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

  // Page preferences
  const [preferences, setPreferences] = useState<VaultPagePreferences>(DEFAULT_VAULT_PAGE_PREFERENCES)
  const [customizeModalOpen, setCustomizeModalOpen] = useState(false)

  // Gallery lightbox state
  const [lightboxCharacter, setLightboxCharacter] = useState<VaultCharacter | null>(null)

  // Add character modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  // Load user preferences
  useEffect(() => {
    if (!user) return
    const loadPreferences = async () => {
      const { data } = await supabase
        .from('user_settings')
        .select('vault_page_preferences')
        .eq('user_id', user.id)
        .single()

      if (data?.vault_page_preferences) {
        const prefs = data.vault_page_preferences as VaultPagePreferences
        setPreferences(prefs)
        setActiveTab(prefs.default_tab as ContentTab || 'all')
        if (prefs.view_mode) setViewMode(prefs.view_mode)
      }
    }
    loadPreferences()
  }, [user])

  const savePreferences = async (newPrefs: ModalPagePreferences<VaultPageTabId>) => {
    const prefs: VaultPagePreferences = {
      ...newPrefs,
      view_mode: viewMode,
    }
    setPreferences(prefs)

    await supabase
      .from('user_settings')
      .upsert({
        user_id: user!.id,
        vault_page_preferences: prefs,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
  }

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
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })

    setVaultCharacters(charactersData || [])

    const { data: campaignsData } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', user!.id)
      .order('name')

    setCampaigns(campaignsData || [])

    // Load template snapshots (My Templates tab)
    const { data: snapshotsData } = await supabase
      .from('template_snapshots')
      .select('*')
      .eq('user_id', user!.id)
      .eq('content_type', 'character')
      .order('published_at', { ascending: false })

    setTemplateSnapshots(snapshotsData || [])

    // Load saved characters from others
    const savedResponse = await fetch('/api/templates/saved?type=character')
    if (savedResponse.ok) {
      const savedData = await savedResponse.json()
      setSavedCharacters(savedData.saves || [])
    }

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

  // Filter characters by tab
  const activeCharacters = useMemo(() =>
    vaultCharacters.filter(c => c.content_mode === 'active' || !c.content_mode),
    [vaultCharacters]
  )

  const inactiveCharacters = useMemo(() =>
    vaultCharacters.filter(c => c.content_mode === 'inactive'),
    [vaultCharacters]
  )

  // In-play characters - characters linked to active campaigns
  const inPlayCharacters = useMemo(() =>
    vaultCharacters.filter(c => c.linked_campaign_id),
    [vaultCharacters]
  )

  // Group snapshots by content_id to get unique templates
  const uniqueTemplateContentIds = useMemo(() =>
    new Set(templateSnapshots.map(s => s.content_id)),
    [templateSnapshots]
  )

  // Get counts for tabs
  const tabCounts = useMemo(() => ({
    all: activeCharacters.length + inPlayCharacters.length + savedCharacters.length + templateSnapshots.length,
    'my-characters': activeCharacters.length,
    'in-play': inPlayCharacters.length,
    collection: templateSnapshots.length + savedCharacters.length,
    discover: 0, // Coming soon
  }), [activeCharacters, inPlayCharacters, savedCharacters, templateSnapshots])

  // Hero character for the "all" tab - most recently updated character
  const heroCharacter = useMemo(() => {
    const allChars = [...activeCharacters, ...inPlayCharacters]
    if (allChars.length === 0) return null
    return allChars.sort((a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )[0]
  }, [activeCharacters, inPlayCharacters])

  // Tab config for customize modal
  const VAULT_TAB_CONFIG: ModalTabConfig<VaultPageTabId>[] = [
    { id: 'all', label: 'All', icon: <User className="w-4 h-4" />, color: 'text-gray-400' },
    { id: 'my-characters', label: 'My Characters', icon: <User className="w-4 h-4" />, color: 'text-emerald-400' },
    { id: 'in-play', label: 'In-Play', icon: <Swords className="w-4 h-4" />, color: 'text-purple-400' },
    { id: 'collection', label: 'Collection', icon: <Bookmark className="w-4 h-4" />, color: 'text-blue-400' },
    { id: 'discover', label: 'Discover', icon: <Sparkles className="w-4 h-4" />, color: 'text-purple-400', comingSoon: true },
  ]

  // Create tabs with counts, respecting preference ordering
  const tabsWithCounts = useMemo(() => {
    const baseTabs = VAULT_TABS.map(tab => ({
      ...tab,
      count: tabCounts[tab.value as keyof typeof tabCounts] ?? 0,
      subFilters: tab.subFilters?.map(sf => ({
        ...sf,
        count: sf.value === 'my-templates' ? templateSnapshots.length : savedCharacters.length,
      })),
    }))

    // If auto_order is on, sort by count (highest first), keeping 'all' first and 'discover' last
    if (preferences.auto_order) {
      return baseTabs.sort((a, b) => {
        if (a.value === 'all') return -1
        if (b.value === 'all') return 1
        if (a.value === 'discover') return 1
        if (b.value === 'discover') return -1
        return (b.count ?? 0) - (a.count ?? 0)
      })
    }

    // Otherwise, use custom order from preferences
    const orderedTabs = preferences.tab_order
      .filter(tabId => !preferences.hidden_tabs.includes(tabId))
      .map(tabId => baseTabs.find(t => t.value === tabId))
      .filter(Boolean) as typeof baseTabs

    return orderedTabs
  }, [tabCounts, templateSnapshots, savedCharacters, preferences])

  const handleReactivate = async (characterId: string) => {
    const response = await fetch('/api/content/reactivate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentType: 'character',
        contentId: characterId,
      }),
    })

    if (response.ok) {
      loadData()
    }
  }

  // Get characters to display based on active tab
  const getCharactersForTab = () => {
    switch (activeTab) {
      case 'my-characters':
        return activeCharacters
      case 'in-play':
        return inPlayCharacters
      default:
        return activeCharacters
    }
  }

  // Filter and sort characters (within the tab-filtered list)
  const filteredCharacters = useMemo(() => {
    let filtered = getCharactersForTab().filter((char) => {
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
  }, [activeTab, activeCharacters, inPlayCharacters, searchQuery, statusFilter, typeFilter, sortBy, pinnedIds])

  const hasActiveFilters = statusFilter !== 'all' || typeFilter !== 'all'

  const clearFilters = () => {
    setStatusFilter('all')
    setTypeFilter('all')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Move this character to the recycle bin? You can restore it within 30 days.')) return

    const { error } = await supabase
      .from('vault_characters')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Delete error:', error)
      toast.error(`Failed to delete: ${error.message}`)
      return
    }

    setVaultCharacters(vaultCharacters.filter((c) => c.id !== id))
    setContextMenu(null)
    toast.success('Moved to recycle bin')
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
    if (!confirm(`Move ${count} character${count === 1 ? '' : 's'} to the recycle bin? You can restore them within 30 days.`)) return

    const ids = Array.from(selectedIds)
    await supabase
      .from('vault_characters')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', ids)
    setVaultCharacters(prev => prev.filter(c => !selectedIds.has(c.id)))
    toast.success(`Moved ${count} character${count === 1 ? '' : 's'} to recycle bin`)
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
          <Loader2 className="w-10 h-10 animate-spin text-[--arcane-purple]" />
        </div>
      </AppLayout>
    )
  }

  // ============ MOBILE LAYOUT ============
  if (isMobile) {
    return (
      <VaultPageMobile
        filteredCharacters={filteredCharacters}
        inPlayCharacters={inPlayCharacters}
        savedCharacters={savedCharacters}
        templateSnapshots={templateSnapshots}
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
        canUseAI={canUseAI}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        subFilter={subFilter}
        setSubFilter={setSubFilter}
        tabsWithCounts={tabsWithCounts}
        onReactivate={handleReactivate}
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
            <button
              onClick={() => setCustomizeModalOpen(true)}
              className="p-2.5 text-gray-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
              title="Customize page"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <TabNavigation
          value={activeTab}
          onChange={setActiveTab}
          tabs={tabsWithCounts}
          subFilter={subFilter}
          onSubFilterChange={setSubFilter}
        />

        {/* Discover Tab - Coming Soon */}
        {activeTab === 'discover' && (
          <div className="text-center py-16 bg-white/[0.02] border border-white/[0.06] rounded-xl">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-purple-400/50" />
            <h3 className="text-lg font-medium text-white mb-2">Community Coming Soon</h3>
            <p className="text-gray-400 max-w-sm mx-auto">
              Discover character templates shared by the community. Coming in a future update.
            </p>
          </div>
        )}

        {/* Collection Tab - My Templates and Saved */}
        {activeTab === 'collection' && (
          <div className="space-y-6">
            {/* My Templates sub-filter */}
            {subFilter === 'my-templates' && (
              templateSnapshots.length === 0 ? (
                <div className="text-center py-16 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 text-purple-400/50" />
                  <h3 className="text-lg font-medium text-white mb-2">No templates yet</h3>
                  <p className="text-gray-400 max-w-sm mx-auto">
                    Publish your characters as templates to share them with others.
                  </p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {templateSnapshots.map((snapshot) => {
                    const snapshotData = snapshot.snapshot_data || {}
                    const character = vaultCharacters.find(c => c.id === snapshot.content_id)
                    const imageUrl = snapshotData.image_url || character?.image_url
                    const name = snapshotData.name || character?.name || 'Untitled'
                    const race = snapshotData.race || character?.race
                    const charClass = snapshotData.class || character?.class
                    const charType = snapshotData.type || character?.type || 'pc'

                    return (
                      <button
                        key={snapshot.id}
                        onClick={() => router.push(`/vault/${snapshot.content_id}?fromTemplate=true`)}
                        className="group relative rounded-xl overflow-hidden bg-gray-900/50 border border-purple-500/20 hover:border-purple-500/40 transition-all text-left"
                      >
                        <div className="relative h-48 overflow-hidden">
                          {imageUrl ? (
                            <>
                              <Image
                                src={imageUrl}
                                alt={name}
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
                            </>
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 to-gray-900 flex items-center justify-center">
                              <User className="w-16 h-16 text-purple-400/30" />
                            </div>
                          )}
                          <div className="absolute top-3 left-3 flex gap-2">
                            {snapshot.is_public ? (
                              <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Public
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-500/20 text-gray-300 border border-gray-500/30">
                                Private
                              </span>
                            )}
                          </div>
                          {snapshot.save_count > 0 && (
                            <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg text-xs text-gray-300">
                              {snapshot.save_count} saves
                            </div>
                          )}
                        </div>
                        <div className="p-5">
                          <h4 className="font-display font-semibold text-lg text-white truncate group-hover:text-purple-400 transition-colors">
                            {name}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {[race, charClass].filter(Boolean).join(' • ') || (charType === 'pc' ? 'Player Character' : 'NPC')} • v{snapshot.version}
                            {snapshot.version_name && ` "${snapshot.version_name}"`}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            Published {formatDate(snapshot.published_at)}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            )}

            {/* Saved sub-filter */}
            {subFilter === 'saved' && (
              savedCharacters.length === 0 ? (
                <div className="text-center py-16 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                  <Bookmark className="w-12 h-12 mx-auto mb-4 text-purple-400/50" />
                  <h3 className="text-lg font-medium text-white mb-2">No saved characters yet</h3>
                  <p className="text-gray-400 max-w-sm mx-auto">
                    When you save character templates from share links, they'll appear here.
                  </p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {savedCharacters.map((save) => (
                    <div
                      key={save.id}
                      className="relative rounded-xl overflow-hidden bg-gray-900/50 border border-white/[0.06] hover:border-purple-500/40 transition-all"
                    >
                      <div className="relative h-40 overflow-hidden">
                        {save.source_image_url ? (
                          <>
                            <Image
                              src={save.source_image_url}
                              alt={save.source_name}
                              fill
                              className="object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
                          </>
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 to-gray-900 flex items-center justify-center">
                            <User className="w-12 h-12 text-purple-400/30" />
                          </div>
                        )}
                        <div className="absolute top-3 left-3">
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Saved Template
                          </span>
                        </div>
                      </div>
                      <div className="p-5">
                        <h4 className="font-display font-semibold text-lg text-white truncate">
                          {save.source_name}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          v{save.saved_version}
                          {save.update_available && (
                            <span className="ml-2 text-purple-400">Update available!</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Saved {formatDate(save.saved_at)}
                        </p>
                        {save.instance_id ? (
                          <button
                            onClick={() => router.push(`/vault/${save.instance_id}`)}
                            className="mt-4 flex items-center justify-center gap-2 w-full px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            <Play className="w-4 h-4" />
                            Continue Playing
                          </button>
                        ) : (
                          <button
                            onClick={() => router.push(`/vault?startPlaying=${save.id}`)}
                            className="mt-4 flex items-center justify-center gap-2 w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            <Play className="w-4 h-4" />
                            Start Playing
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}

        {/* In-Play Tab - Characters in active campaigns (grouped by campaign) */}
        {activeTab === 'in-play' && (
          <InPlayTabView inPlayCharacters={inPlayCharacters} />
        )}

        {/* All Tab - Overview */}
        {activeTab === 'all' && (
          <div className="space-y-8">
            {/* Hero Character */}
            {heroCharacter && (
              <section className="group relative">
                <button
                  onClick={() => router.push(`/vault/${heroCharacter.id}`)}
                  className="w-full relative block rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-950 border border-white/[0.06] hover:border-purple-500/30 transition-all duration-500 text-left"
                >
                  <div className="relative h-[300px] md:h-[380px] overflow-hidden">
                    {heroCharacter.image_url ? (
                      <>
                        <Image
                          src={heroCharacter.image_url}
                          alt={heroCharacter.name}
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
                    <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-10">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                          heroCharacter.linked_campaign_id
                            ? 'bg-green-500/20 text-green-300 border-green-500/30'
                            : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        }`}>
                          {heroCharacter.linked_campaign_id ? 'In Play' : 'My Character'}
                        </span>
                        {heroCharacter.type && (
                          <span className="px-3 py-1 text-xs font-medium rounded-full bg-white/10 text-gray-300 uppercase">
                            {heroCharacter.type}
                          </span>
                        )}
                      </div>
                      <h2 className="text-2xl md:text-4xl font-display font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">
                        {heroCharacter.name}
                      </h2>
                      {(heroCharacter.race || heroCharacter.class) && (
                        <p className="text-gray-300 text-sm md:text-base max-w-2xl mb-3">
                          {[heroCharacter.race, heroCharacter.class].filter(Boolean).join(' • ')}
                        </p>
                      )}
                      {heroCharacter.summary && (
                        <p className="text-gray-400 text-sm max-w-2xl line-clamp-2 mb-3">
                          {heroCharacter.summary}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-purple-400 font-medium">
                        <Play className="w-5 h-5" />
                        <span>View Character</span>
                        <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>
                </button>
              </section>
            )}

            {/* My Characters Section */}
            {activeCharacters.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-purple-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">My Characters</h3>
                    <span className="text-xs text-gray-500">{activeCharacters.length}</span>
                  </div>
                  {activeCharacters.length > 4 && (
                    <button
                      onClick={() => setActiveTab('my-characters')}
                      className="text-sm text-purple-400 hover:text-purple-300"
                    >
                      View all →
                    </button>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {activeCharacters.slice(0, 4).map((character) => (
                    <CharacterCard
                      key={character.id}
                      character={character}
                      isPinned={pinnedIds.has(character.id)}
                      onClick={() => router.push(`/vault/${character.id}`)}
                      onView={() => router.push(`/vault/${character.id}`)}
                      onSessions={() => router.push(`/vault/${character.id}/sessions`)}
                      onPin={() => togglePinned(character.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* In-Play Section */}
            {inPlayCharacters.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Swords className="w-4 h-4 text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">In Play</h3>
                    <span className="text-xs text-gray-500">{inPlayCharacters.length}</span>
                  </div>
                  {inPlayCharacters.length > 4 && (
                    <button
                      onClick={() => setActiveTab('in-play')}
                      className="text-sm text-purple-400 hover:text-purple-300"
                    >
                      View all →
                    </button>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {inPlayCharacters.slice(0, 4).map((character) => (
                    <button
                      key={character.id}
                      onClick={() => router.push(`/vault/${character.id}`)}
                      className="group relative rounded-xl overflow-hidden bg-gray-900/50 border border-purple-500/20 hover:border-purple-500/40 transition-all text-left"
                    >
                      <div className="relative h-48 overflow-hidden">
                        {character.image_url ? (
                          <>
                            <Image
                              src={character.image_url}
                              alt={character.name}
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
                          </>
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 to-gray-900 flex items-center justify-center">
                            <User className="w-16 h-16 text-purple-400/30" />
                          </div>
                        )}
                        <div className="absolute top-3 left-3">
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-green-500/20 text-green-300 border border-green-500/30">
                            In Play
                          </span>
                        </div>
                      </div>
                      <div className="p-5">
                        <h4 className="font-display font-semibold text-lg text-white truncate group-hover:text-purple-400 transition-colors">
                          {character.name}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {[character.race, character.class].filter(Boolean).join(' • ')}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Saved Section */}
            {savedCharacters.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Bookmark className="w-4 h-4 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Saved From Community</h3>
                    <span className="text-xs text-gray-500">{savedCharacters.length}</span>
                  </div>
                  {savedCharacters.length > 4 && (
                    <button
                      onClick={() => setActiveTab('collection')}
                      className="text-sm text-purple-400 hover:text-purple-300"
                    >
                      View all →
                    </button>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {savedCharacters.slice(0, 4).map((save) => (
                    <div
                      key={save.id}
                      className="relative rounded-xl overflow-hidden bg-gray-900/50 border border-white/[0.06] hover:border-purple-500/40 transition-all"
                    >
                      <div className="relative h-40 overflow-hidden">
                        {save.source_image_url ? (
                          <>
                            <Image
                              src={save.source_image_url}
                              alt={save.source_name}
                              fill
                              className="object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
                          </>
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 to-gray-900 flex items-center justify-center">
                            <User className="w-12 h-12 text-purple-400/30" />
                          </div>
                        )}
                      </div>
                      <div className="p-5">
                        <h4 className="font-display font-semibold text-lg text-white truncate">
                          {save.source_name}
                        </h4>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Empty state */}
            {activeCharacters.length === 0 && savedCharacters.length === 0 && (
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-purple-900/20 via-gray-900 to-gray-950 border border-white/[0.06] p-16 text-center">
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
              </div>
            )}
          </div>
        )}

        {/* My Characters Tab */}
        {activeTab === 'my-characters' && (
          <>
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
          </>
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
          <div className={cn("grid gap-4 pt-2", canUseAI ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
            {/* Import with AI - only show if AI is enabled */}
            {canUseAI && (
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
            )}

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

        {/* Customize Modal */}
        <PageCustomizeModal
          isOpen={customizeModalOpen}
          onClose={() => setCustomizeModalOpen(false)}
          title="Customize Vault"
          tabs={VAULT_TAB_CONFIG}
          preferences={preferences as ModalPagePreferences<VaultPageTabId>}
          defaultPreferences={DEFAULT_VAULT_PAGE_PREFERENCES as ModalPagePreferences<VaultPageTabId>}
          onSave={savePreferences}
          tabCounts={tabCounts}
        />
      </div>
      <BackToTopButton />
    </AppLayout>
  )
}
