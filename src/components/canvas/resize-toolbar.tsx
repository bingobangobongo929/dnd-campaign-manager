'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { X, Check, RotateCcw, Scaling } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui'
import type { Character } from '@/types/database'
import {
  DEFAULT_CARD_WIDTH,
  DEFAULT_CARD_HEIGHT,
  MIN_CARD_WIDTH,
  MIN_CARD_HEIGHT,
  MAX_CARD_WIDTH,
  MAX_CARD_HEIGHT,
} from './character-node'

type FilterType = 'all' | 'pc' | 'npc'

interface ResizeToolbarProps {
  characters: Character[]
  onResize: (characterIds: string[], width: number, height: number) => void
  onClose: () => void
}

export function ResizeToolbar({ characters, onResize, onClose }: ResizeToolbarProps) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(characters.map(c => c.id)))
  const [width, setWidth] = useState(DEFAULT_CARD_WIDTH)
  const [height, setHeight] = useState(DEFAULT_CARD_HEIGHT)
  const isFirstRender = useRef(true)

  // Get filtered characters based on type filter
  const filteredCharacters = characters.filter((char) => {
    if (filter === 'all') return true
    return char.type === filter
  })

  // Select all filtered characters when filter changes
  useEffect(() => {
    // Skip initial render - we already set initial state
    if (isFirstRender.current) return
    setSelectedIds(new Set(filteredCharacters.map((c) => c.id)))
  }, [filter])

  // Get currently selected characters
  const selectedCharacters = characters.filter((c) => selectedIds.has(c.id))

  // Toggle character selection
  const toggleCharacter = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Select all in current filter
  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredCharacters.map((c) => c.id)))
  }, [filteredCharacters])

  // Deselect all
  const deselectAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  // Apply resize to selected characters
  const handleApply = useCallback(() => {
    if (selectedIds.size > 0) {
      onResize(Array.from(selectedIds), width, height)
    }
  }, [selectedIds, width, height, onResize])

  // Reset to defaults
  const handleReset = useCallback(() => {
    setWidth(DEFAULT_CARD_WIDTH)
    setHeight(DEFAULT_CARD_HEIGHT)
  }, [])

  // Live preview - apply as sliders change (skip first render)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (selectedIds.size > 0) {
      onResize(Array.from(selectedIds), width, height)
    }
  }, [width, height, selectedIds, onResize])

  const pcCount = characters.filter((c) => c.type === 'pc').length
  const npcCount = characters.filter((c) => c.type === 'npc').length

  return (
    <div className="fixed top-20 right-4 z-50 w-80 bg-[--bg-surface] border border-[--border] rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[--border] bg-[--bg-elevated]">
        <div className="flex items-center gap-2">
          <Scaling className="w-5 h-5 text-[--arcane-purple]" />
          <h3 className="font-semibold text-[--text-primary]">Resize Cards</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-[--bg-hover] transition-colors"
        >
          <X className="w-4 h-4 text-[--text-secondary]" />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-[--border]">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'flex-1 px-3 py-2 text-sm font-medium transition-colors',
            filter === 'all'
              ? 'text-[--arcane-purple] border-b-2 border-[--arcane-purple] bg-[--arcane-purple]/5'
              : 'text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-hover]'
          )}
        >
          All ({characters.length})
        </button>
        <button
          onClick={() => setFilter('pc')}
          className={cn(
            'flex-1 px-3 py-2 text-sm font-medium transition-colors',
            filter === 'pc'
              ? 'text-[--arcane-purple] border-b-2 border-[--arcane-purple] bg-[--arcane-purple]/5'
              : 'text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-hover]'
          )}
        >
          PCs ({pcCount})
        </button>
        <button
          onClick={() => setFilter('npc')}
          className={cn(
            'flex-1 px-3 py-2 text-sm font-medium transition-colors',
            filter === 'npc'
              ? 'text-[--arcane-purple] border-b-2 border-[--arcane-purple] bg-[--arcane-purple]/5'
              : 'text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-hover]'
          )}
        >
          NPCs ({npcCount})
        </button>
      </div>

      {/* Character selection */}
      <div className="px-4 py-3 border-b border-[--border]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[--text-secondary]">
            {selectedIds.size} of {filteredCharacters.length} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="text-xs text-[--arcane-purple] hover:underline"
            >
              Select all
            </button>
            <button
              onClick={deselectAll}
              className="text-xs text-[--text-secondary] hover:underline"
            >
              Clear
            </button>
          </div>
        </div>
        <div className="max-h-32 overflow-y-auto space-y-1">
          {filteredCharacters.map((char) => (
            <label
              key={char.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[--bg-hover] cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedIds.has(char.id)}
                onChange={() => toggleCharacter(char.id)}
                className="w-4 h-4 rounded border-[--border] text-[--arcane-purple] focus:ring-[--arcane-purple]"
              />
              <span className="text-sm text-[--text-primary] truncate flex-1">
                {char.name}
              </span>
              <span
                className={cn(
                  'text-[10px] font-medium px-1.5 py-0.5 rounded',
                  char.type === 'pc'
                    ? 'bg-[--arcane-purple]/20 text-[--arcane-purple]'
                    : 'bg-[--treasure-gold]/20 text-[--treasure-gold]'
                )}
              >
                {char.type.toUpperCase()}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Size sliders */}
      <div className="px-4 py-4 space-y-4">
        {/* Width slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-[--text-primary]">Width</label>
            <span className="text-sm text-[--text-secondary] tabular-nums">{width}px</span>
          </div>
          <input
            type="range"
            min={MIN_CARD_WIDTH}
            max={MAX_CARD_WIDTH}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="w-full h-2 bg-[--bg-elevated] rounded-lg appearance-none cursor-pointer accent-[--arcane-purple]"
          />
          <div className="flex justify-between text-[10px] text-[--text-muted] mt-1">
            <span>{MIN_CARD_WIDTH}px</span>
            <span>{MAX_CARD_WIDTH}px</span>
          </div>
        </div>

        {/* Height slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-[--text-primary]">Height</label>
            <span className="text-sm text-[--text-secondary] tabular-nums">{height}px</span>
          </div>
          <input
            type="range"
            min={MIN_CARD_HEIGHT}
            max={MAX_CARD_HEIGHT}
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
            className="w-full h-2 bg-[--bg-elevated] rounded-lg appearance-none cursor-pointer accent-[--arcane-purple]"
          />
          <div className="flex justify-between text-[10px] text-[--text-muted] mt-1">
            <span>{MIN_CARD_HEIGHT}px</span>
            <span>{MAX_CARD_HEIGHT}px</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-[--border] bg-[--bg-elevated]">
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[--text-secondary] hover:text-[--text-primary] transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
        <Button onClick={onClose} variant="primary" size="sm">
          <Check className="w-4 h-4 mr-1.5" />
          Done
        </Button>
      </div>
    </div>
  )
}
