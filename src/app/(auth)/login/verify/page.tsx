'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Shield, Loader2, Key, Check } from 'lucide-react'
import { useSupabase } from '@/hooks'
import { cn } from '@/lib/utils'

function TwoFactorVerifyForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useSupabase()

  // Get redirect URL from query params
  const redirectUrl = searchParams.get('redirect') || '/home'
  const [code, setCode] = useState('')
  const [isBackupCode, setIsBackupCode] = useState(false)
  const [trustDevice, setTrustDevice] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    // Check if user is partially authenticated (has session but needs 2FA)
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        // Not authenticated at all, redirect to login
        router.push('/login')
        return
      }

      // Check if 2FA is required
      const { data: settings } = await supabase
        .from('user_settings')
        .select('totp_enabled')
        .eq('user_id', user.id)
        .single()

      if (!settings?.totp_enabled) {
        // 2FA not enabled, go to destination
        router.push(redirectUrl)
        return
      }

      setCheckingAuth(false)
    }

    checkAuth()
  }, [supabase, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const cleanCode = code.replace(/[-\s]/g, '')

    if (!isBackupCode && cleanCode.length !== 6) {
      setError('Please enter a 6-digit code')
      return
    }

    if (isBackupCode && cleanCode.length !== 8) {
      setError('Please enter your 8-character backup code')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/2fa/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleanCode, isBackupCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Invalid code')
      }

      // If trust device is checked, call the trust device API
      if (trustDevice) {
        try {
          await fetch('/api/auth/2fa/trust-device', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (trustError) {
          // Don't block login if trust fails, just log it
          console.error('Failed to trust device:', trustError)
        }
      }

      router.push(redirectUrl)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to verify code')
      setLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#0a0a0f]">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px]" />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 via-indigo-600/20 to-purple-600/20 rounded-2xl blur-xl opacity-75" />

        <div className="relative bg-[#12121a]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-500/10 mb-4">
              <Shield className="w-8 h-8 text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Two-Factor Authentication</h1>
            <p className="text-gray-400 text-sm">
              {isBackupCode
                ? 'Enter one of your backup codes'
                : 'Enter the code from your authenticator app'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            {isBackupCode ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Backup Code</label>
                <input
                  type="text"
                  placeholder="XXXX-XXXX"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={9}
                  className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-center text-xl tracking-widest font-mono placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Verification Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  maxLength={6}
                  className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-center text-2xl tracking-widest font-mono placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50"
                  autoFocus
                />
              </div>
            )}

            {/* Trust device checkbox */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={trustDevice}
                  onChange={(e) => setTrustDevice(e.target.checked)}
                  className="sr-only"
                />
                <div className={cn(
                  "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                  trustDevice
                    ? "bg-purple-600 border-purple-600"
                    : "border-gray-600 group-hover:border-gray-500"
                )}>
                  {trustDevice && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>
              <span className="text-sm text-gray-400">
                Trust this device for 30 days
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200",
                "bg-gradient-to-r from-purple-600 to-indigo-600",
                "hover:from-purple-500 hover:to-indigo-500 hover:shadow-lg hover:shadow-purple-500/25",
                "focus:outline-none focus:ring-2 focus:ring-purple-500/50",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "flex items-center justify-center gap-2"
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify'
              )}
            </button>
          </form>

          {/* Toggle backup code mode */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsBackupCode(!isBackupCode)
                setCode('')
                setError('')
              }}
              className="text-sm text-gray-400 hover:text-purple-400 transition-colors flex items-center gap-2 mx-auto"
            >
              <Key className="w-4 h-4" />
              {isBackupCode ? 'Use authenticator code instead' : 'Use a backup code instead'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TwoFactorVerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    }>
      <TwoFactorVerifyForm />
    </Suspense>
  )
}
