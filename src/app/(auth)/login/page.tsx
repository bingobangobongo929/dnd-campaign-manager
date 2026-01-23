'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Sparkles, Shield, BookOpen, Dices, Check, AlertCircle, Ticket, Compass } from 'lucide-react'
import { useSupabase } from '@/hooks'
import { cn } from '@/lib/utils'
import { LegalFooter } from '@/components/ui/legal-footer'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useSupabase()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [inviteCode, setInviteCode] = useState(searchParams.get('invite') || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [inviteValid, setInviteValid] = useState<boolean | null>(null)
  const [inviteError, setInviteError] = useState('')
  const [checkingInvite, setCheckingInvite] = useState(false)

  // Check URL params on mount
  useEffect(() => {
    const invite = searchParams.get('invite')
    const modeParam = searchParams.get('mode')

    // Set mode from URL param (for invite page redirects)
    if (modeParam === 'signup') {
      setMode('signup')
    }

    // Handle invite code
    if (invite) {
      setInviteCode(invite)
      setMode('signup')
      validateInviteCode(invite)
    }
  }, [searchParams])

  // Get redirect URL from params
  const redirectUrl = searchParams.get('redirect') || '/home'

  const validateInviteCode = async (code: string) => {
    if (!code.trim()) {
      setInviteValid(null)
      setInviteError('')
      return
    }

    setCheckingInvite(true)
    setInviteError('')

    try {
      const response = await fetch('/api/auth/validate-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() })
      })

      const data = await response.json()
      setInviteValid(data.valid)
      if (!data.valid) {
        setInviteError(data.error || 'Invalid invite code')
      }
    } catch (err) {
      setInviteValid(false)
      setInviteError('Failed to validate code')
    } finally {
      setCheckingInvite(false)
    }
  }

  const handleInviteChange = (value: string) => {
    setInviteCode(value.toUpperCase())
    setInviteValid(null)
    setInviteError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (mode === 'signup') {
      if (!termsAccepted) {
        setError('You must accept the Terms of Service and Privacy Policy to create an account.')
        return
      }
      if (!inviteCode.trim()) {
        setError('An invite code is required to create an account.')
        return
      }
      if (inviteValid === false) {
        setError('Please enter a valid invite code.')
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.')
        return
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters long.')
        return
      }

      // Validate invite code one more time
      if (inviteValid !== true) {
        await validateInviteCode(inviteCode)
        if (inviteValid === false) {
          setError('Please enter a valid invite code.')
          return
        }
      }
    }

    setLoading(true)

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        // Check if user has 2FA enabled
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: settings } = await supabase
            .from('user_settings')
            .select('totp_enabled, user_id')
            .eq('user_id', user.id)
            .single()

          // Create settings if they don't exist (for manually added users)
          if (!settings) {
            const now = new Date().toISOString()
            await supabase.from('user_settings').insert({
              user_id: user.id,
              tier: 'adventurer',
              role: 'user',
              last_login_at: now,
              terms_accepted_at: now,
              privacy_accepted_at: now,
            })
            router.push(redirectUrl)
          } else if (settings?.totp_enabled) {
            // Check if device is trusted before requiring 2FA
            try {
              const trustCheckRes = await fetch('/api/auth/2fa/trust-device')
              const trustData = await trustCheckRes.json()
              if (trustData.trusted) {
                // Device is trusted, skip 2FA
                await supabase
                  .from('user_settings')
                  .update({ last_login_at: new Date().toISOString() })
                  .eq('user_id', user.id)
                router.push(redirectUrl)
                return
              }
            } catch (trustErr) {
              // If trust check fails, proceed to 2FA anyway
              console.error('Trust check failed:', trustErr)
            }
            // Redirect to 2FA verification page
            router.push('/login/verify')
          } else {
            // No 2FA, update last_login_at and go to home
            await supabase
              .from('user_settings')
              .update({ last_login_at: new Date().toISOString() })
              .eq('user_id', user.id)
            router.push(redirectUrl)
          }
        } else {
          router.push(redirectUrl)
        }
      }
    } else {
      // Sign up
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            invite_code: inviteCode.trim()
          }
        }
      })

      if (error) {
        setError(error.message)
        setLoading(false)
      } else if (data.user) {
        // Use the invite code and send welcome email
        await fetch('/api/auth/use-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: inviteCode.trim(),
            userId: data.user.id,
            email: email
          })
        })

        // Create user settings with terms acceptance and invite info
        const now = new Date().toISOString()
        await supabase.from('user_settings').upsert({
          user_id: data.user.id,
          terms_accepted_at: now,
          privacy_accepted_at: now,
          last_login_at: now,
          invite_code_used: inviteCode.trim()
        }, { onConflict: 'user_id' })

        // If email confirmation is required
        if (!data.session) {
          router.push('/signup/confirm')
        } else {
          router.push(redirectUrl)
        }
      }
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-[#0a0a0f]">
        {/* Gradient orbs */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[100px]" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(139, 92, 246, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.3) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Floating elements */}
        <div className="absolute top-20 left-[15%] text-purple-500/20 animate-float">
          <Dices className="w-8 h-8" />
        </div>
        <div className="absolute top-40 right-[20%] text-purple-500/15 animate-float" style={{ animationDelay: '2s' }}>
          <Shield className="w-10 h-10" />
        </div>
        <div className="absolute bottom-32 left-[25%] text-purple-500/15 animate-float" style={{ animationDelay: '1s' }}>
          <BookOpen className="w-9 h-9" />
        </div>
        <div className="absolute bottom-40 right-[15%] text-purple-500/20 animate-float" style={{ animationDelay: '3s' }}>
          <Sparkles className="w-7 h-7" />
        </div>
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Glow effect behind card */}
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 via-indigo-600/20 to-purple-600/20 rounded-2xl blur-xl opacity-75" />

        <div className="relative bg-[#12121a]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            {/* Logo/Icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 shadow-lg shadow-purple-500/25 overflow-hidden">
              <img src="/icons/icon-192x192.png" alt="Multiloop" className="w-full h-full object-cover" />
            </div>
            <div className="text-sm font-semibold tracking-wide mb-1">
              <span className="text-purple-400">MULTILOOP</span>
              <span className="text-amber-400 ml-1.5">BETA</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {mode === 'signin' ? 'Welcome Back, Adventurer' : 'Begin Your Journey'}
            </h1>
            <p className="text-gray-400 text-sm">
              {mode === 'signin' ? 'Sign in to continue your journey' : 'Create an account with your invite code'}
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="flex rounded-xl bg-white/[0.04] p-1 mb-6">
            <button
              type="button"
              onClick={() => { setMode('signin'); setError('') }}
              className={cn(
                "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all",
                mode === 'signin'
                  ? "bg-purple-600 text-white"
                  : "text-gray-400 hover:text-white"
              )}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError('') }}
              className={cn(
                "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all",
                mode === 'signup'
                  ? "bg-purple-600 text-white"
                  : "text-gray-400 hover:text-white"
              )}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Founder Banner (signup only) */}
            {mode === 'signup' && (
              <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <Compass className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="font-medium text-amber-400 text-sm">Become a Founder</p>
                  <p className="text-xs text-amber-200/70">Join now for permanent early supporter benefits</p>
                </div>
              </div>
            )}

            {/* Invite Code (signup only) */}
            {mode === 'signup' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-purple-400" />
                  Invite Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="XXXXXXXX"
                    value={inviteCode}
                    onChange={(e) => handleInviteChange(e.target.value)}
                    onBlur={() => inviteCode && validateInviteCode(inviteCode)}
                    required
                    maxLength={12}
                    className={cn(
                      "w-full px-4 py-3 bg-white/[0.04] border rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 transition-all font-mono tracking-wider uppercase",
                      inviteValid === true
                        ? "border-green-500/50 focus:border-green-500/50 focus:ring-green-500/20"
                        : inviteValid === false
                        ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20"
                        : "border-white/[0.08] focus:border-purple-500/50 focus:ring-purple-500/20"
                    )}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {checkingInvite ? (
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    ) : inviteValid === true ? (
                      <Check className="w-5 h-5 text-green-400" />
                    ) : inviteValid === false ? (
                      <AlertCircle className="w-5 h-5 text-red-400" />
                    ) : null}
                  </div>
                </div>
                {inviteError && (
                  <p className="text-xs text-red-400">{inviteError}</p>
                )}
                <p className="text-xs text-gray-500">
                  Invite codes are currently handed out personally. If you know, you know.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Email</label>
              <input
                type="email"
                placeholder="adventurer@realm.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">Password</label>
                {mode === 'signin' && (
                  <Link
                    href="/forgot-password"
                    className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <input
                type="password"
                placeholder={mode === 'signin' ? 'Enter your password' : 'Create a password (8+ characters)'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === 'signup' ? 8 : undefined}
                className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
              />
            </div>

            {mode === 'signup' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Confirm Password</label>
                  <input
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  />
                </div>

                {/* Terms Acceptance */}
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer group">
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
                      I am at least 16 years old and agree to the{' '}
                      <Link href="/terms" target="_blank" className="text-purple-400 hover:text-purple-300 underline">
                        Terms of Service
                      </Link>
                      {' '}and{' '}
                      <Link href="/privacy" target="_blank" className="text-purple-400 hover:text-purple-300 underline">
                        Privacy Policy
                      </Link>
                    </span>
                  </label>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading || (mode === 'signup' && (!termsAccepted || !inviteCode || inviteValid === false))}
              className={cn(
                "w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200",
                "bg-gradient-to-r from-purple-600 to-indigo-600",
                "hover:from-purple-500 hover:to-indigo-500 hover:shadow-lg hover:shadow-purple-500/25",
                "focus:outline-none focus:ring-2 focus:ring-purple-500/50",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none",
                "flex items-center justify-center gap-2"
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {mode === 'signin' ? 'Entering the Realm...' : 'Creating Account...'}
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  {mode === 'signin' ? 'Enter the Realm' : 'Begin Adventure'}
                </>
              )}
            </button>
          </form>

        </div>

        {/* Bottom tagline */}
        <p className="text-center text-xs text-gray-600 mt-6">
          Forge stories. Track adventures. Remember legends.
        </p>

        {/* Legal Footer */}
        <LegalFooter className="mt-6" />
      </div>

      {/* CSS for floating animation */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
