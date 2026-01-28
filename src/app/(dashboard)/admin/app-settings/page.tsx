'use client'

import { useState, useEffect } from 'react'
import { Settings, DollarSign, Sparkles, Shield, Loader2, AlertTriangle, TrendingUp, ScrollText } from 'lucide-react'
import { useSupabase, useUserSettings } from '@/hooks'
import { isSuperAdmin } from '@/lib/admin'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface AppSettings {
  billing_enabled: boolean
  founder_signups_enabled: boolean
  founder_signups_closed_at: string | null
  maintenance_mode: boolean
  maintenance_message: string | null
  show_upgrade_prompts: boolean
}

export default function AdminAppSettingsPage() {
  const supabase = useSupabase()
  const { settings: userSettings } = useUserSettings()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<AppSettings>({
    billing_enabled: false,
    founder_signups_enabled: true,
    founder_signups_closed_at: null,
    maintenance_mode: false,
    maintenance_message: null,
    show_upgrade_prompts: false,
  })
  const [maintenanceMessage, setMaintenanceMessage] = useState('')
  const [savingMessage, setSavingMessage] = useState(false)

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
          billing_enabled: data.billing_enabled || false,
          founder_signups_enabled: data.founder_signups_enabled ?? true,
          founder_signups_closed_at: data.founder_signups_closed_at,
          maintenance_mode: data.maintenance_mode || false,
          maintenance_message: data.maintenance_message || null,
          show_upgrade_prompts: data.show_upgrade_prompts || false,
        })
        setMaintenanceMessage(data.maintenance_message || '')
      }
    } catch (error) {
      console.error('Failed to load app settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = async (key: keyof AppSettings, value: boolean) => {
    if (!isSuperAdminUser) {
      toast.error('Only super admins can change app settings')
      return
    }

    setSaving(true)

    try {
      const updates: Partial<AppSettings> = { [key]: value }

      // If closing founder signups, record the timestamp
      if (key === 'founder_signups_enabled' && !value) {
        updates.founder_signups_closed_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('app_settings')
        .upsert({
          id: 'global',
          ...updates,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error

      setSettings(prev => ({ ...prev, ...updates }))

      // Log admin activity
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('admin_activity_log').insert({
        admin_id: user?.id,
        action: `update_app_setting_${key}`,
        details: { key, value },
      })

      toast.success('Setting updated')
    } catch (error) {
      console.error('Failed to update setting:', error)
      toast.error('Failed to update setting')
    } finally {
      setSaving(false)
    }
  }

  const saveMaintenanceMessage = async () => {
    if (!isSuperAdminUser) {
      toast.error('Only super admins can change app settings')
      return
    }

    setSavingMessage(true)

    try {
      const messageToSave = maintenanceMessage.trim() || null

      const { error } = await supabase
        .from('app_settings')
        .upsert({
          id: 'global',
          maintenance_message: messageToSave,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error

      setSettings(prev => ({ ...prev, maintenance_message: messageToSave }))

      // Log admin activity
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('admin_activity_log').insert({
        admin_id: user?.id,
        action: 'update_maintenance_message',
        details: { message: messageToSave },
      })

      toast.success('Maintenance message saved')
    } catch (error) {
      console.error('Failed to save maintenance message:', error)
      toast.error('Failed to save message')
    } finally {
      setSavingMessage(false)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-purple-500/10">
          <Settings className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">App Settings</h1>
          <p className="text-sm text-gray-400">Global application configuration</p>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
        <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium text-amber-400">Caution</p>
          <p className="text-sm text-amber-200/80">
            These settings affect all users. Changes take effect immediately.
          </p>
        </div>
      </div>

      {/* Settings Cards */}
      <div className="grid gap-4">
        {/* Billing Toggle */}
        <div className="p-6 rounded-xl bg-[#1a1a24] border border-white/[0.06]">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-green-500/10">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Billing System</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Enable paid subscriptions and tier upgrades
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  When disabled, all users see the free experience with limits but no upgrade prompts.
                </p>
              </div>
            </div>
            <ToggleSwitch
              enabled={settings.billing_enabled}
              onChange={(v) => updateSetting('billing_enabled', v)}
              disabled={saving}
            />
          </div>
        </div>

        {/* Founder Signups Toggle */}
        <div className="p-6 rounded-xl bg-[#1a1a24] border border-white/[0.06]">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-amber-500/10">
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Founder Signups</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Grant founder status to new users on signup
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {settings.founder_signups_closed_at
                    ? `Closed on ${new Date(settings.founder_signups_closed_at).toLocaleDateString()}`
                    : 'Currently open - new users automatically become Founders'}
                </p>
              </div>
            </div>
            <ToggleSwitch
              enabled={settings.founder_signups_enabled}
              onChange={(v) => updateSetting('founder_signups_enabled', v)}
              disabled={saving}
            />
          </div>
        </div>

        {/* Maintenance Mode Toggle */}
        <div className={cn(
          "p-6 rounded-xl border",
          settings.maintenance_mode
            ? "bg-red-500/5 border-red-500/20"
            : "bg-[#1a1a24] border-white/[0.06]"
        )}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-red-500/10">
                <Shield className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Maintenance Mode</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Block access for non-admin users
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Users will see a beautiful &quot;Dragon Sleeps&quot; maintenance page. Admins can still access the app.
                </p>
              </div>
            </div>
            <ToggleSwitch
              enabled={settings.maintenance_mode}
              onChange={(v) => updateSetting('maintenance_mode', v)}
              disabled={saving}
              variant="danger"
            />
          </div>

          {/* Maintenance Message - shown when maintenance mode is on or being configured */}
          <div className="mt-6 pt-6 border-t border-white/[0.06]">
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-amber-500/10">
                <ScrollText className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-white mb-1">Maintenance Message</h4>
                <p className="text-xs text-gray-500 mb-3">
                  Optional message explaining why the site is down. Displayed on the maintenance page.
                </p>
                <textarea
                  value={maintenanceMessage}
                  onChange={(e) => setMaintenanceMessage(e.target.value)}
                  placeholder="We're upgrading our servers to bring you new features. We'll be back within the hour!"
                  className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 resize-none text-sm"
                  rows={3}
                  maxLength={500}
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">
                    {maintenanceMessage.length}/500 characters
                  </span>
                  <button
                    onClick={saveMaintenanceMessage}
                    disabled={savingMessage || maintenanceMessage === (settings.maintenance_message || '')}
                    className={cn(
                      "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                      maintenanceMessage !== (settings.maintenance_message || '')
                        ? "bg-purple-600 hover:bg-purple-500 text-white"
                        : "bg-white/[0.04] text-gray-500 cursor-not-allowed"
                    )}
                  >
                    {savingMessage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Save Message'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Upgrade Prompts Toggle */}
        <div className="p-6 rounded-xl bg-[#1a1a24] border border-white/[0.06]">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-blue-500/10">
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Upgrade Prompts</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Show &quot;Upgrade to Hero/Legend&quot; nudges in user menu
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  When disabled, users won&apos;t see upgrade suggestions. Enable when ready to monetize.
                </p>
              </div>
            </div>
            <ToggleSwitch
              enabled={settings.show_upgrade_prompts}
              onChange={(v) => updateSetting('show_upgrade_prompts', v)}
              disabled={saving}
            />
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="p-6 rounded-xl bg-[#1a1a24] border border-white/[0.06]">
        <h3 className="font-semibold text-white mb-4">Current State</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatItem
            label="Billing"
            value={settings.billing_enabled ? 'Enabled' : 'Disabled'}
            color={settings.billing_enabled ? 'green' : 'gray'}
          />
          <StatItem
            label="Founder Signups"
            value={settings.founder_signups_enabled ? 'Open' : 'Closed'}
            color={settings.founder_signups_enabled ? 'amber' : 'gray'}
          />
          <StatItem
            label="Maintenance"
            value={settings.maintenance_mode ? 'Active' : 'Off'}
            color={settings.maintenance_mode ? 'red' : 'gray'}
          />
          <StatItem
            label="Upgrade Prompts"
            value={settings.show_upgrade_prompts ? 'Shown' : 'Hidden'}
            color={settings.show_upgrade_prompts ? 'blue' : 'gray'}
          />
          <StatItem
            label="User Experience"
            value={settings.billing_enabled ? 'Full' : 'Stealth'}
            color="purple"
          />
        </div>
      </div>
    </div>
  )
}

function ToggleSwitch({
  enabled,
  onChange,
  disabled,
  variant = 'default',
}: {
  enabled: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
  variant?: 'default' | 'danger'
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      disabled={disabled}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1a1a24]",
        enabled
          ? variant === 'danger'
            ? "bg-red-600 focus:ring-red-500"
            : "bg-purple-600 focus:ring-purple-500"
          : "bg-gray-700 focus:ring-gray-500",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
          enabled ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  )
}

function StatItem({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color: 'green' | 'amber' | 'red' | 'gray' | 'purple' | 'blue'
}) {
  const colors = {
    green: 'text-green-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    gray: 'text-gray-400',
    purple: 'text-purple-400',
    blue: 'text-blue-400',
  }

  return (
    <div className="text-center">
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={cn("font-semibold mt-1", colors[color])}>{value}</p>
    </div>
  )
}
