'use client'

import { useEffect, useState, useCallback } from 'react'
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
  Play,
  Loader2,
  Users,
  Swords,
  MapPin,
  User,
  BookOpen,
  Check,
  Download,
} from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Modal, EmptyState, Badge, AccessDeniedPage } from '@/components/ui'
import { RollReveal } from '@/components/roll-reveal/RollReveal'
import { useSupabase, useUser, usePermissions } from '@/hooks'
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
  type TemplateCategory,
} from '@/lib/random-table-templates'

// Category configuration
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

// Get icon component for template category
const getCategoryIcon = (iconName: string) => {
  switch (iconName) {
    case 'Users': return Users
    case 'MapPin': return MapPin
    case 'Swords': return Swords
    case 'User': return User
    case 'BookOpen': return BookOpen
    default: return Dice5
  }
}

// Template category colors
const TEMPLATE_CATEGORY_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  names: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  locations: { text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  encounters: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  npcs: { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  plots: { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
}

export default function RandomTablesPage() {
  const params = useParams()
  const supabase = useSupabase()
  const { user } = useUser()
  const campaignId = params.id as string
  const { can, loading: permissionsLoading, isDm } = usePermissions(campaignId)

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
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Dice5 className="w-8 h-8 text-orange-400" />
            <h1 className="text-2xl font-bold text-white">Random Tables</h1>
          </div>
          <p className="text-gray-400">
            <span className="text-orange-400 font-semibold">{totalEntries.toLocaleString()}+</span> pre-built entries for names,
            locations, encounters, and more. Roll instantly or add tables to your campaign.
          </p>
        </div>

        {/* Quick Roll Section */}
        <div className="mb-8">
          <div className="relative">
            <div
              onClick={() => setQuickRollOpen(!quickRollOpen)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 bg-[--bg-surface] border rounded-xl cursor-pointer transition-colors",
                quickRollOpen ? "border-orange-500/50" : "border-[--border] hover:border-orange-500/30"
              )}
            >
              <Play className="w-5 h-5 text-orange-400" />
              <span className="flex-1 text-gray-400">Quick roll any table...</span>
              <ChevronDown className={cn(
                "w-5 h-5 text-gray-500 transition-transform",
                quickRollOpen && "rotate-180"
              )} />
            </div>

            {/* Quick Roll Dropdown */}
            {quickRollOpen && (
              <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-[--bg-elevated] border border-[--border] rounded-xl shadow-xl overflow-hidden">
                {/* Search */}
                <div className="p-3 border-b border-[--border]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={quickRollSearch}
                      onChange={(e) => setQuickRollSearch(e.target.value)}
                      placeholder="Search tables..."
                      className="w-full pl-10 pr-4 py-2 bg-[--bg-base] border border-[--border] rounded-lg text-white text-sm focus:outline-none focus:border-orange-500/50"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Results */}
                <div className="max-h-72 overflow-y-auto">
                  {filteredQuickRollItems.length === 0 ? (
                    <div className="px-4 py-6 text-center text-gray-500 text-sm">
                      No tables found
                    </div>
                  ) : (
                    filteredQuickRollItems.slice(0, 15).map((item, index) => (
                      <button
                        key={`${item.type}-${item.type === 'template' ? (item.data as TableTemplate).id : (item.data as RandomTable).id}`}
                        onClick={() => {
                          if (item.type === 'template') {
                            rollOnTemplate(item.data as TableTemplate)
                          } else {
                            rollOnTable(item.data as RandomTable)
                          }
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.05] transition-colors text-left"
                      >
                        <Play className="w-4 h-4 text-orange-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-white text-sm">{item.name}</span>
                          <span className="ml-2 text-xs text-gray-500">{item.category}</span>
                        </div>
                        {item.type === 'table' && (
                          <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">Custom</span>
                        )}
                      </button>
                    ))
                  )}
                  {filteredQuickRollItems.length > 15 && (
                    <div className="px-4 py-2 text-xs text-gray-500 text-center border-t border-[--border]">
                      +{filteredQuickRollItems.length - 15} more results
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Template Categories - Accordion */}
        <div className="space-y-3 mb-8">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Browse Templates</h2>

          {TEMPLATE_CATEGORIES.map(category => {
            const CategoryIcon = getCategoryIcon(category.icon)
            const isExpanded = expandedCategories.has(category.id)
            const colors = TEMPLATE_CATEGORY_COLORS[category.id] || { text: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/30' }
            const totalCatEntries = category.templates.reduce((sum, t) => sum + t.entries.length, 0)

            return (
              <div key={category.id} className="bg-[--bg-surface] border border-[--border] rounded-xl overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors text-left"
                >
                  <div className={cn("p-2 rounded-lg", colors.bg)}>
                    <CategoryIcon className={cn("w-5 h-5", colors.text)} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{category.name}</span>
                      <span className="text-xs text-gray-500">
                        {category.templates.length} tables · {totalCatEntries.toLocaleString()} entries
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{category.description}</p>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  )}
                </button>

                {/* Expanded Templates */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-2">
                    {category.templates.map(template => (
                      <div
                        key={template.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                          "bg-white/[0.02] border-[--border] hover:border-[--border]"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-white text-sm font-medium">{template.name}</span>
                            <span className="text-xs text-gray-500">{template.entries.length} entries</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{template.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => rollOnTemplate(template)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded-lg text-orange-400 text-sm font-medium transition-colors"
                          >
                            <Play className="w-3.5 h-3.5" />
                            Roll
                          </button>
                          {isDm && (
                            <button
                              onClick={() => importTemplate(template)}
                              disabled={importingTemplates.has(template.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.08] border border-[--border] rounded-lg text-gray-400 text-sm font-medium transition-colors disabled:opacity-50"
                              title="Add to My Tables for editing"
                            >
                              {importingTemplates.has(template.id) ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                              Add
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* My Custom Tables Section */}
        <div className="bg-[--bg-surface] border border-[--border] rounded-xl overflow-hidden">
          {/* Header */}
          <button
            onClick={() => setCustomTablesExpanded(!customTablesExpanded)}
            className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors text-left"
          >
            <div className="p-2 rounded-lg bg-indigo-500/10">
              <Dice5 className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">My Custom Tables</span>
                <span className="text-xs text-gray-500">{userTables.length} tables</span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">Tables you've created or imported</p>
            </div>
            {isDm && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  openCreateModal()
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-400 text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                New
              </button>
            )}
            {customTablesExpanded ? (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-500" />
            )}
          </button>

          {/* Show Archived Toggle */}
          {customTablesExpanded && userTables.length > 0 && (
            <div className="px-4 pb-2 flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500"
                />
                Show archived
              </label>
            </div>
          )}

          {/* Custom Tables List */}
          {customTablesExpanded && (
            <div className="px-4 pb-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                </div>
              ) : userTables.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-gray-500 text-sm mb-3">No custom tables yet</p>
                  {isDm && (
                    <button
                      onClick={openCreateModal}
                      className="text-purple-400 text-sm hover:text-purple-300 transition-colors"
                    >
                      Create your first table →
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {userTables.map(table => {
                    const categoryConfig = CATEGORY_CONFIG[table.category]
                    return (
                      <div
                        key={table.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                          "bg-white/[0.02] border-[--border]",
                          table.is_archived && "opacity-60"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-white text-sm font-medium">{table.name}</span>
                            <Badge className={cn(categoryConfig.color, categoryConfig.bgColor, "text-xs")}>
                              {categoryConfig.label}
                            </Badge>
                            <span className="text-xs text-gray-500">{table.entries.length} entries</span>
                          </div>
                          {table.description && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate">{table.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => rollOnTable(table)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded-lg text-orange-400 text-sm font-medium transition-colors"
                          >
                            <Play className="w-3.5 h-3.5" />
                            Roll
                          </button>
                          {isDm && (
                            <>
                              <button
                                onClick={() => openEditModal(table)}
                                className="p-1.5 text-gray-500 hover:text-white hover:bg-white/[0.05] rounded transition-colors"
                                title="Edit"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => toggleArchive(table)}
                                className="p-1.5 text-gray-500 hover:text-white hover:bg-white/[0.05] rounded transition-colors"
                                title={table.is_archived ? 'Restore' : 'Archive'}
                              >
                                {table.is_archived ? (
                                  <ArchiveRestore className="w-4 h-4" />
                                ) : (
                                  <Archive className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => deleteTable(table)}
                                className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Name *</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g., Random NPC Motivations"
              className="w-full px-4 py-2 bg-[--bg-surface] border border-[--border] rounded-lg text-white focus:outline-none focus:border-purple-500"
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
              className="w-full px-4 py-2 bg-[--bg-surface] border border-[--border] rounded-lg text-white focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          {/* Category & Die Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Category</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as RandomTableCategory)}
                className="w-full px-4 py-2 bg-[--bg-surface] border border-[--border] rounded-lg text-white focus:outline-none focus:border-purple-500"
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
                className="w-full px-4 py-2 bg-[--bg-surface] border border-[--border] rounded-lg text-white focus:outline-none focus:border-purple-500"
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
                className="w-full px-4 py-2 bg-[--bg-surface] border border-[--border] rounded-lg text-white focus:outline-none focus:border-purple-500"
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
                <div key={entry.id} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-6">{index + 1}.</span>
                  <input
                    type="text"
                    value={entry.text}
                    onChange={(e) => updateEntry(index, e.target.value)}
                    placeholder="Entry text..."
                    className="flex-1 px-3 py-2 bg-[--bg-surface] border border-[--border] rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={() => removeEntry(index)}
                    className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addEntry}
              className="mt-2 flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white border border-dashed border-[--border] rounded-lg hover:bg-white/[0.02] transition-colors w-full justify-center"
            >
              <Plus className="w-4 h-4" />
              Add Entry
            </button>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[--border]">
            <button onClick={closeModal} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={saveTable}
              disabled={savingTable}
              className="btn btn-primary"
            >
              {savingTable ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
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

      {/* Click outside to close quick roll */}
      {quickRollOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setQuickRollOpen(false)}
        />
      )}
    </AppLayout>
  )
}
