'use client'

import { useState } from 'react'
import { Check, Sparkles, Plus, ChevronDown, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HiddenWidget {
  id: string
  label: string
  required: boolean
}

interface EditModeToolbarProps {
  hiddenWidgets: HiddenWidget[]
  onShowWidget: (widgetId: string) => void
  onReset: () => void
  onDone: () => void
}

export function EditModeToolbar({
  hiddenWidgets,
  onShowWidget,
  onReset,
  onDone,
}: EditModeToolbarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border border-white/10"
        style={{ backgroundColor: 'rgba(10, 10, 15, 0.95)', backdropFilter: 'blur(12px)' }}
      >
        {/* Info text */}
        <span className="text-sm text-gray-400 hidden sm:block">
          Drag widgets to reorder
        </span>

        {/* Divider */}
        <div className="hidden sm:block w-px h-6 bg-white/10" />

        {/* Add Hidden Widget Dropdown */}
        {hiddenWidgets.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors",
                "bg-white/[0.05] hover:bg-white/[0.08] text-gray-300"
              )}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Widget</span>
              <ChevronDown className={cn("w-4 h-4 transition-transform", isDropdownOpen && "rotate-180")} />
            </button>

            {isDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div
                  className="absolute bottom-full left-0 mb-2 w-56 rounded-xl shadow-2xl border border-white/10 overflow-hidden z-50"
                  style={{ backgroundColor: '#1a1a24' }}
                >
                  <div className="p-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-white/10">
                    Hidden Widgets
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1">
                    {hiddenWidgets.map(widget => (
                      <button
                        key={widget.id}
                        onClick={() => {
                          onShowWidget(widget.id)
                          setIsDropdownOpen(false)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/[0.05] transition-colors"
                      >
                        <Eye className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-300">{widget.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Default Layout Button */}
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors bg-white/[0.05] hover:bg-white/[0.08] text-gray-300"
          title="Apply recommended layout"
        >
          <Sparkles className="w-4 h-4" />
          <span className="hidden sm:inline">Default</span>
        </button>

        {/* Done Button */}
        <button
          onClick={onDone}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-purple-600 hover:bg-purple-500 text-white"
        >
          <Check className="w-4 h-4" />
          Done
        </button>
      </div>
    </div>
  )
}
