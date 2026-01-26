'use client'

import { useState, useEffect } from 'react'
import {
  Megaphone,
  Loader2,
  Shield,
  Eye,
  EyeOff,
  Save,
  AlertTriangle,
  Info,
  CheckCircle,
  X
} from 'lucide-react'
import { useSupabase, useUserSettings } from '@/hooks'
import { isSuperAdmin } from '@/lib/admin'
import { toast } from 'sonner'
import { cn, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui'

type AnnouncementType = 'info' | 'warning' | 'success'

interface AnnouncementSettings {
  announcement_active: boolean
  announcement_text: string
  announcement_type: AnnouncementType
  announcement_link?: string
  announcement_link_text?: string
  announcement_updated_at?: string
  announcement_updated_by?: string
}

export default function AdminAnnouncementsPage() {
  const supabase = useSupabase()
  const { settings: userSettings } = useUserSettings()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<AnnouncementSettings>({
    announcement_active: false,
    announcement_text: '',
    announcement_type: 'info',
    announcement_link: '',
    announcement_link_text: '',
  })

  const isSuperAdminUser = isSuperAdmin(userSettings?.role || 'user')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('id', 'global')
        .single()

      if (error && error.code !== 'PGRST116') throw error

      if (data) {
        setSettings({
          announcement_active: data.announcement_active || false,
          announcement_text: data.announcement_text || '',
          announcement_type: data.announcement_type || 'info',
          announcement_link: data.announcement_link || '',
          announcement_link_text: data.announcement_link_text || '',
          announcement_updated_at: data.announcement_updated_at,
          announcement_updated_by: data.announcement_updated_by,
        })
      }
    } catch (error) {
      console.error('Failed to load announcement settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const saveAnnouncement = async () => {
    if (!isSuperAdminUser) {
      toast.error('Only super admins can change announcements')
      return
    }

    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('app_settings')
        .upsert({
          id: 'global',
          announcement_active: settings.announcement_active,
          announcement_text: settings.announcement_text,
          announcement_type: settings.announcement_type,
          announcement_link: settings.announcement_link || null,
          announcement_link_text: settings.announcement_link_text || null,
          announcement_updated_at: new Date().toISOString(),
          announcement_updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error

      // Update local state with new timestamps
      setSettings(prev => ({
        ...prev,
        announcement_updated_at: new Date().toISOString(),
        announcement_updated_by: user?.id || undefined,
      }))

      // Log admin activity
      await supabase.from('admin_activity_log').insert({
        admin_id: user?.id,
        action: 'update_announcement',
        details: {
          active: settings.announcement_active,
          type: settings.announcement_type,
          text_preview: settings.announcement_text.slice(0, 50),
        },
      })

      toast.success('Announcement saved')
    } catch (error) {
      console.error('Failed to save announcement:', error)
      toast.error('Failed to save announcement')
    } finally {
      setSaving(false)
    }
  }

  const clearAnnouncement = async () => {
    setSettings(prev => ({
      ...prev,
      announcement_active: false,
      announcement_text: '',
      announcement_link: '',
      announcement_link_text: '',
    }))
  }

  const getTypeIcon = (type: AnnouncementType) => {
    switch (type) {
      case 'info': return Info
      case 'warning': return AlertTriangle
      case 'success': return CheckCircle
    }
  }

  const getTypeColors = (type: AnnouncementType) => {
    switch (type) {
      case 'info': return {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
        text: 'text-blue-400',
        icon: 'text-blue-400',
      }
      case 'warning': return {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        text: 'text-amber-400',
        icon: 'text-amber-400',
      }
      case 'success': return {
        bg: 'bg-green-500/10',
        border: 'border-green-500/20',
        text: 'text-green-400',
        icon: 'text-green-400',
      }
    }
  }

  if (!isSuperAdminUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400">Super admin access required</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  const Icon = getTypeIcon(settings.announcement_type)
  const colors = getTypeColors(settings.announcement_type)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-purple-500/10">
          <Megaphone className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">Site Announcements</h1>
          <p className="text-sm text-gray-400">Display important messages to all users</p>
        </div>
      </div>

      {/* Preview Banner */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">Preview</label>
        {settings.announcement_text ? (
          <div className={cn("flex items-center gap-3 p-4 rounded-xl border", colors.bg, colors.border)}>
            <Icon className={cn("w-5 h-5 flex-shrink-0", colors.icon)} />
            <p className={cn("text-sm flex-1", colors.text)}>
              {settings.announcement_text}
              {settings.announcement_link && settings.announcement_link_text && (
                <a href={settings.announcement_link} className="ml-2 underline hover:no-underline">
                  {settings.announcement_link_text}
                </a>
              )}
            </p>
            {!settings.announcement_active && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-500/20 text-gray-400">
                Hidden
              </span>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-white/[0.08] text-center text-gray-500 text-sm">
            No announcement text entered
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="bg-[#1a1a24] rounded-xl border border-white/[0.06] p-6 space-y-6">
        {/* Active Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.announcement_active ? (
              <Eye className="w-5 h-5 text-green-400" />
            ) : (
              <EyeOff className="w-5 h-5 text-gray-500" />
            )}
            <div>
              <p className="text-white font-medium">Announcement Status</p>
              <p className="text-sm text-gray-400">
                {settings.announcement_active ? 'Visible to all users' : 'Hidden from users'}
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.announcement_active}
            onClick={() => setSettings(prev => ({ ...prev, announcement_active: !prev.announcement_active }))}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1a1a24]",
              settings.announcement_active
                ? "bg-green-600 focus:ring-green-500"
                : "bg-gray-700 focus:ring-gray-500"
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                settings.announcement_active ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </div>

        {/* Type Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Announcement Type</label>
          <div className="flex gap-3">
            {(['info', 'warning', 'success'] as AnnouncementType[]).map((type) => {
              const TypeIcon = getTypeIcon(type)
              const typeColors = getTypeColors(type)
              return (
                <button
                  key={type}
                  onClick={() => setSettings(prev => ({ ...prev, announcement_type: type }))}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all",
                    settings.announcement_type === type
                      ? cn(typeColors.bg, typeColors.border, typeColors.text)
                      : "bg-white/[0.02] border-white/[0.06] text-gray-400 hover:bg-white/[0.04]"
                  )}
                >
                  <TypeIcon className="w-4 h-4" />
                  <span className="capitalize">{type}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Text Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Announcement Message</label>
          <textarea
            value={settings.announcement_text}
            onChange={(e) => setSettings(prev => ({ ...prev, announcement_text: e.target.value }))}
            placeholder="Enter your announcement message..."
            rows={3}
            className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 resize-none"
          />
          <p className="text-xs text-gray-500">{settings.announcement_text.length} / 500 characters</p>
        </div>

        {/* Optional Link */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Link URL (optional)</label>
            <input
              type="url"
              value={settings.announcement_link}
              onChange={(e) => setSettings(prev => ({ ...prev, announcement_link: e.target.value }))}
              placeholder="https://..."
              className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Link Text (optional)</label>
            <input
              type="text"
              value={settings.announcement_link_text}
              onChange={(e) => setSettings(prev => ({ ...prev, announcement_link_text: e.target.value }))}
              placeholder="Learn more"
              className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
          <div className="text-sm text-gray-500">
            {settings.announcement_updated_at && (
              <span>Last updated: {formatDate(settings.announcement_updated_at)}</span>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={clearAnnouncement}
              disabled={saving || !settings.announcement_text}
            >
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>
            <Button
              onClick={saveAnnouncement}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Announcement
            </Button>
          </div>
        </div>
      </div>

      {/* Usage Tips */}
      <div className="bg-[#1a1a24] rounded-xl border border-white/[0.06] p-6">
        <h3 className="text-white font-medium mb-4">Usage Tips</h3>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <span><strong className="text-blue-400">Info:</strong> General updates, new features, or neutral messages</span>
          </li>
          <li className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <span><strong className="text-amber-400">Warning:</strong> Scheduled maintenance, important notices, or temporary issues</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
            <span><strong className="text-green-400">Success:</strong> Resolved issues, completed maintenance, or positive updates</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
