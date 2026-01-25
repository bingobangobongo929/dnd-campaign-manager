'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
  LogIn,
  AlertCircle,
  UserPlus,
  Shield,
  Crown,
  Eye,
  Pencil,
  User,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { useUser } from '@/hooks'
import { JoinWithCharacterModal } from '@/components/campaign'

interface InviteData {
  id: string
  role: string
  email: string | null
  discordUsername: string | null
  campaign: {
    id: string
    name: string
    image_url: string | null
    description: string | null
  }
  character?: {
    name: string
  } | null
  hasExistingAccount?: boolean
}

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const token = params.token as string

  const [invite, setInvite] = useState<InviteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requiresDiscord, setRequiresDiscord] = useState(false)
  const [discordMismatch, setDiscordMismatch] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [declining, setDeclining] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [showCharacterModal, setShowCharacterModal] = useState(false)
  const [joinedCampaignId, setJoinedCampaignId] = useState<string | null>(null)

  // Fetch invite details
  useEffect(() => {
    async function fetchInvite() {
      try {
        const response = await fetch(`/api/invite/${token}`)
        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Invalid invite')
          return
        }

        setInvite(data.invite)
      } catch {
        setError('Failed to load invite')
      } finally {
        setLoading(false)
      }
    }

    fetchInvite()
  }, [token])

  const handleAccept = async () => {
    setAccepting(true)
    setRequiresDiscord(false)
    setDiscordMismatch(null)
    try {
      const response = await fetch(`/api/invite/${token}`, {
        method: 'POST',
      })
      const data = await response.json()

      if (!response.ok) {
        // Handle Discord-specific errors
        if (data.requiresDiscord) {
          setRequiresDiscord(true)
          setError(null)
          return
        }
        if (data.expectedDiscord) {
          setDiscordMismatch(data.expectedDiscord)
          setError(null)
          return
        }
        setError(data.error || 'Failed to accept invite')
        return
      }

      setJoinedCampaignId(data.campaignId)

      // For player role, show character selection modal
      const role = invite?.role || 'player'
      if (role === 'player' || role === 'contributor') {
        setShowCharacterModal(true)
      } else {
        // For DM roles, go straight to campaign
        setAccepted(true)
        setTimeout(() => {
          router.push(`/campaigns/${data.campaignId}/dashboard`)
        }, 2000)
      }
    } catch {
      setError('Failed to accept invite')
    } finally {
      setAccepting(false)
    }
  }

  const handleCharacterJoinComplete = () => {
    setShowCharacterModal(false)
    setAccepted(true)
    setTimeout(() => {
      router.push(`/campaigns/${joinedCampaignId}/dashboard`)
    }, 2000)
  }

  const handleDecline = async () => {
    setDeclining(true)
    try {
      const response = await fetch(`/api/invite/${token}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Failed to decline invite')
        return
      }

      router.push('/home')
    } catch {
      setError('Failed to decline invite')
    } finally {
      setDeclining(false)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'co_dm': return Shield
      case 'player': return User
      case 'contributor': return Pencil
      case 'guest': return Eye
      default: return User
    }
  }

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'co_dm': return 'Co-DM'
      case 'player': return 'Player'
      case 'contributor': return 'Contributor'
      case 'guest': return 'Guest'
      default: return role
    }
  }

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'co_dm': return 'Full access to manage the campaign alongside the DM'
      case 'player': return 'Join the adventure with your own character'
      case 'contributor': return 'Add session notes and contribute to the story'
      case 'guest': return 'View the campaign content'
      default: return ''
    }
  }

  // Check if email matches (if invite has email restriction)
  const emailMatches = !invite?.email || !user?.email ||
    user.email.toLowerCase() === invite.email.toLowerCase()

  if (loading || userLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
        <InviteHeader />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
        <InviteFooter />
      </div>
    )
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
        <InviteHeader />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#12121a] border border-[--border] rounded-2xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Invite Not Found</h1>
            <p className="text-gray-400 mb-6">
              This invite link may have expired or already been used.
            </p>
            <Link href="/" className="btn btn-primary">
              Go to Homepage
            </Link>
          </div>
        </div>
        <InviteFooter />
      </div>
    )
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
        <InviteHeader />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#12121a] border border-[--border] rounded-2xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Welcome to the Party!</h1>
            <p className="text-gray-400 mb-4">
              You&apos;ve joined <span className="text-white font-medium">{invite?.campaign.name}</span> as a {getRoleDisplay(invite?.role || 'player')}.
            </p>
            <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Taking you to your campaign...</span>
            </div>
          </div>
        </div>
        <InviteFooter />
      </div>
    )
  }

  const RoleIcon = getRoleIcon(invite?.role || 'player')

  // Not logged in - show invite details and encourage signup
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
        <InviteHeader />

        <main className="flex-1 flex items-center justify-center p-4 py-12">
          <div className="max-w-lg w-full">
            {/* Campaign Card */}
            <div className="bg-[#12121a] border border-[--border] rounded-2xl overflow-hidden">
              {/* Campaign Header Image */}
              <div className="relative h-40 bg-gradient-to-br from-purple-900/50 via-indigo-900/30 to-purple-900/50">
                {invite?.campaign.image_url && (
                  <Image
                    src={invite.campaign.image_url}
                    alt={invite.campaign.name}
                    fill
                    className="object-cover opacity-40"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#12121a] via-transparent" />

                {/* Decorative */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl" />
              </div>

              <div className="p-8 -mt-12 relative">
                {/* Icon */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 shadow-lg shadow-purple-500/30 flex items-center justify-center mx-auto mb-5">
                  <Users className="w-8 h-8 text-white" />
                </div>

                <h1 className="text-2xl font-bold text-white text-center mb-2">
                  You&apos;re Invited!
                </h1>

                <p className="text-gray-400 text-center mb-6">
                  Join <span className="text-white font-semibold">{invite?.campaign.name}</span>
                </p>

                {/* Role Badge */}
                <div className="flex justify-center mb-6">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full">
                    <RoleIcon className="w-4 h-4 text-purple-400" />
                    <span className="text-purple-300 font-medium">{getRoleDisplay(invite?.role || 'player')}</span>
                  </div>
                </div>

                {/* Role Description */}
                <p className="text-gray-500 text-sm text-center mb-6">
                  {getRoleDescription(invite?.role || 'player')}
                </p>

                {invite?.campaign.description && (
                  <p className="text-gray-400 text-sm text-center mb-8 line-clamp-3 border-t border-[--border] pt-6">
                    {invite.campaign.description}
                  </p>
                )}

                {/* Auth Options - Smart based on invite type */}
                <div className="space-y-4">
                  {invite?.discordUsername ? (
                    // Discord-based invite
                    <>
                      <div className="bg-[#5865F2]/10 border border-[#5865F2]/30 rounded-xl p-5">
                        <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                          <svg className="w-4 h-4 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                          </svg>
                          Sign in with Discord
                        </h3>
                        <p className="text-gray-500 text-sm mb-4">
                          This invite was sent to <span className="text-white">{invite.discordUsername}</span>. Sign in with Discord to join.
                        </p>
                        <Link
                          href={`/login?redirect=/invite/${token}`}
                          className="btn w-full justify-center bg-[#5865F2] hover:bg-[#4752C4] text-white"
                        >
                          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                          </svg>
                          Continue with Discord
                        </Link>
                      </div>

                      <p className="text-center text-xs text-gray-500">
                        Already have an account?{' '}
                        <Link href={`/login?redirect=/invite/${token}`} className="text-purple-400 hover:text-purple-300">
                          Sign in and link Discord
                        </Link>
                      </p>
                    </>
                  ) : invite?.hasExistingAccount ? (
                    // Email has an existing account - prompt to sign in
                    <>
                      <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-5">
                        <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                          <LogIn className="w-4 h-4 text-purple-400" />
                          Welcome Back!
                        </h3>
                        <p className="text-gray-500 text-sm mb-4">
                          Sign in with <span className="text-white">{invite.email}</span> to accept this invite.
                        </p>
                        <Link
                          href={`/login?redirect=/invite/${token}`}
                          className="btn btn-primary w-full justify-center"
                        >
                          <LogIn className="w-4 h-4 mr-2" />
                          Sign In to Join
                        </Link>
                      </div>

                      <p className="text-center text-xs text-gray-500">
                        Not your account?{' '}
                        <Link href={`/login?redirect=/invite/${token}&mode=signup`} className="text-purple-400 hover:text-purple-300">
                          Create a new one
                        </Link>
                      </p>
                    </>
                  ) : (
                    // No existing account - prompt to create one
                    <>
                      <div className="bg-white/[0.02] border border-[--border] rounded-xl p-5">
                        <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                          <UserPlus className="w-4 h-4 text-purple-400" />
                          New to Multiloop?
                        </h3>
                        <p className="text-gray-500 text-sm mb-4">
                          Create a free account to join this campaign and start your adventure.
                        </p>
                        <Link
                          href={`/login?redirect=/invite/${token}&mode=signup`}
                          className="btn btn-primary w-full justify-center"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Create Account & Join
                        </Link>
                      </div>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-[--border]" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                          <span className="px-3 bg-[#12121a] text-gray-500">or</span>
                        </div>
                      </div>

                      <Link
                        href={`/login?redirect=/invite/${token}`}
                        className="btn btn-secondary w-full justify-center"
                      >
                        <LogIn className="w-4 h-4 mr-2" />
                        Sign In with Existing Account
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Trust indicators */}
            <div className="mt-6 flex items-center justify-center gap-6 text-xs text-gray-600">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Secure & Private
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Free to Join
              </span>
            </div>
          </div>
        </main>

        <InviteFooter showCTA={false} />
      </div>
    )
  }

  // Logged in but email doesn't match
  if (!emailMatches) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
        <InviteHeader user={user} />

        <main className="flex-1 flex items-center justify-center p-4 py-12">
          <div className="max-w-md w-full bg-[#12121a] border border-[--border] rounded-2xl p-8">
            {/* Warning Icon */}
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-amber-400" />
            </div>

            <h1 className="text-xl font-bold text-white text-center mb-2">
              Wrong Account
            </h1>

            <p className="text-gray-400 text-center mb-6">
              This invite was sent to <span className="text-white font-medium">{invite?.email}</span>, but you&apos;re signed in as <span className="text-white font-medium">{user.email}</span>.
            </p>

            {/* Campaign Info */}
            <div className="bg-white/[0.02] border border-[--border] rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                {invite?.campaign.image_url ? (
                  <Image
                    src={invite.campaign.image_url}
                    alt={invite.campaign.name}
                    width={48}
                    height={48}
                    className="rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-400" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-white">{invite?.campaign.name}</p>
                  <p className="text-sm text-gray-500">as {getRoleDisplay(invite?.role || 'player')}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Link
                href={`/api/auth/logout?redirect=/invite/${token}`}
                className="btn btn-primary w-full justify-center"
              >
                Sign Out & Use Correct Account
              </Link>
              <Link
                href="/home"
                className="btn btn-secondary w-full justify-center"
              >
                Go to My Dashboard
              </Link>
            </div>
          </div>
        </main>

        <InviteFooter />
      </div>
    )
  }

  // Logged in and ready to accept
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      <InviteHeader user={user} />

      <main className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="max-w-lg w-full">
          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Campaign Card */}
          <div className="bg-[#12121a] border border-[--border] rounded-2xl overflow-hidden">
            {/* Campaign Header Image */}
            <div className="relative h-40 bg-gradient-to-br from-purple-900/50 via-indigo-900/30 to-purple-900/50">
              {invite?.campaign.image_url && (
                <Image
                  src={invite.campaign.image_url}
                  alt={invite.campaign.name}
                  fill
                  className="object-cover opacity-40"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#12121a] via-transparent" />
            </div>

            <div className="p-8 -mt-12 relative">
              {/* Icon */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 shadow-lg shadow-purple-500/30 flex items-center justify-center mx-auto mb-5">
                <Users className="w-8 h-8 text-white" />
              </div>

              <h1 className="text-2xl font-bold text-white text-center mb-2">
                Join the Adventure
              </h1>

              <p className="text-gray-400 text-center mb-6">
                You&apos;ve been invited to <span className="text-white font-semibold">{invite?.campaign.name}</span>
              </p>

              {/* Role Badge */}
              <div className="flex justify-center mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full">
                  <RoleIcon className="w-4 h-4 text-purple-400" />
                  <span className="text-purple-300 font-medium">{getRoleDisplay(invite?.role || 'player')}</span>
                </div>
              </div>

              {invite?.campaign.description && (
                <p className="text-gray-400 text-sm text-center mb-8 line-clamp-3">
                  {invite.campaign.description}
                </p>
              )}

              {/* Discord linking required warning */}
              {requiresDiscord && (
                <div className="bg-[#5865F2]/10 border border-[#5865F2]/30 rounded-xl p-5 mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <svg className="w-6 h-6 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    <h3 className="font-medium text-white">Link Your Discord</h3>
                  </div>
                  <p className="text-gray-400 text-sm mb-4">
                    This invite was sent to a Discord account. Link your Discord in Settings to join this campaign.
                  </p>
                  <Link
                    href={`/settings?redirect=/invite/${token}`}
                    className="btn btn-primary w-full justify-center"
                  >
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    Go to Settings
                  </Link>
                </div>
              )}

              {/* Discord mismatch warning */}
              {discordMismatch && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <AlertCircle className="w-6 h-6 text-amber-400" />
                    <h3 className="font-medium text-white">Wrong Discord Account</h3>
                  </div>
                  <p className="text-gray-400 text-sm mb-3">
                    This invite was sent to <span className="text-white font-medium">{discordMismatch}</span>, but you&apos;re linked with a different Discord account.
                  </p>
                  <p className="text-gray-500 text-xs">
                    Go to Settings to link the correct Discord account, or ask the DM to send a new invite.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleDecline}
                  disabled={declining || accepting}
                  className="btn btn-secondary flex-1 justify-center"
                >
                  {declining ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Decline'
                  )}
                </button>
                <button
                  onClick={handleAccept}
                  disabled={accepting || declining}
                  className="btn btn-primary flex-1 justify-center"
                >
                  {accepting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Accept & Join
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <InviteFooter />

      {/* Character Selection Modal */}
      {joinedCampaignId && invite && (
        <JoinWithCharacterModal
          isOpen={showCharacterModal}
          onClose={() => setShowCharacterModal(false)}
          campaignId={joinedCampaignId}
          campaignName={invite.campaign.name}
          onJoinComplete={handleCharacterJoinComplete}
        />
      )}
    </div>
  )
}

// Simple header component for invite pages
function InviteHeader({ user }: { user?: { email?: string } } = {}) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0a0a0f]/95 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg overflow-hidden shadow-lg shadow-purple-500/20">
              <img src="/icons/icon-192x192.png" alt="Multiloop" className="w-full h-full object-cover" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white">Multiloop</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                BETA
              </span>
            </div>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user ? (
              <Link
                href="/home"
                className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
              >
                My Dashboard
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

// Simple footer component
function InviteFooter({ showCTA = true }: { showCTA?: boolean } = {}) {
  return (
    <footer className="border-t border-white/[0.06]">
      {showCTA && (
        <div className="bg-gradient-to-r from-purple-900/10 via-indigo-900/10 to-purple-900/10 py-8">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <p className="text-gray-400 text-sm mb-3">
              Multiloop helps tabletop RPG groups organize campaigns, track adventures, and build worlds together.
            </p>
            <Link
              href="/"
              className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
            >
              Learn more about Multiloop
            </Link>
          </div>
        </div>
      )}
      <div className="bg-[#0a0a0f] py-4">
        <p className="text-center text-xs text-gray-600">
          Forge stories. Track adventures. Remember legends.
        </p>
      </div>
    </footer>
  )
}
