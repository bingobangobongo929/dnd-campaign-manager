'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Search, X, Users, ChevronDown, UserCheck } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'

interface Character {
  id: string
  name: string
  type: 'pc' | 'npc'
  image_url?: string | null
}

export interface KeyNpcsData {
  linkedCharacterIds: string[]
  notes: string
}

interface KeyNpcsModuleProps {
  value: KeyNpcsData
  onChange: (value: KeyNpcsData) => void
  characters: Character[]
  readOnly?: boolean
}

// Parse legacy string format or new JSON format
export function parseKeyNpcsValue(value: string | KeyNpcsData | null | undefined): KeyNpcsData {
  if (!value) {
    return { linkedCharacterIds: [], notes: '' }
  }

  // If it's already the new format (object with linkedCharacterIds)
  if (typeof value === 'object' && 'linkedCharacterIds' in value) {
    return {
      linkedCharacterIds: value.linkedCharacterIds || [],
      notes: value.notes || '',
    }
  }

  // If it's a string, try to parse as JSON first
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      // Check if it's a valid KeyNpcsData structure
      if (parsed && typeof parsed === 'object' && 'linkedCharacterIds' in parsed) {
        return {
          linkedCharacterIds: Array.isArray(parsed.linkedCharacterIds) ? parsed.linkedCharacterIds : [],
          notes: typeof parsed.notes === 'string' ? parsed.notes : '',
        }
      }
    } catch {
      // Not valid JSON, treat as legacy notes-only format
    }
    // If we get here, it's either not JSON or not the right structure
    // Treat as legacy plain text notes (but not if it looks like JSON garbage)
    if (!value.startsWith('{')) {
      return { linkedCharacterIds: [], notes: value }
    }
  }

  return { linkedCharacterIds: [], notes: '' }
}

// Serialize KeyNpcsData to string (for backward compatibility with text field saving)
export function serializeKeyNpcsValue(value: KeyNpcsData): string {
  return JSON.stringify(value)
}

export function KeyNpcsModule({
  value,
  onChange,
  characters,
  readOnly = false,
}: KeyNpcsModuleProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAllTypes, setShowAllTypes] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter characters based on search and type
  const filteredCharacters = characters.filter(char => {
    // Filter by type
    if (!showAllTypes && char.type !== 'npc') return false

    // Filter by search
    if (searchQuery && !char.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }

    // Don't show already selected
    if (value.linkedCharacterIds.includes(char.id)) return false

    return true
  })

  const selectedCharacters = characters.filter(char =>
    value.linkedCharacterIds.includes(char.id)
  )

  const handleSelectCharacter = (charId: string) => {
    onChange({
      ...value,
      linkedCharacterIds: [...value.linkedCharacterIds, charId],
    })
    setSearchQuery('')
  }

  const handleRemoveCharacter = (charId: string) => {
    onChange({
      ...value,
      linkedCharacterIds: value.linkedCharacterIds.filter(id => id !== charId),
    })
  }

  const handleNotesChange = (notes: string) => {
    onChange({
      ...value,
      notes,
    })
  }

  if (readOnly) {
    return (
      <div className="space-y-3">
        {/* Selected NPCs (Read Only) */}
        {selectedCharacters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedCharacters.map(char => (
              <div
                key={char.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-full"
              >
                {char.image_url ? (
                  <Image
                    src={char.image_url}
                    alt={char.name}
                    width={20}
                    height={20}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-green-600/30 flex items-center justify-center text-green-400 text-[10px] font-medium">
                    {getInitials(char.name)}
                  </div>
                )}
                <span className="text-sm text-green-300">{char.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Notes (Read Only) */}
        {value.notes && (
          <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.06]">
            <p className="text-sm text-gray-300 whitespace-pre-wrap">{value.notes}</p>
          </div>
        )}

        {!selectedCharacters.length && !value.notes && (
          <p className="text-sm text-gray-500 italic">No key NPCs noted for this session</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Character Picker */}
      <div ref={searchRef} className="relative">
        <div
          onClick={() => {
            setSearchOpen(true)
            setTimeout(() => inputRef.current?.focus(), 0)
          }}
          className={cn(
            "flex items-center gap-2 px-3 py-2 bg-[--bg-base] border rounded-lg cursor-text transition-colors",
            searchOpen ? "border-green-500/50" : "border-[--border] hover:border-green-500/30"
          )}
        >
          <Search className="w-4 h-4 text-gray-500" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            placeholder="Search characters to add..."
            className="flex-1 bg-transparent text-white text-sm placeholder:text-gray-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setShowAllTypes(!showAllTypes)
            }}
            className={cn(
              "text-xs px-2 py-1 rounded transition-colors",
              showAllTypes
                ? "bg-purple-500/20 text-purple-300"
                : "bg-white/[0.05] text-gray-400 hover:text-white"
            )}
          >
            {showAllTypes ? 'All' : 'NPCs only'}
          </button>
        </div>

        {/* Dropdown */}
        {searchOpen && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 py-1 bg-[--bg-elevated] border border-[--border] rounded-lg shadow-xl max-h-60 overflow-auto">
            {filteredCharacters.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                {searchQuery ? 'No matching characters' : showAllTypes ? 'No characters available' : 'No NPCs available'}
              </div>
            ) : (
              filteredCharacters.slice(0, 20).map(char => (
                <button
                  key={char.id}
                  type="button"
                  onClick={() => handleSelectCharacter(char.id)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/[0.05] transition-colors"
                >
                  {char.image_url ? (
                    <Image
                      src={char.image_url}
                      alt={char.name}
                      width={28}
                      height={28}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-green-600/20 flex items-center justify-center text-green-400 text-xs font-medium">
                      {getInitials(char.name)}
                    </div>
                  )}
                  <div className="flex-1 text-left">
                    <span className="text-sm text-white">{char.name}</span>
                    <span className={cn(
                      "ml-2 text-xs",
                      char.type === 'npc' ? 'text-green-400' : 'text-blue-400'
                    )}>
                      {char.type.toUpperCase()}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Selected Characters */}
      {selectedCharacters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCharacters.map(char => (
            <div
              key={char.id}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-full group"
            >
              {char.image_url ? (
                <Image
                  src={char.image_url}
                  alt={char.name}
                  width={20}
                  height={20}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-green-600/30 flex items-center justify-center text-green-400 text-[10px] font-medium">
                  {getInitials(char.name)}
                </div>
              )}
              <span className="text-sm text-green-300">{char.name}</span>
              <button
                type="button"
                onClick={() => handleRemoveCharacter(char.id)}
                className="w-4 h-4 rounded-full bg-green-500/20 hover:bg-red-500/30 flex items-center justify-center transition-colors"
              >
                <X className="w-3 h-3 text-green-400 group-hover:text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">
          Motivations, moods, or notes for this session:
        </label>
        <textarea
          value={value.notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="What do these NPCs want? How might they behave? Any special circumstances?"
          rows={3}
          className="w-full px-3 py-2 bg-[--bg-base] border border-[--border] rounded-lg text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-green-500/50 resize-none"
        />
      </div>

      {/* Helper text */}
      {selectedCharacters.length === 0 && !value.notes && (
        <p className="text-xs text-gray-500">
          Link NPCs from your campaign canvas or add notes about who might appear in this session.
        </p>
      )}
    </div>
  )
}
