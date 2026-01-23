'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Users, CheckCircle2, XCircle, Loader2, LogIn, AlertCircle } from 'lucide-react'
import { useUser } from '@/hooks'

interface InviteData {
  id: string
  role: string
  email: string | null
  discordId: string | null
  campaign: {
    id: string
    name: string
    image_url: string | null
    description: string | null
  }
}

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const token = params.token as string

  const [invite, setInvite] = useState<InviteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [declining, setDeclining] = useState(false)
  const [accepted, setAccepted] = useState(false)

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
    try {
      const response = await fetch(`/api/invite/${token}`, {
        method: 'POST',
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to accept invite')
        return
      }

      setAccepted(true)

      // Redirect to campaign after a brief delay
      setTimeout(() => {
        router.push(`/campaigns/${data.campaignId}/dashboard`)
      }, 2000)
    } catch {
      setError('Failed to accept invite')
    } finally {
      setAccepting(false)
    }
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

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'co_dm':
        return 'Co-DM'
      case 'player':
        return 'Player'
      case 'contributor':
        return 'Contributor'
      case 'guest':
        return 'Guest'
      default:
        return role
    }
  }

  if (loading || userLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#12121a] border border-[--border] rounded-xl p-8 text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Invalid Invite</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <Link href="/home" className="btn btn-primary">
            Go to Home
          </Link>
        </div>
      </div>
    )
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#12121a] border border-[--border] rounded-xl p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Welcome to the Campaign!</h1>
          <p className="text-gray-400 mb-4">
            You&apos;ve joined {invite?.campaign.name} as a {getRoleDisplay(invite?.role || 'player')}.
          </p>
          <p className="text-gray-500 text-sm">Redirecting to campaign...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#12121a] border border-[--border] rounded-xl overflow-hidden">
          {/* Campaign Header */}
          <div className="relative h-32 bg-gradient-to-b from-purple-900/50 to-transparent">
            {invite?.campaign.image_url && (
              <Image
                src={invite.campaign.image_url}
                alt={invite.campaign.name}
                fill
                className="object-cover opacity-30"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#12121a]" />
          </div>

          <div className="p-8 -mt-8 relative">
            <div className="w-16 h-16 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-purple-400" />
            </div>

            <h1 className="text-xl font-bold text-white text-center mb-2">
              You&apos;re Invited!
            </h1>
            <p className="text-gray-400 text-center mb-6">
              You&apos;ve been invited to join <strong className="text-white">{invite?.campaign.name}</strong> as a {getRoleDisplay(invite?.role || 'player')}.
            </p>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-amber-400">
                <LogIn className="w-4 h-4" />
                <span className="text-sm font-medium">Sign in required</span>
              </div>
              <p className="text-amber-300/70 text-sm mt-1">
                Please sign in to accept this invitation.
              </p>
            </div>

            <Link
              href={`/login?redirect=/invite/${token}`}
              className="btn btn-primary w-full"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign In to Accept
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#12121a] border border-[--border] rounded-xl overflow-hidden">
        {/* Campaign Header */}
        <div className="relative h-32 bg-gradient-to-b from-purple-900/50 to-transparent">
          {invite?.campaign.image_url && (
            <Image
              src={invite.campaign.image_url}
              alt={invite.campaign.name}
              fill
              className="object-cover opacity-30"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#12121a]" />
        </div>

        <div className="p-8 -mt-8 relative">
          <div className="w-16 h-16 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-purple-400" />
          </div>

          <h1 className="text-xl font-bold text-white text-center mb-2">
            You&apos;re Invited!
          </h1>
          <p className="text-gray-400 text-center mb-2">
            You&apos;ve been invited to join <strong className="text-white">{invite?.campaign.name}</strong>
          </p>
          <p className="text-center mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 text-purple-400 rounded-full text-sm">
              {getRoleDisplay(invite?.role || 'player')}
            </span>
          </p>

          {invite?.campaign.description && (
            <p className="text-gray-500 text-sm text-center mb-6 line-clamp-3">
              {invite.campaign.description}
            </p>
          )}

          {/* Email mismatch warning */}
          {invite?.email && user.email?.toLowerCase() !== invite.email.toLowerCase() && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Email mismatch</span>
              </div>
              <p className="text-amber-300/70 text-sm mt-1">
                This invite was sent to {invite.email}. You&apos;re signed in as {user.email}.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleDecline}
              disabled={declining || accepting}
              className="btn btn-secondary flex-1"
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
              className="btn btn-primary flex-1"
            >
              {accepting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Accept
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
