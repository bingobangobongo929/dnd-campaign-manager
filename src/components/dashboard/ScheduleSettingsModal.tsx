'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, MapPin, Settings, Loader2, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react'
import { Modal, Input } from '@/components/ui'
import { toast } from 'sonner'
import {
  SchedulingModeSelector,
  SchedulePatternEditor,
  TimezoneSelector,
} from '@/components/scheduling'
import {
  type ScheduleMode,
  type SchedulePattern,
  type ScheduleSettings,
  getDefaultScheduleSettings,
  getDefaultSchedulePattern,
} from '@/lib/schedule-utils'
import { formatTime24to12 } from '@/lib/timezone-utils'
import { cn } from '@/lib/utils'

interface ScheduleSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  campaignId: string
  userTimezone: string
  // Initial values
  initialSettings?: ScheduleSettings | null
  initialPattern?: SchedulePattern | null
  // For simple mode
  initialNextDate?: string | null
  initialNextTime?: string | null
  initialNextLocation?: string | null
  initialNextNotes?: string | null
  // Save handler
  onSave: (data: {
    settings: ScheduleSettings
    pattern: SchedulePattern | null
    // Simple mode fields
    nextDate?: string | null
    nextTime?: string | null
    nextLocation?: string | null
    nextNotes?: string | null
  }) => Promise<void>
}

