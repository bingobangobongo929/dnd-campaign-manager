'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Lock, CheckCircle, XCircle, Eye, EyeOff, Sparkles, Shield, BookOpen, Dices } from 'lucide-react'
import { cn } from '@/lib/utils'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. Please request a new password reset.')
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Password strength indicator
  const getPasswordStrength = (pwd: string) => {
    let strength = 0
    if (pwd.length >= 8) strength++
    if (pwd.length >= 12) strength++
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++
    if (/[0-9]/.test(pwd)) strength++
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++
    return strength
  }

  const strengthLevel = getPasswordStrength(password)
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500']
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong']

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-[#0a0a0f]">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[100px]" />

        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(139, 92, 246, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.3) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

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

      {/* Content */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 via-indigo-600/20 to-purple-600/20 rounded-2xl blur-xl opacity-75" />

        <div className="relative bg-[#12121a]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className={cn(
              "inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4",
              success ? "bg-green-500/10" : "bg-purple-500/10"
            )}>
              {success ? (
                <CheckCircle className="w-8 h-8 text-green-400" />
              ) : (
                <Lock className="w-8 h-8 text-purple-400" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {success ? 'Password Reset!' : 'Create New Password'}
            </h1>
            <p className="text-gray-400 text-sm">
              {success
                ? 'Your password has been successfully reset'
                : 'Choose a strong password for your account'}
            </p>
          </div>

          {success ? (
            <div className="space-y-6">
              <p className="text-center text-gray-300 text-sm">
                You will be redirected to the sign in page shortly.
              </p>

              <Link
                href="/login"
                className="block w-full py-3 px-4 text-center bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all"
              >
                Sign In Now
              </Link>
            </div>
          ) : !token ? (
            <div className="space-y-6">
              <div className="flex items-center justify-center">
                <div className="p-4 bg-red-500/10 rounded-full">
                  <XCircle className="w-12 h-12 text-red-400" />
                </div>
              </div>

              <p className="text-center text-gray-300 text-sm">
                {error}
              </p>

              <Link
                href="/forgot-password"
                className="block w-full py-3 px-4 text-center bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all"
              >
                Request New Reset Link
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-4 py-3 pr-12 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Password strength */}
                {password && (
                  <div className="space-y-2">
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "h-1 flex-1 rounded-full transition-colors",
                            i < strengthLevel ? strengthColors[strengthLevel - 1] : "bg-white/[0.08]"
                          )}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-400">
                      Strength: <span className={cn(
                        strengthLevel <= 2 ? "text-red-400" :
                        strengthLevel <= 3 ? "text-yellow-400" :
                        "text-green-400"
                      )}>{strengthLabels[strengthLevel - 1] || 'Very Weak'}</span>
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Confirm Password</label>
                <input
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={cn(
                    "w-full px-4 py-3 bg-white/[0.04] border rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all",
                    confirmPassword && password !== confirmPassword
                      ? "border-red-500/50"
                      : confirmPassword && password === confirmPassword
                      ? "border-green-500/50"
                      : "border-white/[0.08]"
                  )}
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-400">Passwords do not match</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || password !== confirmPassword || password.length < 8}
                className={cn(
                  "w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200",
                  "bg-gradient-to-r from-purple-600 to-indigo-600",
                  "hover:from-purple-500 hover:to-indigo-500 hover:shadow-lg hover:shadow-purple-500/25",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "flex items-center justify-center gap-2"
                )}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>
          )}
        </div>
      </div>

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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
