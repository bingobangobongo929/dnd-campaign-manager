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
  Loader2,
  Zap,
  Share2,
  Crown,
  Check,
  Info,
  Github,
  MessageSquare,
  Scroll,
  Map,
  BookOpen,
  Camera,
  X,
  Lightbulb,
  RefreshCw,
  Globe,
  Clock,
  Mail,
  Bell,
  Calendar,
  Users,
} from 'lucide-react'
import Image from 'next/image'
import { v4 as uuidv4 } from 'uuid'
import { toast } from 'sonner'
import { Modal, OnboardingTour, useResetTips, useToggleTips } from '@/components/ui'
import { AvatarCropModal } from '@/components/ui/avatar-crop-modal'
import { MobileLayout } from '@/components/mobile'
import { useSupabase, useUser, useIsMobile, useMembership } from '@/hooks'
import { useAppStore, CURRENCY_CONFIG, type Currency, useTierHasAI } from '@/store'
import { AI_PROVIDERS, AIProvider } from '@/lib/ai/config'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { LegalFooter } from '@/components/ui/legal-footer'
import { FounderBadge, UsageBar } from '@/components/membership'
import { TimezoneSelector } from '@/components/scheduling'
import { getUserTimezone, formatCurrentTime, getTimezoneAbbreviation } from '@/lib/timezone-utils'

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
    settings, setSettings,
  } = useAppStore()
  const tierHasAI = useTierHasAI()
  const { isFounder, founderGrantedAt, limits, usage, loading: membershipLoading } = useMembership()

  // Avatar upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarCropImage, setAvatarCropImage] = useState<string | null>(null)

  // Stats state
  const [stats, setStats] = useState({
    campaigns: 0,
    characters: 0, // Vault characters (user's main characters)
    sessions: 0,
    oneshots: 0,
  })
  const [loadingStats, setLoadingStats] = useState(true)


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
  const [showWhatsNew, setShowWhatsNew] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Expanded sections
  const [expandedProvider, setExpandedProvider] = useState<AIProvider | null>(null)

  // Onboarding/Tips state
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showTips, setShowTips] = useState(true)
  const resetTips = useResetTips()
  const toggleTips = useToggleTips()

  // Timezone state
  const [userTimezone, setUserTimezone] = useState(() => getUserTimezone())
  const [savingTimezone, setSavingTimezone] = useState(false)

  // Email notification preferences
  const [emailPrefs, setEmailPrefs] = useState({
    campaign_invites: true,
    session_reminders: true,
    character_claims: true,
    community_updates: false,
  })
  const [savingEmailPrefs, setSavingEmailPrefs] = useState(false)

  // Load user stats
  useEffect(() => {
    if (user) {
      loadStats()
      loadSharesSummary()
      loadUserSettings()
    }
  }, [user])

  const loadUserSettings = async () => {
    if (!user) return
    try {
      const { data } = await supabase
        .from('user_settings')
        .select('show_tips, timezone, email_prefs')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setShowTips(data.show_tips !== false)
        if (data.timezone) {
          setUserTimezone(data.timezone)
        }
        if (data.email_prefs) {
          setEmailPrefs({
            campaign_invites: data.email_prefs.campaign_invites !== false,
            session_reminders: data.email_prefs.session_reminders !== false,
            character_claims: data.email_prefs.character_claims !== false,
            community_updates: data.email_prefs.community_updates === true,
          })
        }
      }
    } catch {
      // Column might not exist yet
    }
  }

  const handleTimezoneChange = async (newTimezone: string) => {
    setUserTimezone(newTimezone)
    setSavingTimezone(true)
    try {
      const { error } = await supabase
        .from('user_settings')
        .update({ timezone: newTimezone })
        .eq('user_id', user!.id)

      if (error) throw error
      toast.success('Timezone updated')
    } catch (error) {
      console.error('Failed to save timezone:', error)
      toast.error('Failed to save timezone')
    } finally {
      setSavingTimezone(false)
    }
  }

  const handleToggleTips = async () => {
    const newValue = !showTips
    setShowTips(newValue)
    await toggleTips(newValue)
    toast.success(newValue ? 'Tips enabled' : 'Tips hidden')
  }

  const handleResetTips = async () => {
    await resetTips()
    toast.success('Tips reset - they will appear again as you navigate')
  }

  const handleRestartTour = () => {
    setShowOnboarding(true)
  }

  const handleEmailPrefChange = async (key: keyof typeof emailPrefs) => {
    const newPrefs = { ...emailPrefs, [key]: !emailPrefs[key] }
    setEmailPrefs(newPrefs)
    setSavingEmailPrefs(true)
    try {
      const { error } = await supabase
        .from('user_settings')
        .update({ email_prefs: newPrefs })
        .eq('user_id', user!.id)

      if (error) throw error
      toast.success('Email preferences updated')
    } catch (error) {
      console.error('Failed to save email preferences:', error)
      // Revert on error
      setEmailPrefs(emailPrefs)
      toast.error('Failed to save preferences')
    } finally {
      setSavingEmailPrefs(false)
    }
  }

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

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB')
      return
    }

    // Create object URL and open crop modal
    const imageUrl = URL.createObjectURL(file)
    setAvatarCropImage(imageUrl)
    e.target.value = ''
  }

  const handleAvatarCropSave = async (blob: Blob) => {
    if (!user) return

    setUploadingAvatar(true)
    try {
      // Delete old avatar if exists
      if (settings?.avatar_url) {
        const oldPath = settings.avatar_url.split('/avatars/')[1]
        if (oldPath) {
          await supabase.storage.from('avatars').remove([oldPath])
        }
      }

      // Upload new avatar (webp format from crop)
      const path = `${user.id}/${uuidv4()}.webp`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { contentType: 'image/webp' })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)

      // Update user settings
      const { error: updateError } = await supabase
        .from('user_settings')
        .update({ avatar_url: urlData.publicUrl })
        .eq('user_id', user.id)

      if (updateError) throw updateError

      // Update local state
      if (settings) {
        setSettings({ ...settings, avatar_url: urlData.publicUrl })
      }

      toast.success('Avatar updated')
    } catch (error) {
      console.error('Avatar upload failed:', error)
      toast.error('Failed to upload avatar')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleAvatarCropClose = () => {
    if (avatarCropImage) {
      URL.revokeObjectURL(avatarCropImage)
    }
    setAvatarCropImage(null)
  }

  const handleRemoveAvatar = async () => {
    if (!user || !settings?.avatar_url) return

    setUploadingAvatar(true)
    try {
      // Delete from storage
      const path = settings.avatar_url.split('/avatars/')[1]
      if (path) {
        await supabase.storage.from('avatars').remove([path])
      }

      // Update user settings
      await supabase
        .from('user_settings')
        .update({ avatar_url: null })
        .eq('user_id', user.id)

      // Update local state
      setSettings({ ...settings, avatar_url: null })
      toast.success('Avatar removed')
    } catch (error) {
      console.error('Remove avatar failed:', error)
      toast.error('Failed to remove avatar')
    } finally {
      setUploadingAvatar(false)
    }
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

              {isFounder && (
                <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                  <FounderBadge size="md" />
                  <div>
                    <p className="text-sm font-medium text-amber-400">Founder</p>
                    <p className="text-[10px] text-gray-500">Early supporter</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Preferences */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                <Globe className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-base font-semibold text-white">Preferences</h2>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wide">Timezone</label>
                  <p className="text-xs text-gray-500 mt-0.5">For session time conversion</p>
                </div>
                {savingTimezone && (
                  <Loader2 className="w-4 h-4 text-[--arcane-purple] animate-spin" />
                )}
              </div>
              <TimezoneSelector
                value={userTimezone}
                onChange={handleTimezoneChange}
                label=""
                showCurrentTime={true}
              />
            </div>
          </section>

          {/* AI Settings - only show for users who can access AI */}
          {tierHasAI && (
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
                      aiEnabled ? 'bg-purple-600' : 'bg-gray-600'
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

                    {/* Currency in AI section */}
                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/[0.06]">
                      <div>
                        <span className="text-xs text-gray-500">Cost Display</span>
                      </div>
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
                )}

              </div>
            </section>
          )}

          {/* Data Management */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
                <Database className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-base font-semibold text-white">Data Management</h2>
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

              <Link
                href="/recycle-bin"
                className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] active:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Trash2 className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-white">Recycle Bin</p>
                    <p className="text-xs text-gray-500">Restore deleted content</p>
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

              {/* Danger Zone */}
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
            </div>
          </section>

          {/* About */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <Info className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-base font-semibold text-white">About</h2>
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
              </div>
            </div>
          </section>

          {/* Sign Out */}
          <section className="space-y-3">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-red-400 active:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sign Out</span>
            </button>
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
            {/* Avatar Upload */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-[--bg-elevated] border border-[--border]">
              <div className="relative">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-[--bg-secondary] flex items-center justify-center">
                  {settings?.avatar_url ? (
                    <Image
                      src={settings.avatar_url}
                      alt="Your avatar"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-semibold text-[--text-tertiary]">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  )}
                </div>
                {uploadingAvatar && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <label className="text-xs text-[--text-tertiary] uppercase tracking-wide">Profile Picture</label>
                <p className="text-sm text-[--text-secondary] mt-0.5">1:1 square image, max 5MB</p>
                <div className="flex gap-2 mt-2">
                  <label className="btn btn-secondary text-sm cursor-pointer">
                    <Camera className="w-4 h-4" />
                    {settings?.avatar_url ? 'Change' : 'Upload'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarSelect}
                      className="hidden"
                      disabled={uploadingAvatar}
                    />
                  </label>
                  {settings?.avatar_url && (
                    <button
                      onClick={handleRemoveAvatar}
                      disabled={uploadingAvatar}
                      className="btn btn-secondary text-sm text-red-400 hover:bg-red-500/10"
                    >
                      <X className="w-4 h-4" />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

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

            {/* Founder Status */}
            {isFounder && (
              <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-3">
                  <FounderBadge size="lg" />
                  <div>
                    <p className="font-medium text-amber-400">Founder</p>
                    <p className="text-xs text-[--text-tertiary]">
                      Early supporter since {founderGrantedAt ? formatDate(founderGrantedAt) : 'the beginning'}
                    </p>
                  </div>
                </div>
              </div>
            )}

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
            SECTION: PREFERENCES
            ═══════════════════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[--text-primary]">Preferences</h2>
              <p className="text-sm text-[--text-tertiary]">Localization and display settings</p>
            </div>
          </div>

          <div className="card p-5 space-y-5">
            {/* Timezone Setting */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs text-[--text-tertiary] uppercase tracking-wide">Your Timezone</label>
                  <p className="text-xs text-[--text-tertiary] mt-0.5">
                    Session times will be converted to your local time
                  </p>
                </div>
                {savingTimezone && (
                  <Loader2 className="w-4 h-4 text-[--arcane-purple] animate-spin" />
                )}
              </div>
              <TimezoneSelector
                value={userTimezone}
                onChange={handleTimezoneChange}
                label=""
                showCurrentTime={true}
              />
              <div className="flex items-center gap-2 text-xs text-[--text-tertiary]">
                <Clock className="w-3 h-3" />
                <span>Current time: {formatCurrentTime(userTimezone)} {getTimezoneAbbreviation(userTimezone)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION: AI & INTELLIGENCE - only show for users who can access AI
            ═══════════════════════════════════════════════════════════════════ */}
        {tierHasAI && (
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
                  aiEnabled ? 'bg-purple-600' : 'bg-gray-600'
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

                {/* Currency Preference - controls AI cost display */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-[--bg-elevated] border border-[--border]">
                  <div>
                    <label className="text-xs text-[--text-tertiary] uppercase tracking-wide">Cost Display Currency</label>
                    <p className="text-xs text-[--text-tertiary] mt-0.5">For AI cost estimates</p>
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
              </>
            )}
          </div>
        </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION: DATA MANAGEMENT
            ═══════════════════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[--text-primary]">Data Management</h2>
              <p className="text-sm text-[--text-tertiary]">Content, storage, and sharing</p>
            </div>
          </div>

          <div className="card p-5 space-y-5">
            {/* Usage Limits */}
            {!membershipLoading && (
              <div className="p-4 rounded-xl bg-[--bg-elevated] border border-[--border] space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-[--text-primary]">Usage</p>
                  {isFounder && (
                    <span className="text-xs text-amber-400 flex items-center gap-1">
                      <FounderBadge size="sm" />
                      Expanded limits
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <UsageBar label="Campaigns" used={usage.campaigns} limit={limits.campaigns} />
                  <UsageBar label="One-Shots" used={usage.oneshots} limit={limits.oneshots} />
                  <UsageBar label="Characters" used={usage.vaultCharacters} limit={limits.vaultCharacters} />
                  <UsageBar label="Storage" used={usage.storageMB} limit={limits.storageMB} unit="MB" />
                </div>
              </div>
            )}

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

            {/* Recycle Bin */}
            <Link
              href="/recycle-bin"
              className="flex items-center justify-between p-4 rounded-xl bg-[--bg-elevated] border border-[--border] hover:border-[--arcane-purple]/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-[--text-primary]">Recycle Bin</p>
                  <p className="text-xs text-[--text-tertiary]">Restore deleted content within 30 days</p>
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

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION: PREFERENCES
            ═══════════════════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[--text-primary]">Preferences</h2>
              <p className="text-sm text-[--text-tertiary]">Tips, shortcuts, and guidance</p>
            </div>
          </div>

          <div className="card p-5 space-y-4">
            {/* Contextual Tips Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-[--bg-elevated] border border-[--border]">
              <div className="flex-1">
                <p className="font-medium text-[--text-primary]">Show Contextual Tips</p>
                <p className="text-xs text-[--text-tertiary] mt-0.5">
                  Helpful hints that appear near UI elements
                </p>
              </div>
              <button
                onClick={handleToggleTips}
                className={`relative w-14 h-8 rounded-full transition-colors flex-shrink-0 ml-4 ${
                  showTips ? 'bg-purple-600' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${
                    showTips ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

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

            {/* Restart Tour Button */}
            <button
              onClick={handleRestartTour}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-[--bg-elevated] border border-[--border] hover:border-[--arcane-purple]/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-[--text-secondary] group-hover:text-[--arcane-purple]" />
                <div className="text-left">
                  <p className="font-medium text-[--text-primary]">Restart Welcome Tour</p>
                  <p className="text-xs text-[--text-tertiary]">See the app introduction again</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[--text-tertiary] group-hover:text-[--arcane-purple]" />
            </button>

            {/* Reset Tips Button */}
            <button
              onClick={handleResetTips}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-[--bg-elevated] border border-[--border] hover:border-[--arcane-purple]/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Lightbulb className="w-5 h-5 text-[--text-secondary] group-hover:text-[--arcane-purple]" />
                <div className="text-left">
                  <p className="font-medium text-[--text-primary]">Reset All Tips</p>
                  <p className="text-xs text-[--text-tertiary]">Show dismissed tips again</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[--text-tertiary] group-hover:text-[--arcane-purple]" />
            </button>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION: NOTIFICATIONS
            ═══════════════════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[--text-primary]">Email Notifications</h2>
              <p className="text-sm text-[--text-tertiary]">Choose what emails you receive</p>
            </div>
          </div>

          <div className="card p-5 space-y-1">
            {/* Campaign Invites */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-[--bg-elevated] border border-[--border]">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-[--text-secondary]" />
                <div>
                  <p className="font-medium text-[--text-primary]">Campaign Invites</p>
                  <p className="text-xs text-[--text-tertiary]">When you're invited to join a campaign</p>
                </div>
              </div>
              <button
                onClick={() => handleEmailPrefChange('campaign_invites')}
                disabled={savingEmailPrefs}
                className={`relative w-14 h-8 rounded-full transition-colors flex-shrink-0 ml-4 ${
                  emailPrefs.campaign_invites ? 'bg-purple-600' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${
                    emailPrefs.campaign_invites ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Session Reminders */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-[--bg-elevated] border border-[--border]">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-[--text-secondary]" />
                <div>
                  <p className="font-medium text-[--text-primary]">Session Reminders</p>
                  <p className="text-xs text-[--text-tertiary]">Reminders before upcoming sessions</p>
                </div>
              </div>
              <button
                onClick={() => handleEmailPrefChange('session_reminders')}
                disabled={savingEmailPrefs}
                className={`relative w-14 h-8 rounded-full transition-colors flex-shrink-0 ml-4 ${
                  emailPrefs.session_reminders ? 'bg-purple-600' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${
                    emailPrefs.session_reminders ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Character Claims */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-[--bg-elevated] border border-[--border]">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-[--text-secondary]" />
                <div>
                  <p className="font-medium text-[--text-primary]">Character Claims</p>
                  <p className="text-xs text-[--text-tertiary]">When a character is assigned to you</p>
                </div>
              </div>
              <button
                onClick={() => handleEmailPrefChange('character_claims')}
                disabled={savingEmailPrefs}
                className={`relative w-14 h-8 rounded-full transition-colors flex-shrink-0 ml-4 ${
                  emailPrefs.character_claims ? 'bg-purple-600' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${
                    emailPrefs.character_claims ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Community Updates */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-[--bg-elevated] border border-[--border]">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-[--text-secondary]" />
                <div>
                  <p className="font-medium text-[--text-primary]">Community Updates</p>
                  <p className="text-xs text-[--text-tertiary]">New features and occasional updates</p>
                </div>
              </div>
              <button
                onClick={() => handleEmailPrefChange('community_updates')}
                disabled={savingEmailPrefs}
                className={`relative w-14 h-8 rounded-full transition-colors flex-shrink-0 ml-4 ${
                  emailPrefs.community_updates ? 'bg-purple-600' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${
                    emailPrefs.community_updates ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION: ABOUT
            ═══════════════════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Info className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[--text-primary]">About</h2>
              <p className="text-sm text-[--text-tertiary]">Version info and feedback</p>
            </div>
          </div>

          <div className="card p-5 space-y-4">
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

      {/* Avatar Crop Modal */}
      <AvatarCropModal
        isOpen={!!avatarCropImage}
        imageSrc={avatarCropImage || ''}
        onClose={handleAvatarCropClose}
        onSave={handleAvatarCropSave}
      />

      {/* Onboarding Tour */}
      <OnboardingTour
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
    </>
  )
}
