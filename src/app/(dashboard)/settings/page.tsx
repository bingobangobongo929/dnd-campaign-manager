'use client'

import { useEffect, useState } from 'react'
import {
  Sparkles,
  LogOut,
  User,
  Bot,
  Database,
  Download,
  Trash2,
  AlertTriangle,
  Keyboard,
  Shield,
  ChevronRight,
  BarChart3,
  Loader2,
  Zap,
  ImageIcon,
  Share2,
  Crown,
  Check,
  Info,
  Github,
  MessageSquare,
  Scroll,
  Map,
  BookOpen,
} from 'lucide-react'
import { Modal } from '@/components/ui'
import { MobileLayout } from '@/components/mobile'
import { useSupabase, useUser, useIsMobile } from '@/hooks'
import { useAppStore, CURRENCY_CONFIG, type Currency, useCanUseAI } from '@/store'
import { AI_PROVIDERS, AIProvider } from '@/lib/ai/config'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { LegalFooter } from '@/components/ui/legal-footer'

// App version - using date-based versioning
const APP_VERSION = '2025.01.17'
const APP_BUILD = 'January 2025'

// What's new highlights
const WHATS_NEW = [
  'Enhanced AI model selection with detailed info',
  'Share analytics with real-time viewer tracking',
  'Character vault with document parsing',
  'Campaign intelligence suggestions',
  'Image generation with Gemini 3',
  'Improved mobile responsiveness',
]

