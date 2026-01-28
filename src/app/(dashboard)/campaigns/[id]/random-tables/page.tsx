'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  Dice5,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  X,
  Trash2,
  Edit3,
  Archive,
  ArchiveRestore,
  Shuffle,
  Loader2,
  Users,
  Swords,
  MapPin,
  User,
  BookOpen,
  Download,
  Sparkles,
  Beer,
  Store,
  Building2,
  Trees,
  Compass,
  Cloud,
  Footprints,
  Skull,
  Gem,
  Heart,
  MessageCircle,
  Scroll,
  AlertTriangle,
  Navigation,
  Star,
  Play,
} from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Modal, EmptyState, Badge, AccessDeniedPage, Tooltip } from '@/components/ui'
import { RollReveal } from '@/components/roll-reveal/RollReveal'
import { useSupabase, useUser, usePermissions, useFavoriteRandomTables } from '@/hooks'
import { cn } from '@/lib/utils'
import type {
  RandomTable,
  RandomTableEntry,
  RandomTableCategory,
  RandomTableDieType,
} from '@/types/database'
import { v4 as uuidv4 } from 'uuid'
import { toast } from 'sonner'
import {
  TEMPLATE_CATEGORIES,
  getTotalEntryCount,
  type TableTemplate,
} from '@/lib/random-table-templates'

