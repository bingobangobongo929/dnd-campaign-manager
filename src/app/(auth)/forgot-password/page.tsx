'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, Mail, ArrowLeft, CheckCircle, Sparkles, Shield, BookOpen, Dices } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send reset email')
      }

      setSent(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

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

      {/* Content */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 via-indigo-600/20 to-purple-600/20 rounded-2xl blur-xl opacity-75" />

        <div className="relative bg-[#12121a]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-500/10 mb-4">
              <Mail className="w-8 h-8 text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {sent ? 'Check Your Email' : 'Forgot Password?'}
            </h1>
            <p className="text-gray-400 text-sm">
              {sent
                ? 'We\'ve sent you a password reset link'
                : 'Enter your email and we\'ll send you a reset link'}
            </p>
          </div>

          {sent ? (
            <div className="space-y-6">
              <div className="flex items-center justify-center">
                <div className="p-4 bg-green-500/10 rounded-full">
                  <CheckCircle className="w-12 h-12 text-green-400" />
                </div>
              </div>

              <p className="text-center text-gray-300 text-sm">
                If an account exists for <span className="text-purple-400">{email}</span>,
                you will receive an email with instructions to reset your password.
              </p>

              <p className="text-center text-gray-500 text-xs">
                Didn't receive the email? Check your spam folder or try again.
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => { setSent(false); setEmail('') }}
                  className="w-full py-3 px-4 bg-white/[0.04] border border-white/[0.08] rounded-xl text-gray-300 hover:text-white hover:bg-white/[0.06] transition-all"
                >
                  Try Another Email
                </button>
                <Link
                  href="/login"
                  className="w-full py-3 px-4 text-center bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all"
                >
                  Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
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

              <button
                type="submit"
                disabled={loading}
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
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>

              <Link
                href="/login"
                className="flex items-center justify-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </Link>
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
