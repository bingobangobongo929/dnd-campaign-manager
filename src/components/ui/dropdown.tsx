'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DropdownOption {
  value: string
  label: string
  icon?: React.ReactNode
}

interface DropdownProps {
  options: DropdownOption[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function Dropdown({ options, value, onChange, placeholder = 'Select...', className }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find(opt => opt.value === value)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-between w-full h-10 px-3 rounded-lg border bg-[--bg-surface] text-sm transition-colors',
          'border-[--border] hover:border-[--border-focus]/50 focus:border-[--border-focus] focus:outline-none focus:ring-2 focus:ring-[--border-focus]/20',
          isOpen && 'border-[--border-focus] ring-2 ring-[--border-focus]/20'
        )}
      >
        <span className={cn('truncate', !selected && 'text-[--text-tertiary]')}>
          {selected ? (
            <span className="flex items-center gap-2">
              {selected.icon}
              {selected.label}
            </span>
          ) : placeholder}
        </span>
        <ChevronDown className={cn('h-4 w-4 text-[--text-tertiary] transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div
          className="absolute z-50 w-full mt-1 py-1 rounded-lg shadow-2xl animate-scale-in"
          style={{
            backgroundColor: '#1a1a24',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              className={cn(
                'flex items-center justify-between w-full px-3 py-2.5 text-sm text-left transition-colors',
                option.value === value ? 'text-[--arcane-purple]' : 'text-[--text-primary]'
              )}
              style={{
                backgroundColor: option.value === value ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (option.value !== value) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = option.value === value ? 'rgba(139, 92, 246, 0.1)' : 'transparent'
              }}
            >
              <span className="flex items-center gap-2">
                {option.icon}
                {option.label}
              </span>
              {option.value === value && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
