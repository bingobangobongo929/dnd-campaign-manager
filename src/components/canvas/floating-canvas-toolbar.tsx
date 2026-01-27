'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Minus,
  Plus,
  Maximize,
  Link2,
  Settings,
  ChevronDown,
  Users,
  Scaling,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CONNECTION_FILTER_OPTIONS } from './connection-edges'
import type { RelationshipCategory } from '@/types/database'

interface FloatingCanvasToolbarProps {
  // Zoom
  zoomLevel: number
  onZoomIn: () => void
  onZoomOut: () => void
  onFitToScreen: () => void
  // Connections
  showConnections: boolean
  connectionFilter: RelationshipCategory | 'all' | null
  onToggleConnections: () => void
  onFilterChange: (filter: RelationshipCategory | null) => void
  // Add actions
  onAddCharacter: () => void
  onAddGroup: () => void
  // Settings
  onOpenCardSizing: () => void
  // Permissions
  canEdit: boolean
}

export function FloatingCanvasToolbar({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  showConnections,
  connectionFilter,
  onToggleConnections,
  onFilterChange,
  onAddCharacter,
  onAddGroup,
  onOpenCardSizing,
  canEdit,
}: FloatingCanvasToolbarProps) {
  const [connectionsDropdownOpen, setConnectionsDropdownOpen] = useState(false)
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false)
  const connectionsRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (connectionsRef.current && !connectionsRef.current.contains(event.target as Node)) {
        setConnectionsDropdownOpen(false)
      }
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const currentFilterLabel = CONNECTION_FILTER_OPTIONS.find(o =>
    o.value === connectionFilter || (connectionFilter === null && o.value === 'all')
  )?.label || 'All Connections'

  return (
    <div className="canvas-floating-toolbar">
      {/* Zoom Controls */}
      <div className="toolbar-group">
        <button
          onClick={onZoomOut}
          className="toolbar-btn icon-only"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="toolbar-zoom-level">{Math.round(zoomLevel * 100)}%</span>
        <button
          onClick={onZoomIn}
          className="toolbar-btn icon-only"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={onFitToScreen}
          className="toolbar-btn icon-only"
          title="Fit to Screen"
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Connections Toggle + Filter */}
      <div className="toolbar-dropdown" ref={connectionsRef}>
        <button
          onClick={() => setConnectionsDropdownOpen(!connectionsDropdownOpen)}
          className={cn(
            "toolbar-btn",
            showConnections && "active"
          )}
        >
          <Link2 className="w-4 h-4" />
          <span className="toolbar-btn-label">Connections</span>
          {showConnections && <span className="toolbar-indicator" />}
          <ChevronDown className={cn("w-3 h-3 transition-transform", connectionsDropdownOpen && "rotate-180")} />
        </button>

        {connectionsDropdownOpen && (
          <div className="toolbar-dropdown-panel">
            <button
              className={cn(
                "toolbar-dropdown-item",
                showConnections && "text-purple-400"
              )}
              onClick={() => {
                onToggleConnections()
                if (showConnections) setConnectionsDropdownOpen(false)
              }}
            >
              <Link2 className="w-4 h-4" />
              {showConnections ? "Hide Connections" : "Show Connections"}
            </button>

            {showConnections && (
              <>
                <div className="toolbar-dropdown-divider" />
                <div className="toolbar-dropdown-header">Filter by Type</div>
                {CONNECTION_FILTER_OPTIONS.map((option) => (
                  <button
                    key={option.label}
                    className={cn(
                      "toolbar-dropdown-item",
                      (connectionFilter === option.value || (connectionFilter === null && option.value === 'all')) && "active"
                    )}
                    onClick={() => {
                      // Convert 'all' to null for the parent component
                      onFilterChange(option.value === 'all' ? null : option.value)
                      setConnectionsDropdownOpen(false)
                    }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: option.color }}
                    />
                    {option.label}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <div className="toolbar-divider" />

      {/* Add Actions */}
      {canEdit && (
        <>
          <button
            onClick={onAddCharacter}
            className="toolbar-btn primary"
          >
            <Plus className="w-4 h-4" />
            <span className="toolbar-btn-label">Character</span>
          </button>

          <button
            onClick={onAddGroup}
            className="toolbar-btn"
          >
            <Users className="w-4 h-4" />
            <span className="toolbar-btn-label">Group</span>
          </button>

          <div className="toolbar-divider" />
        </>
      )}

      {/* Settings Dropdown */}
      <div className="toolbar-dropdown" ref={settingsRef}>
        <button
          onClick={() => setSettingsDropdownOpen(!settingsDropdownOpen)}
          className="toolbar-btn icon-only"
          title="Canvas Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        {settingsDropdownOpen && (
          <div className="toolbar-dropdown-panel">
            <button
              className="toolbar-dropdown-item"
              onClick={() => {
                onOpenCardSizing()
                setSettingsDropdownOpen(false)
              }}
            >
              <Scaling className="w-4 h-4" />
              Card Sizing
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
