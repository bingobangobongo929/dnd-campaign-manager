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
  HardDrive,
  Keyboard,
  Shield,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { Modal } from '@/components/ui'
import { useSupabase, useUser } from '@/hooks'
import { useAppStore } from '@/store'
import { AI_PROVIDERS, AIProvider } from '@/lib/ai/config'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()
  const { aiEnabled, setAIEnabled, aiProvider, setAIProvider } = useAppStore()

  // Stats state
  const [stats, setStats] = useState({
    campaigns: 0,
    characters: 0,
    sessions: 0,
    oneshots: 0,
  })
  const [loadingStats, setLoadingStats] = useState(true)

  // Modal states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Load user stats
  useEffect(() => {
    if (user) {
      loadStats()
    }
  }, [user])

  const loadStats = async () => {
    setLoadingStats(true)
    const [campaignsRes, charsRes, sessionsRes, oneshotsRes] = await Promise.all([
      supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
      supabase.from('characters').select('id', { count: 'exact', head: true }),
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleExportData = async () => {
    setExporting(true)
    try {
      // Fetch all user data
      const [campaignsRes, oneshotsRes] = await Promise.all([
        supabase.from('campaigns').select('*, characters(*), sessions(*), timeline_events(*)').eq('user_id', user!.id),
        supabase.from('oneshots').select('*, oneshot_runs(*)').eq('user_id', user!.id),
      ])

      const exportData = {
        exportDate: new Date().toISOString(),
        version: '1.0.0',
        user: { email: user?.email },
        campaigns: campaignsRes.data || [],
        oneshots: oneshotsRes.data || [],
      }

      // Download as JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `campaign-manager-export-${new Date().toISOString().split('T')[0]}.json`
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

  const KEYBOARD_SHORTCUTS = [
    { keys: ['Ctrl/Cmd', 'K'], description: 'Quick search' },
    { keys: ['Ctrl/Cmd', 'S'], description: 'Save (auto-saves anyway)' },
    { keys: ['Esc'], description: 'Close modal / Cancel' },
    { keys: ['Tab'], description: 'Navigate between fields' },
    { keys: ['Enter'], description: 'Confirm / Submit' },
  ]

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        {/* Page Header */}
        <div className="page-header">
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your account and preferences</p>
        </div>

        <div className="space-y-6">
          {/* Account Section */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[--arcane-purple] to-[--arcane-purple-dim] flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[--text-primary]">Account</h2>
                <p className="text-sm text-[--text-tertiary]">Your profile and session</p>
              </div>
            </div>

            <div className="space-y-4">
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

              <button
                className="btn btn-secondary w-full justify-center text-[--arcane-ember] hover:bg-red-500/10"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>

          {/* AI Assistant Section */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[--arcane-purple] to-blue-600 flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[--text-primary]">AI Assistant</h2>
                <p className="text-sm text-[--text-tertiary]">Configure AI-powered features</p>
              </div>
            </div>

            {/* Master AI Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-[--bg-elevated] border border-[--border] mb-4">
              <div className="flex-1">
                <p className="font-medium text-[--text-primary]">Enable AI Features</p>
                <p className="text-xs text-[--text-tertiary] mt-0.5">
                  {aiEnabled
                    ? 'Campaign Intelligence, image prompts, and AI analysis are active'
                    : 'All AI features are hidden throughout the app'}
                </p>
              </div>
              <button
                onClick={() => setAIEnabled(!aiEnabled)}
                className={`relative w-14 h-8 rounded-full transition-colors flex-shrink-0 ml-4 ${
                  aiEnabled ? 'bg-[--arcane-purple]' : 'bg-[--bg-surface] border border-[--border]'
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
              <div className="space-y-3">
                <p className="text-sm text-[--text-secondary]">Select your preferred AI model</p>
                {(Object.keys(AI_PROVIDERS) as AIProvider[]).map((provider) => {
                  const info = AI_PROVIDERS[provider]
                  const isSelected = aiProvider === provider
                  return (
                    <button
                      key={provider}
                      onClick={() => setAIProvider(provider)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? 'border-[--arcane-purple] bg-[--arcane-purple]/10'
                          : 'border-[--border] hover:border-[--arcane-purple]/50'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          provider === 'anthropic' ? 'bg-orange-500/20' : 'bg-blue-500/20'
                        }`}
                      >
                        <Sparkles
                          className={`w-5 h-5 ${provider === 'anthropic' ? 'text-orange-500' : 'text-blue-500'}`}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-[--text-primary]">{info.name}</p>
                        <p className="text-xs text-[--text-tertiary]">{info.description}</p>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-[--arcane-purple] flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Data & Storage Section */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[--text-primary]">Data & Storage</h2>
                <p className="text-sm text-[--text-tertiary]">Your campaigns and content</p>
              </div>
            </div>

            {/* Usage Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Campaigns', value: stats.campaigns, icon: HardDrive },
                { label: 'Characters', value: stats.characters, icon: User },
                { label: 'Sessions', value: stats.sessions, icon: Database },
                { label: 'One-Shots', value: stats.oneshots, icon: Sparkles },
              ].map((stat) => (
                <div key={stat.label} className="p-4 rounded-xl bg-[--bg-elevated] border border-[--border] text-center">
                  <stat.icon className="w-5 h-5 mx-auto mb-2 text-[--text-tertiary]" />
                  <p className="text-2xl font-bold text-[--text-primary]">
                    {loadingStats ? '-' : stat.value}
                  </p>
                  <p className="text-xs text-[--text-tertiary]">{stat.label}</p>
                </div>
              ))}
            </div>

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
                  <p className="text-xs text-[--text-tertiary]">Download your campaigns as JSON</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[--text-tertiary] group-hover:text-[--arcane-purple]" />
            </button>
          </div>

          {/* Quick Reference Section */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <Keyboard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[--text-primary]">Quick Reference</h2>
                <p className="text-sm text-[--text-tertiary]">Keyboard shortcuts and tips</p>
              </div>
            </div>

            <button
              className="w-full flex items-center justify-between p-4 rounded-xl bg-[--bg-elevated] border border-[--border] hover:border-[--arcane-purple]/50 transition-colors group"
              onClick={() => setShowKeyboardShortcuts(true)}
            >
              <div className="flex items-center gap-3">
                <Keyboard className="w-5 h-5 text-[--text-secondary] group-hover:text-[--arcane-purple]" />
                <div className="text-left">
                  <p className="font-medium text-[--text-primary]">Keyboard Shortcuts</p>
                  <p className="text-xs text-[--text-tertiary]">View all available shortcuts</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[--text-tertiary] group-hover:text-[--arcane-purple]" />
            </button>
          </div>

          {/* About Section */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-[--text-primary] mb-4">About</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[--text-secondary]">Version</span>
                <span className="font-mono text-sm text-[--arcane-gold]">1.0.0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[--text-secondary]">Built with</span>
                <span className="text-sm text-[--text-primary]">Next.js, Supabase, AI</span>
              </div>
              <div className="pt-3 border-t border-[--border]">
                <p className="text-sm text-[--text-tertiary] text-center">
                  Made with love for dungeon masters everywhere
                </p>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="card p-6 border-red-500/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
            </div>
            <p className="text-sm text-[--text-tertiary] mb-4">
              Irreversible actions. Please be careful.
            </p>
            <button
              className="btn btn-secondary text-red-400 border-red-500/30 hover:bg-red-500/10"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="w-4 h-4" />
              Delete All Data
            </button>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      <Modal
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
        title="Keyboard Shortcuts"
        description="Speed up your workflow with these shortcuts"
      >
        <div className="space-y-3">
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete All Data?"
        description="This action cannot be undone"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
            <p className="text-sm text-red-400">
              This will permanently delete all your campaigns, characters, sessions, and one-shots.
              This action cannot be reversed.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="btn btn-secondary flex-1" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </button>
            <button
              className="btn flex-1 bg-red-500 hover:bg-red-600 text-white"
              onClick={async () => {
                // Delete all user data
                if (user) {
                  await supabase.from('oneshots').delete().eq('user_id', user.id)
                  await supabase.from('campaigns').delete().eq('user_id', user.id)
                }
                setShowDeleteConfirm(false)
                loadStats()
              }}
            >
              <Trash2 className="w-4 h-4" />
              Delete Everything
            </button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}
