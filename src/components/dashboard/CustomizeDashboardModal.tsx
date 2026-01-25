'use client'

import { useState, useRef } from 'react'
import { RotateCcw, GripVertical, Eye, EyeOff, Lock } from 'lucide-react'
import { Modal } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
  DM_WIDGETS,
  PLAYER_WIDGETS,
  type DmWidgetId,
  type PlayerWidgetId,
} from '@/hooks/useDashboardPreferences'

interface CustomizeDashboardModalProps {
  isOpen: boolean
  onClose: () => void
  isDm: boolean
  visibleWidgets: readonly (DmWidgetId | PlayerWidgetId)[]
  widgetOrder: readonly (DmWidgetId | PlayerWidgetId)[]
  onToggleWidget: (widgetId: string) => void
  onReorderWidgets: (newOrder: (DmWidgetId | PlayerWidgetId)[]) => void
  onResetToDefaults: () => void
}

export function CustomizeDashboardModal({
  isOpen,
  onClose,
  isDm,
  visibleWidgets,
  widgetOrder,
  onToggleWidget,
  onReorderWidgets,
  onResetToDefaults,
}: CustomizeDashboardModalProps) {
  const widgetDefs = isDm ? DM_WIDGETS : PLAYER_WIDGETS
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [dragOverItem, setDragOverItem] = useState<string | null>(null)
  const dragNodeRef = useRef<HTMLDivElement | null>(null)

  // Sort widget definitions by the user's saved order
  const sortedWidgets = [...widgetDefs].sort((a, b) => {
    const aIndex = widgetOrder.indexOf(a.id as DmWidgetId | PlayerWidgetId)
    const bIndex = widgetOrder.indexOf(b.id as DmWidgetId | PlayerWidgetId)
    // Widgets not in the order array go to the end
    if (aIndex === -1 && bIndex === -1) return 0
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  })

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, widgetId: string) => {
    setDraggedItem(widgetId)
    dragNodeRef.current = e.currentTarget
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', widgetId)
    // Add a slight delay before adding the dragging class for better UX
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

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, widgetId: string) => {
    e.preventDefault()
    if (draggedItem && draggedItem !== widgetId) {
      setDragOverItem(widgetId)
    }
  }

  const handleDragLeave = () => {
    setDragOverItem(null)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetWidgetId: string) => {
    e.preventDefault()
    if (!draggedItem || draggedItem === targetWidgetId) {
      setDragOverItem(null)
      return
    }

    // Create new order by moving dragged item to target position
    const currentOrder = sortedWidgets.map(w => w.id as DmWidgetId | PlayerWidgetId)
    const draggedIndex = currentOrder.indexOf(draggedItem as DmWidgetId | PlayerWidgetId)
    const targetIndex = currentOrder.indexOf(targetWidgetId as DmWidgetId | PlayerWidgetId)

    if (draggedIndex === -1 || targetIndex === -1) return

    const newOrder = [...currentOrder]
    newOrder.splice(draggedIndex, 1)
    newOrder.splice(targetIndex, 0, draggedItem as DmWidgetId | PlayerWidgetId)

    onReorderWidgets(newOrder)
    setDragOverItem(null)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Customize Dashboard"
      description="Drag to reorder widgets, toggle visibility"
      size="md"
    >
      <div className="space-y-4">
        {/* Widgets list */}
        <div className="space-y-2">
          {sortedWidgets.map((widget) => {
            const isVisible = visibleWidgets.includes(widget.id as DmWidgetId | PlayerWidgetId)
            const isRequired = widget.required
            const isDragging = draggedItem === widget.id
            const isDragOver = dragOverItem === widget.id

            return (
              <div
                key={widget.id}
                draggable={!isRequired}
                onDragStart={(e) => !isRequired && handleDragStart(e, widget.id)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, widget.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, widget.id)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-all",
                  isVisible
                    ? "bg-purple-500/10 border-purple-500/30"
                    : "bg-white/[0.02] border-white/[0.06]",
                  isRequired && "opacity-70",
                  isDragging && "opacity-50",
                  isDragOver && "border-purple-400 border-dashed bg-purple-500/20",
                  !isRequired && "cursor-grab active:cursor-grabbing"
                )}
              >
                {/* Drag handle */}
                <div className={cn(
                  "text-gray-500 transition-colors",
                  !isRequired && "hover:text-gray-300"
                )}>
                  <GripVertical className="w-4 h-4" />
                </div>

                {/* Widget name */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">
                      {widget.label}
                    </span>
                    {isRequired && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Lock className="w-3 h-3" />
                        Required
                      </span>
                    )}
                  </div>
                </div>

                {/* Toggle button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!isRequired) onToggleWidget(widget.id)
                  }}
                  disabled={isRequired}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    isRequired
                      ? "cursor-not-allowed text-gray-600"
                      : isVisible
                        ? "text-purple-400 hover:bg-purple-500/20"
                        : "text-gray-400 hover:bg-white/[0.05]"
                  )}
                  title={isRequired ? "This widget is required" : isVisible ? "Hide widget" : "Show widget"}
                >
                  {isVisible ? (
                    <Eye className="w-5 h-5" />
                  ) : (
                    <EyeOff className="w-5 h-5" />
                  )}
                </button>
              </div>
            )
          })}
        </div>

        {/* Reset button */}
        <div className="flex justify-end pt-4 border-t border-white/[0.06]">
          <button
            onClick={onResetToDefaults}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>
        </div>
      </div>
    </Modal>
  )
}
