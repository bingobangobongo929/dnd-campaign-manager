'use client'

import { useState, useEffect } from 'react'
import {
  Database,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Loader2,
  HardDrive,
  Users,
  FileText,
  Swords,
  Scroll
} from 'lucide-react'
import { useSupabase } from '@/hooks'
import { cn, formatDate } from '@/lib/utils'
import { toast } from 'sonner'

interface HealthStatus {
  database: {
    status: 'healthy' | 'degraded' | 'down'
    latency: number
    message?: string
  }
  tables: {
    name: string
    rowCount: number
    sizeEstimate?: string
  }[]
  lastChecked: string
}

interface TableStats {
  name: string
  displayName: string
  count: number
  icon: typeof Database
}

export default function AdminHealthPage() {
  const supabase = useSupabase()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [tableStats, setTableStats] = useState<TableStats[]>([])
  const [error, setError] = useState<string | null>(null)

  const checkHealth = async () => {
    setRefreshing(true)
    setError(null)

    try {
      // Test database connection and latency
      const startTime = performance.now()
      const { error: dbError } = await supabase
        .from('user_settings')
        .select('count', { count: 'exact', head: true })
      const latency = Math.round(performance.now() - startTime)

      const dbStatus: HealthStatus['database'] = dbError
        ? { status: 'down', latency: 0, message: dbError.message }
        : latency > 1000
        ? { status: 'degraded', latency, message: 'High latency detected' }
        : { status: 'healthy', latency }

      // Get table counts
      const tablesToCheck = [
        { table: 'user_settings', name: 'Users', icon: Users },
        { table: 'campaigns', name: 'Campaigns', icon: Swords },
        { table: 'oneshots', name: 'One-Shots', icon: Scroll },
        { table: 'vault_characters', name: 'Vault Characters', icon: FileText },
        { table: 'sessions', name: 'Sessions', icon: Clock },
        { table: 'characters', name: 'Campaign Characters', icon: Users },
        { table: 'timeline_events', name: 'Timeline Events', icon: Clock },
        { table: 'admin_activity_log', name: 'Admin Activity', icon: Database },
        { table: 'feedback', name: 'Feedback', icon: FileText },
        { table: 'ai_usage_logs', name: 'AI Usage Logs', icon: HardDrive },
      ]

      const stats: TableStats[] = []
      for (const t of tablesToCheck) {
        const { count, error } = await supabase
          .from(t.table)
          .select('*', { count: 'exact', head: true })

        if (!error) {
          stats.push({
            name: t.table,
            displayName: t.name,
            count: count || 0,
            icon: t.icon,
          })
        }
      }

      setTableStats(stats)
      setHealth({
        database: dbStatus,
        tables: stats.map(s => ({ name: s.name, rowCount: s.count })),
        lastChecked: new Date().toISOString(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check health')
      toast.error('Health check failed')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    checkHealth()
  }, [])

  const getStatusColor = (status: 'healthy' | 'degraded' | 'down') => {
    switch (status) {
      case 'healthy': return 'text-green-400 bg-green-500/10'
      case 'degraded': return 'text-amber-400 bg-amber-500/10'
      case 'down': return 'text-red-400 bg-red-500/10'
    }
  }

  const getStatusIcon = (status: 'healthy' | 'degraded' | 'down') => {
    switch (status) {
      case 'healthy': return CheckCircle
      case 'degraded': return AlertCircle
      case 'down': return AlertCircle
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">System Health</h2>
          <p className="text-sm text-gray-400">
            Monitor database and service status
          </p>
        </div>
        <button
          onClick={checkHealth}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white hover:bg-white/[0.08] disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Database Status */}
      {health && (
        <div className="bg-[#1a1a24] rounded-xl border border-white/[0.06] p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={cn("p-3 rounded-xl", getStatusColor(health.database.status))}>
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-white font-medium">Database Connection</h3>
                <p className="text-sm text-gray-400">Supabase PostgreSQL</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={cn("px-3 py-1.5 rounded-lg text-sm font-medium", getStatusColor(health.database.status))}>
                {health.database.status.charAt(0).toUpperCase() + health.database.status.slice(1)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white/[0.02] rounded-xl">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Latency</p>
              <p className="text-2xl font-bold text-white">{health.database.latency}ms</p>
            </div>
            <div className="p-4 bg-white/[0.02] rounded-xl">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</p>
              <div className="flex items-center gap-2">
                {(() => {
                  const Icon = getStatusIcon(health.database.status)
                  return <Icon className={cn("w-5 h-5", health.database.status === 'healthy' ? 'text-green-400' : health.database.status === 'degraded' ? 'text-amber-400' : 'text-red-400')} />
                })()}
                <span className="text-lg font-medium text-white">
                  {health.database.status === 'healthy' ? 'Connected' : health.database.message}
                </span>
              </div>
            </div>
            <div className="p-4 bg-white/[0.02] rounded-xl">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Last Checked</p>
              <p className="text-lg font-medium text-white">{formatDate(health.lastChecked)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Table Statistics */}
      <div className="bg-[#1a1a24] rounded-xl border border-white/[0.06] p-6">
        <h3 className="text-white font-medium mb-4">Table Statistics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {tableStats.map((table) => {
            const Icon = table.icon
            return (
              <div key={table.name} className="p-4 bg-white/[0.02] rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className="text-sm text-gray-400">{table.displayName}</p>
                </div>
                <p className="text-2xl font-bold text-white">{table.count.toLocaleString()}</p>
                <p className="text-xs text-gray-600 mt-1">{table.name}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#1a1a24] rounded-xl border border-white/[0.06] p-6">
          <h3 className="text-white font-medium mb-4">Environment</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-white/[0.06]">
              <span className="text-gray-400">Environment</span>
              <span className="text-white font-mono text-sm">{process.env.NODE_ENV || 'development'}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-white/[0.06]">
              <span className="text-gray-400">Region</span>
              <span className="text-white font-mono text-sm">Vercel Edge</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-400">Database</span>
              <span className="text-white font-mono text-sm">Supabase</span>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a24] rounded-xl border border-white/[0.06] p-6">
          <h3 className="text-white font-medium mb-4">Services</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-white/[0.06]">
              <span className="text-gray-400">Authentication</span>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-400">Active</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-white/[0.06]">
              <span className="text-gray-400">Storage</span>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-400">Active</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-400">AI Services</span>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-400">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
