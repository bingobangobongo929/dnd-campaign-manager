'use client'

import { useState, useEffect, useRef } from 'react'
import { Modal } from '@/components/ui/modal'
import {
  Swords,
  Compass,
  Users,
  Scroll,
  BookOpen,
  Eye,
  EyeOff,
  RotateCcw,
  Wand2,
  GripVertical
} from 'lucide-react'
import type { HomepagePreferences, HomepageSectionId } from '@/types/database'
import { DEFAULT_HOMEPAGE_PREFERENCES } from '@/types/database'
import { cn } from '@/lib/utils'

interface SectionConfig {
  id: HomepageSectionId
  label: string
  icon: React.ReactNode
  color: string
}

const SECTION_CONFIGS: SectionConfig[] = [
  { id: 'campaigns', label: 'Your Campaigns', icon: <Swords className="w-4 h-4" />, color: 'text-blue-400' },
  { id: 'adventures', label: 'Adventures', icon: <Compass className="w-4 h-4" />, color: 'text-teal-400' },
  { id: 'playing', label: 'Playing In', icon: <Users className="w-4 h-4" />, color: 'text-purple-400' },
  { id: 'oneshots', label: 'One-Shots', icon: <Scroll className="w-4 h-4" />, color: 'text-orange-400' },
  { id: 'characters', label: 'Characters', icon: <BookOpen className="w-4 h-4" />, color: 'text-emerald-400' },
]

interface CustomizeHomepageModalProps {
  isOpen: boolean
  onClose: () => void
  preferences: HomepagePreferences
  onSave: (preferences: HomepagePreferences) => Promise<void>
  sectionCounts: Record<HomepageSectionId, number>
}

