'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Wrench,
  FileText,
  MapPin,
  Clock,
  CheckCircle2,
  Circle,
  Lightbulb,
  Plus,
  X,
} from 'lucide-react'
import { DashboardWidget } from './DashboardWidget'
import { cn } from '@/lib/utils'
import type { Campaign } from '@/types/database'

interface PrepChecklistItem {
  id: string
  text: string
  completed: boolean
}

interface DmToolboxWidgetProps {
  campaignId: string
  campaign: Campaign | null
  pendingPlayerNotes: number
  className?: string
}

interface ToolCardProps {
  icon: React.ElementType
  title: string
  description: string
  href?: string
  onClick?: () => void
  badge?: number | string
  variant?: 'default' | 'highlight'
}

function ToolCard({
  icon: Icon,
  title,
  description,
  href,
  onClick,
  badge,
  variant = 'default',
}: ToolCardProps) {
  const content = (
    <div
      className={cn(
        "p-3 rounded-lg border transition-colors cursor-pointer",
        variant === 'highlight'
          ? "bg-purple-600/10 border-purple-500/20 hover:bg-purple-600/20"
          : "bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.05]"
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", variant === 'highlight' ? "text-purple-400" : "text-gray-400")} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm text-white">{title}</p>
            {badge !== undefined && (typeof badge === 'string' || badge > 0) && (
              <span className="px-1.5 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-400">
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  if (onClick) {
    return <div onClick={onClick}>{content}</div>
  }

  return content
}

const DEFAULT_PREP_ITEMS: PrepChecklistItem[] = [
  { id: '1', text: 'Review last session notes', completed: false },
  { id: '2', text: 'Prepare NPCs for this session', completed: false },
  { id: '3', text: 'Check party status and goals', completed: false },
]

export function DmToolboxWidget({
  campaignId,
  campaign,
  pendingPlayerNotes,
  className,
}: DmToolboxWidgetProps) {
  // Prep checklist state
  const [prepItems, setPrepItems] = useState<PrepChecklistItem[]>([])
  const [newItemText, setNewItemText] = useState('')
  const [showAddItem, setShowAddItem] = useState(false)

  // Load checklist from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`prep-checklist-${campaignId}`)
    if (stored) {
      try {
        setPrepItems(JSON.parse(stored))
      } catch {
        setPrepItems(DEFAULT_PREP_ITEMS)
      }
    } else {
      setPrepItems(DEFAULT_PREP_ITEMS)
    }
  }, [campaignId])

  // Save checklist to localStorage
  const saveItems = (items: PrepChecklistItem[]) => {
    localStorage.setItem(`prep-checklist-${campaignId}`, JSON.stringify(items))
    setPrepItems(items)
  }

  const toggleItem = (id: string) => {
    const updated = prepItems.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    )
    saveItems(updated)
  }

  const addItem = () => {
    if (!newItemText.trim()) return
    const newItem: PrepChecklistItem = {
      id: Date.now().toString(),
      text: newItemText.trim(),
      completed: false,
    }
    saveItems([...prepItems, newItem])
    setNewItemText('')
    setShowAddItem(false)
  }

  const removeItem = (id: string) => {
    saveItems(prepItems.filter(item => item.id !== id))
  }

  const resetChecklist = () => {
    const reset = prepItems.map(item => ({ ...item, completed: false }))
    saveItems(reset)
  }

  const completedCount = prepItems.filter(i => i.completed).length
  const totalCount = prepItems.length

  return (
    <DashboardWidget
      title="DM Toolbox"
      icon={Wrench}
      className={className}
    >
      <div className="space-y-4">
        {/* Session Prep Checklist */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5" />
              Session Prep
            </h4>
            {completedCount > 0 && (
              <button
                onClick={resetChecklist}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Reset
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            {prepItems.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg group",
                  item.completed ? "bg-emerald-500/5" : "bg-white/[0.02]"
                )}
              >
                <button
                  onClick={() => toggleItem(item.id)}
                  className="flex-shrink-0"
                >
                  {item.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Circle className="w-4 h-4 text-gray-500 hover:text-gray-300" />
                  )}
                </button>
                <span className={cn(
                  "flex-1 text-sm",
                  item.completed ? "text-gray-500 line-through" : "text-gray-300"
                )}>
                  {item.text}
                </span>
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {showAddItem ? (
              <div className="flex items-center gap-2 p-2">
                <input
                  type="text"
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addItem()}
                  placeholder="New prep item..."
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-600 focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={addItem}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowAddItem(false)
                    setNewItemText('')
                  }}
                  className="text-xs text-gray-500 hover:text-gray-300"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddItem(true)}
                className="flex items-center gap-1.5 p-2 w-full text-gray-500 hover:text-gray-300 text-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add item
              </button>
            )}
          </div>

          {totalCount > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500/50 rounded-full transition-all"
                  style={{ width: `${(completedCount / totalCount) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">
                {completedCount}/{totalCount}
              </span>
            </div>
          )}
        </div>

        {/* Quick Tools Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {pendingPlayerNotes > 0 && (
            <ToolCard
              icon={FileText}
              title="Pending Notes"
              description="Review player notes"
              href={`/campaigns/${campaignId}/sessions`}
              badge={pendingPlayerNotes}
              variant="highlight"
            />
          )}
          <ToolCard
            icon={MapPin}
            title="Party Location"
            description="Update current location"
            href={`/campaigns/${campaignId}/map`}
          />
          <ToolCard
            icon={Clock}
            title="Timeline"
            description="Add story events"
            href={`/campaigns/${campaignId}/timeline`}
          />
        </div>
      </div>
    </DashboardWidget>
  )
}
