'use client'

import { useState, useEffect } from 'react'
import {
  Calendar,
  MapPin,
  Star,
  Users,
  Check,
  Scroll,
  User,
  Swords,
  Crown,
  Skull,
  Heart,
  Shield,
  BookOpen,
} from 'lucide-react'
import { Input, Dropdown } from '@/components/ui'
import { RichTextEditor } from '@/components/editor'
import { cn, getInitials } from '@/lib/utils'
import Image from 'next/image'
import type { Character, Session } from '@/types/database'

export const EVENT_TYPES = [
  { value: 'session', label: 'Session', icon: Scroll },
  { value: 'character_intro', label: 'Character Introduction', icon: User },
  { value: 'combat', label: 'Combat/Battle', icon: Swords },
  { value: 'discovery', label: 'Discovery', icon: MapPin },
  { value: 'quest_start', label: 'Quest Started', icon: Star },
  { value: 'quest_complete', label: 'Quest Completed', icon: Crown },
  { value: 'death', label: 'Death', icon: Skull },
  { value: 'romance', label: 'Romance', icon: Heart },
  { value: 'alliance', label: 'Alliance', icon: Shield },
  { value: 'other', label: 'Other', icon: Calendar },
]

export interface TimelineEventFormData {
  title: string
  description: string
  event_date: string
  event_type: string
  session_id: string | null
  location: string
  is_major: boolean
  character_ids: string[]
}

interface TimelineEventEditorProps {
  formData: TimelineEventFormData
  onChange: (data: TimelineEventFormData) => void
  characters: Character[]
  sessions: Session[]
  mode?: 'full' | 'compact'
  className?: string
}