export function CustomizeHomepageModal({
  isOpen,
  onClose,
  preferences,
  onSave,
  sectionCounts,
}: CustomizeHomepageModalProps) {
  const [localPrefs, setLocalPrefs] = useState<HomepagePreferences>(preferences)
  const [saving, setSaving] = useState(false)
  const [draggedItem, setDraggedItem] = useState<HomepageSectionId | null>(null)
  const [dragOverItem, setDragOverItem] = useState<HomepageSectionId | null>(null)
  const dragNodeRef = useRef<HTMLDivElement | null>(null)

  // Reset local state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalPrefs(preferences)
      setDraggedItem(null)
      setDragOverItem(null)
    }
  }, [isOpen, preferences])

  // Get current section order (either manual or auto-sorted)
  const getSectionOrder = (): HomepageSectionId[] => {
    if (!localPrefs.auto_order && localPrefs.section_order.length > 0) {
      // Manual order - ensure all sections are included
      const existingIds = new Set(localPrefs.section_order)
      const allIds: HomepageSectionId[] = [...localPrefs.section_order]
      SECTION_CONFIGS.forEach(s => {
        if (!existingIds.has(s.id)) {
          allIds.push(s.id)
        }
      })
      return allIds
    }

    // Auto order: non-empty first (by count desc), then empty
    return [...SECTION_CONFIGS]
      .sort((a, b) => {
        const countA = sectionCounts[a.id] || 0
        const countB = sectionCounts[b.id] || 0
        if (countA === 0 && countB > 0) return 1
        if (countA > 0 && countB === 0) return -1
        return countB - countA
      })
      .map(s => s.id)
  }

  const orderedSections = getSectionOrder()

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, sectionId: HomepageSectionId) => {
    setDraggedItem(sectionId)
    dragNodeRef.current = e.currentTarget
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', sectionId)
    setTimeout(() => {
      if (dragNodeRef.current) {
        dragNodeRef.current.style.opacity = '0.5'
      }
    }, 0)
  }

  const handleDragEnd = () => {
    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = '1'
    }
    setDraggedItem(null)
    setDragOverItem(null)
    dragNodeRef.current = null
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, sectionId: HomepageSectionId) => {
    e.preventDefault()
    if (draggedItem && draggedItem !== sectionId) {
      setDragOverItem(sectionId)
    }
  }

  const handleDragLeave = () => {
    setDragOverItem(null)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetSectionId: HomepageSectionId) => {
    e.preventDefault()
    if (!draggedItem || draggedItem === targetSectionId) {
      setDragOverItem(null)
      return
    }

    const currentOrder = [...orderedSections]
    const draggedIndex = currentOrder.indexOf(draggedItem)
    const targetIndex = currentOrder.indexOf(targetSectionId)

    if (draggedIndex === -1 || targetIndex === -1) return

    const newOrder = [...currentOrder]
    newOrder.splice(draggedIndex, 1)
    newOrder.splice(targetIndex, 0, draggedItem)

    setLocalPrefs({
      ...localPrefs,
      auto_order: false,
      section_order: newOrder,
    })
    setDragOverItem(null)
  }

  const toggleVisibility = (sectionId: HomepageSectionId) => {
    const isHidden = localPrefs.hidden_sections.includes(sectionId)
    const newHidden = isHidden
      ? localPrefs.hidden_sections.filter(id => id !== sectionId)
      : [...localPrefs.hidden_sections, sectionId]

    setLocalPrefs({
      ...localPrefs,
      hidden_sections: newHidden,
    })
  }

  const toggleAutoOrder = (enabled: boolean) => {
    setLocalPrefs({
      ...localPrefs,
      auto_order: enabled,
      // If switching to auto, clear manual order
      section_order: enabled ? [] : orderedSections,
    })
  }

  const handleReset = () => {
    setLocalPrefs(DEFAULT_HOMEPAGE_PREFERENCES)
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

  const getConfig = (id: HomepageSectionId) =>
    SECTION_CONFIGS.find(s => s.id === id) || SECTION_CONFIGS[0]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Customize Homepage" size="sm">
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

        {/* Section List */}
        <div className="space-y-1">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Sections</p>

          {orderedSections.map((sectionId) => {
            const config = getConfig(sectionId)
            const count = sectionCounts[sectionId] || 0
            const isHidden = localPrefs.hidden_sections.includes(sectionId)
            const isAutoMode = localPrefs.auto_order
            const isDragging = draggedItem === sectionId
            const isDragOver = dragOverItem === sectionId

            return (
              <div
                key={sectionId}
                draggable={!isAutoMode}
                onDragStart={(e) => !isAutoMode && handleDragStart(e, sectionId)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, sectionId)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, sectionId)}
                className={cn(
                  "flex items-center gap-2 p-2.5 rounded-lg border transition-all",
                  isHidden
                    ? "bg-gray-900/50 border-white/[0.03] opacity-60"
                    : "bg-white/[0.03] border-white/[0.06]",
                  isDragging && "opacity-50",
                  isDragOver && "border-purple-400 border-dashed bg-purple-500/20",
                  !isAutoMode && "cursor-grab active:cursor-grabbing"
                )}
              >
                {/* Drag Handle */}
                <div className={cn(
                  "text-gray-500 transition-colors",
                  !isAutoMode && "hover:text-gray-300"
                )}>
                  <GripVertical className="w-4 h-4" />
                </div>

                {/* Icon */}
                <span className={cn(config.color, isHidden && "opacity-50")}>
                  {config.icon}
                </span>

                {/* Label & Count */}
                <div className="flex-1 flex items-center gap-2">
                  <span className={cn(
                    "text-sm",
                    isHidden ? "text-gray-500" : "text-white"
                  )}>
                    {config.label}
                  </span>
                  <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full",
                    count > 0
                      ? "bg-white/10 text-gray-400"
                      : "bg-gray-800 text-gray-600"
                  )}>
                    {count}
                  </span>
                </div>

                {/* Visibility Toggle */}
                <button
                  onClick={() => toggleVisibility(sectionId)}
                  className={cn(
                    "p-1.5 rounded transition-colors",
                    isHidden
                      ? "text-gray-600 hover:text-gray-400 hover:bg-white/[0.05]"
                      : "text-gray-400 hover:text-white hover:bg-white/[0.05]"
                  )}
                  title={isHidden ? "Show section" : "Hide section"}
                >
                  {isHidden ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            )
          })}
        </div>

        {/* Info note */}
        <p className="text-xs text-gray-500">
          Sections with 0 items show a prompt to get started. Hidden sections won't appear on your homepage.
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
