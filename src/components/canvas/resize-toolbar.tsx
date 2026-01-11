'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { X, Check, RotateCcw, Scaling, Users, User } from 'lucide-react'
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

  // Calculate slider percentages for gradient
  const widthPercent = ((width - MIN_CARD_WIDTH) / (MAX_CARD_WIDTH - MIN_CARD_WIDTH)) * 100
  const heightPercent = ((height - MIN_CARD_HEIGHT) / (MAX_CARD_HEIGHT - MIN_CARD_HEIGHT)) * 100

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[420px] max-w-[95vw] bg-[--bg-surface] border border-[--border] rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[--border] bg-[--bg-elevated]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[--arcane-purple] to-[--arcane-purple-dim] flex items-center justify-center shadow-lg shadow-[--arcane-purple-glow]">
              <Scaling className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[--text-primary]">Resize Cards</h2>
              <p className="text-sm text-[--text-tertiary]">Adjust card dimensions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-[--bg-hover] transition-colors"
          >
            <X className="w-5 h-5 text-[--text-secondary]" />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 px-6 py-4 border-b border-[--border]">
          {[
            { id: 'all' as const, label: 'All', count: characters.length, icon: Users },
            { id: 'pc' as const, label: 'PCs', count: pcCount, icon: User },
            { id: 'npc' as const, label: 'NPCs', count: npcCount, icon: User },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                filter === tab.id
                  ? 'bg-[--arcane-purple] text-white shadow-lg shadow-[--arcane-purple-glow]'
                  : 'bg-[--bg-elevated] text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-hover]'
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span className={cn(
                'px-2 py-0.5 rounded-full text-xs',
                filter === tab.id
                  ? 'bg-white/20'
                  : 'bg-[--bg-hover]'
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Character selection */}
        <div className="px-6 py-4 border-b border-[--border]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-[--text-secondary]">
              <span className="text-[--arcane-purple] font-semibold">{selectedIds.size}</span> of {filteredCharacters.length} selected
            </span>
            <div className="flex gap-3">
              <button
                onClick={selectAll}
                className="text-sm font-medium text-[--arcane-purple] hover:text-[--arcane-purple-dim] transition-colors"
              >
                Select all
              </button>
              <span className="text-[--border]">|</span>
              <button
                onClick={deselectAll}
                className="text-sm font-medium text-[--text-secondary] hover:text-[--text-primary] transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1 pr-2 -mr-2 scrollbar-thin">
            {filteredCharacters.map((char) => (
              <label
                key={char.id}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all',
                  selectedIds.has(char.id)
                    ? 'bg-[--arcane-purple]/10 border border-[--arcane-purple]/30'
                    : 'bg-[--bg-elevated] border border-transparent hover:bg-[--bg-hover]'
                )}
              >
                <div className={cn(
                  'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all',
                  selectedIds.has(char.id)
                    ? 'bg-[--arcane-purple] border-[--arcane-purple]'
                    : 'border-[--border] bg-transparent'
                )}>
                  {selectedIds.has(char.id) && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={selectedIds.has(char.id)}
                  onChange={() => toggleCharacter(char.id)}
                  className="sr-only"
                />
                <span className="text-sm text-[--text-primary] truncate flex-1 font-medium">
                  {char.name}
                </span>
                <span
                  className={cn(
                    'text-xs font-semibold px-2.5 py-1 rounded-lg',
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
        <div className="px-6 py-6 space-y-6 bg-[--bg-base]">
          {/* Width slider */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-[--text-primary]">Width</label>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-[--arcane-purple] tabular-nums">{width}</span>
                <span className="text-sm text-[--text-tertiary]">px</span>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 h-3 rounded-full bg-[--bg-elevated]" />
              <div
                className="absolute h-3 rounded-full bg-gradient-to-r from-[--arcane-purple] to-[--arcane-purple-dim]"
                style={{ width: `${widthPercent}%` }}
              />
              <input
                type="range"
                min={MIN_CARD_WIDTH}
                max={MAX_CARD_WIDTH}
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                className="relative w-full h-3 appearance-none bg-transparent cursor-pointer z-10
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-6
                  [&::-webkit-slider-thumb]:h-6
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-white
                  [&::-webkit-slider-thumb]:shadow-lg
                  [&::-webkit-slider-thumb]:shadow-[--arcane-purple-glow]
                  [&::-webkit-slider-thumb]:border-2
                  [&::-webkit-slider-thumb]:border-[--arcane-purple]
                  [&::-webkit-slider-thumb]:cursor-grab
                  [&::-webkit-slider-thumb]:active:cursor-grabbing
                  [&::-webkit-slider-thumb]:transition-transform
                  [&::-webkit-slider-thumb]:hover:scale-110"
              />
            </div>
            <div className="flex justify-between text-xs text-[--text-muted] mt-2">
              <span>{MIN_CARD_WIDTH}px</span>
              <span>{MAX_CARD_WIDTH}px</span>
            </div>
          </div>

          {/* Height slider */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-[--text-primary]">Height</label>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-[--arcane-purple] tabular-nums">{height}</span>
                <span className="text-sm text-[--text-tertiary]">px</span>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 h-3 rounded-full bg-[--bg-elevated]" />
              <div
                className="absolute h-3 rounded-full bg-gradient-to-r from-[--arcane-purple] to-[--arcane-purple-dim]"
                style={{ width: `${heightPercent}%` }}
              />
              <input
                type="range"
                min={MIN_CARD_HEIGHT}
                max={MAX_CARD_HEIGHT}
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="relative w-full h-3 appearance-none bg-transparent cursor-pointer z-10
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-6
                  [&::-webkit-slider-thumb]:h-6
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-white
                  [&::-webkit-slider-thumb]:shadow-lg
                  [&::-webkit-slider-thumb]:shadow-[--arcane-purple-glow]
                  [&::-webkit-slider-thumb]:border-2
                  [&::-webkit-slider-thumb]:border-[--arcane-purple]
                  [&::-webkit-slider-thumb]:cursor-grab
                  [&::-webkit-slider-thumb]:active:cursor-grabbing
                  [&::-webkit-slider-thumb]:transition-transform
                  [&::-webkit-slider-thumb]:hover:scale-110"
              />
            </div>
            <div className="flex justify-between text-xs text-[--text-muted] mt-2">
              <span>{MIN_CARD_HEIGHT}px</span>
              <span>{MAX_CARD_HEIGHT}px</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-6 py-5 border-t border-[--border] bg-[--bg-elevated]">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[--text-secondary] hover:text-[--text-primary] rounded-xl hover:bg-[--bg-hover] transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Default
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[--arcane-purple] rounded-xl hover:bg-[--arcane-purple-dim] shadow-lg shadow-[--arcane-purple-glow] transition-all hover:scale-105"
          >
            <Check className="w-4 h-4" />
            Done
          </button>
        </div>
      </div>
    </>
  )
}