export function ScheduleSettingsModal({
  isOpen,
  onClose,
  campaignId,
  userTimezone,
  initialSettings,
  initialPattern,
  initialNextDate,
  initialNextTime,
  initialNextLocation,
  initialNextNotes,
  onSave,
}: ScheduleSettingsModalProps) {
  const [saving, setSaving] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Form state
  const [settings, setSettings] = useState<ScheduleSettings>(() =>
    initialSettings || getDefaultScheduleSettings()
  )
  const [pattern, setPattern] = useState<SchedulePattern | null>(() =>
    initialPattern || null
  )

  // Simple mode fields
  const [nextDate, setNextDate] = useState('')
  const [nextTime, setNextTime] = useState('')
  const [nextLocation, setNextLocation] = useState('')
  const [nextNotes, setNextNotes] = useState('')

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSettings(initialSettings || getDefaultScheduleSettings())
      setPattern(initialPattern || null)

      // Parse initial date/time for simple mode
      if (initialNextDate) {
        const d = new Date(initialNextDate)
        if (!isNaN(d.getTime())) {
          setNextDate(d.toISOString().split('T')[0])
        }
      } else {
        setNextDate('')
      }

      if (initialNextTime) {
        setNextTime(initialNextTime)
      } else {
        setNextTime('')
      }

      setNextLocation(initialNextLocation || '')
      setNextNotes(initialNextNotes || '')
    }
  }, [isOpen, initialSettings, initialPattern, initialNextDate, initialNextTime, initialNextLocation, initialNextNotes])

  const handleModeChange = (mode: ScheduleMode) => {
    setSettings({ ...settings, mode })

    // Initialize pattern when switching to full mode
    if (mode === 'full' && !pattern) {
      setPattern(getDefaultSchedulePattern(userTimezone))
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave({
        settings,
        pattern: settings.mode === 'full' ? pattern : null,
        nextDate: settings.mode === 'simple' && nextDate ? nextDate : null,
        nextTime: settings.mode === 'simple' && nextTime ? nextTime : null,
        nextLocation: settings.mode === 'simple' || settings.mode === 'full' ? nextLocation || (pattern?.location || null) : null,
        nextNotes: settings.mode === 'simple' ? nextNotes : null,
      })
      toast.success('Schedule settings saved')
      onClose()
    } catch (error) {
      console.error('Failed to save schedule settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Session Scheduling"
      description="Configure how you manage session schedules for this campaign"
      size="lg"
    >
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
        {/* Mode Selection */}
        <SchedulingModeSelector
          value={settings.mode}
          onChange={handleModeChange}
        />

        {/* Simple Mode: Just date/time/location */}
        {settings.mode === 'simple' && (
          <div className="space-y-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <h3 className="text-sm font-medium text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[--arcane-purple]" />
              Next Session
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[--text-tertiary] mb-1.5">Date</label>
                <input
                  type="date"
                  value={nextDate}
                  onChange={(e) => setNextDate(e.target.value)}
                  className={cn(
                    'w-full px-4 py-2.5 rounded-lg',
                    'bg-white/[0.04] border border-white/[0.06]',
                    'text-sm text-white',
                    'focus:outline-none focus:ring-2 focus:ring-[--arcane-purple]/30'
                  )}
                />
              </div>
              <div>
                <label className="block text-xs text-[--text-tertiary] mb-1.5">Time</label>
                <input
                  type="time"
                  value={nextTime}
                  onChange={(e) => setNextTime(e.target.value)}
                  className={cn(
                    'w-full px-4 py-2.5 rounded-lg',
                    'bg-white/[0.04] border border-white/[0.06]',
                    'text-sm text-white',
                    'focus:outline-none focus:ring-2 focus:ring-[--arcane-purple]/30'
                  )}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-[--text-tertiary] mb-1.5 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Location / Platform
              </label>
              <input
                type="text"
                value={nextLocation}
                onChange={(e) => setNextLocation(e.target.value)}
                placeholder="e.g., Discord + Roll20"
                className={cn(
                  'w-full px-4 py-2.5 rounded-lg',
                  'bg-white/[0.04] border border-white/[0.06]',
                  'text-sm text-white placeholder:text-[--text-tertiary]',
                  'focus:outline-none focus:ring-2 focus:ring-[--arcane-purple]/30'
                )}
              />
            </div>

            <div>
              <label className="block text-xs text-[--text-tertiary] mb-1.5">
                Notes for Players (optional)
              </label>
              <textarea
                value={nextNotes}
                onChange={(e) => setNextNotes(e.target.value)}
                placeholder="e.g., Bring your backstory notes!"
                rows={2}
                className={cn(
                  'w-full px-4 py-2.5 rounded-lg resize-none',
                  'bg-white/[0.04] border border-white/[0.06]',
                  'text-sm text-white placeholder:text-[--text-tertiary]',
                  'focus:outline-none focus:ring-2 focus:ring-[--arcane-purple]/30'
                )}
              />
            </div>
          </div>
        )}

        {/* Full Mode: Pattern editor */}
        {settings.mode === 'full' && (
          <div className="space-y-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <h3 className="text-sm font-medium text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[--arcane-purple]" />
              Recurring Schedule
            </h3>

            <SchedulePatternEditor
              value={pattern}
              onChange={setPattern}
              userTimezone={userTimezone}
            />

            {/* Advanced Settings */}
            <div className="pt-4 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-[--text-tertiary] hover:text-white transition-colors"
              >
                <Settings className="w-4 h-4" />
                Advanced Settings
                {showAdvanced ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {showAdvanced && (
                <div className="mt-4 space-y-4">
                  {/* Attendance Mode */}
                  <div className="space-y-2">
                    <label className="text-xs text-[--text-tertiary]">Attendance Mode</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSettings({ ...settings, attendance_mode: 'assumed' })}
                        className={cn(
                          'flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                          settings.attendance_mode === 'assumed'
                            ? 'bg-[--arcane-purple] text-white'
                            : 'bg-white/[0.04] text-[--text-secondary] hover:bg-white/[0.08]'
                        )}
                      >
                        Assumed Attending
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettings({ ...settings, attendance_mode: 'confirmed' })}
                        className={cn(
                          'flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                          settings.attendance_mode === 'confirmed'
                            ? 'bg-[--arcane-purple] text-white'
                            : 'bg-white/[0.04] text-[--text-secondary] hover:bg-white/[0.08]'
                        )}
                      >
                        Require Confirmation
                      </button>
                    </div>
                    <p className="text-xs text-[--text-tertiary]">
                      {settings.attendance_mode === 'assumed'
                        ? 'Players are assumed attending unless they say otherwise'
                        : 'Players must confirm each session'}
                    </p>
                  </div>

                  {/* Minimum Players */}
                  <div className="space-y-2">
                    <label className="text-xs text-[--text-tertiary]">
                      Minimum Players for Session
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={settings.minimum_players || 3}
                        onChange={(e) => setSettings({
                          ...settings,
                          minimum_players: parseInt(e.target.value) || 3
                        })}
                        className={cn(
                          'w-20 px-3 py-2 rounded-lg text-center',
                          'bg-white/[0.04] border border-white/[0.06]',
                          'text-sm text-white',
                          'focus:outline-none focus:ring-2 focus:ring-[--arcane-purple]/30'
                        )}
                      />
                      <span className="text-sm text-[--text-tertiary]">players needed</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Discord Integration Coming Soon */}
        <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/20">
              <MessageCircle className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-white">Discord Integration</h4>
                <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-500/20 text-indigo-300">
                  Coming Soon
                </span>
              </div>
              <p className="text-xs text-[--text-tertiary] mt-1">
                Get automatic session reminders sent to your Discord server. Stay tuned!
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06]">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm text-[--text-secondary] hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 text-sm font-medium bg-[--arcane-purple] hover:bg-[--arcane-purple]/80 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Settings
          </button>
        </div>
      </div>
    </Modal>
  )
}
