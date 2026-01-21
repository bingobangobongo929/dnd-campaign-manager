'use client'

import { useState } from 'react'
import { Lock, Loader2, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui'

interface PasswordEntryFormProps {
  shareCode: string
  contentName?: string
  onSuccess: (token: string) => void
}

/**
 * Password entry form for protected share links.
 * Shown before the shared content when a password is required.
 */
export function PasswordEntryForm({ shareCode, contentName, onSuccess }: PasswordEntryFormProps) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!password.trim()) {
      setError('Please enter a password')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/shares/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareCode,
          password: password.trim(),
        }),
      })

      const data = await res.json()

      if (!data.valid) {
        setError('Incorrect password')
        setLoading(false)
        return
      }

      // Store verification token in sessionStorage
      if (data.token) {
        sessionStorage.setItem(`share_verified_${shareCode}`, data.token)
      }

      onSuccess(data.token)
    } catch (err) {
      console.error('Password verification error:', err)
      setError('Failed to verify password. Please try again.')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Password Required</h1>
          <p className="text-gray-400">
            {contentName
              ? `Enter the password to view "${contentName}"`
              : 'This content is password protected. Enter the password to continue.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="bg-white/[0.03] border-white/[0.08] text-center text-lg"
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm justify-center">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Unlock Content
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-6">
          The owner of this content has protected it with a password.
          <br />
          If you don't have the password, ask the person who shared the link.
        </p>
      </div>
    </div>
  )
}
