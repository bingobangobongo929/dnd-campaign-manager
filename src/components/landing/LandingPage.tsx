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
  XCircle,
  Clock,
  Star,
  Zap,
  Heart,
  ArrowRight,
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

// Reusable Waitlist Form Component
function WaitlistForm({
  source = 'hero',
  buttonText = 'Join the Waitlist',
  className = '',
  onSuccess,
}: {
  source?: string
  buttonText?: string
  className?: string
  onSuccess?: () => void
}) {
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(true)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !consent) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, consent, source }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to join waitlist')
        return
      }

      setSubmitted(true)
      onSuccess?.()
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className={cn("inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/30", className)}>
        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
          <Check className="w-5 h-5 text-purple-400" />
        </div>
        <div className="text-left">
          <p className="font-semibold text-white">Check your inbox!</p>
          <p className="text-sm text-gray-400">Confirm your email to secure your spot.</p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={cn("w-full max-w-md", className)}>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-5 py-3.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading || !consent}
          className="px-6 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 whitespace-nowrap"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              {buttonText}
            </>
          )}
        </button>
      </div>

      {/* Consent checkbox */}
      <label className="flex items-start gap-3 mt-4 cursor-pointer group">
        <div className="relative mt-0.5">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="sr-only"
          />
          <div className={cn(
            "w-5 h-5 rounded border-2 transition-all flex items-center justify-center",
            consent
              ? "bg-purple-600 border-purple-600"
              : "border-gray-600 group-hover:border-gray-500"
          )}>
            {consent && <Check className="w-3 h-3 text-white" />}
          </div>
        </div>
        <span className="text-sm text-gray-400 leading-tight">
          I agree to receive email updates about early access.{' '}
          <Link href="/privacy" className="text-purple-400 hover:text-purple-300 underline">
            Privacy Policy
          </Link>
        </span>
      </label>

      {error && (
        <p className="mt-3 text-sm text-red-400 flex items-center gap-2">
          <XCircle className="w-4 h-4" />
          {error}
        </p>
      )}
    </form>
  )
}

export function LandingPage() {
  const searchParams = useSearchParams()
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
              <a
                href="#waitlist"
                className="text-sm font-medium px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white transition-all flex items-center gap-2 shadow-lg shadow-purple-500/20"
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Join Waitlist</span>
                <span className="sm:hidden">Join</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="waitlist" className="relative pt-28 pb-16 px-4 overflow-hidden">
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
          {/* Exclusive Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/10 to-purple-500/10 border border-amber-500/30 mb-8">
            <Crown className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-300">Founding Members Only</span>
            <span className="w-1 h-1 rounded-full bg-amber-400/50" />
            <span className="text-sm text-gray-400">Closed Beta</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            <span className="whitespace-nowrap">Track Campaigns.</span>{' '}
            <span className="whitespace-nowrap bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Build Characters.
            </span>
            <br className="hidden sm:block" />
            <span className="sm:hidden"> </span>
            <span className="whitespace-nowrap">Chronicle Your Epic Journeys.</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            The ultimate companion for Dungeon Masters and players. Join now to become a
            Founding Member with exclusive early access and permanent benefits.
          </p>

          {/* Show verification status from URL param */}
          {verificationStatus && VERIFICATION_MESSAGES[verificationStatus] && (
            <div className={cn(
              "inline-flex items-center gap-2 px-6 py-4 rounded-xl border mb-8",
              VERIFICATION_MESSAGES[verificationStatus].color
            )}>
              {(() => {
                const Icon = VERIFICATION_MESSAGES[verificationStatus].icon
                return <Icon className="w-5 h-5" />
              })()}
              <span>{VERIFICATION_MESSAGES[verificationStatus].message}</span>
            </div>
          )}

          {/* Waitlist Form - Primary CTA */}
          {verificationStatus !== 'confirmed' && verificationStatus !== 'already-verified' && (
            <div className="flex justify-center mb-8">
              <WaitlistForm source="hero" />
            </div>
          )}

          {/* Founding Member Benefits */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Star className="w-3 h-3 text-purple-400" />
              </div>
              <span>Permanent Founder badge</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Zap className="w-3 h-3 text-purple-400" />
              </div>
              <span>Early access before open beta</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Heart className="w-3 h-3 text-purple-400" />
              </div>
              <span>Shape the product with your feedback</span>
            </div>
          </div>

          {/* Secondary Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#demo"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              <span>Explore the demo first</span>
              <ChevronRight className="w-4 h-4" />
            </a>
            <span className="hidden sm:block text-gray-600">|</span>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
            >
              <span>Already have an invite?</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Social Proof / Trust Banner */}
      <section className="py-6 px-4 border-y border-white/[0.06] bg-gradient-to-r from-purple-900/5 via-transparent to-indigo-900/5">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span>Your data is encrypted & private</span>
            </div>
            <div className="flex items-center gap-2">
              <Dices className="w-4 h-4 text-purple-500" />
              <span>Built by tabletop enthusiasts</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Open beta launching Q1 2026</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] mb-4">
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span className="text-xs text-gray-400 uppercase tracking-wider">What&apos;s Inside</span>
            </div>
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] mb-4">
              <BookOpen className="w-3 h-3 text-purple-400" />
              <span className="text-xs text-gray-400 uppercase tracking-wider">Try It Now</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Preview What&apos;s{' '}
              <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                Waiting For You
              </span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Explore fully-featured demo content. No account needed.
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
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/20">
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
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
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
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20">
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

      {/* Bottom CTA Section - Founding Members */}
      <section className="py-20 px-4 border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-3xl bg-gradient-to-b from-purple-900/20 to-indigo-900/20 border border-purple-500/20 p-8 sm:p-12 overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] -z-10" />

            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 mb-6">
                <Star className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-amber-300">Become a Founding Member</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Secure Your Spot as a{' '}
                <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                  Founder
                </span>
              </h2>

              <p className="text-gray-400 mb-8 max-w-xl mx-auto">
                Join now and lock in your Founding Member status forever. Early supporters get permanent recognition
                and help shape the future of Multiloop.
              </p>

              {/* Benefits Grid */}
              <div className="grid sm:grid-cols-3 gap-4 mb-8">
                <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                  <Star className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-white">Founder Badge</p>
                  <p className="text-xs text-gray-500">Displayed forever on your profile</p>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                  <Zap className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-white">Priority Access</p>
                  <p className="text-xs text-gray-500">First to try new features</p>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                  <Heart className="w-6 h-6 text-pink-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-white">Direct Feedback</p>
                  <p className="text-xs text-gray-500">Help shape the product</p>
                </div>
              </div>

              {/* Waitlist Form */}
              <div className="flex justify-center mb-6">
                <WaitlistForm source="footer" buttonText="Reserve My Spot" />
              </div>

              <p className="text-sm text-gray-500">
                Already have an invite?{' '}
                <Link href="/login" className="text-purple-400 hover:text-purple-300 underline">
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
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
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                BETA
              </span>
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
    description: 'Keep detailed session logs with easy recaps, attendee tracking, and timeline integration.',
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
    title: 'Share & Collaborate',
    description: 'Share campaigns and characters with your players via secure links with granular privacy controls.',
    gradient: 'from-pink-600 to-pink-800',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Your data is encrypted and never shared. Full GDPR compliance and data export.',
    gradient: 'from-emerald-600 to-emerald-800',
  },
]
