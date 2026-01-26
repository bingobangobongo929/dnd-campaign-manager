'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, Loader2, Shield, Ban, UserX, Crown, Edit2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download } from 'lucide-react'
import { toast } from 'sonner'
import { useSupabase } from '@/hooks'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { AdminActivityLog } from '@/types/database'

interface ActivityEntry extends AdminActivityLog {
  admin_email?: string
  target_email?: string
}

const ACTION_ICONS: Record<string, typeof Shield> = {
  suspend_user: Ban,
  unsuspend_user: Shield,
  disable_user: UserX,
  enable_user: Shield,
  change_tier: Crown,
  change_role: Shield,
}

const ACTION_LABELS: Record<string, string> = {
  suspend_user: 'Suspended user',
  unsuspend_user: 'Unsuspended user',
  disable_user: 'Disabled user',
  enable_user: 'Enabled user',
  change_tier: 'Changed tier',
  change_role: 'Changed role',
}

const ACTION_COLORS: Record<string, string> = {
  suspend_user: 'text-amber-400 bg-amber-500/10',
  unsuspend_user: 'text-green-400 bg-green-500/10',
  disable_user: 'text-red-400 bg-red-500/10',
  enable_user: 'text-green-400 bg-green-500/10',
  change_tier: 'text-blue-400 bg-blue-500/10',
  change_role: 'text-purple-400 bg-purple-500/10',
}

export default function AdminActivityPage() {
  const supabase = useSupabase()
  const [activities, setActivities] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterAction, setFilterAction] = useState<string>('all')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  useEffect(() => {
    fetchActivities()
  }, [])

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000) // Fetch more, paginate client-side

      if (error) throw error
      setActivities(data || [])
    } catch (error) {
      console.error('Failed to fetch activity log:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter activities
  const filteredActivities = activities.filter(activity => {
    if (filterAction !== 'all' && activity.action !== filterAction) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (
        !activity.admin_id.toLowerCase().includes(query) &&
        !activity.target_user_id?.toLowerCase().includes(query)
      ) {
        return false
      }
    }
    return true
  })

  // Pagination calculations
  const totalActivities = filteredActivities.length
  const totalPages = Math.ceil(totalActivities / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalActivities)
  const paginatedActivities = filteredActivities.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  const handleFilterChange = (value: string) => {
    setFilterAction(value)
    setCurrentPage(1)
  }

  // Export filtered activities to CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Action', 'Admin ID', 'Target User ID', 'Details', 'Created At']
    const rows = filteredActivities.map(activity => [
      activity.id,
      ACTION_LABELS[activity.action] || activity.action,
      activity.admin_id,
      activity.target_user_id || '',
      activity.details ? JSON.stringify(activity.details) : '',
      activity.created_at ? new Date(activity.created_at).toISOString() : '',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `activity-log-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    toast.success(`Exported ${filteredActivities.length} entries to CSV`)
  }

  // Get unique actions for filter
  const uniqueActions = [...new Set(activities.map(a => a.action))]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search by user ID..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50"
          />
        </div>

        <select
          value={filterAction}
          onChange={(e) => handleFilterChange(e.target.value)}
          className="px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-purple-500/50"
        >
          <option value="all">All Actions</option>
          {uniqueActions.map(action => (
            <option key={action} value={action}>
              {ACTION_LABELS[action] || action}
            </option>
          ))}
        </select>

        <select
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
          className="px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-purple-500/50"
        >
          <option value={25}>25 per page</option>
          <option value={50}>50 per page</option>
          <option value={100}>100 per page</option>
        </select>

        <button
          onClick={handleExportCSV}
          disabled={filteredActivities.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white hover:bg-white/[0.08] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Export activity log to CSV"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Activity List */}
      {paginatedActivities.length === 0 ? (
        <div className="text-center py-16 bg-[#1a1a24] rounded-xl border border-white/[0.06]">
          <Shield className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No activity yet</h3>
          <p className="text-gray-400">Admin actions will appear here.</p>
        </div>
      ) : (
        <div className="bg-[#1a1a24] rounded-xl border border-white/[0.06] overflow-hidden">
          <div className="divide-y divide-white/[0.03]">
            {paginatedActivities.map((activity) => {
              const Icon = ACTION_ICONS[activity.action] || Edit2
              const label = ACTION_LABELS[activity.action] || activity.action
              const colorClass = ACTION_COLORS[activity.action] || 'text-gray-400 bg-gray-500/10'

              return (
                <div key={activity.id} className="p-4 hover:bg-white/[0.02]">
                  <div className="flex items-start gap-4">
                    <div className={cn("p-2.5 rounded-xl", colorClass)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">
                        <span className="font-medium">{label}</span>
                      </p>
                      <div className="mt-1 space-y-1 text-xs text-gray-500">
                        <p>
                          Admin: <span className="text-gray-400 font-mono">{activity.admin_id.slice(0, 8)}...</span>
                        </p>
                        {activity.target_user_id && (
                          <p>
                            Target: <span className="text-gray-400 font-mono">{activity.target_user_id.slice(0, 8)}...</span>
                          </p>
                        )}
                        {activity.details && Object.keys(activity.details).length > 0 && (
                          <p className="text-gray-600">
                            {JSON.stringify(activity.details)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(activity.created_at)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination Controls */}
          {totalActivities > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
              <div className="text-sm text-gray-400">
                Showing {startIndex + 1}-{endIndex} of {totalActivities} entries
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="First page"
                >
                  <ChevronsLeft className="w-4 h-4 text-gray-400" />
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Previous page"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-400" />
                </button>
                <span className="px-3 py-1 text-sm text-white">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Next page"
                >
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Last page"
                >
                  <ChevronsRight className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
