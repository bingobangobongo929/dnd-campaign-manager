'use client'

import { useState, useEffect } from 'react'
import { Dice5, ChevronDown, Loader2, Search, Star, Shuffle } from 'lucide-react'
import { RollReveal } from '@/components/roll-reveal/RollReveal'
import { useSupabase, useUser, useFavoriteRandomTables } from '@/hooks'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Tooltip } from '@/components/ui'
import type { RandomTable, RandomTableEntry } from '@/types/database'
import {
  TEMPLATE_CATEGORIES,
  type TableTemplate,
} from '@/lib/random-table-templates'

interface QuickRollDropdownProps {
  campaignId: string
  className?: string
}

export function QuickRollDropdown({ campaignId, className }: QuickRollDropdownProps) {
  const supabase = useSupabase()
  const { user } = useUser()
  const [tables, setTables] = useState<RandomTable[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTable, setSelectedTable] = useState<RandomTable | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<TableTemplate | null>(null)
  const [showRollReveal, setShowRollReveal] = useState(false)

  // Favorites hook
  const {
    tableFavorites,
    templateFavorites,
    isTableFavorite,
    isTemplateFavorite,
    toggleTableFavorite,
    toggleTemplateFavorite,
  } = useFavoriteRandomTables(campaignId, user?.id)

  // Load campaign's random tables
  useEffect(() => {
    const loadTables = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('random_tables')
          .select('*')
          .eq('campaign_id', campaignId)
          .eq('is_archived', false)
          .order('name')

        if (error) throw error
        setTables(data || [])
      } catch (error) {
        console.error('Failed to load random tables:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTables()
  }, [campaignId, supabase])

  // Get all templates flattened
  const allTemplates = TEMPLATE_CATEGORIES.flatMap(cat =>
    cat.templates.map(t => ({ ...t, categoryName: cat.name }))
  )

  // Get favorite items
  const favoriteTables = tables.filter(t => isTableFavorite(t.id))
  const favoriteTemplates = allTemplates.filter(t => isTemplateFavorite(t.id))
  const hasFavorites = favoriteTables.length > 0 || favoriteTemplates.length > 0

  // Filter items by search
  const filteredTables = tables.filter(t =>
    !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const filteredTemplates = allTemplates.filter(t =>
    !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.categoryName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Handle selecting a user table
  const handleSelectTable = (table: RandomTable) => {
    setSelectedTable(table)
    setSelectedTemplate(null)
    setIsOpen(false)
    setSearchQuery('')
    setShowRollReveal(true)
  }

  // Handle selecting a template
  const handleSelectTemplate = (template: TableTemplate) => {
    setSelectedTemplate(template)
    setSelectedTable(null)
    setIsOpen(false)
    setSearchQuery('')
    setShowRollReveal(true)
  }

  // Handle accepting roll result (copy to clipboard)
  const handleAcceptRoll = (entry: RandomTableEntry | string) => {
    const name = selectedTable?.name || selectedTemplate?.name || 'Random Table'
    const text = typeof entry === 'string' ? entry : entry.text
    navigator.clipboard.writeText(`${name}: ${text}`)
    toast.success('Result copied to clipboard')
    setShowRollReveal(false)
    setSelectedTable(null)
    setSelectedTemplate(null)
  }

  // Handle closing roll reveal
  const handleCloseRollReveal = () => {
    setShowRollReveal(false)
    setSelectedTable(null)
    setSelectedTemplate(null)
  }

  // Get roll items for RollReveal
  const getRollItems = () => {
    if (selectedTable) return selectedTable.entries
    if (selectedTemplate) {
      return selectedTemplate.entries.map((text, i) => ({ id: String(i), text, weight: 1 }))
    }
    return []
  }

  return (
    <>
      <div className={cn("relative", className)}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={loading}
          className={cn(
            "flex items-center gap-2 w-full px-3 py-2.5 rounded-lg transition-all text-left",
            "bg-pink-500/10 hover:bg-pink-500/15",
            isOpen && "ring-2 ring-pink-500/40",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          <Dice5 className="w-4 h-4 text-pink-400" />
          <span className="flex-1 text-sm text-white">Quick Roll</span>
          {hasFavorites && (
            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
          )}
          {loading ? (
            <Loader2 className="w-4 h-4 text-pink-400 animate-spin" />
          ) : (
            <ChevronDown className={cn(
              "w-4 h-4 text-gray-500 transition-transform",
              isOpen && "rotate-180"
            )} />
          )}
        </button>

        {/* Dropdown menu */}
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => {
                setIsOpen(false)
                setSearchQuery('')
              }}
            />

            {/* Dropdown - solid background */}
            <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-[#1a1a24] rounded-xl shadow-2xl overflow-hidden">
              {/* Search */}
              <div className="p-3 border-b border-white/[0.06]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tables..."
                    className="w-full pl-9 pr-3 py-2 bg-[#0d0d14] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/40"
                    autoFocus
                  />
                </div>
              </div>

              <div className="max-h-[300px] overflow-y-auto">
                {/* Favorites Section - Only show if not searching */}
                {!searchQuery && hasFavorites && (
                  <div>
                    <div className="px-3 py-2 text-xs font-medium text-yellow-400 uppercase tracking-wider bg-yellow-500/5 flex items-center gap-2">
                      <Star className="w-3 h-3 fill-yellow-400" />
                      Favorites
                    </div>
                    {favoriteTables.map(table => (
                      <TableRow
                        key={`fav-table-${table.id}`}
                        name={table.name}
                        count={table.entries.length}
                        isFavorite={true}
                        onRoll={() => handleSelectTable(table)}
                        onToggleFavorite={() => toggleTableFavorite(table.id)}
                        iconColor="text-pink-400/70"
                      />
                    ))}
                    {favoriteTemplates.map(template => (
                      <TableRow
                        key={`fav-template-${template.id}`}
                        name={template.name}
                        subtitle={template.categoryName}
                        count={template.entries.length}
                        isFavorite={true}
                        onRoll={() => handleSelectTemplate(template)}
                        onToggleFavorite={() => toggleTemplateFavorite(template.id)}
                        iconColor="text-orange-400/70"
                      />
                    ))}
                  </div>
                )}

                {/* My Tables Section */}
                {filteredTables.length > 0 && (
                  <div>
                    <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-white/[0.02]">
                      My Tables
                    </div>
                    {filteredTables.map(table => (
                      <TableRow
                        key={table.id}
                        name={table.name}
                        count={table.entries.length}
                        isFavorite={isTableFavorite(table.id)}
                        onRoll={() => handleSelectTable(table)}
                        onToggleFavorite={() => toggleTableFavorite(table.id)}
                        iconColor="text-pink-400/70"
                      />
                    ))}
                  </div>
                )}

                {/* Templates Section */}
                {filteredTemplates.length > 0 && (
                  <div>
                    <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-white/[0.02]">
                      Templates
                    </div>
                    {filteredTemplates.slice(0, 10).map(template => (
                      <TableRow
                        key={template.id}
                        name={template.name}
                        subtitle={template.categoryName}
                        count={template.entries.length}
                        isFavorite={isTemplateFavorite(template.id)}
                        onRoll={() => handleSelectTemplate(template)}
                        onToggleFavorite={() => toggleTemplateFavorite(template.id)}
                        iconColor="text-orange-400/70"
                      />
                    ))}
                    {filteredTemplates.length > 10 && (
                      <div className="px-3 py-2 text-xs text-gray-500 text-center">
                        +{filteredTemplates.length - 10} more
                      </div>
                    )}
                  </div>
                )}

                {/* Empty state */}
                {filteredTables.length === 0 && filteredTemplates.length === 0 && (
                  <div className="px-4 py-6 text-center text-gray-500 text-sm">
                    No tables found
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Roll Reveal Modal */}
      {(selectedTable || selectedTemplate) && (
        <RollReveal
          items={getRollItems()}
          isOpen={showRollReveal}
          onClose={handleCloseRollReveal}
          onAccept={handleAcceptRoll}
          duration="fast"
          title={`Rolling ${selectedTable?.name || selectedTemplate?.name}...`}
          renderResult={(entry) => (
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-2">
                {selectedTable
                  ? (selectedTable.roll_type === 'custom' ? `d${selectedTable.custom_die_size}` : selectedTable.roll_type)
                  : (selectedTemplate?.roll_type === 'custom' ? `d${selectedTemplate?.custom_die_size}` : selectedTemplate?.roll_type)
                }
              </p>
              <p className="text-xl text-white leading-relaxed">
                {typeof entry === 'string' ? entry : entry.text}
              </p>
            </div>
          )}
        />
      )}
    </>
  )
}

// Reusable table row component
function TableRow({
  name,
  subtitle,
  count,
  isFavorite,
  onRoll,
  onToggleFavorite,
  iconColor,
}: {
  name: string
  subtitle?: string
  count: number
  isFavorite: boolean
  onRoll: () => void
  onToggleFavorite: () => void
  iconColor: string
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 hover:bg-white/[0.04] transition-colors">
      <Dice5 className={cn("w-4 h-4 flex-shrink-0", iconColor)} />
      <div className="flex-1 min-w-0">
        <span className="text-sm text-white block truncate">{name}</span>
        {subtitle && <span className="text-xs text-gray-500">{subtitle}</span>}
      </div>
      <span className="text-xs text-gray-500 flex-shrink-0">{count}</span>

      {/* Favorite button */}
      <Tooltip content={isFavorite ? "Remove from favorites" : "Add to favorites"}>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite()
          }}
          className={cn(
            "p-1.5 rounded-md transition-colors flex-shrink-0",
            isFavorite
              ? "text-yellow-400 hover:bg-yellow-500/20"
              : "text-gray-500 hover:text-yellow-400 hover:bg-white/[0.05]"
          )}
        >
          <Star className={cn("w-3.5 h-3.5", isFavorite && "fill-yellow-400")} />
        </button>
      </Tooltip>

      {/* Roll button */}
      <Tooltip content="Roll this table">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRoll()
          }}
          className="p-1.5 rounded-md text-pink-400 hover:bg-pink-500/20 transition-colors flex-shrink-0"
        >
          <Shuffle className="w-3.5 h-3.5" />
        </button>
      </Tooltip>
    </div>
  )
}
