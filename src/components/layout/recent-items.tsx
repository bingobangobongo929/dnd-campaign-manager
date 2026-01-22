'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, Swords, BookOpen, Scroll, ChevronRight, Loader2 } from 'lucide-react'
import { useAppStore, type RecentItem } from '@/store'
import Image from 'next/image'

const TYPE_ICONS = {
  campaign: Swords,
  character: BookOpen,
  oneshot: Scroll,
}

const TYPE_LABELS = {
  campaign: 'Campaign',
  character: 'Character',
  oneshot: 'One-Shot',
}

const TYPE_COLORS = {
  campaign: 'text-blue-400 bg-blue-500/15',
  character: 'text-purple-400 bg-purple-500/15',
  oneshot: 'text-amber-400 bg-amber-500/15',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}

export function RecentItems() {
  const router = useRouter()
  const { recentItems, recentItemsLoading, fetchRecentItems } = useAppStore()
  const [isOpen, setIsOpen] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch recent items from database on mount
  useEffect(() => {
    if (!hasFetched) {
      fetchRecentItems()
      setHasFetched(true)
    }
  }, [fetchRecentItems, hasFetched])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleItemClick = (item: RecentItem) => {
    setIsOpen(false)
    router.push(item.href)
  }

  // Don't show if loading and no items, or if no items after loading
  if (recentItemsLoading && recentItems.length === 0) {
    return null
  }

  if (!recentItemsLoading && recentItems.length === 0) {
    return null
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.1] transition-all text-gray-400 hover:text-white"
        title="Recent items"
      >
        <Clock className="w-4 h-4" />
        <span className="hidden sm:inline">Recent</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-[--bg-surface] border border-[--border] rounded-xl shadow-xl overflow-hidden animate-scale-in z-50">
          <div className="p-3 border-b border-white/[0.06]">
            <h3 className="text-sm font-medium text-white">Recently Visited</h3>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {recentItemsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
              </div>
            ) : (
              recentItems.map((item) => {
                const Icon = TYPE_ICONS[item.type]
                return (
                  <button
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleItemClick(item)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.04] transition-colors text-left group"
                  >
                    {/* Image/Icon */}
                    <div className="flex-shrink-0">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          width={36}
                          height={36}
                          className="w-9 h-9 rounded-lg object-cover"
                        />
                      ) : (
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${TYPE_COLORS[item.type]}`}>
                          {item.type === 'character' ? (
                            <span className="text-xs font-bold">{getInitials(item.name)}</span>
                          ) : (
                            <Icon className="w-4 h-4" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{item.name}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className={`px-1.5 py-0.5 rounded ${TYPE_COLORS[item.type]}`}>
                          {TYPE_LABELS[item.type]}
                        </span>
                        {item.subtitle && (
                          <span className="truncate">{item.subtitle}</span>
                        )}
                      </div>
                    </div>

                    {/* Time & Arrow */}
                    <div className="flex items-center gap-2 text-gray-500">
                      <span className="text-xs">{formatTimeAgo(item.visitedAt)}</span>
                      <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