export function TimelineEventEditor({
  formData,
  onChange,
  characters,
  sessions,
  mode = 'full',
  className,
}: TimelineEventEditorProps) {
  // Group characters by type
  const pcCharacters = characters.filter(c => c.type === 'pc')
  const npcCharacters = characters.filter(c => c.type === 'npc')

  // Build session options
  const sessionOptions = [
    { value: '', label: 'No linked session' },
    ...sessions.map(s => ({
      value: s.id,
      label: `Session ${s.session_number}${s.title ? `: ${s.title}` : ''}`,
    })),
  ]

  const toggleCharacter = (characterId: string) => {
    const newIds = formData.character_ids.includes(characterId)
      ? formData.character_ids.filter(id => id !== characterId)
      : [...formData.character_ids, characterId]
    onChange({ ...formData, character_ids: newIds })
  }

  const updateField = <K extends keyof TimelineEventFormData>(
    field: K,
    value: TimelineEventFormData[K]
  ) => {
    onChange({ ...formData, [field]: value })
  }

  if (mode === 'compact') {
    // Compact mode for modals - no description editor, simpler layout
    return (
      <div className={cn('space-y-4', className)}>
        {/* Title */}
        <div className="form-group">
          <label className="form-label">Event Title</label>
          <Input
            value={formData.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="What happened..."
            className="w-full"
          />
        </div>

        {/* Event Type & Date */}
        <div className="grid grid-cols-2 gap-4">
          <div className="form-group">
            <label className="form-label">Event Type</label>
            <Dropdown
              options={EVENT_TYPES.map(t => ({ value: t.value, label: t.label }))}
              value={formData.event_type}
              onChange={(value) => updateField('event_type', value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <Input
              type="date"
              value={formData.event_date}
              onChange={(e) => updateField('event_date', e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        {/* Session & Location */}
        <div className="grid grid-cols-2 gap-4">
          <div className="form-group">
            <label className="form-label flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              Linked Session
            </label>
            <Dropdown
              options={sessionOptions}
              value={formData.session_id || ''}
              onChange={(value) => updateField('session_id', value || null)}
            />
          </div>
          <div className="form-group">
            <label className="form-label flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              Location
            </label>
            <Input
              value={formData.location}
              onChange={(e) => updateField('location', e.target.value)}
              placeholder="Where did this happen?"
              className="w-full"
            />
          </div>
        </div>

        {/* Importance Toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => updateField('is_major', !formData.is_major)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium',
              formData.is_major
                ? 'bg-[--arcane-gold]/20 text-[--arcane-gold] ring-1 ring-[--arcane-gold]/30'
                : 'bg-[--bg-elevated] text-[--text-secondary] hover:bg-[--bg-surface]'
            )}
          >
            <Star className={cn('w-4 h-4', formData.is_major && 'fill-current')} />
            {formData.is_major ? 'Major Event' : 'Minor Event'}
          </button>
        </div>

        {/* Description */}
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Describe what happened..."
            className="form-input w-full min-h-[100px] resize-none"
            rows={4}
          />
        </div>
      </div>
    )
  }

  // Full mode - complete editor with all features
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header Row: Type, Date, Title */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Dropdown
            options={EVENT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            value={formData.event_type}
            onChange={(value) => updateField('event_type', value)}
            className="w-48"
          />
          <div className="flex items-center gap-1.5 text-sm text-[--text-tertiary]">
            <Calendar className="w-4 h-4" />
            <Input
              type="date"
              value={formData.event_date}
              onChange={(e) => updateField('event_date', e.target.value)}
              className="h-7 px-2 py-0 text-sm border-none bg-transparent hover:bg-[--bg-elevated] focus:bg-[--bg-elevated] rounded cursor-pointer"
            />
          </div>
        </div>
        <Input
          value={formData.title}
          onChange={(e) => updateField('title', e.target.value)}
          className="text-2xl font-display font-semibold border-none bg-transparent px-0 h-auto focus:ring-0 placeholder:text-[--text-tertiary]"
          placeholder="Event title..."
        />
      </div>

      {/* Meta Row: Session, Location, Importance */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Session Link */}
          <div className="form-group mb-0">
            <label className="form-label flex items-center gap-1.5 text-xs">
              <BookOpen className="w-3.5 h-3.5 text-[--arcane-purple]" />
              Linked Session
            </label>
            <Dropdown
              options={sessionOptions}
              value={formData.session_id || ''}
              onChange={(value) => updateField('session_id', value || null)}
            />
          </div>

          {/* Location */}
          <div className="form-group mb-0">
            <label className="form-label flex items-center gap-1.5 text-xs">
              <MapPin className="w-3.5 h-3.5 text-[--arcane-purple]" />
              Location
            </label>
            <Input
              value={formData.location}
              onChange={(e) => updateField('location', e.target.value)}
              placeholder="Where did this happen?"
              className="w-full"
            />
          </div>

          {/* Importance */}
          <div className="form-group mb-0">
            <label className="form-label flex items-center gap-1.5 text-xs">
              <Star className="w-3.5 h-3.5 text-[--arcane-purple]" />
              Importance
            </label>
            <button
              type="button"
              onClick={() => updateField('is_major', !formData.is_major)}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium',
                formData.is_major
                  ? 'bg-[--arcane-gold]/20 text-[--arcane-gold] ring-1 ring-[--arcane-gold]/30'
                  : 'bg-[--bg-elevated] text-[--text-secondary] hover:bg-[--bg-surface] border border-[--border]'
              )}
            >
              <Star className={cn('w-4 h-4', formData.is_major && 'fill-current')} />
              {formData.is_major ? 'Major Event' : 'Minor Event'}
            </button>
          </div>
        </div>
      </div>

      {/* Characters Section */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[--arcane-purple]" />
            <label className="form-label mb-0 text-lg">
              Characters Involved
            </label>
            <span className="text-sm text-[--text-tertiary]">
              ({formData.character_ids.length} selected)
            </span>
          </div>
        </div>

        {/* PC Characters */}
        {pcCharacters.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-[--text-tertiary] uppercase tracking-wide mb-2">
              Player Characters
            </h4>
            <div className="flex flex-wrap gap-2">
              {pcCharacters.map((char) => {
                const isSelected = formData.character_ids.includes(char.id)
                return (
                  <button
                    key={char.id}
                    type="button"
                    onClick={() => toggleCharacter(char.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-xl transition-all',
                      isSelected
                        ? 'bg-[--arcane-purple] text-white shadow-lg shadow-[--arcane-purple]/25'
                        : 'bg-[--bg-elevated] border border-[--border] hover:border-[--arcane-purple]/50 text-[--text-secondary] hover:text-[--text-primary]'
                    )}
                  >
                    <div className={cn(
                      "relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0",
                      isSelected ? 'ring-2 ring-white/30' : 'bg-[--bg-surface]'
                    )}>
                      {char.image_url ? (
                        <Image
                          src={char.image_url}
                          alt={char.name}
                          fill
                          className="object-cover"
                          sizes="28px"
                        />
                      ) : (
                        <div className={cn(
                          "w-full h-full flex items-center justify-center text-xs font-medium",
                          isSelected ? 'bg-white/20 text-white' : 'text-[--text-secondary]'
                        )}>
                          {getInitials(char.name)}
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-medium">
                      {char.name}
                    </span>
                    {isSelected && (
                      <Check className="w-4 h-4 ml-1" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* NPC Characters */}
        {npcCharacters.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-[--text-tertiary] uppercase tracking-wide mb-2">
              Non-Player Characters
            </h4>
            <div className="flex flex-wrap gap-2">
              {npcCharacters.map((char) => {
                const isSelected = formData.character_ids.includes(char.id)
                return (
                  <button
                    key={char.id}
                    type="button"
                    onClick={() => toggleCharacter(char.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-xl transition-all',
                      isSelected
                        ? 'bg-[--arcane-gold] text-[--bg-base] shadow-lg shadow-[--arcane-gold]/25'
                        : 'bg-[--bg-elevated] border border-[--border] hover:border-[--arcane-gold]/50 text-[--text-secondary] hover:text-[--text-primary]'
                    )}
                  >
                    <div className={cn(
                      "relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0",
                      isSelected ? 'ring-2 ring-black/20' : 'bg-[--bg-surface]'
                    )}>
                      {char.image_url ? (
                        <Image
                          src={char.image_url}
                          alt={char.name}
                          fill
                          className="object-cover"
                          sizes="28px"
                        />
                      ) : (
                        <div className={cn(
                          "w-full h-full flex items-center justify-center text-xs font-medium",
                          isSelected ? 'bg-black/20 text-[--bg-base]' : 'text-[--text-secondary]'
                        )}>
                          {getInitials(char.name)}
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-medium">
                      {char.name}
                    </span>
                    {isSelected && (
                      <Check className="w-4 h-4 ml-1" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {characters.length === 0 && (
          <p className="text-sm text-[--text-tertiary] text-center py-4">
            No characters in this campaign yet. Add characters on the Canvas.
          </p>
        )}
      </div>

      {/* Description Section */}
      <div className="card p-5">
        <label className="form-label">Event Description</label>
        <RichTextEditor
          content={formData.description}
          onChange={(content) => updateField('description', content)}
          placeholder="Describe what happened during this event..."
          className="min-h-[300px]"
        />
      </div>
    </div>
  )
}
