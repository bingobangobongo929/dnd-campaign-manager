'use client'

import { Settings, RotateCcw, GripVertical, Eye, EyeOff, Lock } from 'lucide-react'
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
  onToggleWidget: (widgetId: string) => void
  onResetToDefaults: () => void
}

export function CustomizeDashboardModal({
  isOpen,
  onClose,
  isDm,
  visibleWidgets,
  onToggleWidget,
  onResetToDefaults,
}: CustomizeDashboardModalProps) {
  const widgets = isDm ? DM_WIDGETS : PLAYER_WIDGETS

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Customize Dashboard"
      description="Choose which widgets to show on your dashboard"
      size="md"
    >
      <div className="space-y-4">
        {/* Widgets list */}
        <div className="space-y-2">
          {widgets.map((widget) => {
            const isVisible = visibleWidgets.includes(widget.id as DmWidgetId | PlayerWidgetId)
            const isRequired = widget.required

            return (
              <div
                key={widget.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-all",
                  isVisible
                    ? "bg-purple-500/10 border-purple-500/30"
                    : "bg-white/[0.02] border-white/[0.06]",
                  isRequired && "opacity-70"
                )}
              >
                {/* Drag handle (placeholder for future reordering) */}
                <div className="text-gray-500">
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
                  onClick={() => !isRequired && onToggleWidget(widget.id)}
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
