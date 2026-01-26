'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import {
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Wand2,
  GripVertical
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TabConfig<T extends string> {
  id: T
  label: string
  icon: React.ReactNode
  color: string // Tailwind color class like 'text-purple-400'
  comingSoon?: boolean
}

export interface PagePreferences<T extends string> {
  auto_order: boolean
  tab_order: T[]
  hidden_tabs: T[]
  default_tab: T
}

interface PageCustomizeModalProps<T extends string> {
  isOpen: boolean
  onClose: () => void
  title: string
  tabs: TabConfig<T>[]
  preferences: PagePreferences<T>
  defaultPreferences: PagePreferences<T>
  onSave: (preferences: PagePreferences<T>) => Promise<void>
  tabCounts: Record<T, number>
}

export function PageCustomizeModal<T extends string>({
  isOpen,
  onClose,
  title,
  tabs,
  preferences,
  defaultPreferences,
  onSave,
  tabCounts,
}: PageCustomizeModalProps<T>) {
  const [localPrefs, setLocalPrefs] = useState<PagePreferences<T>>(preferences)
  const [saving, setSaving] = useState(false)

  // Reset local state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalPrefs(preferences)
    }
  }, [isOpen, preferences])

  // Get current tab order (either manual or auto-sorted)
  const getTabOrder = (): T[] => {
    if (!localPrefs.auto_order && localPrefs.tab_order.length > 0) {
      // Manual order - ensure all tabs are included
      const existingIds = new Set(localPrefs.tab_order)
      const allIds: T[] = [...localPrefs.tab_order]
      tabs.forEach(t => {
        if (!existingIds.has(t.id)) {
          allIds.push(t.id)
        }
      })
      return allIds
    }

    // Auto order: non-empty first (by count desc), then empty, coming soon last
    return [...tabs]
      .sort((a, b) => {
        // Coming soon always last
        if (a.comingSoon && !b.comingSoon) return 1
        if (!a.comingSoon && b.comingSoon) return -1

        const countA = tabCounts[a.id] || 0
        const countB = tabCounts[b.id] || 0
        if (countA === 0 && countB > 0) return 1
        if (countA > 0 && countB === 0) return -1
        return countB - countA
      })
      .map(t => t.id)
  }

  const orderedTabs = getTabOrder()

  const moveTab = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...orderedTabs]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= newOrder.length) return

    // Swap
    ;[newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]]

    setLocalPrefs({
      ...localPrefs,
      auto_order: false,
      tab_order: newOrder,
    })
  }

  const toggleVisibility = (tabId: T) => {
    const isHidden = localPrefs.hidden_tabs.includes(tabId)
    const newHidden = isHidden
      ? localPrefs.hidden_tabs.filter(id => id !== tabId)
      : [...localPrefs.hidden_tabs, tabId]

    setLocalPrefs({
      ...localPrefs,
      hidden_tabs: newHidden,
    })
  }

  const toggleAutoOrder = (enabled: boolean) => {
    setLocalPrefs({
      ...localPrefs,
      auto_order: enabled,
      // If switching to auto, clear manual order
      tab_order: enabled ? [] : orderedTabs,
    })
  }

  const handleReset = () => {
    setLocalPrefs(defaultPreferences)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(localPrefs)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const getConfig = (id: T) =>
    tabs.find(t => t.id === id) || tabs[0]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-6">
        {/* Auto/Manual Toggle */}
        <div className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg border border-white/[0.06]">
          <div className="flex items-center gap-3">
            <Wand2 className="w-4 h-4 text-purple-400" />
            <div>
              <p className="text-sm font-medium text-white">Auto-arrange</p>
              <p className="text-xs text-gray-500">Sort by content count</p>
            </div>
          </div>
          <button
            onClick={() => toggleAutoOrder(!localPrefs.auto_order)}
            className={cn(
              "relative w-11 h-6 rounded-full transition-colors",
              localPrefs.auto_order ? "bg-purple-600" : "bg-gray-700"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform",
                localPrefs.auto_order && "translate-x-5"
              )}
            />
          </button>
        </div>

        {/* Tab List */}
        <div className="space-y-1">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Tabs</p>

          {orderedTabs.map((tabId, index) => {
            const config = getConfig(tabId)
            const count = tabCounts[tabId] ?? 0
            const isHidden = localPrefs.hidden_tabs.includes(tabId)
            const isAutoMode = localPrefs.auto_order
            const isComingSoon = config.comingSoon

            return (
              <div
                key={tabId}
                className={cn(
                  "flex items-center gap-2 p-2.5 rounded-lg border transition-all",
                  isHidden || isComingSoon
                    ? "bg-gray-900/50 border-white/[0.03] opacity-60"
                    : "bg-white/[0.03] border-white/[0.06]"
                )}
              >
                {/* Drag Handle / Order Indicator */}
                <div className="flex items-center gap-1">
                  {!isAutoMode && !isComingSoon && (
                    <div className="flex flex-col -my-1">
                      <button
                        onClick={() => moveTab(index, 'up')}
                        disabled={index === 0}
                        className="p-0.5 text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveTab(index, 'down')}
                        disabled={index === orderedTabs.length - 1}
                        className="p-0.5 text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  {(isAutoMode || isComingSoon) && (
                    <div className="w-5 flex items-center justify-center">
                      <GripVertical className="w-3.5 h-3.5 text-gray-600" />
                    </div>
                  )}
                </div>

                {/* Icon */}
                <span className={cn(config.color, (isHidden || isComingSoon) && "opacity-50")}>
                  {config.icon}
                </span>

                {/* Label & Count */}
                <div className="flex-1 flex items-center gap-2">
                  <span className={cn(
                    "text-sm",
                    (isHidden || isComingSoon) ? "text-gray-500" : "text-white"
                  )}>
                    {config.label}
                  </span>
                  {isComingSoon ? (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                      Soon
                    </span>
                  ) : (
                    <span className={cn(
                      "text-xs px-1.5 py-0.5 rounded-full",
                      count > 0
                        ? "bg-white/10 text-gray-400"
                        : "bg-gray-800 text-gray-600"
                    )}>
                      {count}
                    </span>
                  )}
                </div>

                {/* Visibility Toggle */}
                {!isComingSoon && (
                  <button
                    onClick={() => toggleVisibility(tabId)}
                    className={cn(
                      "p-1.5 rounded transition-colors",
                      isHidden
                        ? "text-gray-600 hover:text-gray-400 hover:bg-white/[0.05]"
                        : "text-gray-400 hover:text-white hover:bg-white/[0.05]"
                    )}
                    title={isHidden ? "Show tab" : "Hide tab"}
                  >
                    {isHidden ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Info note */}
        <p className="text-xs text-gray-500">
          Tabs with 0 items show guidance to help you get started. Hidden tabs won't appear in navigation.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Default
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 text-white rounded-lg transition-colors"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
