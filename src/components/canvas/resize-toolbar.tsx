'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { X, Check, RotateCcw, Users, User } from 'lucide-react'
import { cn } from '@/lib/utils'
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
    if (isFirstRender.current) return
    setSelectedIds(new Set(filteredCharacters.map((c) => c.id)))
  }, [filter])

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
    <div className="fixed top-16 right-4 z-50 w-80 bg-[--bg-surface] border border-[--border] rounded-xl shadow-2xl animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[--border]">
        <h3 className="text-sm font-semibold text-[--text-primary]">Resize Cards</h3>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[--bg-hover] transition-colors"
        >
          <X className="w-4 h-4 text-[--text-secondary]" />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 px-3 py-2 border-b border-[--border]">
        {[
          { id: 'all' as const, label: 'All', count: characters.length, icon: Users },
          { id: 'pc' as const, label: 'PCs', count: pcCount, icon: User },
          { id: 'npc' as const, label: 'NPCs', count: npcCount, icon: User },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors',
              filter === tab.id
                ? 'bg-[--arcane-purple] text-white'
                : 'text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-hover]'
            )}
          >
            <tab.icon className="w-3 h-3" />
            <span>{tab.label}</span>
            <span className={cn(
              'px-1.5 py-0.5 rounded text-[10px]',
              filter === tab.id ? 'bg-white/20' : 'bg-[--bg-elevated]'
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Character selection */}
      <div className="px-3 py-2 border-b border-[--border]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[--text-secondary]">
            <span className="text-[--arcane-purple] font-medium">{selectedIds.size}</span> / {filteredCharacters.length}
          </span>
          <div className="flex gap-2 text-xs">
            <button onClick={selectAll} className="text-[--arcane-purple] hover:underline">All</button>
            <button onClick={deselectAll} className="text-[--text-tertiary] hover:text-[--text-secondary]">None</button>
          </div>
        </div>
        <div className="max-h-28 overflow-y-auto space-y-0.5 scrollbar-thin">
          {filteredCharacters.map((char) => (
            <label
              key={char.id}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors text-xs',
                selectedIds.has(char.id)
                  ? 'bg-[--arcane-purple]/10'
                  : 'hover:bg-[--bg-hover]'
              )}
            >
              <input
                type="checkbox"
                checked={selectedIds.has(char.id)}
                onChange={() => toggleCharacter(char.id)}
                className="w-3.5 h-3.5 rounded border-[--border] text-[--arcane-purple] focus:ring-[--arcane-purple] focus:ring-offset-0"
              />
              <span className="text-[--text-primary] truncate flex-1">{char.name}</span>
              <span className={cn(
                'text-[10px] font-medium px-1.5 py-0.5 rounded',
                char.type === 'pc' ? 'bg-[--arcane-purple]/20 text-[--arcane-purple]' : 'bg-[--treasure-gold]/20 text-[--treasure-gold]'
              )}>
                {char.type.toUpperCase()}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Size sliders */}
      <div className="px-3 py-3 space-y-3">
        {/* Width slider */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-[--text-secondary]">Width</label>
            <span className="text-xs font-semibold text-[--text-primary] tabular-nums">{width}px</span>
          </div>
          <input
            type="range"
            min={MIN_CARD_WIDTH}
            max={MAX_CARD_WIDTH}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="w-full h-1.5 bg-[--bg-elevated] rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3.5
              [&::-webkit-slider-thumb]:h-3.5
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-[--arcane-purple]
              [&::-webkit-slider-thumb]:cursor-grab
              [&::-webkit-slider-thumb]:active:cursor-grabbing"
          />
          <div className="flex justify-between text-[10px] text-[--text-muted] mt-0.5">
            <span>{MIN_CARD_WIDTH}</span>
            <span>{MAX_CARD_WIDTH}</span>
          </div>
        </div>

        {/* Height slider */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-[--text-secondary]">Height</label>
            <span className="text-xs font-semibold text-[--text-primary] tabular-nums">{height}px</span>
          </div>
          <input
            type="range"
            min={MIN_CARD_HEIGHT}
            max={MAX_CARD_HEIGHT}
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
            className="w-full h-1.5 bg-[--bg-elevated] rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3.5
              [&::-webkit-slider-thumb]:h-3.5
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-[--arcane-purple]
              [&::-webkit-slider-thumb]:cursor-grab
              [&::-webkit-slider-thumb]:active:cursor-grabbing"
          />
          <div className="flex justify-between text-[10px] text-[--text-muted] mt-0.5">
            <span>{MIN_CARD_HEIGHT}</span>
            <span>{MAX_CARD_HEIGHT}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-[--border]">
        <button
          onClick={handleReset}
          className="flex items-center gap-1 px-2 py-1 text-xs text-[--text-secondary] hover:text-[--text-primary] rounded hover:bg-[--bg-hover] transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
        <button
          onClick={onClose}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-[--arcane-purple] rounded-lg hover:bg-[--arcane-purple-dim] transition-colors"
        >
          <Check className="w-3 h-3" />
          Done
        </button>
      </div>
    </div>
  )
}