// Category configuration for user tables
const CATEGORY_CONFIG: Record<RandomTableCategory, { label: string; color: string; bgColor: string }> = {
  general: { label: 'General', color: 'text-gray-400', bgColor: 'bg-gray-500/10' },
  npc: { label: 'NPCs', color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  encounter: { label: 'Encounters', color: 'text-red-400', bgColor: 'bg-red-500/10' },
  loot: { label: 'Loot', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
  location: { label: 'Locations', color: 'text-green-400', bgColor: 'bg-green-500/10' },
  weather: { label: 'Weather', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
  rumor: { label: 'Rumors', color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
  complication: { label: 'Complications', color: 'text-pink-400', bgColor: 'bg-pink-500/10' },
  name: { label: 'Names', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  custom: { label: 'Custom', color: 'text-indigo-400', bgColor: 'bg-indigo-500/10' },
}

// Die type options
const DIE_TYPES: { value: RandomTableDieType; label: string }[] = [
  { value: 'd4', label: 'd4' },
  { value: 'd6', label: 'd6' },
  { value: 'd8', label: 'd8' },
  { value: 'd10', label: 'd10' },
  { value: 'd12', label: 'd12' },
  { value: 'd20', label: 'd20' },
  { value: 'd100', label: 'd100' },
  { value: 'custom', label: 'Custom' },
]

// Category list for filter
const CATEGORIES: { value: RandomTableCategory; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'npc', label: 'NPCs' },
  { value: 'encounter', label: 'Encounters' },
  { value: 'loot', label: 'Loot' },
  { value: 'location', label: 'Locations' },
  { value: 'weather', label: 'Weather' },
  { value: 'rumor', label: 'Rumors' },
  { value: 'complication', label: 'Complications' },
  { value: 'name', label: 'Names' },
  { value: 'custom', label: 'Custom' },
]

// Template category icons and colors
const TEMPLATE_CATEGORY_CONFIG: Record<string, {
  icon: typeof Users
  color: string
  bgColor: string
}> = {
  names: { icon: Users, color: 'text-blue-400', bgColor: 'bg-blue-500/15' },
  locations: { icon: MapPin, color: 'text-emerald-400', bgColor: 'bg-emerald-500/15' },
  encounters: { icon: Swords, color: 'text-red-400', bgColor: 'bg-red-500/15' },
  npcs: { icon: User, color: 'text-purple-400', bgColor: 'bg-purple-500/15' },
  plots: { icon: BookOpen, color: 'text-amber-400', bgColor: 'bg-amber-500/15' },
}

// Individual template icons based on template ID
const TEMPLATE_ICONS: Record<string, typeof Users> = {
  // Names
  'human-male-names': User,
  'human-female-names': User,
  'elf-names': Sparkles,
  'dwarf-names': Gem,
  'halfling-names': Heart,
  'orc-goblin-names': Skull,
  'tiefling-names': Sparkles,
  // Locations
  'tavern-names': Beer,
  'shop-names': Store,
  'city-names': Building2,
  'village-names': Building2,
  'wilderness-landmarks': Trees,
  'street-names': Navigation,
  // Encounters
  'road-encounters': Footprints,
  'dungeon-features': Skull,
  'weather-conditions': Cloud,
  'loot-descriptors': Gem,
  // NPCs
  'npc-traits': Heart,
  'npc-motivations': Compass,
  // Plots
  'rumors': MessageCircle,
  'quest-hooks': Scroll,
  'complications': AlertTriangle,
}

export default function RandomTablesPage() {
  const params = useParams()
  const supabase = useSupabase()
  const { user } = useUser()
  const campaignId = params.id as string
  const { can, loading: permissionsLoading, isDm } = usePermissions(campaignId)

  // Favorites hook
  const {
    isTableFavorite,
    isTemplateFavorite,
    toggleTableFavorite,
    toggleTemplateFavorite,
  } = useFavoriteRandomTables(campaignId, user?.id)

  const [loading, setLoading] = useState(true)
  const [tables, setTables] = useState<RandomTable[]>([])
  const [showArchived, setShowArchived] = useState(false)

  // Quick roll state
  const [quickRollOpen, setQuickRollOpen] = useState(false)
  const [quickRollSearch, setQuickRollSearch] = useState('')

  // Accordion state
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [customTablesExpanded, setCustomTablesExpanded] = useState(true)

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTable, setEditingTable] = useState<RandomTable | null>(null)
  const [savingTable, setSavingTable] = useState(false)

  // Roll state
  const [rollingTable, setRollingTable] = useState<RandomTable | null>(null)
  const [rollingTemplate, setRollingTemplate] = useState<TableTemplate | null>(null)
  const [showRollReveal, setShowRollReveal] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formCategory, setFormCategory] = useState<RandomTableCategory>('general')
  const [formRollType, setFormRollType] = useState<RandomTableDieType>('d20')
  const [formCustomDieSize, setFormCustomDieSize] = useState<number>(20)
  const [formEntries, setFormEntries] = useState<RandomTableEntry[]>([])

  // Import templates state
  const [importingTemplates, setImportingTemplates] = useState<Set<string>>(new Set())

  // Load tables
  useEffect(() => {
    if (user && campaignId) {
      loadTables()
    }
  }, [user, campaignId])

  const loadTables = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('random_tables')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('name')

      if (error) throw error
      setTables(data || [])
    } catch (error) {
      console.error('Failed to load tables:', error)
      toast.error('Failed to load random tables')
    } finally {
      setLoading(false)
    }
  }

  // Filter user tables (not archived by default)
  const userTables = tables.filter(table => {
    if (!showArchived && table.is_archived) return false
    return true
  })

  // Get all rollable items for quick roll (templates + user tables)
  const getAllRollableItems = () => {
    const items: { type: 'template' | 'table'; name: string; category: string; data: TableTemplate | RandomTable }[] = []

    // Add templates
    TEMPLATE_CATEGORIES.forEach(cat => {
      cat.templates.forEach(template => {
        items.push({
          type: 'template',
          name: template.name,
          category: cat.name,
          data: template,
        })
      })
    })

    // Add user tables
    userTables.forEach(table => {
      items.push({
        type: 'table',
        name: table.name,
        category: 'My Tables',
        data: table,
      })
    })

    return items
  }

  // Filter quick roll items by search
  const filteredQuickRollItems = getAllRollableItems().filter(item => {
    if (!quickRollSearch) return true
    return item.name.toLowerCase().includes(quickRollSearch.toLowerCase()) ||
           item.category.toLowerCase().includes(quickRollSearch.toLowerCase())
  })

  // Toggle accordion category
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  // Reset form
  const resetForm = () => {
    setFormName('')
    setFormDescription('')
    setFormCategory('general')
    setFormRollType('d20')
    setFormCustomDieSize(20)
    setFormEntries([])
  }

  // Open create modal
  const openCreateModal = () => {
    resetForm()
    setEditingTable(null)
    setShowCreateModal(true)
  }

  // Open edit modal
  const openEditModal = (table: RandomTable) => {
    setFormName(table.name)
    setFormDescription(table.description || '')
    setFormCategory(table.category)
    setFormRollType(table.roll_type)
    setFormCustomDieSize(table.custom_die_size || 20)
    setFormEntries(table.entries)
    setEditingTable(table)
    setShowCreateModal(true)
  }

  // Close modal
  const closeModal = () => {
    setShowCreateModal(false)
    setEditingTable(null)
    resetForm()
  }

  // Add entry
  const addEntry = () => {
    setFormEntries([...formEntries, { id: uuidv4(), text: '', weight: 1 }])
  }

  // Update entry
  const updateEntry = (index: number, text: string) => {
    const updated = [...formEntries]
    updated[index] = { ...updated[index], text }
    setFormEntries(updated)
  }

  // Remove entry
  const removeEntry = (index: number) => {
    setFormEntries(formEntries.filter((_, i) => i !== index))
  }

  // Save table
  const saveTable = async () => {
    if (!formName.trim()) {
      toast.error('Please enter a table name')
      return
    }
    if (formEntries.length === 0) {
      toast.error('Please add at least one entry')
      return
    }

    setSavingTable(true)
    try {
      const tableData = {
        campaign_id: campaignId,
        user_id: user!.id,
        name: formName.trim(),
        description: formDescription.trim() || null,
        category: formCategory,
        roll_type: formRollType,
        custom_die_size: formRollType === 'custom' ? formCustomDieSize : null,
        entries: formEntries.filter(e => e.text.trim()),
      }

      if (editingTable) {
        const { error } = await supabase
          .from('random_tables')
          .update(tableData)
          .eq('id', editingTable.id)

        if (error) throw error
        toast.success('Table updated')
      } else {
        const { error } = await supabase
          .from('random_tables')
          .insert(tableData)

        if (error) throw error
        toast.success('Table created')
      }

      closeModal()
      loadTables()
    } catch (error) {
      console.error('Failed to save table:', error)
      toast.error('Failed to save table')
    } finally {
      setSavingTable(false)
    }
  }

  // Delete table
  const deleteTable = async (table: RandomTable) => {
    if (!confirm(`Delete "${table.name}"? This cannot be undone.`)) return

    try {
      const { error } = await supabase
        .from('random_tables')
        .delete()
        .eq('id', table.id)

      if (error) throw error
      toast.success('Table deleted')
      loadTables()
    } catch (error) {
      console.error('Failed to delete table:', error)
      toast.error('Failed to delete table')
    }
  }

  // Archive/unarchive table
  const toggleArchive = async (table: RandomTable) => {
    try {
      const { error } = await supabase
        .from('random_tables')
        .update({ is_archived: !table.is_archived })
        .eq('id', table.id)

      if (error) throw error
      toast.success(table.is_archived ? 'Table restored' : 'Table archived')
      loadTables()
    } catch (error) {
      console.error('Failed to toggle archive:', error)
      toast.error('Failed to update table')
    }
  }

  // Roll on user table
  const rollOnTable = (table: RandomTable) => {
    setRollingTable(table)
    setRollingTemplate(null)
    setShowRollReveal(true)
    setQuickRollOpen(false)
  }

  // Roll on template
  const rollOnTemplate = (template: TableTemplate) => {
    setRollingTemplate(template)
    setRollingTable(null)
    setShowRollReveal(true)
    setQuickRollOpen(false)
  }

  // Close roll result
  const closeRollResult = () => {
    setShowRollReveal(false)
    setRollingTable(null)
    setRollingTemplate(null)
  }

  // Handle accepting roll result (copy to clipboard)
  const handleAcceptRoll = (entry: RandomTableEntry | string) => {
    const tableName = rollingTable?.name || rollingTemplate?.name || 'Random Table'
    const resultText = typeof entry === 'string' ? entry : entry.text
    navigator.clipboard.writeText(`${tableName}: ${resultText}`)
    toast.success('Result copied to clipboard')
    closeRollResult()
  }

  // Import a single template to campaign
  const importTemplate = async (template: TableTemplate) => {
    setImportingTemplates(prev => new Set(prev).add(template.id))
    try {
      const tableData = {
        campaign_id: campaignId,
        user_id: user!.id,
        name: template.name,
        description: template.description,
        category: template.category,
        roll_type: template.roll_type,
        custom_die_size: template.custom_die_size || null,
        entries: template.entries.map((text) => ({
          id: uuidv4(),
          text,
          weight: 1,
        })),
        tags: template.tags,
      }

      const { error } = await supabase
        .from('random_tables')
        .insert(tableData)

      if (error) throw error
      toast.success(`Added "${template.name}" to your tables`)
      loadTables()
    } catch (error) {
      console.error('Failed to import template:', error)
      toast.error('Failed to import template')
    } finally {
      setImportingTemplates(prev => {
        const next = new Set(prev)
        next.delete(template.id)
        return next
      })
    }
  }

  // Get entries for roll reveal
  const getRollItems = () => {
    if (rollingTable) {
      return rollingTable.entries
    }
    if (rollingTemplate) {
      return rollingTemplate.entries.map((text, i) => ({ id: String(i), text, weight: 1 }))
    }
    return []
  }

  // Get icon for template
  const getTemplateIcon = (templateId: string) => {
    return TEMPLATE_ICONS[templateId] || Dice5
  }

  // Permission check
  if (permissionsLoading) {
    return (
      <AppLayout campaignId={campaignId}>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      </AppLayout>
    )
  }

  if (!isDm && !can.viewLore) {
    return (
      <AppLayout campaignId={campaignId}>
        <AccessDeniedPage
          campaignId={campaignId}
          message="You don't have permission to view random tables."
        />
      </AppLayout>
    )
  }

  const totalEntries = getTotalEntryCount()

  return (
    <AppLayout campaignId={campaignId}>
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-3">
            <div className="p-3 rounded-xl bg-orange-500/15">
              <Dice5 className="w-8 h-8 text-orange-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Random Tables</h1>
              <p className="text-gray-400 mt-1">
                <span className="text-orange-400 font-semibold">{totalEntries.toLocaleString()}+</span> pre-built entries ready to roll
              </p>
            </div>
          </div>
        </div>

        {/* Quick Roll Section */}
        <div className="mb-10 relative">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Quick Roll</label>
          <div
            onClick={() => setQuickRollOpen(!quickRollOpen)}
            className={cn(
              "flex items-center gap-4 px-5 py-4 bg-[#0d0d14] rounded-xl cursor-pointer transition-all",
              quickRollOpen
                ? "ring-2 ring-orange-500/40"
                : "hover:bg-[#111118]"
            )}
          >
            <div className="p-2.5 rounded-lg bg-orange-500/15">
              <Play className="w-5 h-5 text-orange-400" />
            </div>
            <span className="flex-1 text-gray-400">Search and roll any table...</span>
            <ChevronDown className={cn(
              "w-5 h-5 text-gray-500 transition-transform",
              quickRollOpen && "rotate-180"
            )} />
          </div>

          {/* Quick Roll Dropdown */}
          {quickRollOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setQuickRollOpen(false)}
              />
              <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-[#1a1a24] rounded-xl shadow-2xl overflow-hidden">
                {/* Search */}
                <div className="p-4 border-b border-white/[0.06]">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={quickRollSearch}
                      onChange={(e) => setQuickRollSearch(e.target.value)}
                      placeholder="Search tables..."
                      className="w-full pl-11 pr-4 py-3 bg-[#0d0d14] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Results */}
                <div className="max-h-80 overflow-y-auto">
                  {filteredQuickRollItems.length === 0 ? (
                    <div className="px-5 py-8 text-center text-gray-500">
                      No tables found
                    </div>
                  ) : (
                    filteredQuickRollItems.slice(0, 12).map((item) => {
                      const TemplateIcon = item.type === 'template'
                        ? getTemplateIcon((item.data as TableTemplate).id)
                        : Dice5
                      return (
                        <button
                          key={`${item.type}-${item.type === 'template' ? (item.data as TableTemplate).id : (item.data as RandomTable).id}`}
                          onClick={() => {
                            if (item.type === 'template') {
                              rollOnTemplate(item.data as TableTemplate)
                            } else {
                              rollOnTable(item.data as RandomTable)
                            }
                          }}
                          className="w-full flex items-center gap-4 px-5 py-3 hover:bg-white/[0.04] transition-colors text-left"
                        >
                          <TemplateIcon className="w-4 h-4 text-orange-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-white">{item.name}</span>
                          </div>
                          <span className="text-xs text-gray-500">{item.category}</span>
                          {item.type === 'table' && (
                            <span className="text-xs text-indigo-400 bg-indigo-500/15 px-2 py-0.5 rounded-md">Custom</span>
                          )}
                        </button>
                      )
                    })
                  )}
                  {filteredQuickRollItems.length > 12 && (
                    <div className="px-5 py-3 text-sm text-gray-500 text-center border-t border-white/[0.06]">
                      +{filteredQuickRollItems.length - 12} more tables
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Template Categories */}
        <div className="space-y-4 mb-10">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Browse Templates</label>

          {TEMPLATE_CATEGORIES.map(category => {
            const config = TEMPLATE_CATEGORY_CONFIG[category.id] || { icon: Dice5, color: 'text-gray-400', bgColor: 'bg-gray-500/15' }
            const CategoryIcon = config.icon
            const isExpanded = expandedCategories.has(category.id)
            const totalCatEntries = category.templates.reduce((sum, t) => sum + t.entries.length, 0)

            return (
              <div key={category.id} className="bg-[#0d0d14] rounded-xl overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full flex items-center gap-4 p-5 hover:bg-white/[0.02] transition-colors text-left"
                >
                  <div className={cn("p-2.5 rounded-lg", config.bgColor)}>
                    <CategoryIcon className={cn("w-5 h-5", config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-white text-lg">{category.name}</span>
                      <span className="text-sm text-gray-500">
                        {category.templates.length} tables · {totalCatEntries.toLocaleString()} entries
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{category.description}</p>
                  </div>
                  <ChevronDown className={cn(
                    "w-5 h-5 text-gray-500 transition-transform flex-shrink-0",
                    isExpanded && "rotate-180"
                  )} />
                </button>

                {/* Expanded Templates */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-1">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {category.templates.map(template => {
                        const TemplateIcon = getTemplateIcon(template.id)
                        const isFav = isTemplateFavorite(template.id)
                        return (
                          <div
                            key={template.id}
                            className="flex items-center gap-4 p-4 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                          >
                            <div className={cn("p-2 rounded-lg", config.bgColor)}>
                              <TemplateIcon className={cn("w-4 h-4", config.color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-white font-medium">{template.name}</span>
                                {isFav && <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">{template.entries.length} entries</p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {/* Favorite button */}
                              <Tooltip content={isFav ? "Remove from Quick Roll in session prep" : "Add to Quick Roll in session prep"}>
                                <button
                                  onClick={() => toggleTemplateFavorite(template.id)}
                                  className={cn(
                                    "p-2 rounded-lg transition-colors",
                                    isFav
                                      ? "text-yellow-400 hover:bg-yellow-500/20"
                                      : "text-gray-500 hover:text-yellow-400 hover:bg-white/[0.06]"
                                  )}
                                >
                                  <Star className={cn("w-4 h-4", isFav && "fill-yellow-400")} />
                                </button>
                              </Tooltip>
                              {/* Roll button */}
                              <Tooltip content="Roll this table">
                                <button
                                  onClick={() => rollOnTemplate(template)}
                                  className="p-2 bg-orange-500/15 hover:bg-orange-500/25 rounded-lg text-orange-400 transition-colors"
                                >
                                  <Shuffle className="w-4 h-4" />
                                </button>
                              </Tooltip>
                              {isDm && (
                                <Tooltip content="Add to My Tables">
                                  <button
                                    onClick={() => importTemplate(template)}
                                    disabled={importingTemplates.has(template.id)}
                                    className="p-2 text-gray-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors disabled:opacity-50"
                                  >
                                    {importingTemplates.has(template.id) ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Download className="w-4 h-4" />
                                    )}
                                  </button>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* My Custom Tables Section */}
        <div className="bg-[#0d0d14] rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-4 p-5">
            <div className="p-2.5 rounded-lg bg-indigo-500/15">
              <Dice5 className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-white text-lg">My Custom Tables</span>
                <span className="text-sm text-gray-500">{userTables.length} tables</span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">Tables you've created or imported</p>
            </div>
            {isDm && (
              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500/15 hover:bg-purple-500/25 rounded-lg text-purple-400 text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Table
              </button>
            )}
            <button
              onClick={() => setCustomTablesExpanded(!customTablesExpanded)}
              className="p-2 text-gray-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
            >
              <ChevronDown className={cn(
                "w-5 h-5 transition-transform",
                customTablesExpanded && "rotate-180"
              )} />
            </button>
          </div>

          {/* Custom Tables List */}
          {customTablesExpanded && (
            <div className="px-5 pb-5">
              {/* Show Archived Toggle */}
              {tables.some(t => t.is_archived) && (
                <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer mb-4">
                  <input
                    type="checkbox"
                    checked={showArchived}
                    onChange={(e) => setShowArchived(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500"
                  />
                  Show archived tables
                </label>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                </div>
              ) : userTables.length === 0 ? (
                <div className="py-12 text-center">
                  <Dice5 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 font-medium mb-2">No custom tables yet</p>
                  <p className="text-gray-500 text-sm mb-4">Create your own tables or import from templates above</p>
                  {isDm && (
                    <button
                      onClick={openCreateModal}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/15 text-purple-400 rounded-lg hover:bg-purple-500/25 transition-colors text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Create Table
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {userTables.map(table => {
                    const categoryConfig = CATEGORY_CONFIG[table.category]
                    const isFav = isTableFavorite(table.id)
                    return (
                      <div
                        key={table.id}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors",
                          table.is_archived && "opacity-50"
                        )}
                      >
                        <div className={cn("p-2 rounded-lg", categoryConfig.bgColor)}>
                          <Dice5 className={cn("w-4 h-4", categoryConfig.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium truncate">{table.name}</span>
                            {isFav && <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />}
                            <Badge className={cn(categoryConfig.color, categoryConfig.bgColor, "text-xs flex-shrink-0")}>
                              {categoryConfig.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{table.entries.length} entries</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* Favorite button */}
                          <Tooltip content={isFav ? "Remove from Quick Roll in session prep" : "Add to Quick Roll in session prep"}>
                            <button
                              onClick={() => toggleTableFavorite(table.id)}
                              className={cn(
                                "p-2 rounded-lg transition-colors",
                                isFav
                                  ? "text-yellow-400 hover:bg-yellow-500/20"
                                  : "text-gray-500 hover:text-yellow-400 hover:bg-white/[0.06]"
                              )}
                            >
                              <Star className={cn("w-4 h-4", isFav && "fill-yellow-400")} />
                            </button>
                          </Tooltip>
                          {/* Roll button */}
                          <Tooltip content="Roll this table">
                            <button
                              onClick={() => rollOnTable(table)}
                              className="p-2 bg-orange-500/15 hover:bg-orange-500/25 rounded-lg text-orange-400 transition-colors"
                            >
                              <Shuffle className="w-4 h-4" />
                            </button>
                          </Tooltip>
                          {isDm && (
                            <>
                              <Tooltip content="Edit">
                                <button
                                  onClick={() => openEditModal(table)}
                                  className="p-2 text-gray-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                              </Tooltip>
                              <Tooltip content={table.is_archived ? 'Restore' : 'Archive'}>
                                <button
                                  onClick={() => toggleArchive(table)}
                                  className="p-2 text-gray-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
                                >
                                  {table.is_archived ? (
                                    <ArchiveRestore className="w-4 h-4" />
                                  ) : (
                                    <Archive className="w-4 h-4" />
                                  )}
                                </button>
                              </Tooltip>
                              <Tooltip content="Delete">
                                <button
                                  onClick={() => deleteTable(table)}
                                  className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </Tooltip>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={closeModal}
        title={editingTable ? 'Edit Table' : 'Create Random Table'}
        size="lg"
      >
        <div className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Name *</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g., Random NPC Motivations"
              className="w-full px-4 py-3 bg-[#0d0d14] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Description</label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="What is this table used for?"
              rows={2}
              className="w-full px-4 py-3 bg-[#0d0d14] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40 resize-none"
            />
          </div>

          {/* Category & Die Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Category</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as RandomTableCategory)}
                className="w-full px-4 py-3 bg-[#0d0d14] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Die Type</label>
              <select
                value={formRollType}
                onChange={(e) => setFormRollType(e.target.value as RandomTableDieType)}
                className="w-full px-4 py-3 bg-[#0d0d14] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              >
                {DIE_TYPES.map(die => (
                  <option key={die.value} value={die.value}>{die.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom die size */}
          {formRollType === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-white mb-2">Custom Die Size</label>
              <input
                type="number"
                value={formCustomDieSize}
                onChange={(e) => setFormCustomDieSize(parseInt(e.target.value) || 1)}
                min={1}
                max={1000}
                className="w-full px-4 py-3 bg-[#0d0d14] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              />
            </div>
          )}

          {/* Entries */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Entries ({formEntries.length})
            </label>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {formEntries.map((entry, index) => (
                <div key={entry.id} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-6 text-right">{index + 1}.</span>
                  <input
                    type="text"
                    value={entry.text}
                    onChange={(e) => updateEntry(index, e.target.value)}
                    placeholder="Entry text..."
                    className="flex-1 px-4 py-2.5 bg-[#0d0d14] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  />
                  <button
                    onClick={() => removeEntry(index)}
                    className="p-2 text-gray-500 hover:text-red-400 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addEntry}
              className="mt-3 flex items-center gap-2 px-4 py-2.5 text-sm text-gray-400 hover:text-white border border-dashed border-white/[0.1] rounded-lg hover:bg-white/[0.02] transition-colors w-full justify-center"
            >
              <Plus className="w-4 h-4" />
              Add Entry
            </button>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
            <button onClick={closeModal} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={saveTable}
              disabled={savingTable}
              className="btn btn-primary"
            >
              {savingTable && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editingTable ? 'Update Table' : 'Create Table'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Roll Result Modal */}
      {(rollingTable || rollingTemplate) && (
        <RollReveal
          items={getRollItems()}
          isOpen={showRollReveal}
          onClose={closeRollResult}
          onAccept={handleAcceptRoll}
          duration="fast"
          title={`Rolling ${rollingTable?.name || rollingTemplate?.name}...`}
          renderResult={(entry) => (
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-2">
                {rollingTable
                  ? (rollingTable.roll_type === 'custom' ? `d${rollingTable.custom_die_size}` : rollingTable.roll_type)
                  : (rollingTemplate?.roll_type === 'custom' ? `d${rollingTemplate.custom_die_size}` : rollingTemplate?.roll_type)
                }
              </p>
              <p className="text-xl text-white leading-relaxed">
                {typeof entry === 'string' ? entry : entry.text}
              </p>
            </div>
          )}
        />
      )}
    </AppLayout>
  )
}
