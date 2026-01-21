'use client'

import { useState } from 'react'
import { User, Loader2, Check, X } from 'lucide-react'
import { Modal } from '@/components/ui'
import { useSupabase } from '@/hooks'
import { cn } from '@/lib/utils'

interface UsernameSetupModalProps {
  isOpen: boolean
  onComplete: (username: string) => void
}

export function UsernameSetupModal({ isOpen, onComplete }: UsernameSetupModalProps) {
  const supabase = useSupabase()
  const [username, setUsername] = useState('')
  const [checking, setChecking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Validate username format
  const validateUsername = (value: string): string | null => {
    if (value.length < 3) return 'Username must be at least 3 characters'
    if (value.length > 20) return 'Username must be 20 characters or less'
    if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Only letters, numbers, and underscores allowed'
    if (/^[0-9]/.test(value)) return 'Username cannot start with a number'
    return null
  }

  // Check if username is available
  const checkAvailability = async (value: string) => {
    const validationError = validateUsername(value)
    if (validationError) {
      setError(validationError)
      setAvailable(null)
      return
    }

    setChecking(true)
    setError(null)

    try {
      const { data, error: checkError } = await supabase
        .from('user_settings')
        .select('username')
        .ilike('username', value)
        .maybeSingle()

      if (checkError) throw checkError

      if (data) {
        setAvailable(false)
        setError('This username is already taken')
      } else {
        setAvailable(true)
        setError(null)
      }
    } catch (err) {
      console.error('Error checking username:', err)
      setError('Could not check availability')
      setAvailable(null)
    } finally {
      setChecking(false)
    }
  }

  // Handle input change with debounced check
  const handleChange = (value: string) => {
    // Sanitize input - only allow valid characters
    const sanitized = value.toLowerCase().replace(/[^a-z0-9_]/g, '')
    setUsername(sanitized)
    setAvailable(null)
    setError(null)

    if (sanitized.length >= 3) {
      // Debounce the check
      const timer = setTimeout(() => checkAvailability(sanitized), 500)
      return () => clearTimeout(timer)
    }
  }

  // Save username
  const handleSave = async () => {
    if (!available || saving) return

    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/user/username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save username')
      }

      onComplete(username)
    } catch (err) {
      console.error('Error saving username:', err)
      setError(err instanceof Error ? err.message : 'Failed to save username')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // Cannot close - must set username
      title="Choose Your Username"
      size="sm"
    >
      <div className="py-4 space-y-4">
        <p className="text-sm text-gray-400">
          Pick a unique username for your profile. This will be shown when you share templates with the community.
        </p>

        {/* Username Input */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Username
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">@</span>
            <input
              type="text"
              value={username}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="yourname"
              className={cn(
                "w-full py-2.5 pl-8 pr-10 bg-white/[0.02] border rounded-lg text-white placeholder:text-gray-600 focus:outline-none transition-colors",
                error
                  ? "border-red-500/50 focus:border-red-500"
                  : available
                    ? "border-emerald-500/50 focus:border-emerald-500"
                    : "border-white/[0.08] focus:border-purple-500/50"
              )}
              autoFocus
              maxLength={20}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {checking && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
              {!checking && available === true && <Check className="w-4 h-4 text-emerald-400" />}
              {!checking && available === false && <X className="w-4 h-4 text-red-400" />}
            </div>
          </div>

          {/* Error/Status Message */}
          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
          {!error && available && (
            <p className="text-xs text-emerald-400">Username is available!</p>
          )}
          {!error && !available && username.length > 0 && username.length < 3 && (
            <p className="text-xs text-gray-500">Keep typing...</p>
          )}
        </div>

        {/* Requirements */}
        <div className="p-3 bg-white/[0.02] rounded-lg">
          <p className="text-xs text-gray-500 mb-2">Username requirements:</p>
          <ul className="text-xs text-gray-500 space-y-1">
            <li className={cn(username.length >= 3 && "text-emerald-400")}>
              • 3-20 characters
            </li>
            <li className={cn(/^[a-zA-Z0-9_]+$/.test(username) && username.length > 0 && "text-emerald-400")}>
              • Letters, numbers, and underscores only
            </li>
            <li className={cn(username.length > 0 && !/^[0-9]/.test(username) && "text-emerald-400")}>
              • Cannot start with a number
            </li>
          </ul>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={!available || saving}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors",
            available && !saving
              ? "bg-purple-600 hover:bg-purple-500 text-white"
              : "bg-white/[0.05] text-gray-500 cursor-not-allowed"
          )}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <User className="w-4 h-4" />
              Set Username
            </>
          )}
        </button>

        <p className="text-xs text-gray-500 text-center">
          You can change your username later in Settings.
        </p>
      </div>
    </Modal>
  )
}
