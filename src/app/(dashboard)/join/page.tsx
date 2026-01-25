'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, ArrowRight, Loader2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'

/**
 * /join page - Standalone page for entering invite codes
 *
 * Users can:
 * - Paste a full invite URL (e.g., https://multiloop.app/invite/abc123)
 * - Enter just the invite token/code (e.g., abc123)
 *
 * This page extracts the token and redirects to /invite/[token]
 */
export default function JoinPage() {
  const router = useRouter()
  const [inviteCode, setInviteCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()

    const input = inviteCode.trim()
    if (!input) {
      setError('Please enter an invite code or link')
      return
    }

    setJoining(true)
    setError(null)

    try {
      // Extract token from URL or use as-is
      let token = input

      // Check if it's a full URL
      if (input.includes('/')) {
        // Try to extract the last segment (the token)
        const segments = input.split('/').filter(Boolean)
        token = segments[segments.length - 1]
      }

      // Remove any query params or hash
      token = token.split('?')[0].split('#')[0]

      if (!token) {
        setError('Could not extract invite code from the provided input')
        setJoining(false)
        return
      }

      // Redirect to the invite page
      router.push(`/invite/${token}`)
    } catch {
      setError('Something went wrong. Please try again.')
      setJoining(false)
    }
  }

  return (
    <AppLayout>
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
              <Users className="w-8 h-8 text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Join a Campaign</h1>
            <p className="text-gray-400">
              Enter your invite code or paste the full invite link from your DM
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label htmlFor="inviteCode" className="sr-only">
                Invite code or link
              </label>
              <input
                id="inviteCode"
                type="text"
                value={inviteCode}
                onChange={(e) => {
                  setInviteCode(e.target.value)
                  setError(null)
                }}
                placeholder="Paste invite link or code..."
                className="w-full px-4 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-colors"
                autoFocus
                disabled={joining}
              />
              {error && (
                <p className="mt-2 text-sm text-red-400">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={joining || !inviteCode.trim()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
            >
              {joining ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  Join Campaign
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Help text */}
          <div className="mt-8 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
            <h3 className="text-sm font-medium text-white mb-2">How to join</h3>
            <ul className="text-sm text-gray-400 space-y-1.5">
              <li>1. Ask your DM for an invite link</li>
              <li>2. Paste the link or code above</li>
              <li>3. Review and accept the invite</li>
            </ul>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
