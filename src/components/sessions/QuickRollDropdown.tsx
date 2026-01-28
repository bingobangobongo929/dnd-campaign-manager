'use client'

import { useState, useEffect } from 'react'
import { Dice5, ChevronDown, Loader2 } from 'lucide-react'
import { RollReveal } from '@/components/roll-reveal/RollReveal'
import { useSupabase } from '@/hooks'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { RandomTable, RandomTableEntry } from '@/types/database'

interface QuickRollDropdownProps {
  campaignId: string
  className?: string
}

export function QuickRollDropdown({ campaignId, className }: QuickRollDropdownProps) {
  const supabase = useSupabase()
  const [tables, setTables] = useState<RandomTable[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedTable, setSelectedTable] = useState<RandomTable | null>(null)
  const [showRollReveal, setShowRollReveal] = useState(false)

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

  // Handle selecting a table and triggering a roll
  const handleSelectTable = (table: RandomTable) => {
    setSelectedTable(table)
    setIsOpen(false)
    setShowRollReveal(true)
  }

  // Handle accepting roll result (copy to clipboard)
  const handleAcceptRoll = (entry: RandomTableEntry) => {
    if (selectedTable) {
      navigator.clipboard.writeText(`${selectedTable.name}: ${entry.text}`)
      toast.success('Result copied to clipboard')
    }
    setShowRollReveal(false)
    setSelectedTable(null)
  }

  // Handle closing roll reveal
  const handleCloseRollReveal = () => {
    setShowRollReveal(false)
    setSelectedTable(null)
  }

  // If no tables exist, don't show the dropdown
  if (!loading && tables.length === 0) {
    return null
  }

  return (
    <>
      <div className={cn("relative", className)}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={loading || tables.length === 0}
          className={cn(
            "flex items-center gap-2 w-full px-3 py-2 rounded-lg border transition-all text-left",
            "bg-pink-500/5 border-pink-500/20 hover:border-pink-500/40",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          <Dice5 className="w-4 h-4 text-pink-400" />
          <span className="flex-1 text-sm text-white">Quick Roll</span>
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
        {isOpen && tables.length > 0 && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-[--bg-elevated] border border-[--border] rounded-lg shadow-xl overflow-hidden">
              <div className="max-h-[200px] overflow-y-auto py-1">
                {tables.map(table => (
                  <button
                    key={table.id}
                    onClick={() => handleSelectTable(table)}
                    className="w-full px-3 py-2 text-left hover:bg-white/[0.05] transition-colors flex items-center gap-2"
                  >
                    <Dice5 className="w-4 h-4 text-pink-400/50" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-white block truncate">{table.name}</span>
                      <span className="text-xs text-gray-500">
                        {table.entries.length} entries
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {table.roll_type === 'custom' ? `d${table.custom_die_size}` : table.roll_type}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Roll Reveal Modal */}
      {selectedTable && (
        <RollReveal
          items={selectedTable.entries}
          isOpen={showRollReveal}
          onClose={handleCloseRollReveal}
          onAccept={handleAcceptRoll}
          duration="fast"
          title={`Rolling ${selectedTable.name}...`}
          renderResult={(entry) => (
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-2">
                {selectedTable.roll_type === 'custom' ? `d${selectedTable.custom_die_size}` : selectedTable.roll_type}
              </p>
              <p className="text-xl text-white leading-relaxed">{entry.text}</p>
            </div>
          )}
        />
      )}
    </>
  )
}
