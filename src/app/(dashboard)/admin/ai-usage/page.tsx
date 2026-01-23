'use client'

import { useState, useEffect } from 'react'
import {
  Bot, Zap, Image as ImageIcon, DollarSign, Users, Clock,
  TrendingUp, Loader2, ChevronDown, ChevronUp, Settings,
  ThumbsUp, ThumbsDown, Upload, Check, X, Edit2, Filter,
  BarChart3, PieChart, ArrowRight
} from 'lucide-react'
import { cn, formatDistanceToNow } from '@/lib/utils'
import { toast } from 'sonner'

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

interface IntelligenceStats {
  stats: {
    totalCalls: number
    totalCost: number
    totalInputTokens: number
    totalOutputTokens: number
    avgDuration: number
    errorCount: number
    byOperationType: Record<string, { count: number; cost: number }>
    byModel: Record<string, { count: number; cost: number }>
    byDay: Record<string, { count: number; cost: number }>
    topUsers: Array<{ userId: string; count: number; cost: number }>
  }
  importFunnel: {
    started: number
    parsed: number
    reviewed: number
    saved: number
    cancelled: number
  }
  feedbackStats: {
    total: number
    accepted: number
    edited: number
    dismissed: number
    positive: number
    negative: number
  }
}

interface TierSetting {
  id: string
  tier: string
  campaign_intelligence_cooldown_hours: number
  character_intelligence_cooldown_hours: number
  import_limit_per_day: number | null
  updated_at: string
  updated_by: string | null
}

type TabType = 'usage' | 'intelligence' | 'import' | 'feedback' | 'settings'

export default function AdminAIUsagePage() {
  const [activeTab, setActiveTab] = useState<TabType>('usage')
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('month')
  const [data, setData] = useState<UsageData | null>(null)
  const [intelligenceData, setIntelligenceData] = useState<IntelligenceStats | null>(null)
  const [tierSettings, setTierSettings] = useState<TierSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [currency, setCurrency] = useState<'USD' | 'GBP' | 'EUR'>('GBP')
  const [editingTier, setEditingTier] = useState<string | null>(null)
  const [tierForm, setTierForm] = useState<{
    campaignCooldown: number
    characterCooldown: number
    importLimit: number | null
  }>({ campaignCooldown: 12, characterCooldown: 12, importLimit: null })

  useEffect(() => {
    fetchUsage()
    fetchIntelligenceStats()
    fetchTierSettings()
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

  const fetchIntelligenceStats = async () => {
    try {
      const days = period === 'week' ? 7 : period === 'month' ? 30 : 365
      const response = await fetch(`/api/admin/ai/usage?days=${days}`)
      if (response.ok) {
        const result = await response.json()
        setIntelligenceData(result)
      }
    } catch (err) {
      console.error('Failed to fetch intelligence stats:', err)
    }
  }

  const fetchTierSettings = async () => {
    try {
      const response = await fetch('/api/admin/ai/tiers')
      if (response.ok) {
        const result = await response.json()
        setTierSettings(result.tiers || [])
      }
    } catch (err) {
      console.error('Failed to fetch tier settings:', err)
    }
  }

  const handleEditTier = (tier: TierSetting) => {
    setEditingTier(tier.tier)
    setTierForm({
      campaignCooldown: tier.campaign_intelligence_cooldown_hours,
      characterCooldown: tier.character_intelligence_cooldown_hours,
      importLimit: tier.import_limit_per_day,
    })
  }

  const handleSaveTier = async () => {
    if (!editingTier) return

    try {
      const response = await fetch('/api/admin/ai/tiers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: editingTier,
          campaignIntelligenceCooldownHours: tierForm.campaignCooldown,
          characterIntelligenceCooldownHours: tierForm.characterCooldown,
          importLimitPerDay: tierForm.importLimit,
        }),
      })

      if (response.ok) {
        toast.success('Tier settings updated')
        setEditingTier(null)
        fetchTierSettings()
      } else {
        toast.error('Failed to update tier settings')
      }
    } catch (err) {
      toast.error('Failed to update tier settings')
    }
  }

  const initializeTiers = async () => {
    try {
      const response = await fetch('/api/admin/ai/tiers', { method: 'POST' })
      if (response.ok) {
        toast.success('Tier settings initialized')
        fetchTierSettings()
      } else {
        toast.error('Failed to initialize tier settings')
      }
    } catch (err) {
      toast.error('Failed to initialize tier settings')
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

  const tabs: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'usage', label: 'Usage', icon: BarChart3 },
    { id: 'intelligence', label: 'Intelligence', icon: Bot },
    { id: 'import', label: 'Import Funnel', icon: Upload },
    { id: 'feedback', label: 'Feedback', icon: ThumbsUp },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">AI Admin Panel</h2>
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

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-white/[0.06] pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'usage' && (
        <UsageTab
          data={data}
          currency={currency}
          formatCost={formatCost}
          expandedUser={expandedUser}
          setExpandedUser={setExpandedUser}
        />
      )}

      {activeTab === 'intelligence' && (
        <IntelligenceTab
          data={intelligenceData}
          formatCost={(usd: number) => {
            const rates: Record<string, number> = { USD: 1, GBP: 0.80, EUR: 0.92 }
            const converted = usd * rates[currency]
            const symbol = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '€'
            return `${symbol}${converted.toFixed(4)}`
          }}
        />
      )}

      {activeTab === 'import' && (
        <ImportFunnelTab data={intelligenceData} />
      )}

      {activeTab === 'feedback' && (
        <FeedbackTab data={intelligenceData} />
      )}

      {activeTab === 'settings' && (
        <SettingsTab
          tierSettings={tierSettings}
          editingTier={editingTier}
          tierForm={tierForm}
          setTierForm={setTierForm}
          handleEditTier={handleEditTier}
          handleSaveTier={handleSaveTier}
          setEditingTier={setEditingTier}
          initializeTiers={initializeTiers}
        />
      )}
    </div>
  )
}

