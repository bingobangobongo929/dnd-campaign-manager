'use client'

import { useState, useEffect, useRef } from 'react'
import { Modal } from '@/components/ui/modal'
import {
  EyeOff,
  RotateCcw,
  GripVertical,
  Lock,
  FileText,
  Users,
  ScrollText,
  MessageSquare,
  Lightbulb,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CompletedSection } from '@/types/database'

interface SectionConfig {
  id: CompletedSection
  label: string
  icon: React.ReactNode
  color: string
  description: string
}

const SECTION_CONFIGS: SectionConfig[] = [
  {
    id: 'dm_notes',
    label: 'DM Notes',
    icon: <EyeOff className="w-4 h-4" />,
    color: 'text-red-400',
    description: 'Private notes only you can see',
  },
  {
    id: 'session_content',
    label: 'Session Content',
    icon: <ScrollText className="w-4 h-4" />,
    color: 'text-blue-400',
    description: 'Link quests and encounters',
  },
  {
    id: 'player_notes',
    label: 'Player Notes',
    icon: <MessageSquare className="w-4 h-4" />,
    color: 'text-green-400',
    description: 'Player perspectives on the session',
  },
  {
    id: 'thoughts_for_next',
    label: 'Thoughts for Next',
    icon: <Lightbulb className="w-4 h-4" />,
    color: 'text-yellow-400',
    description: 'Ideas for the next session',
  },
]

const LOCKED_SECTIONS = [
  { id: 'session_notes', label: 'Session Notes', description: 'Core session recap - always visible' },
  { id: 'share_toggle', label: 'Share Controls', description: 'Share with players toggle' },
  { id: 'attendance', label: 'Attendance', description: 'Who was present at the session' },
]

interface CustomizeLayoutModalProps {
  isOpen: boolean
  onClose: () => void
  sectionOrder: CompletedSection[]
  hiddenSections: string[]
  onUpdateOrder: (order: CompletedSection[]) => void
  onToggleHidden: (sectionId: string) => void
  onReset: () => void
}

export function CustomizeLayoutModal({
  isOpen,
  onClose,
  sectionOrder,
  hiddenSections,
  onUpdateOrder,
  onToggleHidden,
  onReset,
}: CustomizeLayoutModalProps) {
  const [localOrder, setLocalOrder] = useState<CompletedSection[]>(sectionOrder)
  const [localHidden, setLocalHidden] = useState<string[]>(hiddenSections)
  const [draggedItem, setDraggedItem] = useState<CompletedSection | null>(null)
  const [dragOverItem, setDragOverItem] = useState<CompletedSection | null>(null)
  const dragNodeRef = useRef<HTMLDivElement | null>(null)

  // Reset local state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalOrder(sectionOrder)
      setLocalHidden(hiddenSections)
      setDraggedItem(null)
      setDragOverItem(null)
    }
  }, [isOpen, sectionOrder, hiddenSections])

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, sectionId: CompletedSection) => {
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

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, sectionId: CompletedSection) => {
    e.preventDefault()
    if (draggedItem && draggedItem !== sectionId) {
      setDragOverItem(sectionId)
    }
  }

  const handleDragLeave = () => {
    setDragOverItem(null)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetSectionId: CompletedSection) => {
    e.preventDefault()
    if (!draggedItem || draggedItem === targetSectionId) {
      setDragOverItem(null)
      return
    }

    const currentOrder = [...localOrder]
    const draggedIndex = currentOrder.indexOf(draggedItem)
    const targetIndex = currentOrder.indexOf(targetSectionId)

    if (draggedIndex === -1 || targetIndex === -1) return

    const newOrder = [...currentOrder]
    newOrder.splice(draggedIndex, 1)
    newOrder.splice(targetIndex, 0, draggedItem)

    setLocalOrder(newOrder)
    setDragOverItem(null)
  }

  const toggleVisibility = (sectionId: string) => {
    const isHidden = localHidden.includes(sectionId)
    const newHidden = isHidden
      ? localHidden.filter(id => id !== sectionId)
      : [...localHidden, sectionId]
    setLocalHidden(newHidden)
  }

  const handleReset = () => {
    setLocalOrder(SECTION_CONFIGS.map(s => s.id))
    setLocalHidden([])
  }

  const handleSave = () => {
    // Save the changes
    onUpdateOrder(localOrder)
    // Update hidden sections
    localHidden.forEach(id => {
      if (!hiddenSections.includes(id)) {
        onToggleHidden(id)
      }
    })
    hiddenSections.forEach(id => {
      if (!localHidden.includes(id)) {
        onToggleHidden(id)
      }
    })
    onClose()
  }

  const getConfig = (id: CompletedSection) =>
    SECTION_CONFIGS.find(s => s.id === id) || SECTION_CONFIGS[0]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Customize Session Layout" size="sm">
      <div className="space-y-6">
        {/* Locked Sections */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Lock className="w-4 h-4 text-gray-500" />
            <h4 className="text-sm font-medium text-gray-400">Core Sections (Always Visible)</h4>
          </div>
          <div className="space-y-2">
            {LOCKED_SECTIONS.map(section => (
              <div
                key={section.id}
                className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50 opacity-60"
              >
                <div className="w-5 flex items-center justify-center">
                  <Lock className="w-3 h-3 text-gray-600" />
                </div>
                <FileText className="w-4 h-4 text-gray-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-400">{section.label}</p>
                  <p className="text-xs text-gray-600">{section.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customizable Sections */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-white">Optional Sections</h4>
            <span className="text-xs text-gray-500">Drag to reorder</span>
          </div>
          <div className="space-y-2">
            {localOrder.map(sectionId => {
              const config = getConfig(sectionId)
              const isHidden = localHidden.includes(sectionId)
              const isDragging = draggedItem === sectionId
              const isDragOver = dragOverItem === sectionId

              return (
                <div
                  key={sectionId}
                  draggable
                  onDragStart={(e) => handleDragStart(e, sectionId)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, sectionId)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, sectionId)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-move",
                    isHidden
                      ? "bg-gray-800/30 border-gray-700/50 opacity-50"
                      : "bg-white/[0.02] border-white/[0.08] hover:border-purple-500/30",
                    isDragging && "opacity-50",
                    isDragOver && "border-purple-500 bg-purple-500/10"
                  )}
                >
                  <div className="w-5 flex items-center justify-center">
                    <GripVertical className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className={cn("w-4 h-4", config.color)}>
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium",
                      isHidden ? "text-gray-500" : "text-white"
                    )}>{config.label}</p>
                    <p className="text-xs text-gray-500">{config.description}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleVisibility(sectionId)
                    }}
                    className={cn(
                      "p-1.5 rounded transition-colors",
                      isHidden
                        ? "text-gray-600 hover:text-white hover:bg-white/[0.05]"
                        : "text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                    )}
                    title={isHidden ? "Show section" : "Hide section"}
                  >
                    <EyeOff className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Default
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="btn btn-secondary btn-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn btn-primary btn-sm"
            >
              Save Layout
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
