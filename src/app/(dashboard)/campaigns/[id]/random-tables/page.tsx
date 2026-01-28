'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
  Dice5,
  Plus,
  Search,
  ChevronDown,
  X,
  Trash2,
  Edit3,
  Archive,
  ArchiveRestore,
  Play,
  Clock,
  Filter,
  Loader2,
  Sparkles,
  Users,
  Swords,
  Cloud,
  Gem,
  Check,
  Download,
} from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Modal, EmptyState, Badge, AccessDeniedPage } from '@/components/ui'
import { RollTableReveal } from '@/components/roll-reveal/RollTableReveal'
import { useSupabase, useUser, usePermissions } from '@/hooks'
import { cn } from '@/lib/utils'
import type {
  RandomTable,
  RandomTableEntry,
  RandomTableCategory,
  RandomTableDieType,
  RandomTableRoll,
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

export default function RandomTablesPage() {
  const params = useParams()
  const supabase = useSupabase()
  const { user } = useUser()
  const campaignId = params.id as string
  const { can, loading: permissionsLoading, isDm } = usePermissions(campaignId)

  const [loading, setLoading] = useState(true)
  const [tables, setTables] = useState<RandomTable[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<RandomTableCategory | 'all'>('all')
  const [showArchived, setShowArchived] = useState(false)

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTable, setEditingTable] = useState<RandomTable | null>(null)
  const [savingTable, setSavingTable] = useState(false)

  // Roll state
  const [rollingTable, setRollingTable] = useState<RandomTable | null>(null)
  const [rollResult, setRollResult] = useState<{ value: number; entry: RandomTableEntry } | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formCategory, setFormCategory] = useState<RandomTableCategory>('general')
  const [formRollType, setFormRollType] = useState<RandomTableDieType>('d20')
  const [formCustomDieSize, setFormCustomDieSize] = useState<number>(20)
  const [formEntries, setFormEntries] = useState<RandomTableEntry[]>([])

  // Templates modal state
  const [showTemplatesModal, setShowTemplatesModal] = useState(false)
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set())
  const [importingTemplates, setImportingTemplates] = useState(false)

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

  // Filter tables
  const filteredTables = tables.filter(table => {
    if (!showArchived && table.is_archived) return false
    if (categoryFilter !== 'all' && table.category !== categoryFilter) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        table.name.toLowerCase().includes(query) ||
        table.description?.toLowerCase().includes(query) ||
        table.entries.some(e => e.text.toLowerCase().includes(query))
      )
    }
    return true
  })

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
        // Update existing
        const { error } = await supabase
          .from('random_tables')
          .update(tableData)
          .eq('id', editingTable.id)

        if (error) throw error
        toast.success('Table updated')
      } else {
        // Create new
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

  // Roll on table
  const rollOnTable = (table: RandomTable) => {
    const dieSize = table.roll_type === 'custom'
      ? table.custom_die_size || 20
      : parseInt(table.roll_type.slice(1))

    const rollValue = Math.floor(Math.random() * dieSize) + 1

    // Find entry for roll (simple index-based for now)
    const entryIndex = (rollValue - 1) % table.entries.length
    const entry = table.entries[entryIndex]

    setRollingTable(table)
    setRollResult({ value: rollValue, entry })
  }

  // Close roll result
  const closeRollResult = () => {
    setRollingTable(null)
    setRollResult(null)
  }

  // Toggle template selection
  const toggleTemplateSelection = (templateId: string) => {
    setSelectedTemplates(prev => {
      const next = new Set(prev)
      if (next.has(templateId)) {
        next.delete(templateId)
      } else {
        next.add(templateId)
      }
      return next
    })
  }

  // Import selected templates
  const importSelectedTemplates = async () => {
    if (selectedTemplates.size === 0) {
      toast.error('Please select at least one template')
      return
    }

    setImportingTemplates(true)
    try {
      // Get all selected templates
      const templatesToImport: TableTemplate[] = []
      TEMPLATE_CATEGORIES.forEach(cat => {
        cat.templates.forEach(template => {
          if (selectedTemplates.has(template.id)) {
            templatesToImport.push(template)
          }
        })
      })

      // Create tables in database
      const tablesToInsert = templatesToImport.map(template => ({
        campaign_id: campaignId,
        user_id: user!.id,
        name: template.name,
        description: template.description,
        category: template.category,
        roll_type: template.roll_type,
        custom_die_size: template.custom_die_size || null,
        entries: template.entries.map((text, index) => ({
          id: uuidv4(),
          text,
          weight: 1,
        })),
        tags: template.tags,
      }))

      const { error } = await supabase
        .from('random_tables')
        .insert(tablesToInsert)

      if (error) throw error

      toast.success(`Added ${templatesToImport.length} table${templatesToImport.length > 1 ? 's' : ''}`)
      setShowTemplatesModal(false)
      setSelectedTemplates(new Set())
      loadTables()
    } catch (error) {
      console.error('Failed to import templates:', error)
      toast.error('Failed to import templates')
    } finally {
      setImportingTemplates(false)
    }
  }

  // Get icon for template category
  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Users': return Users
      case 'Swords': return Swords
      case 'Cloud': return Cloud
      case 'Gem': return Gem
      default: return Dice5
    }
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

  return (
    <AppLayout campaignId={campaignId}>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Dice5 className="w-7 h-7 text-orange-400" />
              Random Tables
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Create and roll on custom tables during prep and gameplay
            </p>
          </div>
          {isDm && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTemplatesModal(true)}
                className="btn btn-secondary"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Browse Templates
              </button>
              <button onClick={openCreateModal} className="btn btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                New Table
              </button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tables..."
              className="w-full pl-10 pr-4 py-2 bg-[--bg-surface] border border-[--border] rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as RandomTableCategory | 'all')}
            className="px-4 py-2 bg-[--bg-surface] border border-[--border] rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>

          {/* Show archived toggle */}
          <label className="flex items-center gap-2 px-4 py-2 bg-[--bg-surface] border border-[--border] rounded-lg text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-gray-400">Show Archived</span>
          </label>
        </div>

        {/* Tables Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-[40vh]">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        ) : filteredTables.length === 0 ? (
          <EmptyState
            icon={<Dice5 className="w-12 h-12" />}
            title="No random tables yet"
            description="Create your first random table to use during prep and gameplay."
            action={isDm ? (
              <button onClick={openCreateModal} className="btn btn-primary">
                Create Table
              </button>
            ) : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTables.map(table => {
              const categoryConfig = CATEGORY_CONFIG[table.category]
              return (
                <div
                  key={table.id}
                  className={cn(
                    "bg-[--bg-surface] border border-[--border] rounded-xl p-4 transition-colors hover:border-orange-500/30",
                    table.is_archived && "opacity-60"
                  )}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-white">{table.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={cn(categoryConfig.color, categoryConfig.bgColor)}>
                          {categoryConfig.label}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {table.roll_type === 'custom' ? `d${table.custom_die_size}` : table.roll_type}
                        </span>
                      </div>
                    </div>
                    {isDm && (
                      <div className="flex items-center gap-1">
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
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {table.description && (
                    <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                      {table.description}
                    </p>
                  )}

                  {/* Entries preview */}
                  <div className="text-xs text-gray-500 mb-4">
                    {table.entries.length} entries
                  </div>

                  {/* Roll button */}
                  <button
                    onClick={() => rollOnTable(table)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded-lg text-orange-400 text-sm font-medium transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Roll
                  </button>
                </div>
              )
            })}
          </div>
        )}
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
      {rollingTable && rollResult && (
        <RollTableReveal
          tableName={rollingTable.name}
          rollValue={rollResult.value}
          resultText={rollResult.entry.text}
          dieType={rollingTable.roll_type === 'custom' ? `d${rollingTable.custom_die_size}` : rollingTable.roll_type}
          onClose={closeRollResult}
        />
      )}

      {/* Starter Templates Modal */}
      <Modal
        isOpen={showTemplatesModal}
        onClose={() => {
          setShowTemplatesModal(false)
          setSelectedTemplates(new Set())
        }}
        title="Starter Templates"
        description={`${getTotalEntryCount()}+ pre-built entries for names, encounters, and more`}
        size="lg"
      >
        <div className="space-y-6">
          {TEMPLATE_CATEGORIES.map(category => {
            const CategoryIcon = getCategoryIcon(category.icon)
            return (
              <div key={category.id} className="space-y-3">
                {/* Category Header */}
                <div className="flex items-center gap-2">
                  <CategoryIcon className="w-5 h-5 text-purple-400" />
                  <h3 className="font-medium text-white">{category.name}</h3>
                  <span className="text-xs text-gray-500">- {category.description}</span>
                </div>

                {/* Templates Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {category.templates.map(template => {
                    const isSelected = selectedTemplates.has(template.id)
                    const categoryConfig = CATEGORY_CONFIG[template.category]

                    return (
                      <button
                        key={template.id}
                        onClick={() => toggleTemplateSelection(template.id)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                          isSelected
                            ? "bg-purple-500/20 border-purple-500/50"
                            : "bg-white/[0.02] border-[--border] hover:bg-white/[0.04]"
                        )}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                          isSelected
                            ? "bg-purple-500 border-purple-500"
                            : "border-gray-600"
                        )}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-white text-sm font-medium">{template.name}</span>
                            <span className="text-xs text-gray-500">
                              {template.entries.length} entries
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 truncate">{template.description}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-[--border]">
            <div className="text-sm text-gray-400">
              {selectedTemplates.size > 0 ? (
                <span>{selectedTemplates.size} template{selectedTemplates.size > 1 ? 's' : ''} selected</span>
              ) : (
                <span>Select templates to add to your campaign</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setShowTemplatesModal(false)
                  setSelectedTemplates(new Set())
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={importSelectedTemplates}
                disabled={selectedTemplates.size === 0 || importingTemplates}
                className="btn btn-primary"
              >
                {importingTemplates ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Add to Campaign
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}
