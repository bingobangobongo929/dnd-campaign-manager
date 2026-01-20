'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Sparkles,
  Shield,
  BookOpen,
  Dices,
  Users,
  Map,
  Scroll,
  ChevronRight,
  Check,
  Loader2,
  Swords,
  Crown,
  AlertCircle,
  Mail,
  XCircle,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { LegalFooter } from '@/components/ui/legal-footer'

// Verification status messages
const VERIFICATION_MESSAGES: Record<string, { icon: typeof Check; color: string; message: string }> = {
  'confirmed': {
    icon: Check,
    color: 'bg-green-500/10 border-green-500/30 text-green-400',
    message: "You're on the list! We'll email you when early access opens."
  },
  'already-verified': {
    icon: Check,
    color: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    message: "You're already on the waitlist. We'll be in touch!"
  },
  'invalid': {
    icon: XCircle,
    color: 'bg-red-500/10 border-red-500/30 text-red-400',
    message: 'Invalid verification link. Please try signing up again.'
  },
  'expired': {
    icon: Clock,
    color: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    message: 'This verification link has expired. Please sign up again.'
  },
  'error': {
    icon: XCircle,
    color: 'bg-red-500/10 border-red-500/30 text-red-400',
    message: 'Something went wrong. Please try again.'
  },
}

