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
  onResize: (characterIds: string[], width: number | null, height: number | null) => void
  onClose: () => void
}

export function ResizeToolbar({ characters, onResize, onClose }: ResizeToolbarProps) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(characters.map(c => c.id)))
  const [width, setWidth] = useState(DEFAULT_CARD_WIDTH)
  const [height, setHeight] = useState(DEFAULT_CARD_HEIGHT)
  const isFirstRender = useRef(true)
  const prevWidth = useRef(width)
  const prevHeight = useRef(height)

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

  // Live preview - apply as sliders change (only the dimension that changed)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    const widthChanged = prevWidth.current !== width
    const heightChanged = prevHeight.current !== height

    if ((widthChanged || heightChanged) && selectedIds.size > 0) {
      // Only pass the dimension that actually changed
      onResize(
        Array.from(selectedIds),
        widthChanged ? width : null,
        heightChanged ? height : null
      )
    }

    prevWidth.current = width
    prevHeight.current = height
  }, [width, height, selectedIds, onResize])

  const pcCount = characters.filter((c) => c.type === 'pc').length
  const npcCount = characters.filter((c) => c.type === 'npc').length

  return (
    <div className="fixed top-20 right-6 z-50 w-[340px] rounded-2xl shadow-2xl animate-slide-in-right" style={{ backgroundColor: '#1a1a24', border: '1px solid #2a2a3a' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #2a2a3a' }}>
        <h3 className="text-base font-semibold text-[--text-primary]">Resize Cards</h3>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[--bg-hover] transition-colors"
        >
          <X className="w-5 h-5 text-[--text-secondary]" />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 px-5 py-4" style={{ borderBottom: '1px solid #2a2a3a' }}>
        {[
          { id: 'all' as const, label: 'All', count: characters.length, icon: Users },
          { id: 'pc' as const, label: 'PCs', count: pcCount, icon: User },
          { id: 'npc' as const, label: 'NPCs', count: npcCount, icon: User },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
              filter === tab.id
                ? 'bg-[--arcane-purple] text-white shadow-md shadow-[--arcane-purple]/30'
                : 'text-[--text-secondary] bg-[--bg-elevated] hover:text-[--text-primary] hover:bg-[--bg-hover]'
            )}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
            <span className={cn(
              'px-2 py-0.5 rounded-md text-xs font-semibold',
              filter === tab.id ? 'bg-white/20' : 'bg-[--bg-hover]'
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Character selection */}
      <div className="px-5 py-4" style={{ borderBottom: '1px solid #2a2a3a' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-[--text-secondary]">
            <span className="text-[--arcane-purple] font-semibold">{selectedIds.size}</span> of {filteredCharacters.length} selected
          </span>
          <div className="flex gap-3 text-sm">
            <button onClick={selectAll} className="font-medium text-[--arcane-purple] hover:underline">Select All</button>
            <button onClick={deselectAll} className="font-medium text-[--text-tertiary] hover:text-[--text-secondary]">Clear</button>
          </div>
        </div>
        <div className="max-h-36 overflow-y-auto space-y-1 scrollbar-thin">
          {filteredCharacters.map((char) => (
            <label
              key={char.id}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors',
                selectedIds.has(char.id)
                  ? 'bg-[--arcane-purple]/10 border border-[--arcane-purple]/20'
                  : 'hover:bg-[--bg-hover] border border-transparent'
              )}
            >
              <input
                type="checkbox"
                checked={selectedIds.has(char.id)}
                onChange={() => toggleCharacter(char.id)}
                className="w-4 h-4 rounded border-[--border] text-[--arcane-purple] focus:ring-[--arcane-purple] focus:ring-offset-0"
              />
              <span className="text-sm text-[--text-primary] truncate flex-1 font-medium">{char.name}</span>
              <span className={cn(
                'text-xs font-semibold px-2 py-1 rounded-md',
                char.type === 'pc' ? 'bg-[--arcane-purple]/20 text-[--arcane-purple]' : 'bg-[--treasure-gold]/20 text-[--treasure-gold]'
              )}>
                {char.type.toUpperCase()}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Size sliders */}
      <div className="px-5 py-5 space-y-5">
        {/* Width slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-[--text-primary]">Width</label>
            <span className="text-sm font-bold text-[--arcane-purple] tabular-nums">{width}px</span>
          </div>
          <input
            type="range"
            min={MIN_CARD_WIDTH}
            max={MAX_CARD_WIDTH}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="w-full h-2.5 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-5
              [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-[#8B5CF6]
              [&::-webkit-slider-thumb]:border-2
              [&::-webkit-slider-thumb]:border-white
              [&::-webkit-slider-thumb]:shadow-lg
              [&::-webkit-slider-thumb]:cursor-grab
              [&::-webkit-slider-thumb]:active:cursor-grabbing
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-110"
            style={{ backgroundColor: '#2a2a3a' }}
          />
          <div className="flex justify-between text-xs text-[--text-muted] mt-1.5">
            <span>{MIN_CARD_WIDTH}px</span>
            <span>{MAX_CARD_WIDTH}px</span>
          </div>
        </div>

        {/* Height slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-[--text-primary]">Height</label>
            <span className="text-sm font-bold text-[--arcane-purple] tabular-nums">{height}px</span>
          </div>
          <input
            type="range"
            min={MIN_CARD_HEIGHT}
            max={MAX_CARD_HEIGHT}
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
            className="w-full h-2.5 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-5
              [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-[#8B5CF6]
              [&::-webkit-slider-thumb]:border-2
              [&::-webkit-slider-thumb]:border-white
              [&::-webkit-slider-thumb]:shadow-lg
              [&::-webkit-slider-thumb]:cursor-grab
              [&::-webkit-slider-thumb]:active:cursor-grabbing
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-110"
            style={{ backgroundColor: '#2a2a3a' }}
          />
          <div className="flex justify-between text-xs text-[--text-muted] mt-1.5">
            <span>{MIN_CARD_HEIGHT}px</span>
            <span>{MAX_CARD_HEIGHT}px</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: '1px solid #2a2a3a' }}>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[--text-secondary] bg-[--bg-elevated] border border-[--border] rounded-lg hover:bg-[--bg-hover] hover:text-[--text-primary] transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset</span>
        </button>
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[--arcane-purple] rounded-lg hover:bg-[--arcane-purple-dim] shadow-md shadow-[--arcane-purple]/30 transition-all hover:scale-[1.02]"
        >
          <Check className="w-4 h-4" />
          <span>Done</span>
        </button>
      </div>
    </div>
  )
}
