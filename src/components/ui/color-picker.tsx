'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

// Curated color palette for D&D groups
const PRESET_COLORS = [
  // Purples & Blues
  { value: '#8B5CF6', label: 'Arcane Purple' },
  { value: '#6366F1', label: 'Indigo' },
  { value: '#3B82F6', label: 'Royal Blue' },
  { value: '#0EA5E9', label: 'Sky Blue' },
  { value: '#06B6D4', label: 'Cyan' },

  // Greens & Teals
  { value: '#14B8A6', label: 'Teal' },
  { value: '#10B981', label: 'Emerald' },
  { value: '#22C55E', label: 'Green' },
  { value: '#84CC16', label: 'Lime' },

  // Yellows & Oranges
  { value: '#D4A843', label: 'Arcane Gold' },
  { value: '#EAB308', label: 'Yellow' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#F97316', label: 'Orange' },

  // Reds & Pinks
  { value: '#E85D4C', label: 'Ember' },
  { value: '#EF4444', label: 'Red' },
  { value: '#EC4899', label: 'Pink' },
  { value: '#D946EF', label: 'Fuchsia' },

  // Neutrals
  { value: '#78716C', label: 'Stone' },
  { value: '#71717A', label: 'Zinc' },
  { value: '#6B7280', label: 'Gray' },
]

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  className?: string
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  const [customColor, setCustomColor] = useState('')

  return (
    <div className={cn('space-y-4', className)}>
      {/* Preset colors grid */}
      <div className="grid grid-cols-7 gap-3 mb-5">
        {PRESET_COLORS.map((color) => (
          <button
            key={color.value}
            type="button"
            onClick={() => onChange(color.value)}
            className={cn(
              'w-9 h-9 rounded-lg transition-all flex items-center justify-center',
              value === color.value
                ? 'ring-2 ring-white/80 ring-offset-2 ring-offset-[#12121a]'
                : 'hover:ring-2 hover:ring-white/20'
            )}
            style={{ backgroundColor: color.value }}
            title={color.label}
          >
            {value === color.value && (
              <Check className="w-4 h-4 text-white drop-shadow-md" />
            )}
          </button>
        ))}
      </div>

      {/* Custom color input */}
      <div className="flex items-center gap-2 pt-4 mt-4 border-t border-[#2a2a3a]">
        <label className="text-xs text-[#606070]">Custom:</label>
        <div className="flex items-center gap-2 flex-1">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
            style={{ padding: 0 }}
          />
          <input
            type="text"
            value={customColor || value}
            onChange={(e) => {
              setCustomColor(e.target.value)
              if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                onChange(e.target.value)
              }
            }}
            onBlur={() => {
              if (/^#[0-9A-Fa-f]{6}$/.test(customColor)) {
                onChange(customColor)
              }
              setCustomColor('')
            }}
            placeholder="#8B5CF6"
            className="flex-1 h-8 px-2 text-sm rounded-lg bg-[#1a1a24] border border-[#2a2a3a] text-[#f0f0f5] focus:border-[#8B5CF6] focus:outline-none"
          />
        </div>
      </div>
    </div>
  )
}

export { PRESET_COLORS }