export function LandingPage() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null)

  // Check for verification status in URL
  useEffect(() => {
    const status = searchParams.get('waitlist')
    if (status && VERIFICATION_MESSAGES[status]) {
      setVerificationStatus(status)
      // Clean up URL without causing a navigation
      window.history.replaceState({}, '', '/')
    }
  }, [searchParams])

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to join waitlist')
        return
      }

      setSubmitted(true)
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl overflow-hidden shadow-lg shadow-purple-500/20">
                <img src="/icons/icon-192x192.png" alt="Multiloop" className="w-full h-full object-cover" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white">Multiloop</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  BETA
                </span>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">
                Features
              </a>
              <a href="#demo" className="text-sm text-gray-400 hover:text-white transition-colors">
                Try Demo
              </a>
              <Link href="/changelog" className="text-sm text-gray-400 hover:text-white transition-colors">
                Changelog
              </Link>
            </nav>

            {/* Auth Buttons */}
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm text-gray-400 hover:text-white transition-colors px-4 py-2"
              >
                Sign In
              </Link>
              <Link
                href="/login"
                className="text-sm font-medium px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px] animate-pulse" />
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-900/10 rounded-full blur-[150px]" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(139, 92, 246, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.3) 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        {/* Floating Icons */}
        <div className="absolute top-40 left-[10%] text-purple-500/20 animate-float hidden lg:block">
          <Dices className="w-10 h-10" />
        </div>
        <div className="absolute top-60 right-[15%] text-purple-500/15 animate-float hidden lg:block" style={{ animationDelay: '2s' }}>
          <Shield className="w-12 h-12" />
        </div>
        <div className="absolute bottom-40 left-[20%] text-purple-500/15 animate-float hidden lg:block" style={{ animationDelay: '1s' }}>
          <Scroll className="w-10 h-10" />
        </div>
        <div className="absolute bottom-60 right-[10%] text-purple-500/20 animate-float hidden lg:block" style={{ animationDelay: '3s' }}>
          <Swords className="w-11 h-11" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] mb-8">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-gray-300">Your tabletop adventures, organized</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Track Campaigns.{' '}
            <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Build Characters.
            </span>
            <br />
            Chronicle Your Epic Journeys.
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            The ultimate companion for Dungeon Masters and players. Manage your TTRPG campaigns,
            track session notes, and bring your characters to life.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 hover:shadow-lg hover:shadow-purple-500/25 transition-all"
            >
              <Sparkles className="w-5 h-5" />
              Start Your Adventure
              <ChevronRight className="w-5 h-5" />
            </Link>
            <a
              href="#demo"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-gray-300 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:text-white transition-all"
            >
              <BookOpen className="w-5 h-5" />
              Explore Demo
            </a>
          </div>

          <p className="text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-purple-400 hover:text-purple-300 underline">
              Sign in
            </Link>
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything You Need to Run{' '}
              <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                Epic Games
              </span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              From session zero to the final boss fight, Multiloop has the tools to keep your adventures organized.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="group p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-purple-500/30 hover:bg-white/[0.04] transition-all"
              >
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
                  "bg-gradient-to-br",
                  feature.gradient
                )}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white group-hover:text-purple-300 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="py-20 px-4 border-t border-white/[0.06] bg-gradient-to-b from-transparent to-purple-900/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Try Before You{' '}
              <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                Commit
              </span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Explore fully-featured demo content to see what Multiloop can do for your games.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Demo Campaign */}
            <Link
              href="/demo/campaign"
              className="group relative overflow-hidden rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-purple-500/40 transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="p-6">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center mb-4">
                  <Map className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">The Sunken Citadel</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Explore a complete campaign with NPCs, sessions, and timeline events.
                </p>
                <div className="flex items-center gap-2 text-purple-400 text-sm font-medium">
                  View Campaign
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>

            {/* Demo Character */}
            <Link
              href="/demo/character"
              className="group relative overflow-hidden rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-indigo-500/40 transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="p-6">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center mb-4">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">Lyra Silvervane</h3>
                <p className="text-sm text-gray-400 mb-4">
                  See a detailed character vault with backstory, relationships, and journal.
                </p>
                <div className="flex items-center gap-2 text-indigo-400 text-sm font-medium">
                  View Character
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>

            {/* Demo One-Shot */}
            <Link
              href="/demo/oneshot"
              className="group relative overflow-hidden rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-amber-500/40 transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="p-6">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center mb-4">
                  <Crown className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">The Night Market</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Discover a ready-to-run one-shot with encounters and NPCs.
                </p>
                <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
                  View One-Shot
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Waitlist / CTA Section */}
      <section className="py-20 px-4 border-t border-white/[0.06]">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 mb-6">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-amber-300">Closed Beta - Open Beta Q1 2026</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to Begin Your{' '}
            <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Adventure?
            </span>
          </h2>
          <p className="text-gray-400 mb-8">
            We&apos;re currently in closed beta while we polish the experience. Request early access below
            or sign in with your invite code. Open beta is planned for Q1 2026.
          </p>

          {/* Show verification status from URL param */}
          {verificationStatus && VERIFICATION_MESSAGES[verificationStatus] && (
            <div className={cn(
              "inline-flex items-center gap-2 px-6 py-4 rounded-xl border mb-6",
              VERIFICATION_MESSAGES[verificationStatus].color
            )}>
              {(() => {
                const Icon = VERIFICATION_MESSAGES[verificationStatus].icon
                return <Icon className="w-5 h-5" />
              })()}
              <span>{VERIFICATION_MESSAGES[verificationStatus].message}</span>
            </div>
          )}

          {submitted ? (
            <div className="inline-flex items-center gap-2 px-6 py-4 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Mail className="w-5 h-5" />
              <span>Check your email to confirm your spot on the waitlist!</span>
            </div>
          ) : verificationStatus === 'confirmed' || verificationStatus === 'already-verified' ? null : (
            <div className="max-w-md mx-auto">
              <form onSubmit={handleWaitlist} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>Request Access</>
                  )}
                </button>
              </form>
              {error && (
                <p className="mt-3 text-sm text-red-400">{error}</p>
              )}
            </div>
          )}

          <p className="text-sm text-gray-500 mt-6">
            Already have an invite?{' '}
            <Link href="/login" className="text-purple-400 hover:text-purple-300 underline">
              Sign in here
            </Link>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg overflow-hidden">
                <img src="/icons/icon-192x192.png" alt="Multiloop" className="w-full h-full object-cover" />
              </div>
              <span className="text-gray-400">Multiloop</span>
            </div>

            <LegalFooter className="!mt-0" />
          </div>

          <p className="text-center text-sm text-gray-600 mt-8">
            Forge stories. Track adventures. Remember legends.
          </p>
        </div>
      </footer>

      {/* Animation styles */}
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

const features = [
  {
    icon: Map,
    title: 'Campaign Canvas',
    description: 'Organize your campaigns with an intuitive visual canvas. Track characters, locations, and plot threads.',
    gradient: 'from-purple-600 to-purple-800',
  },
  {
    icon: Users,
    title: 'Character Vault',
    description: 'Build rich character profiles with backstories, relationships, and session journals.',
    gradient: 'from-indigo-600 to-indigo-800',
  },
  {
    icon: BookOpen,
    title: 'Session Notes',
    description: 'Keep detailed session logs with AI-assisted summaries and timeline tracking.',
    gradient: 'from-violet-600 to-violet-800',
  },
  {
    icon: Scroll,
    title: 'One-Shots Library',
    description: 'Organize and plan one-shot adventures with encounters, NPCs, and session guides.',
    gradient: 'from-amber-600 to-amber-800',
  },
  {
    icon: Sparkles,
    title: 'AI Assistant',
    description: 'Get help with NPC names, plot hooks, and session recaps powered by AI.',
    gradient: 'from-pink-600 to-pink-800',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Your data is encrypted and never shared. Full GDPR compliance and data export.',
    gradient: 'from-emerald-600 to-emerald-800',
  },
]

