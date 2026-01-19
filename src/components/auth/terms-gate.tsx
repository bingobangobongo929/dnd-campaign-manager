'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Shield, Loader2 } from 'lucide-react'
import { useSupabase, useUser } from '@/hooks'
import { cn } from '@/lib/utils'
import type { UserSettings } from '@/types/database'

interface TermsGateProps {
  userSettings: UserSettings
  onAccept: () => void
}

export function TermsGate({ userSettings, onAccept }: TermsGateProps) {
  const supabase = useSupabase()
  const { user } = useUser()
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // If terms are already accepted, don't show the gate
  if (userSettings.terms_accepted_at && userSettings.privacy_accepted_at) {
    return null
  }

  const handleAccept = async () => {
    if (!termsAccepted || !user) return

    setLoading(true)
    setError('')

    const now = new Date().toISOString()
    const { error } = await supabase
      .from('user_settings')
      .update({
        terms_accepted_at: now,
        privacy_accepted_at: now,
      })
      .eq('user_id', user.id)

    if (error) {
      setError('Failed to save your acceptance. Please try again.')
      setLoading(false)
    } else {
      onAccept()
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0a0f] flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-purple-600/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-[128px]" />
      </div>

      <div className="relative w-full max-w-lg">
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 via-indigo-600/20 to-purple-600/20 rounded-2xl blur-xl opacity-75" />

        <div className="relative bg-[#12121a]/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-500/10 mb-4">
              <Shield className="w-8 h-8 text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Updated Terms & Privacy Policy</h1>
            <p className="text-gray-400">
              We&apos;ve updated our legal documents to better protect your rights and data.
              Please review and accept to continue using Multiloop.
            </p>
          </div>

          {/* Documents */}
          <div className="space-y-3 mb-6">
            <Link
              href="/terms"
              target="_blank"
              className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors"
            >
              <div>
                <h3 className="font-medium text-white">Terms of Service</h3>
                <p className="text-sm text-gray-500">Rules and guidelines for using Multiloop</p>
              </div>
              <span className="text-purple-400 text-sm">Read &rarr;</span>
            </Link>

            <Link
              href="/privacy"
              target="_blank"
              className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors"
            >
              <div>
                <h3 className="font-medium text-white">Privacy Policy</h3>
                <p className="text-sm text-gray-500">How we collect, use, and protect your data</p>
              </div>
              <span className="text-purple-400 text-sm">Read &rarr;</span>
            </Link>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Acceptance checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group mb-6">
            <div className="relative mt-0.5">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="sr-only"
              />
              <div className={cn(
                "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                termsAccepted
                  ? "bg-purple-600 border-purple-600"
                  : "border-gray-600 group-hover:border-gray-500"
              )}>
                {termsAccepted && <Check className="w-3 h-3 text-white" />}
              </div>
            </div>
            <span className="text-sm text-gray-400">
              I have read and agree to the Terms of Service and Privacy Policy
            </span>
          </label>

          {/* Accept button */}
          <button
            onClick={handleAccept}
            disabled={!termsAccepted || loading}
            className={cn(
              "w-full py-3 px-4 rounded-xl font-semibold text-white transition-all",
              "bg-gradient-to-r from-purple-600 to-indigo-600",
              "hover:from-purple-500 hover:to-indigo-500 hover:shadow-lg hover:shadow-purple-500/25",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none",
              "flex items-center justify-center gap-2"
            )}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              'Continue to Multiloop'
            )}
          </button>

          {/* Note */}
          <p className="text-center text-xs text-gray-600 mt-4">
            Questions? Contact us at{' '}
            <a href="mailto:privacy@multiloop.app" className="text-purple-400 hover:underline">
              privacy@multiloop.app
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