export default function SettingsPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()
  const isMobile = useIsMobile()
  const {
    aiEnabled, setAIEnabled,
    aiProvider, setAIProvider,
    currency, setCurrency,
  } = useAppStore()
  const canUseAI = useCanUseAI()

  // Stats state
  const [stats, setStats] = useState({
    campaigns: 0,
    characters: 0, // Vault characters (user's main characters)
    sessions: 0,
    oneshots: 0,
  })
  const [loadingStats, setLoadingStats] = useState(true)

  // API Usage state
  const [apiUsage, setApiUsage] = useState<{
    summary: {
      totalRequests: number
      totalTokens: number
      totalImages: number
      totalCostCents: number
      costs: Record<string, string>
    }
    byProvider: Record<string, { requests: number; tokens: number; cost: number }>
    byOperation: Record<string, { requests: number; tokens: number; cost: number }>
  } | null>(null)
  const [loadingUsage, setLoadingUsage] = useState(true)
  const [usagePeriod, setUsagePeriod] = useState<'week' | 'month' | 'all'>('month')

  // Shares summary state
  const [sharesSummary, setSharesSummary] = useState<{
    active_shares: number
    viewing_now: number
    total_views: number
  } | null>(null)

  // Modal states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  const [showApiUsageDetails, setShowApiUsageDetails] = useState(false)
  const [showWhatsNew, setShowWhatsNew] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Expanded sections
  const [expandedProvider, setExpandedProvider] = useState<AIProvider | null>(null)

  // Load user stats
  useEffect(() => {
    if (user) {
      loadStats()
      loadApiUsage()
      loadSharesSummary()
    }
  }, [user, usagePeriod])

  const loadStats = async () => {
    setLoadingStats(true)
    const [campaignsRes, charsRes, sessionsRes, oneshotsRes] = await Promise.all([
      supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
      supabase.from('vault_characters').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
      supabase.from('sessions').select('id', { count: 'exact', head: true }),
      supabase.from('oneshots').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
    ])

    setStats({
      campaigns: campaignsRes.count || 0,
      characters: charsRes.count || 0,
      sessions: sessionsRes.count || 0,
      oneshots: oneshotsRes.count || 0,
    })
    setLoadingStats(false)
  }

  const loadApiUsage = async () => {
    setLoadingUsage(true)
    try {
      const res = await fetch(`/api/usage?period=${usagePeriod}`)
      if (res.ok) {
        const data = await res.json()
        setApiUsage(data)
      }
    } catch (error) {
      console.error('Failed to load API usage:', error)
    } finally {
      setLoadingUsage(false)
    }
  }

  const loadSharesSummary = async () => {
    try {
      const res = await fetch('/api/shares')
      if (res.ok) {
        const data = await res.json()
        setSharesSummary(data.summary)
      }
    } catch (error) {
      console.error('Failed to load shares summary:', error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleExportData = async () => {
    setExporting(true)
    try {
      const [campaignsRes, oneshotsRes, vaultRes] = await Promise.all([
        supabase.from('campaigns').select('*, characters(*), sessions(*), timeline_events(*)').eq('user_id', user!.id),
        supabase.from('oneshots').select('*, oneshot_runs(*)').eq('user_id', user!.id),
        supabase.from('vault_characters').select('*').eq('user_id', user!.id),
      ])

      const exportData = {
        exportDate: new Date().toISOString(),
        version: APP_VERSION,
        user: { email: user?.email },
        campaigns: campaignsRes.data || [],
        oneshots: oneshotsRes.data || [],
        vaultCharacters: vaultRes.data || [],
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `multiloop-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export data. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteAll = async () => {
    if (deleteConfirmText !== 'DELETE') return

    if (user) {
      await supabase.from('vault_characters').delete().eq('user_id', user.id)
      await supabase.from('oneshots').delete().eq('user_id', user.id)
      await supabase.from('campaigns').delete().eq('user_id', user.id)
    }
    setShowDeleteConfirm(false)
    setDeleteConfirmText('')
    loadStats()
  }

  const KEYBOARD_SHORTCUTS = [
    { keys: ['G', 'H'], description: 'Go to Home' },
    { keys: ['G', 'C'], description: 'Go to Campaigns' },
    { keys: ['G', 'V'], description: 'Go to Vault' },
    { keys: ['G', 'O'], description: 'Go to One-Shots' },
    { keys: ['Ctrl/Cmd', 'K'], description: 'Quick search' },
    { keys: ['?'], description: 'Show this help' },
    { keys: ['Esc'], description: 'Close modal / Cancel' },
  ]

  const getProviderIcon = (icon: string) => {
    switch (icon) {
      case 'sparkles': return Sparkles
      case 'zap': return Zap
      case 'crown': return Crown
      default: return Bot
    }
  }

  const getCurrencySymbol = () => CURRENCY_CONFIG[currency].symbol

  const formatCost = (costCents: number) => {
    const usdCost = costCents / 100
    const rate = CURRENCY_CONFIG[currency].rate
    return `${getCurrencySymbol()}${(usdCost * rate).toFixed(2)}`
  }

  // ============ MOBILE LAYOUT ============
  if (isMobile) {
    return (
      <MobileLayout title="Settings">
        <div className="px-4 pb-24 space-y-6">
          {/* Profile & Account */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[--arcane-purple] to-[--arcane-purple-dim] flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-base font-semibold text-white">Profile</h2>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wide">Email</label>
                <p className="text-sm text-white">{user?.email || 'Not signed in'}</p>
              </div>

              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wide">Member Since</label>
                <p className="text-sm text-white">
                  {user?.created_at ? formatDate(user.created_at) : 'Unknown'}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                <span className="text-sm text-gray-400">Currency</span>
                <div className="flex gap-1">
                  {(Object.keys(CURRENCY_CONFIG) as Currency[]).map((cur) => (
                    <button
                      key={cur}
                      onClick={() => setCurrency(cur)}
                      className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                        currency === cur
                          ? 'bg-[--arcane-purple] text-white'
                          : 'bg-white/5 text-gray-400'
                      }`}
                    >
                      {CURRENCY_CONFIG[cur].symbol}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* AI Settings - only show for users who can access AI */}
          {canUseAI && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[--arcane-purple] to-blue-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-base font-semibold text-white">AI Features</h2>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-4">
                {/* Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex-1 pr-4">
                    <p className="text-sm font-medium text-white">Enable AI</p>
                    <p className="text-xs text-gray-500">
                      {aiEnabled ? 'All AI features active' : 'AI features disabled'}
                    </p>
                  </div>
                  <button
                    onClick={() => setAIEnabled(!aiEnabled)}
                    className={`relative w-12 h-7 rounded-full transition-colors ${
                      aiEnabled ? 'bg-[--arcane-purple]' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                        aiEnabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* Provider Selection */}
                {aiEnabled && (
                  <div className="pt-3 border-t border-white/[0.06] space-y-2">
                    <p className="text-xs text-gray-500">Select AI Model</p>
                    {(Object.keys(AI_PROVIDERS) as AIProvider[]).map((provider) => {
                      const info = AI_PROVIDERS[provider]
                      const isSelected = aiProvider === provider
                      const ProviderIcon = getProviderIcon(info.icon)

                      return (
                        <button
                          key={provider}
                          onClick={() => setAIProvider(provider)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                            isSelected
                              ? 'bg-purple-500/15 border border-purple-500/30'
                              : 'bg-white/[0.02] border border-transparent active:bg-white/[0.05]'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            info.icon === 'sparkles' ? 'bg-orange-500/20' :
                            info.icon === 'zap' ? 'bg-blue-500/20' : 'bg-purple-500/20'
                          }`}>
                            <ProviderIcon className={`w-4 h-4 ${
                              info.icon === 'sparkles' ? 'text-orange-500' :
                              info.icon === 'zap' ? 'text-blue-500' : 'text-purple-500'
                            }`} />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-white">{info.name}</p>
                            <p className="text-xs text-gray-500">{info.costTier} cost</p>
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Usage Summary */}
                {aiEnabled && apiUsage && (
                  <div className="pt-3 border-t border-white/[0.06]">
                    <p className="text-xs text-gray-500 mb-2">Usage ({usagePeriod === 'month' ? '30d' : usagePeriod === 'week' ? '7d' : 'All'})</p>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="p-2 rounded-lg bg-white/[0.03] text-center">
                        <p className="text-sm font-bold text-white">{apiUsage.summary.totalRequests}</p>
                        <p className="text-[10px] text-gray-500">Requests</p>
                      </div>
                      <div className="p-2 rounded-lg bg-white/[0.03] text-center">
                        <p className="text-sm font-bold text-white">{(apiUsage.summary.totalTokens / 1000).toFixed(0)}K</p>
                        <p className="text-[10px] text-gray-500">Tokens</p>
                      </div>
                      <div className="p-2 rounded-lg bg-white/[0.03] text-center">
                        <p className="text-sm font-bold text-white">{apiUsage.summary.totalImages}</p>
                        <p className="text-[10px] text-gray-500">Images</p>
                      </div>
                      <div className="p-2 rounded-lg bg-white/[0.03] text-center">
                        <p className="text-sm font-bold text-white">{formatCost(apiUsage.summary.totalCostCents)}</p>
                        <p className="text-[10px] text-gray-500">Cost</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Content Stats */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
                <Database className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-base font-semibold text-white">Your Content</h2>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                <Map className="w-4 h-4 mx-auto mb-1 text-gray-500" />
                <p className="text-lg font-bold text-white">{loadingStats ? '-' : stats.campaigns}</p>
                <p className="text-[10px] text-gray-500">Campaigns</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                <User className="w-4 h-4 mx-auto mb-1 text-gray-500" />
                <p className="text-lg font-bold text-white">{loadingStats ? '-' : stats.characters}</p>
                <p className="text-[10px] text-gray-500">Characters</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                <BookOpen className="w-4 h-4 mx-auto mb-1 text-gray-500" />
                <p className="text-lg font-bold text-white">{loadingStats ? '-' : stats.sessions}</p>
                <p className="text-[10px] text-gray-500">Sessions</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                <Scroll className="w-4 h-4 mx-auto mb-1 text-gray-500" />
                <p className="text-lg font-bold text-white">{loadingStats ? '-' : stats.oneshots}</p>
                <p className="text-[10px] text-gray-500">One-Shots</p>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-2">
              <Link
                href="/settings/shares"
                className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] active:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Share2 className="w-5 h-5 text-pink-400" />
                  <div>
                    <p className="text-sm font-medium text-white">Shared Links</p>
                    <p className="text-xs text-gray-500">
                      {sharesSummary ? `${sharesSummary.active_shares} active` : 'Manage shares'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </Link>

              <button
                onClick={handleExportData}
                disabled={exporting}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] active:bg-white/[0.04] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Download className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-white">Export Data</p>
                    <p className="text-xs text-gray-500">Download as JSON</p>
                  </div>
                </div>
                {exporting ? (
                  <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                )}
              </button>
            </div>
          </section>

          {/* App Info */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <Info className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-base font-semibold text-white">App Info</h2>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Multiloop</p>
                  <p className="text-xs text-gray-500">TTRPG Campaign Manager</p>
                </div>
                <span className="font-mono text-xs text-[--arcane-gold] bg-[--arcane-gold]/10 px-2 py-1 rounded">
                  v{APP_VERSION}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowWhatsNew(true)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 active:bg-purple-500/30"
                >
                  What&apos;s New
                </button>
                <button
                  onClick={() => setShowKeyboardShortcuts(true)}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 active:bg-white/10"
                >
                  <Keyboard className="w-3 h-3" />
                  Shortcuts
                </button>
              </div>
            </div>
          </section>

          {/* Sign Out & Danger Zone */}
          <section className="space-y-3">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-red-400 active:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sign Out</span>
            </button>

            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-red-400">Danger Zone</span>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-red-500/30 text-red-400 active:bg-red-500/10 transition-colors text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Delete All Data
              </button>
            </div>
          </section>

          {/* Legal Footer */}
          <LegalFooter className="mt-8 pb-4" />
        </div>

        {/* Modals (same as desktop) */}
        <Modal
          isOpen={showKeyboardShortcuts}
          onClose={() => setShowKeyboardShortcuts(false)}
          title="Keyboard Shortcuts"
        >
          <div className="space-y-2">
            {KEYBOARD_SHORTCUTS.map((shortcut, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[--bg-elevated]">
                <span className="text-sm text-gray-400">{shortcut.description}</span>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key, j) => (
                    <span key={j}>
                      <kbd className="px-2 py-1 text-xs font-mono bg-white/5 border border-white/10 rounded">
                        {key}
                      </kbd>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Modal>

        <Modal
          isOpen={showWhatsNew}
          onClose={() => setShowWhatsNew(false)}
          title="What's New"
        >
          <div className="space-y-2">
            {WHATS_NEW.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[--bg-elevated]">
                <Sparkles className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-300">{item}</span>
              </div>
            ))}
          </div>
        </Modal>

        <Modal
          isOpen={showDeleteConfirm}
          onClose={() => { setShowDeleteConfirm(false); setDeleteConfirmText('') }}
          title="Delete All Data?"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-red-400 mb-2">This will permanently delete:</p>
              <ul className="text-sm text-red-400/80 space-y-1">
                <li>• {stats.campaigns} campaigns</li>
                <li>• {stats.characters} characters</li>
                <li>• {stats.sessions} sessions</li>
                <li>• {stats.oneshots} one-shots</li>
              </ul>
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-2">
                Type <span className="font-mono font-bold text-red-400">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-lg text-white"
                placeholder="Type DELETE"
              />
            </div>
            <div className="flex gap-3">
              <button
                className="flex-1 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-gray-300"
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText('') }}
              >
                Cancel
              </button>
              <button
                className="flex-1 py-3 bg-red-500 active:bg-red-600 rounded-xl text-white font-medium disabled:opacity-50"
                onClick={handleDeleteAll}
                disabled={deleteConfirmText !== 'DELETE'}
              >
                Delete
              </button>
            </div>
          </div>
        </Modal>
      </MobileLayout>
    )
  }

  // ============ DESKTOP LAYOUT ============
  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account and preferences</p>
      </div>

      <div className="space-y-8">
        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 1: PROFILE & ACCOUNT
            ═══════════════════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[--arcane-purple] to-[--arcane-purple-dim] flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[--text-primary]">Profile & Account</h2>
              <p className="text-sm text-[--text-tertiary]">Your account details</p>
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-[--bg-elevated] border border-[--border]">
              <div>
                <label className="text-xs text-[--text-tertiary] uppercase tracking-wide">Email Address</label>
                <p className="text-[--text-primary] font-medium">{user?.email || 'Not signed in'}</p>
              </div>
              <Shield className="w-5 h-5 text-emerald-500" />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-[--bg-elevated] border border-[--border]">
              <div>
                <label className="text-xs text-[--text-tertiary] uppercase tracking-wide">Member Since</label>
                <p className="text-[--text-primary] font-medium">
                  {user?.created_at ? formatDate(user.created_at) : 'Unknown'}
                </p>
              </div>
            </div>

            {/* Currency Preference */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-[--bg-elevated] border border-[--border]">
              <div>
                <label className="text-xs text-[--text-tertiary] uppercase tracking-wide">Display Currency</label>
                <p className="text-[--text-primary] font-medium">{CURRENCY_CONFIG[currency].name}</p>
              </div>
              <div className="flex gap-1">
                {(Object.keys(CURRENCY_CONFIG) as Currency[]).map((cur) => (
                  <button
                    key={cur}
                    onClick={() => setCurrency(cur)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      currency === cur
                        ? 'bg-[--arcane-purple] text-white'
                        : 'bg-[--bg-surface] text-[--text-secondary] hover:text-[--text-primary]'
                    }`}
                  >
                    {CURRENCY_CONFIG[cur].symbol}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="btn btn-secondary w-full justify-center text-[--arcane-ember] hover:bg-red-500/10"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 2: AI & INTELLIGENCE - only show for users who can access AI
            ═══════════════════════════════════════════════════════════════════ */}
        {canUseAI && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[--arcane-purple] to-blue-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[--text-primary]">AI & Intelligence</h2>
              <p className="text-sm text-[--text-tertiary]">Configure AI-powered features</p>
            </div>
          </div>

          <div className="card p-5 space-y-5">
            {/* Master AI Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-[--bg-elevated] border border-[--border]">
              <div className="flex-1">
                <p className="font-medium text-[--text-primary]">Enable AI Features</p>
                <p className="text-xs text-[--text-tertiary] mt-0.5">
                  {aiEnabled
                    ? 'Campaign Intelligence, image generation, and AI analysis are active'
                    : 'All AI features are hidden throughout the app'}
                </p>
              </div>
              <button
                onClick={() => setAIEnabled(!aiEnabled)}
                className={`relative w-14 h-8 rounded-full transition-colors flex-shrink-0 ml-4 ${
                  aiEnabled ? 'bg-[--arcane-purple]' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${
                    aiEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Provider Selection */}
            {aiEnabled && (
              <>
                <div>
                  <p className="text-sm text-[--text-secondary] mb-3">Select your AI model</p>
                  <div className="space-y-2">
                    {(Object.keys(AI_PROVIDERS) as AIProvider[]).map((provider) => {
                      const info = AI_PROVIDERS[provider]
                      const isSelected = aiProvider === provider
                      const isExpanded = expandedProvider === provider
                      const ProviderIcon = getProviderIcon(info.icon)

                      return (
                        <div key={provider} className="rounded-xl border-2 transition-all overflow-hidden"
                          style={{
                            borderColor: isSelected ? 'var(--arcane-purple)' : 'var(--border)',
                            backgroundColor: isSelected ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                          }}
                        >
                          <button
                            onClick={() => setAIProvider(provider)}
                            className="w-full flex items-center gap-4 p-4 text-left"
                          >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              info.icon === 'sparkles' ? 'bg-orange-500/20' :
                              info.icon === 'zap' ? 'bg-blue-500/20' : 'bg-purple-500/20'
                            }`}>
                              <ProviderIcon className={`w-5 h-5 ${
                                info.icon === 'sparkles' ? 'text-orange-500' :
                                info.icon === 'zap' ? 'text-blue-500' : 'text-purple-500'
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-[--text-primary]">{info.name}</p>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-[--text-tertiary]">
                                  {info.modelDisplay}
                                </span>
                              </div>
                              <p className="text-xs text-[--text-tertiary] truncate">{info.description}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {isSelected && (
                                <div className="w-5 h-5 rounded-full bg-[--arcane-purple] flex items-center justify-center">
                                  <Check className="w-3 h-3 text-white" />
                                </div>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setExpandedProvider(isExpanded ? null : provider)
                                }}
                                className="p-1 rounded hover:bg-white/10 transition-colors"
                              >
                                <Info className="w-4 h-4 text-[--text-tertiary]" />
                              </button>
                            </div>
                          </button>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="px-4 pb-4 pt-0 border-t border-white/5">
                              <div className="grid grid-cols-3 gap-3 my-3">
                                <div className="text-center p-2 rounded-lg bg-white/5">
                                  <p className="text-xs text-[--text-tertiary]">Speed</p>
                                  <p className="text-sm font-medium text-[--text-primary] capitalize">{info.speed}</p>
                                </div>
                                <div className="text-center p-2 rounded-lg bg-white/5">
                                  <p className="text-xs text-[--text-tertiary]">Quality</p>
                                  <p className="text-sm font-medium text-[--text-primary] capitalize">{info.quality}</p>
                                </div>
                                <div className="text-center p-2 rounded-lg bg-white/5">
                                  <p className="text-xs text-[--text-tertiary]">Cost</p>
                                  <p className="text-sm font-medium text-[--text-primary] capitalize">{info.costTier}</p>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div>
                                  <p className="text-xs font-medium text-emerald-400 mb-1">Strengths</p>
                                  <ul className="text-xs text-[--text-secondary] space-y-0.5">
                                    {info.strengths.map((s, i) => (
                                      <li key={i} className="flex items-start gap-1.5">
                                        <span className="text-emerald-400 mt-0.5">+</span> {s}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-amber-400 mb-1">Considerations</p>
                                  <ul className="text-xs text-[--text-secondary] space-y-0.5">
                                    {info.considerations.map((c, i) => (
                                      <li key={i} className="flex items-start gap-1.5">
                                        <span className="text-amber-400 mt-0.5">!</span> {c}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* API Usage Summary */}
                <div className="pt-4 border-t border-[--border]">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-[--text-primary]">API Usage</p>
                    <div className="flex gap-1">
                      {(['week', 'month', 'all'] as const).map((period) => (
                        <button
                          key={period}
                          onClick={() => setUsagePeriod(period)}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            usagePeriod === period
                              ? 'bg-[--arcane-purple] text-white'
                              : 'bg-[--bg-surface] text-[--text-tertiary] hover:text-[--text-primary]'
                          }`}
                        >
                          {period === 'week' ? '7d' : period === 'month' ? '30d' : 'All'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {loadingUsage ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-[--text-tertiary]" />
                    </div>
                  ) : apiUsage ? (
                    <>
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        <div className="p-3 rounded-lg bg-[--bg-elevated] text-center">
                          <Zap className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                          <p className="text-lg font-bold text-[--text-primary]">{apiUsage.summary.totalRequests}</p>
                          <p className="text-[10px] text-[--text-tertiary]">Requests</p>
                        </div>
                        <div className="p-3 rounded-lg bg-[--bg-elevated] text-center">
                          <Bot className="w-4 h-4 text-purple-500 mx-auto mb-1" />
                          <p className="text-lg font-bold text-[--text-primary]">{(apiUsage.summary.totalTokens / 1000).toFixed(1)}K</p>
                          <p className="text-[10px] text-[--text-tertiary]">Tokens</p>
                        </div>
                        <div className="p-3 rounded-lg bg-[--bg-elevated] text-center">
                          <ImageIcon className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                          <p className="text-lg font-bold text-[--text-primary]">{apiUsage.summary.totalImages}</p>
                          <p className="text-[10px] text-[--text-tertiary]">Images</p>
                        </div>
                        <div className="p-3 rounded-lg bg-[--bg-elevated] text-center">
                          <BarChart3 className="w-4 h-4 text-cyan-500 mx-auto mb-1" />
                          <p className="text-lg font-bold text-[--text-primary]">
                            {getCurrencySymbol()}{apiUsage.summary.costs?.[currency] || formatCost(apiUsage.summary.totalCostCents).slice(1)}
                          </p>
                          <p className="text-[10px] text-[--text-tertiary]">Est. Cost</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowApiUsageDetails(true)}
                        className="w-full flex items-center justify-between p-3 rounded-lg bg-[--bg-elevated] border border-[--border] hover:border-[--arcane-purple]/50 transition-colors group text-sm"
                      >
                        <span className="text-[--text-secondary] group-hover:text-[--text-primary]">View Detailed Breakdown</span>
                        <ChevronRight className="w-4 h-4 text-[--text-tertiary] group-hover:text-[--arcane-purple]" />
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-[--text-tertiary] text-center py-4">
                      No usage data yet. Start using AI features to track usage.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 3: YOUR CONTENT
            ═══════════════════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[--text-primary]">Your Content</h2>
              <p className="text-sm text-[--text-tertiary]">Data, storage, and sharing</p>
            </div>
          </div>

          <div className="card p-5 space-y-5">
            {/* Content Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'Campaigns', value: stats.campaigns, icon: Map },
                { label: 'Characters', value: stats.characters, icon: User },
                { label: 'Sessions', value: stats.sessions, icon: BookOpen },
                { label: 'One-Shots', value: stats.oneshots, icon: Scroll },
              ].map((stat) => (
                <div key={stat.label} className="p-3 rounded-lg bg-[--bg-elevated] text-center">
                  <stat.icon className="w-4 h-4 mx-auto mb-1 text-[--text-tertiary]" />
                  <p className="text-xl font-bold text-[--text-primary]">
                    {loadingStats ? '-' : stat.value}
                  </p>
                  <p className="text-[10px] text-[--text-tertiary]">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Shared Links Summary with Live Badge */}
            <Link
              href="/settings/shares"
              className="flex items-center justify-between p-4 rounded-xl bg-[--bg-elevated] border border-[--border] hover:border-[--arcane-purple]/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Share2 className="w-5 h-5 text-pink-400" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-[--text-primary]">Shared Links</p>
                    {sharesSummary && sharesSummary.viewing_now > 0 && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 text-xs">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        {sharesSummary.viewing_now} viewing
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[--text-tertiary]">
                    {sharesSummary
                      ? `${sharesSummary.active_shares} active links, ${sharesSummary.total_views} total views`
                      : 'Manage and track your shared content'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[--text-tertiary] group-hover:text-[--arcane-purple]" />
            </Link>

            {/* Export Data */}
            <button
              className="w-full flex items-center justify-between p-4 rounded-xl bg-[--bg-elevated] border border-[--border] hover:border-[--arcane-purple]/50 transition-colors group"
              onClick={handleExportData}
              disabled={exporting}
            >
              <div className="flex items-center gap-3">
                <Download className="w-5 h-5 text-[--text-secondary] group-hover:text-[--arcane-purple]" />
                <div className="text-left">
                  <p className="font-medium text-[--text-primary]">Export All Data</p>
                  <p className="text-xs text-[--text-tertiary]">Download everything as JSON</p>
                </div>
              </div>
              {exporting ? (
                <Loader2 className="w-5 h-5 animate-spin text-[--arcane-purple]" />
              ) : (
                <ChevronRight className="w-5 h-5 text-[--text-tertiary] group-hover:text-[--arcane-purple]" />
              )}
            </button>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 4: APP INFO
            ═══════════════════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Info className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[--text-primary]">App Info</h2>
              <p className="text-sm text-[--text-tertiary]">Help, shortcuts, and about</p>
            </div>
          </div>

          <div className="card p-5 space-y-4">
            {/* Keyboard Shortcuts */}
            <button
              className="w-full flex items-center justify-between p-4 rounded-xl bg-[--bg-elevated] border border-[--border] hover:border-[--arcane-purple]/50 transition-colors group"
              onClick={() => setShowKeyboardShortcuts(true)}
            >
              <div className="flex items-center gap-3">
                <Keyboard className="w-5 h-5 text-[--text-secondary] group-hover:text-[--arcane-purple]" />
                <div className="text-left">
                  <p className="font-medium text-[--text-primary]">Keyboard Shortcuts</p>
                  <p className="text-xs text-[--text-tertiary]">Navigate faster with hotkeys</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[--text-tertiary] group-hover:text-[--arcane-purple]" />
            </button>

            {/* About */}
            <div className="p-4 rounded-xl bg-[--bg-elevated] border border-[--border]">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-[--text-primary]">Multiloop</p>
                  <p className="text-xs text-[--text-tertiary]">TTRPG Campaign Manager</p>
                </div>
                <span className="font-mono text-sm text-[--arcane-gold] bg-[--arcane-gold]/10 px-2 py-1 rounded">
                  v{APP_VERSION}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  onClick={() => setShowWhatsNew(true)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-[--arcane-purple]/20 text-[--arcane-purple] hover:bg-[--arcane-purple]/30 transition-colors"
                >
                  What&apos;s New
                </button>
                <a
                  href="https://github.com/bingobangobongo929/dnd-campaign-manager/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-white/5 text-[--text-secondary] hover:text-[--text-primary] hover:bg-white/10 transition-colors"
                >
                  <Github className="w-3 h-3" />
                  Report Bug
                </a>
                <a
                  href="https://github.com/bingobangobongo929/dnd-campaign-manager/discussions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-white/5 text-[--text-secondary] hover:text-[--text-primary] hover:bg-white/10 transition-colors"
                >
                  <MessageSquare className="w-3 h-3" />
                  Feedback
                </a>
              </div>

              <p className="text-xs text-[--text-tertiary] border-t border-[--border] pt-3">
                Built with Next.js, Supabase, and AI.
              </p>
            </div>

            {/* Danger Zone */}
            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <div>
                  <p className="font-medium text-red-400">Danger Zone</p>
                  <p className="text-xs text-red-400/70">Irreversible actions</p>
                </div>
              </div>
              <button
                className="btn btn-secondary text-red-400 border-red-500/30 hover:bg-red-500/10"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4" />
                Delete All Data
              </button>
            </div>
          </div>
        </section>

        {/* Legal Footer */}
        <LegalFooter className="mt-12" />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MODALS
          ═══════════════════════════════════════════════════════════════════ */}

      {/* Keyboard Shortcuts Modal */}
      <Modal
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
        title="Keyboard Shortcuts"
        description="Navigate faster with these hotkeys"
      >
        <div className="space-y-2">
          {KEYBOARD_SHORTCUTS.map((shortcut, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[--bg-elevated]">
              <span className="text-[--text-secondary]">{shortcut.description}</span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, j) => (
                  <span key={j}>
                    <kbd className="px-2 py-1 text-xs font-mono bg-[--bg-surface] border border-[--border] rounded">
                      {key}
                    </kbd>
                    {j < shortcut.keys.length - 1 && <span className="text-[--text-tertiary] mx-1">+</span>}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* What's New Modal */}
      <Modal
        isOpen={showWhatsNew}
        onClose={() => setShowWhatsNew(false)}
        title="What's New"
        description={`${APP_BUILD} Update`}
      >
        <div className="space-y-3">
          {WHATS_NEW.map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[--bg-elevated]">
              <Sparkles className="w-4 h-4 text-[--arcane-purple] mt-0.5 flex-shrink-0" />
              <span className="text-[--text-secondary] text-sm">{item}</span>
            </div>
          ))}
          <p className="text-xs text-[--text-tertiary] text-center pt-2">
            More updates coming soon!
          </p>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false)
          setDeleteConfirmText('')
        }}
        title="Delete All Data?"
        description="This action cannot be undone"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
            <p className="text-sm text-red-400 mb-3">
              This will permanently delete:
            </p>
            <ul className="text-sm text-red-400/80 space-y-1">
              <li>• {stats.campaigns} campaigns and their NPCs</li>
              <li>• {stats.characters} characters</li>
              <li>• {stats.sessions} session notes</li>
              <li>• {stats.oneshots} one-shots</li>
            </ul>
          </div>

          <div>
            <label className="text-sm text-[--text-secondary] block mb-2">
              Type <span className="font-mono font-bold text-red-400">DELETE</span> to confirm:
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full px-3 py-2 bg-[--bg-elevated] border border-[--border] rounded-lg text-[--text-primary] focus:outline-none focus:border-red-500"
              placeholder="Type DELETE"
            />
          </div>

          <div className="flex gap-3">
            <button
              className="btn btn-secondary flex-1"
              onClick={() => {
                setShowDeleteConfirm(false)
                setDeleteConfirmText('')
              }}
            >
              Cancel
            </button>
            <button
              className="btn flex-1 bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleDeleteAll}
              disabled={deleteConfirmText !== 'DELETE'}
            >
              <Trash2 className="w-4 h-4" />
              Delete Everything
            </button>
          </div>
        </div>
      </Modal>

      {/* API Usage Details Modal */}
      <Modal
        isOpen={showApiUsageDetails}
        onClose={() => setShowApiUsageDetails(false)}
        title="API Usage Breakdown"
        description={`${usagePeriod === 'week' ? 'This week' : usagePeriod === 'month' ? 'This month' : 'All time'}`}
        size="lg"
      >
        {apiUsage && (
          <div className="space-y-6">
            {/* By Provider */}
            <div>
              <h3 className="text-sm font-semibold text-[--text-primary] mb-3">By Provider</h3>
              <div className="space-y-2">
                {Object.entries(apiUsage.byProvider).map(([provider, data]) => {
                  const providerInfo = AI_PROVIDERS[provider as AIProvider]
                  const ProviderIcon = providerInfo ? getProviderIcon(providerInfo.icon) : Bot
                  return (
                    <div
                      key={provider}
                      className="flex items-center justify-between p-3 rounded-lg bg-[--bg-elevated]"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          provider === 'anthropic' ? 'bg-orange-500/20' : 'bg-blue-500/20'
                        }`}>
                          <ProviderIcon className={`w-4 h-4 ${
                            provider === 'anthropic' ? 'text-orange-500' : 'text-blue-500'
                          }`} />
                        </div>
                        <span className="text-[--text-primary] font-medium">
                          {providerInfo?.name || provider}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-[--text-tertiary]">{data.requests} requests</span>
                        <span className="text-[--text-tertiary]">{(data.tokens / 1000).toFixed(1)}K tokens</span>
                        <span className="text-emerald-400 font-medium">{formatCost(data.cost)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* By Operation */}
            <div>
              <h3 className="text-sm font-semibold text-[--text-primary] mb-3">By Operation</h3>
              <div className="space-y-2">
                {Object.entries(apiUsage.byOperation).map(([operation, data]) => {
                  const opLabels: Record<string, string> = {
                    'analyze': 'Campaign Analysis',
                    'analyze_campaign': 'Campaign Analysis',
                    'analyze_character': 'Character Analysis',
                    'parse': 'Document Parsing',
                    'image_generation': 'Image Generation',
                    'generate_image': 'Image Generation',
                    'generate_prompt': 'Prompt Generation',
                    'generate_timeline': 'Timeline Generation',
                  }
                  return (
                    <div
                      key={operation}
                      className="flex items-center justify-between p-3 rounded-lg bg-[--bg-elevated]"
                    >
                      <span className="text-[--text-primary]">{opLabels[operation] || operation}</span>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-[--text-tertiary]">{data.requests} requests</span>
                        <span className="text-emerald-400 font-medium">{formatCost(data.cost)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Note */}
            <p className="text-xs text-[--text-tertiary] text-center pt-2 border-t border-[--border]">
              Cost estimates are approximate, converted from USD at current rates.
              Actual costs may vary based on your billing arrangements.
            </p>
          </div>
        )}
      </Modal>
    </>
  )
}
