'use client'

import { useState, useEffect } from 'react'
import { Bot, Zap, Image as ImageIcon, DollarSign, Users, Clock, TrendingUp, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { cn, formatDistanceToNow } from '@/lib/utils'

interface UserStats {
  userId: string
  requests: number
  tokens: number
  images: number
  costCents: number
  lastActivity: string
}

interface UsageData {
  period: string
  startDate: string
  summary: {
    totalRequests: number
    totalTokens: number
    totalImages: number
    totalCostCents: number
    costs: Record<string, string>
    uniqueUsers: number
  }
  byUser: UserStats[]
  byProvider: Record<string, { requests: number; tokens: number; cost: number }>
  byOperation: Record<string, { requests: number; tokens: number; cost: number }>
  recentRequests: Array<{
    id: string
    userId: string
    provider: string
    model: string
    operation: string
    inputTokens: number
    outputTokens: number
    tokens: number
    images: number
    cost: number
    success: boolean
    responseTimeMs: number
    createdAt: string
  }>
}

export default function AdminAIUsagePage() {
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('month')
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [currency, setCurrency] = useState<'USD' | 'GBP' | 'EUR'>('GBP')

  useEffect(() => {
    fetchUsage()
  }, [period])

  const fetchUsage = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/ai-usage?period=${period}`)
      if (!response.ok) throw new Error('Failed to fetch usage')
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load usage data')
    } finally {
      setLoading(false)
    }
  }

  const formatCost = (cents: number) => {
    const usd = cents / 100
    const rates: Record<string, number> = { USD: 1, GBP: 0.80, EUR: 0.92 }
    const converted = usd * rates[currency]
    const symbol = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '€'
    return `${symbol}${converted.toFixed(2)}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-400">
        {error}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-400">
        No usage data available
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">AI Usage Statistics</h2>
        <div className="flex items-center gap-4">
          {/* Currency Selector */}
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as 'USD' | 'GBP' | 'EUR')}
            className="px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white"
          >
            <option value="GBP">£ GBP</option>
            <option value="USD">$ USD</option>
            <option value="EUR">€ EUR</option>
          </select>
          {/* Period Selector */}
          <div className="flex gap-1 bg-white/[0.02] rounded-lg p-1">
            {(['week', 'month', 'all'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  period === p
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                )}
              >
                {p === 'week' ? 'Week' : p === 'month' ? 'Month' : 'All Time'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={Zap}
          label="Total Requests"
          value={data.summary.totalRequests.toLocaleString()}
          color="blue"
        />
        <StatCard
          icon={Bot}
          label="Total Tokens"
          value={`${(data.summary.totalTokens / 1000).toFixed(1)}K`}
          color="purple"
        />
        <StatCard
          icon={ImageIcon}
          label="Images Generated"
          value={data.summary.totalImages.toLocaleString()}
          color="green"
        />
        <StatCard
          icon={DollarSign}
          label="Total Cost"
          value={formatCost(data.summary.totalCostCents)}
          color="amber"
        />
        <StatCard
          icon={Users}
          label="Active Users"
          value={data.summary.uniqueUsers.toLocaleString()}
          color="indigo"
        />
      </div>

      {/* Provider & Operation Breakdown */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* By Provider */}
        <section className="bg-[#1a1a24] rounded-xl border border-white/[0.06] p-6">
          <h3 className="text-md font-semibold text-white mb-4">Usage by Provider</h3>
          <div className="space-y-3">
            {Object.entries(data.byProvider).length === 0 ? (
              <p className="text-gray-500 text-sm">No usage data</p>
            ) : (
              Object.entries(data.byProvider).map(([provider, stats]) => (
                <div key={provider} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg">
                  <div>
                    <p className="text-white font-medium capitalize">{provider}</p>
                    <p className="text-xs text-gray-500">{stats.requests} requests</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium">{formatCost(stats.cost)}</p>
                    <p className="text-xs text-gray-500">{(stats.tokens / 1000).toFixed(1)}K tokens</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* By Operation */}
        <section className="bg-[#1a1a24] rounded-xl border border-white/[0.06] p-6">
          <h3 className="text-md font-semibold text-white mb-4">Usage by Operation</h3>
          <div className="space-y-3">
            {Object.entries(data.byOperation).length === 0 ? (
              <p className="text-gray-500 text-sm">No usage data</p>
            ) : (
              Object.entries(data.byOperation).map(([operation, stats]) => (
                <div key={operation} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg">
                  <div>
                    <p className="text-white font-medium capitalize">{operation.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-gray-500">{stats.requests} requests</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium">{formatCost(stats.cost)}</p>
                    <p className="text-xs text-gray-500">{(stats.tokens / 1000).toFixed(1)}K tokens</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Per-User Usage */}
      <section className="bg-[#1a1a24] rounded-xl border border-white/[0.06] p-6">
        <h3 className="text-md font-semibold text-white mb-4">Usage by User</h3>
        <div className="space-y-2">
          {data.byUser.length === 0 ? (
            <p className="text-gray-500 text-sm">No user usage data</p>
          ) : (
            data.byUser.map((user) => (
              <div key={user.userId} className="border border-white/[0.06] rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedUser(expandedUser === user.userId ? null : user.userId)}
                  className="w-full flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <Users className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm text-white font-mono">{user.userId.slice(0, 8)}...</p>
                      <p className="text-xs text-gray-500">Last active: {formatDistanceToNow(new Date(user.lastActivity))} ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-white font-medium">{formatCost(user.costCents)}</p>
                      <p className="text-xs text-gray-500">{user.requests} requests</p>
                    </div>
                    {expandedUser === user.userId ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </button>
                {expandedUser === user.userId && (
                  <div className="p-4 border-t border-white/[0.06] bg-white/[0.01]">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-3 bg-white/[0.02] rounded-lg text-center">
                        <p className="text-lg font-bold text-white">{user.requests}</p>
                        <p className="text-xs text-gray-500">Requests</p>
                      </div>
                      <div className="p-3 bg-white/[0.02] rounded-lg text-center">
                        <p className="text-lg font-bold text-white">{(user.tokens / 1000).toFixed(1)}K</p>
                        <p className="text-xs text-gray-500">Tokens</p>
                      </div>
                      <div className="p-3 bg-white/[0.02] rounded-lg text-center">
                        <p className="text-lg font-bold text-white">{user.images}</p>
                        <p className="text-xs text-gray-500">Images</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* Recent Requests */}
      <section className="bg-[#1a1a24] rounded-xl border border-white/[0.06] p-6">
        <h3 className="text-md font-semibold text-white mb-4">Recent Requests</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-left">
                <th className="pb-3 font-medium">Time</th>
                <th className="pb-3 font-medium">Provider</th>
                <th className="pb-3 font-medium">Operation</th>
                <th className="pb-3 font-medium text-right">Tokens</th>
                <th className="pb-3 font-medium text-right">Cost</th>
                <th className="pb-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {data.recentRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-gray-500">No recent requests</td>
                </tr>
              ) : (
                data.recentRequests.map((req) => (
                  <tr key={req.id} className="text-gray-300">
                    <td className="py-3 text-gray-500">{formatDistanceToNow(new Date(req.createdAt))} ago</td>
                    <td className="py-3 capitalize">{req.provider}</td>
                    <td className="py-3 capitalize">{req.operation.replace(/_/g, ' ')}</td>
                    <td className="py-3 text-right">
                      {req.tokens > 0 ? `${req.tokens.toLocaleString()}` : req.images > 0 ? `${req.images} img` : '-'}
                    </td>
                    <td className="py-3 text-right">{formatCost(req.cost)}</td>
                    <td className="py-3 text-right">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium",
                        req.success ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                      )}>
                        {req.success ? 'OK' : 'Error'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  color: 'blue' | 'purple' | 'green' | 'amber' | 'indigo'
}) {
  const colors = {
    blue: 'bg-blue-500/10 text-blue-400',
    purple: 'bg-purple-500/10 text-purple-400',
    green: 'bg-green-500/10 text-green-400',
    amber: 'bg-amber-500/10 text-amber-400',
    indigo: 'bg-indigo-500/10 text-indigo-400',
  }

  return (
    <div className="bg-[#1a1a24] rounded-xl border border-white/[0.06] p-5">
      <div className="flex items-center gap-3">
        <div className={cn("p-2.5 rounded-xl", colors[color])}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-sm text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  )
}
