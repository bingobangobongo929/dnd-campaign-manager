'use client'

import { useState, useEffect } from 'react'
import { Calendar, MapPin, FileText, X, Loader2 } from 'lucide-react'
import { Modal, Input, Textarea } from '@/components/ui'
import { toast } from 'sonner'

interface ScheduleSessionModalProps {
  isOpen: boolean
  onClose: () => void
  campaignId: string
  initialDate?: string | null
  initialLocation?: string | null
  initialNotes?: string | null
  onSave: (data: {
    date: string
    location: string
    notes: string
  }) => Promise<void>
  onClear?: () => Promise<void>
}

export function ScheduleSessionModal({
  isOpen,
  onClose,
  campaignId,
  initialDate,
  initialLocation,
  initialNotes,
  onSave,
  onClear,
}: ScheduleSessionModalProps) {
  const [saving, setSaving] = useState(false)
  const [clearing, setClearing] = useState(false)

  // Form state
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialDate) {
        const d = new Date(initialDate)
        setDate(d.toISOString().split('T')[0])
        setTime(d.toTimeString().slice(0, 5))
      } else {
        setDate('')
        setTime('')
      }
      setLocation(initialLocation || '')
      setNotes(initialNotes || '')
    }
  }, [isOpen, initialDate, initialLocation, initialNotes])

  const handleSave = async () => {
    if (!date || !time) {
      toast.error('Please select a date and time')
      return
    }

    setSaving(true)
    try {
      const dateTime = new Date(`${date}T${time}:00`).toISOString()
      await onSave({
        date: dateTime,
        location: location.trim(),
        notes: notes.trim(),
      })
      toast.success('Session scheduled')
      onClose()
    } catch (error) {
      toast.error('Failed to schedule session')
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async () => {
    if (!onClear) return

    setClearing(true)
    try {
      await onClear()
      toast.success('Session cleared')
      onClose()
    } catch (error) {
      toast.error('Failed to clear session')
    } finally {
      setClearing(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Schedule Next Session"
      size="md"
    >
      <div className="space-y-4">
        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              Date
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              Time
            </label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1.5">
            <MapPin className="w-4 h-4 inline-block mr-1" />
            Location / Platform
          </label>
          <Input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Roll20 + Discord Voice"
            className="w-full"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1.5">
            <FileText className="w-4 h-4 inline-block mr-1" />
            Notes for Players (optional)
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., We'll be finishing the Thornhold arc. Bring your character backstory notes!"
            rows={3}
            className="w-full"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
          <div>
            {initialDate && onClear && (
              <button
                onClick={handleClear}
                disabled={clearing}
                className="text-sm text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
              >
                {clearing ? 'Clearing...' : 'Clear Session'}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !date || !time}
              className="px-4 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {initialDate ? 'Update' : 'Save & Notify Players'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
