'use client'

import { useState } from 'react'
import { Pause, Archive, Skull, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui'
import { cn } from '@/lib/utils'

interface SetInactiveModalProps {
  isOpen: boolean
  onClose: () => void
  contentType: 'campaign' | 'character' | 'oneshot'
  contentId: string
  contentName: string
  onInactive?: () => void
}

interface InactiveOption {
  value: string
  label: string
  description: string
  icon: typeof Pause
  color: string
}

export function SetInactiveModal({
  isOpen,
  onClose,
  contentType,
  contentId,
  contentName,
  onInactive,
}: SetInactiveModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedReason, setSelectedReason] = useState<string | null>(null)

  const getOptions = (): InactiveOption[] => {
    switch (contentType) {
      case 'campaign':
        return [
          {
            value: 'completed',
            label: 'Completed',
            description: 'This campaign has reached its conclusion',
            icon: Archive,
            color: 'green',
          },
          {
            value: 'on_hiatus',
            label: 'On Hiatus',
            description: 'Taking a break, may return later',
            icon: Pause,
            color: 'yellow',
          },
          {
            value: 'retired',
            label: 'Retired',
            description: 'No longer running this campaign',
            icon: Archive,
            color: 'gray',
          },
        ]
      case 'character':
        return [
          {
            value: 'retired',
            label: 'Retired',
            description: 'This character is no longer being played',
            icon: Archive,
            color: 'gray',
          },
          {
            value: 'deceased',
            label: 'Deceased',
            description: 'This character has died in-game',
            icon: Skull,
            color: 'red',
          },
          {
            value: 'on_hiatus',
            label: 'On Hiatus',
            description: 'Taking a break from this character',
            icon: Pause,
            color: 'yellow',
          },
        ]
      case 'oneshot':
        return [
          {
            value: 'completed',
            label: 'Completed',
            description: 'This one-shot has been run',
            icon: Archive,
            color: 'green',
          },
          {
            value: 'archived',
            label: 'Archived',
            description: 'Storing for future reference',
            icon: Archive,
            color: 'gray',
          },
        ]
    }
  }

  const handleSetInactive = async () => {
    if (!selectedReason) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/content/set-inactive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType,
          contentId,
          reason: selectedReason,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update status')
      }

      onInactive?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  const options = getOptions()

  const getColorClasses = (color: string, isSelected: boolean) => {
    const colors: Record<string, { bg: string; border: string; icon: string }> = {
      green: {
        bg: isSelected ? 'bg-green-500/20' : 'bg-green-500/5',
        border: isSelected ? 'border-green-500' : 'border-green-500/20',
        icon: 'text-green-400',
      },
      yellow: {
        bg: isSelected ? 'bg-yellow-500/20' : 'bg-yellow-500/5',
        border: isSelected ? 'border-yellow-500' : 'border-yellow-500/20',
        icon: 'text-yellow-400',
      },
      red: {
        bg: isSelected ? 'bg-red-500/20' : 'bg-red-500/5',
        border: isSelected ? 'border-red-500' : 'border-red-500/20',
        icon: 'text-red-400',
      },
      gray: {
        bg: isSelected ? 'bg-gray-500/20' : 'bg-gray-500/5',
        border: isSelected ? 'border-gray-500' : 'border-gray-500/20',
        icon: 'text-gray-400',
      },
    }
    return colors[color] || colors.gray
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mark as Inactive"
      size="md"
    >
      <div className="space-y-6">
        <p className="text-sm text-gray-400">
          Why are you marking "{contentName}" as inactive?
        </p>

        {/* Options */}
        <div className="space-y-3">
          {options.map((option) => {
            const isSelected = selectedReason === option.value
            const colorClasses = getColorClasses(option.color, isSelected)
            const Icon = option.icon

            return (
              <button
                key={option.value}
                onClick={() => setSelectedReason(option.value)}
                className={cn(
                  'w-full flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left',
                  colorClasses.bg,
                  colorClasses.border,
                  isSelected ? 'ring-2 ring-offset-2 ring-offset-gray-900' : ''
                )}
              >
                <div className={cn('p-2 rounded-lg bg-white/5', colorClasses.bg)}>
                  <Icon className={cn('w-5 h-5', colorClasses.icon)} />
                </div>
                <div>
                  <p className="font-medium text-white">{option.label}</p>
                  <p className="text-sm text-gray-400">{option.description}</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Info */}
        <p className="text-xs text-gray-500">
          You can reactivate this {contentType} at any time from the Inactive tab.
        </p>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSetInactive}
            disabled={loading || !selectedReason}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Pause className="w-4 h-4" />
            )}
            Mark as Inactive
          </button>
        </div>
      </div>
    </Modal>
  )
}
