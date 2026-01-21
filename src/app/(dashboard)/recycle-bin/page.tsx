'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout'
import { Trash2, RotateCcw, AlertTriangle, Loader2, Clock, Swords, Users, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { RecycleBinItem } from '@/app/api/recycle-bin/route'

type FilterType = 'all' | 'campaign' | 'character' | 'oneshot'

export default function RecycleBinPage() {
  const [items, setItems] = useState<RecycleBinItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [emptyingAll, setEmptyingAll] = useState(false)

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/recycle-bin')
      const data = await response.json()
      setItems(data.items || [])
    } catch (error) {
      console.error('Failed to fetch recycle bin:', error)
      toast.error('Failed to load recycle bin')
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (item: RecycleBinItem) => {
    setActionLoading(item.id)
    try {
      const response = await fetch('/api/recycle-bin/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: item.type, contentId: item.id }),
      })

      if (!response.ok) throw new Error('Failed to restore')

      setItems(items.filter(i => i.id !== item.id))
      toast.success(`"${item.name}" restored successfully`)
    } catch (error) {
      console.error('Restore error:', error)
      toast.error('Failed to restore item')
    } finally {
      setActionLoading(null)
    }
  }

  const handlePermanentDelete = async (item: RecycleBinItem) => {
    if (!confirm(`Permanently delete "${item.name}"? This cannot be undone.`)) return

    setActionLoading(item.id)
    try {
      const response = await fetch('/api/recycle-bin/purge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: item.type, contentId: item.id }),
      })

      if (!response.ok) throw new Error('Failed to delete')

      setItems(items.filter(i => i.id !== item.id))
      toast.success(`"${item.name}" permanently deleted`)
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete item')
    } finally {
      setActionLoading(null)
    }
  }

  const handleEmptyAll = async () => {
    if (!confirm('Permanently delete ALL items in the recycle bin? This cannot be undone.')) return

    setEmptyingAll(true)
    try {
      const response = await fetch('/api/recycle-bin/empty', {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Failed to empty')

      setItems([])
      toast.success('Recycle bin emptied')
    } catch (error) {
      console.error('Empty error:', error)
      toast.error('Failed to empty recycle bin')
    } finally {
      setEmptyingAll(false)
    }
  }

  const filteredItems = filter === 'all' ? items : items.filter(i => i.type === filter)

  const getItemIcon = (type: RecycleBinItem['type']) => {
    switch (type) {
      case 'campaign':
        return Users
      case 'character':
        return BookOpen
      case 'oneshot':
        return Swords
    }
  }

  const getItemLabel = (type: RecycleBinItem['type']) => {
    switch (type) {
      case 'campaign':
        return 'Campaign'
      case 'character':
        return 'Character'
      case 'oneshot':
        return 'One-Shot'
    }
  }

  const formatDeletedDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    return `${diffDays} days ago`
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Recycle Bin</h1>
              <p className="text-sm text-gray-400">
                Items are automatically deleted after 30 days
              </p>
            </div>
          </div>

          {items.length > 0 && (
            <button
              onClick={handleEmptyAll}
              disabled={emptyingAll}
              className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
            >
              {emptyingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Empty All
            </button>
          )}
        </div>

        {/* Filters */}
        {items.length > 0 && (
          <div className="flex gap-2 mb-6">
            {(['all', 'campaign', 'character', 'oneshot'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  filter === f
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                )}
              >
                {f === 'all' ? 'All' : f === 'oneshot' ? 'One-Shots' : `${f.charAt(0).toUpperCase() + f.slice(1)}s`}
              </button>
            ))}
          </div>
        )}

        {/* Items List */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <div className="p-4 bg-white/[0.02] rounded-full w-fit mx-auto mb-4">
              <Trash2 className="w-12 h-12 text-gray-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-400 mb-2">
              {items.length === 0 ? 'Recycle bin is empty' : 'No items match this filter'}
            </h3>
            <p className="text-sm text-gray-500">
              {items.length === 0
                ? 'Deleted items will appear here for 30 days'
                : 'Try selecting a different filter'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const Icon = getItemIcon(item.type)
              const isLoading = actionLoading === item.id

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl hover:bg-white/[0.04] transition-colors"
                >
                  {/* Image/Icon */}
                  <div className="w-14 h-14 rounded-lg bg-white/[0.05] overflow-hidden flex-shrink-0">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Icon className="w-6 h-6 text-gray-500" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-medium truncate">{item.name}</h3>
                      <span className="px-2 py-0.5 bg-white/[0.06] rounded text-xs text-gray-400">
                        {getItemLabel(item.type)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      <span>Deleted {formatDeletedDate(item.deletedAt)}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {item.daysRemaining} days left
                      </span>
                    </div>
                  </div>

                  {/* Warning for items expiring soon */}
                  {item.daysRemaining <= 7 && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 rounded text-amber-400 text-xs">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Expiring soon
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRestore(item)}
                      disabled={isLoading}
                      className="flex items-center gap-2 px-3 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RotateCcw className="w-4 h-4" />
                      )}
                      Restore
                    </button>
                    <button
                      onClick={() => handlePermanentDelete(item)}
                      disabled={isLoading}
                      className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Info footer */}
        {items.length > 0 && (
          <div className="mt-8 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-400">
                <p className="font-medium text-gray-300 mb-1">About the Recycle Bin</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Items are automatically permanently deleted after 30 days</li>
                  <li>Restoring an item brings back all associated data (sessions, relationships, etc.)</li>
                  <li>Permanently deleted items cannot be recovered</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
