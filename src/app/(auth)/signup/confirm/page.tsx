'use client'

import Link from 'next/link'
import { Mail, ArrowRight, CheckCircle } from 'lucide-react'

export default function SignupConfirmPage() {
  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#0a0a0f]">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(139, 92, 246, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.3) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md mx-auto px-6">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Mail className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Check Your Email</h1>
          <p className="text-gray-400">We've sent you a confirmation link</p>
        </div>

        <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-8 shadow-2xl">
          <div className="space-y-6">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <CheckCircle className="w-6 h-6 text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-medium">Almost there!</p>
                <p className="text-gray-400 text-sm mt-1">
                  Click the confirmation link in your email to activate your account.
                  Check your spam folder if you don't see it.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-gray-500">What happens next:</p>
              <ol className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold">1</span>
                  Open the email from Multiloop
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold">2</span>
                  Click "Confirm Email" button
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold">3</span>
                  Sign in and start your adventure
                </li>
              </ol>
            </div>

            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors"
            >
              Go to Sign In
              <ArrowRight className="w-4 h-4" />
            </Link>

            <p className="text-center text-xs text-gray-500">
              Didn't receive an email?{' '}
              <Link href="/login" className="text-purple-400 hover:text-purple-300">
                Try signing up again
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-600">
          © {new Date().getFullYear()} Multiloop. All rights reserved.
        </p>
      </div>
    </div>
  )
}
