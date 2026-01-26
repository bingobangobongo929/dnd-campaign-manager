'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, CheckCircle, XCircle, AlertTriangle, ArrowRight } from 'lucide-react'
import { LegalFooter } from '@/components/ui/legal-footer'

function CancelDeletionContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [username, setUsername] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    const email = searchParams.get('email')

    if (!token || !email) {
      setStatus('error')
      setErrorMessage('Invalid cancellation link. Please check your email for the correct link.')
      return
    }

    cancelDeletion(token, email)
  }, [searchParams])

  const cancelDeletion = async (token: string, email: string) => {
    try {
      const response = await fetch('/api/user/cancel-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error?.includes('grace period has expired')) {
          setStatus('expired')
        } else {
          setStatus('error')
          setErrorMessage(data.error || 'Failed to cancel deletion')
        }
        return
      }

      setStatus('success')
      setUsername(data.username || '')
    } catch (error) {
      setStatus('error')
      setErrorMessage('An unexpected error occurred. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      {/* Background decoration */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent pointer-events-none" />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md relative">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <img
                src="/icons/icon-192x192.png"
                alt="Multiloop"
                className="w-16 h-16 mx-auto rounded-2xl"
              />
            </Link>
          </div>

          {/* Card */}
          <div className="bg-[#12121a]/80 backdrop-blur-xl rounded-2xl border border-white/[0.06] p-8 shadow-2xl">
            {status === 'loading' && (
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 animate-spin text-purple-400 mx-auto mb-4" />
                <h1 className="text-xl font-semibold text-white mb-2">
                  Cancelling Deletion...
                </h1>
                <p className="text-gray-400">
                  Please wait while we restore your account.
                </p>
              </div>
            )}

            {status === 'success' && (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  Account Restored!
                </h1>
                <p className="text-gray-400 mb-6">
                  {username ? `Welcome back, ${username}!` : 'Welcome back!'} Your account deletion has been cancelled and your account is fully active again.
                </p>

                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6">
                  <p className="text-sm text-green-300">
                    All your campaigns, characters, and data are safe. Nothing was deleted.
                  </p>
                </div>

                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-colors"
                >
                  Sign In to Your Account
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
                  <XCircle className="w-8 h-8 text-red-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  Unable to Cancel Deletion
                </h1>
                <p className="text-gray-400 mb-6">
                  {errorMessage}
                </p>

                <div className="space-y-3">
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-white/[0.06] hover:bg-white/[0.1] text-white font-medium rounded-xl transition-colors"
                  >
                    Go to Login
                  </Link>
                  <p className="text-sm text-gray-500">
                    Need help? Contact us at{' '}
                    <a href="mailto:contact@multiloop.app" className="text-purple-400 hover:underline">
                      contact@multiloop.app
                    </a>
                  </p>
                </div>
              </div>
            )}

            {status === 'expired' && (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
                  <AlertTriangle className="w-8 h-8 text-amber-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  Grace Period Expired
                </h1>
                <p className="text-gray-400 mb-6">
                  The 14-day grace period has ended and your account may have been permanently deleted.
                </p>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
                  <p className="text-sm text-amber-300">
                    If you believe this is an error or need assistance, please contact our support team.
                  </p>
                </div>

                <div className="space-y-3">
                  <a
                    href="mailto:contact@multiloop.app"
                    className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-colors"
                  >
                    Contact Support
                  </a>
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-white/[0.06] hover:bg-white/[0.1] text-white font-medium rounded-xl transition-colors"
                  >
                    Return to Homepage
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <LegalFooter />
    </div>
  )
}

export default function CancelDeletionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    }>
      <CancelDeletionContent />
    </Suspense>
  )
}