// Usage Tab Component
function UsageTab({
  data,
  currency,
  formatCost,
  expandedUser,
  setExpandedUser,
}: {
  data: UsageData | null
  currency: string
  formatCost: (cents: number) => string
  expandedUser: string | null
  setExpandedUser: (id: string | null) => void
}) {
  if (!data) {
    return (
      <div className="text-center py-12 text-gray-400">
        No usage data available
      </div>
    )
  }

  return (
    <div className="space-y-6">

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

// Intelligence Tab Component
function IntelligenceTab({
  data,
  formatCost,
}: {
  data: IntelligenceStats | null
  formatCost: (usd: number) => string
}) {
  if (!data) {
    return (
      <div className="text-center py-12 text-gray-400">
        No intelligence data available. Run Campaign or Character Intelligence to see stats here.
      </div>
    )
  }

  const { stats } = data

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Zap}
          label="Total Calls"
          value={stats.totalCalls.toLocaleString()}
          color="blue"
        />
        <StatCard
          icon={DollarSign}
          label="Total Cost"
          value={formatCost(stats.totalCost)}
          color="amber"
        />
        <StatCard
          icon={Clock}
          label="Avg Duration"
          value={`${Math.round(stats.avgDuration)}ms`}
          color="purple"
        />
        <StatCard
          icon={X}
          label="Errors"
          value={stats.errorCount.toLocaleString()}
          color="indigo"
        />
      </div>

      {/* By Operation Type */}
      <section className="bg-[#1a1a24] rounded-xl border border-white/[0.06] p-6">
        <h3 className="text-md font-semibold text-white mb-4">By Operation Type</h3>
        <div className="grid lg:grid-cols-2 gap-3">
          {Object.entries(stats.byOperationType).length === 0 ? (
            <p className="text-gray-500 text-sm">No data</p>
          ) : (
            Object.entries(stats.byOperationType).map(([opType, opStats]) => (
              <div key={opType} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg">
                <div>
                  <p className="text-white font-medium capitalize">{opType.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-gray-500">{opStats.count} calls</p>
                </div>
                <p className="text-white font-medium">{formatCost(opStats.cost)}</p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* By Model */}
      <section className="bg-[#1a1a24] rounded-xl border border-white/[0.06] p-6">
        <h3 className="text-md font-semibold text-white mb-4">By Model</h3>
        <div className="grid lg:grid-cols-2 gap-3">
          {Object.entries(stats.byModel).length === 0 ? (
            <p className="text-gray-500 text-sm">No data</p>
          ) : (
            Object.entries(stats.byModel).map(([model, modelStats]) => (
              <div key={model} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg">
                <div>
                  <p className="text-white font-medium">{model}</p>
                  <p className="text-xs text-gray-500">{modelStats.count} calls</p>
                </div>
                <p className="text-white font-medium">{formatCost(modelStats.cost)}</p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Top Users */}
      <section className="bg-[#1a1a24] rounded-xl border border-white/[0.06] p-6">
        <h3 className="text-md font-semibold text-white mb-4">Top Users</h3>
        <div className="space-y-2">
          {stats.topUsers.length === 0 ? (
            <p className="text-gray-500 text-sm">No data</p>
          ) : (
            stats.topUsers.map((user, index) => (
              <div key={user.userId} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 text-sm w-6">#{index + 1}</span>
                  <span className="text-white font-mono text-sm">{user.userId.slice(0, 8)}...</span>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">{formatCost(user.cost)}</p>
                  <p className="text-xs text-gray-500">{user.count} calls</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

// Import Funnel Tab Component
function ImportFunnelTab({ data }: { data: IntelligenceStats | null }) {
  if (!data) {
    return (
      <div className="text-center py-12 text-gray-400">
        No import data available.
      </div>
    )
  }

  const { importFunnel } = data
  const total = importFunnel.started || 1 // Avoid division by zero

  const stages = [
    { label: 'Started', value: importFunnel.started, color: 'bg-gray-500' },
    { label: 'Parsed', value: importFunnel.parsed, color: 'bg-blue-500' },
    { label: 'Reviewed', value: importFunnel.reviewed, color: 'bg-purple-500' },
    { label: 'Saved', value: importFunnel.saved, color: 'bg-green-500' },
    { label: 'Cancelled', value: importFunnel.cancelled, color: 'bg-red-500' },
  ]

  const conversionRate = importFunnel.started > 0
    ? ((importFunnel.saved / importFunnel.started) * 100).toFixed(1)
    : '0'

  return (
    <div className="space-y-6">
      {/* Conversion Rate */}
      <div className="bg-[#1a1a24] rounded-xl border border-white/[0.06] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-md font-semibold text-white">Import Conversion Rate</h3>
          <span className="text-2xl font-bold text-green-400">{conversionRate}%</span>
        </div>
        <p className="text-sm text-gray-400">
          {importFunnel.saved} of {importFunnel.started} imports successfully saved
        </p>
      </div>

      {/* Funnel Visualization */}
      <section className="bg-[#1a1a24] rounded-xl border border-white/[0.06] p-6">
        <h3 className="text-md font-semibold text-white mb-6">Import Funnel</h3>
        <div className="space-y-4">
          {stages.filter(s => s.label !== 'Cancelled').map((stage, index) => {
            const percentage = (stage.value / total) * 100
            return (
              <div key={stage.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-400 text-sm">{stage.label}</span>
                  <span className="text-white font-medium">{stage.value}</span>
                </div>
                <div className="h-8 bg-white/[0.02] rounded-lg overflow-hidden">
                  <div
                    className={cn("h-full transition-all", stage.color)}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                {index < stages.length - 2 && (
                  <div className="flex justify-center my-2">
                    <ArrowRight className="w-4 h-4 text-gray-600 rotate-90" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Cancelled/Abandoned */}
      <section className="bg-[#1a1a24] rounded-xl border border-white/[0.06] p-6">
        <h3 className="text-md font-semibold text-white mb-4">Drop-off Analysis</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-white/[0.02] rounded-lg text-center">
            <p className="text-2xl font-bold text-red-400">{importFunnel.cancelled}</p>
            <p className="text-xs text-gray-500 mt-1">Cancelled</p>
          </div>
          <div className="p-4 bg-white/[0.02] rounded-lg text-center">
            <p className="text-2xl font-bold text-amber-400">
              {importFunnel.started - importFunnel.parsed - importFunnel.cancelled}
            </p>
            <p className="text-xs text-gray-500 mt-1">Parse Failed</p>
          </div>
        </div>
      </section>
    </div>
  )
}

// Feedback Tab Component
function FeedbackTab({ data }: { data: IntelligenceStats | null }) {
  if (!data) {
    return (
      <div className="text-center py-12 text-gray-400">
        No feedback data available.
      </div>
    )
  }

  const { feedbackStats } = data
  const total = feedbackStats.total || 1

  const acceptanceRate = ((feedbackStats.accepted / total) * 100).toFixed(1)
  const positiveRate = feedbackStats.positive + feedbackStats.negative > 0
    ? ((feedbackStats.positive / (feedbackStats.positive + feedbackStats.negative)) * 100).toFixed(1)
    : '0'

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Check}
          label="Acceptance Rate"
          value={`${acceptanceRate}%`}
          color="green"
        />
        <StatCard
          icon={ThumbsUp}
          label="Positive Rate"
          value={`${positiveRate}%`}
          color="blue"
        />
        <StatCard
          icon={Edit2}
          label="Edited"
          value={feedbackStats.edited.toLocaleString()}
          color="purple"
        />
        <StatCard
          icon={X}
          label="Dismissed"
          value={feedbackStats.dismissed.toLocaleString()}
          color="amber"
        />
      </div>

      {/* Action Breakdown */}
      <section className="bg-[#1a1a24] rounded-xl border border-white/[0.06] p-6">
        <h3 className="text-md font-semibold text-white mb-4">Suggestion Actions</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
            <p className="text-2xl font-bold text-green-400">{feedbackStats.accepted}</p>
            <p className="text-xs text-green-400/70 mt-1">Accepted</p>
          </div>
          <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg text-center">
            <p className="text-2xl font-bold text-purple-400">{feedbackStats.edited}</p>
            <p className="text-xs text-purple-400/70 mt-1">Edited</p>
          </div>
          <div className="p-4 bg-gray-500/10 border border-gray-500/20 rounded-lg text-center">
            <p className="text-2xl font-bold text-gray-400">{feedbackStats.dismissed}</p>
            <p className="text-xs text-gray-400/70 mt-1">Dismissed</p>
          </div>
        </div>
      </section>

      {/* Feedback Sentiment */}
      <section className="bg-[#1a1a24] rounded-xl border border-white/[0.06] p-6">
        <h3 className="text-md font-semibold text-white mb-4">User Feedback</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-white/[0.02] rounded-lg">
            <div className="flex items-center gap-3">
              <ThumbsUp className="w-6 h-6 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-white">{feedbackStats.positive}</p>
                <p className="text-xs text-gray-500">Positive</p>
              </div>
            </div>
          </div>
          <div className="p-4 bg-white/[0.02] rounded-lg">
            <div className="flex items-center gap-3">
              <ThumbsDown className="w-6 h-6 text-red-400" />
              <div>
                <p className="text-2xl font-bold text-white">{feedbackStats.negative}</p>
                <p className="text-xs text-gray-500">Negative</p>
              </div>
            </div>
          </div>
        </div>
        {feedbackStats.positive + feedbackStats.negative > 0 && (
          <div className="mt-4 h-4 bg-white/[0.02] rounded-full overflow-hidden flex">
            <div
              className="bg-green-500 h-full"
              style={{ width: `${(feedbackStats.positive / (feedbackStats.positive + feedbackStats.negative)) * 100}%` }}
            />
            <div
              className="bg-red-500 h-full"
              style={{ width: `${(feedbackStats.negative / (feedbackStats.positive + feedbackStats.negative)) * 100}%` }}
            />
          </div>
        )}
      </section>
    </div>
  )
}

// Settings Tab Component
function SettingsTab({
  tierSettings,
  editingTier,
  tierForm,
  setTierForm,
  handleEditTier,
  handleSaveTier,
  setEditingTier,
  initializeTiers,
}: {
  tierSettings: TierSetting[]
  editingTier: string | null
  tierForm: { campaignCooldown: number; characterCooldown: number; importLimit: number | null }
  setTierForm: (form: { campaignCooldown: number; characterCooldown: number; importLimit: number | null }) => void
  handleEditTier: (tier: TierSetting) => void
  handleSaveTier: () => void
  setEditingTier: (tier: string | null) => void
  initializeTiers: () => void
}) {
  const tierLabels: Record<string, string> = {
    free: 'Free',
    adventurer: 'Adventurer',
    hero: 'Hero',
    legend: 'Legend',
  }

  const tierColors: Record<string, string> = {
    free: 'bg-gray-500/10 border-gray-500/20',
    adventurer: 'bg-blue-500/10 border-blue-500/20',
    hero: 'bg-purple-500/10 border-purple-500/20',
    legend: 'bg-amber-500/10 border-amber-500/20',
  }

  if (tierSettings.length === 0) {
    return (
      <div className="bg-[#1a1a24] rounded-xl border border-white/[0.06] p-6 text-center">
        <Settings className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">No Tier Settings</h3>
        <p className="text-gray-400 text-sm mb-4">
          Initialize default tier settings to configure AI cooldowns and limits.
        </p>
        <button
          onClick={initializeTiers}
          className="btn btn-primary"
        >
          Initialize Tier Settings
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="bg-[#1a1a24] rounded-xl border border-white/[0.06] p-6">
        <h3 className="text-md font-semibold text-white mb-4">Tier Cooldown Settings</h3>
        <p className="text-sm text-gray-400 mb-6">
          Configure AI Intelligence cooldowns and import limits per subscription tier.
        </p>
        <div className="grid lg:grid-cols-2 gap-4">
          {tierSettings.map((tier) => (
            <div
              key={tier.tier}
              className={cn(
                "p-4 rounded-lg border",
                tierColors[tier.tier] || 'bg-white/[0.02] border-white/[0.06]'
              )}
            >
              {editingTier === tier.tier ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">{tierLabels[tier.tier] || tier.tier}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingTier(null)}
                        className="p-1.5 text-gray-400 hover:text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleSaveTier}
                        className="p-1.5 text-green-400 hover:text-green-300 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Campaign Intelligence Cooldown (hours)</label>
                    <input
                      type="number"
                      value={tierForm.campaignCooldown}
                      onChange={(e) => setTierForm({ ...tierForm, campaignCooldown: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Character Intelligence Cooldown (hours)</label>
                    <input
                      type="number"
                      value={tierForm.characterCooldown}
                      onChange={(e) => setTierForm({ ...tierForm, characterCooldown: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Import Limit Per Day (blank = unlimited)</label>
                    <input
                      type="number"
                      value={tierForm.importLimit ?? ''}
                      onChange={(e) => setTierForm({ ...tierForm, importLimit: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="Unlimited"
                      className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded text-white text-sm"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white font-medium">{tierLabels[tier.tier] || tier.tier}</span>
                    <button
                      onClick={() => handleEditTier(tier)}
                      className="p-1.5 text-gray-400 hover:text-white transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Campaign Cooldown</span>
                      <span className="text-white">{tier.campaign_intelligence_cooldown_hours}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Character Cooldown</span>
                      <span className="text-white">{tier.character_intelligence_cooldown_hours}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Import Limit</span>
                      <span className="text-white">
                        {tier.import_limit_per_day === null ? 'Unlimited' : `${tier.import_limit_per_day}/day`}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
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
