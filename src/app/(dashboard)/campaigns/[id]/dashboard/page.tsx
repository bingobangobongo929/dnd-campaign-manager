'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Calendar,
  Users,
  Map,
  Clock,
  Brain,
  Plus,
  BookOpen,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  UserPlus,
  FileText,
  ChevronRight,
  LayoutGrid,
  Loader2,
  Share2,
  UsersRound,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { useSupabase, useUser, useIsMobile, usePermissions } from '@/hooks'
import { useAppStore, useCanUseAI } from '@/store'
import { cn, getInitials } from '@/lib/utils'
import type { Campaign, Character, Session, TimelineEvent, PlayerSessionNote, CampaignMember } from '@/types/database'
import { PartyModal } from '@/components/campaign'
import { Modal, AccessDeniedPage } from '@/components/ui'

// Widget component wrapper
function DashboardWidget({
  title,
  icon: Icon,
  className,
  children,
  action,
}: {
  title: string
  icon: React.ElementType
  className?: string
  children: React.ReactNode
  action?: { label: string; href: string } | { label: string; onClick: () => void }
}) {
  return (
    <div className={cn("bg-[#0a0a0f] border border-[--border] rounded-xl overflow-hidden", className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-[--border]">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-[--arcane-purple]" />
          <h3 className="font-medium text-white text-sm">{title}</h3>
        </div>
        {action && (
          'href' in action ? (
            <Link href={action.href} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
              {action.label}
              <ChevronRight className="w-3 h-3" />
            </Link>
          ) : (
            <button onClick={action.onClick} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
              {action.label}
              <ChevronRight className="w-3 h-3" />
            </button>
          )
        )}
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  )
}

// Quick Action Button
function QuickAction({
  icon: Icon,
  label,
  href,
  onClick,
  variant = 'default',
}: {
  icon: React.ElementType
  label: string
  href?: string
  onClick?: () => void
  variant?: 'default' | 'primary'
}) {
  const className = cn(
    "flex flex-col items-center gap-2 p-4 rounded-lg transition-colors",
    variant === 'primary'
      ? "bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 text-purple-300"
      : "bg-white/[0.02] border border-[--border] hover:bg-white/[0.05] text-gray-300"
  )

  if (href) {
    return (
      <Link href={href} className={className}>
        <Icon className="w-5 h-5" />
        <span className="text-xs font-medium">{label}</span>
      </Link>
    )
  }

  return (
    <button onClick={onClick} className={className}>
      <Icon className="w-5 h-5" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  )
}

// Character Card for Party Overview
function PartyMemberCard({ character }: { character: Character }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg border border-[--border]">
      {character.image_url ? (
        <Image
          src={character.image_url}
          alt={character.name}
          width={40}
          height={40}
          className="rounded-full object-cover"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400 font-medium text-sm">
          {getInitials(character.name)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white text-sm truncate">{character.name}</p>
        <p className="text-xs text-gray-500 truncate">
          {character.race && character.class
            ? `${character.race} ${character.class}`
            : character.role || 'Player Character'}
        </p>
      </div>
      {character.status && (
        <span
          className="px-2 py-0.5 text-xs rounded-full"
          style={{
            backgroundColor: `${character.status_color || '#6B7280'}20`,
            color: character.status_color || '#9CA3AF',
          }}
        >
          {character.status}
        </span>
      )}
    </div>
  )
}

// My Character Card for Player Dashboard
function MyCharacterCard({ character, campaignId }: { character: Character; campaignId: string }) {
  return (
    <Link
      href={`/campaigns/${campaignId}/canvas`}
      className="block p-4 bg-gradient-to-br from-purple-600/10 to-purple-600/5 border border-purple-500/20 rounded-xl hover:bg-purple-600/15 transition-colors"
    >
      <div className="flex items-center gap-4">
        {character.image_url ? (
          <Image
            src={character.image_url}
            alt={character.name}
            width={64}
            height={64}
            className="rounded-xl object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-purple-600/30 flex items-center justify-center text-purple-300 font-bold text-xl">
            {getInitials(character.name)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-lg truncate">{character.name}</p>
          <p className="text-sm text-gray-400">
            {character.race && character.class
              ? `${character.race} ${character.class}`
              : character.role || 'Player Character'}
          </p>
          {character.status && (
            <span
              className="inline-block mt-2 px-2 py-0.5 text-xs rounded-full"
              style={{
                backgroundColor: `${character.status_color || '#6B7280'}20`,
                color: character.status_color || '#9CA3AF',
              }}
            >
              {character.status}
            </span>
          )}
        </div>
        <ChevronRight className="w-5 h-5 text-purple-400" />
      </div>
    </Link>
  )
}

export default function CampaignDashboardPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()
  const isMobile = useIsMobile()
  const { trackRecentItem } = useAppStore()
  const canUseAI = useCanUseAI()

  const campaignId = params.id as string

  // Permissions
  const { can, loading: permissionsLoading, isMember, isDm } = usePermissions(campaignId)

  const [loading, setLoading] = useState(true)
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [playerNotes, setPlayerNotes] = useState<PlayerSessionNote[]>([])

  // Player/membership state
  const [membership, setMembership] = useState<CampaignMember | null>(null)
  const [myCharacter, setMyCharacter] = useState<Character | null>(null)
  const [showMembersModal, setShowMembersModal] = useState(false)
  const isOwner = campaign?.user_id === user?.id
  const isPlayer = membership && ['player', 'contributor'].includes(membership.role) && !isOwner

  // Load dashboard data
  useEffect(() => {
    if (user && campaignId) {
      loadDashboardData()
    }
  }, [user, campaignId])

  const loadDashboardData = async () => {
    setLoading(true)

    // Load campaign
    const { data: campaignData } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (!campaignData) {
      router.push('/campaigns')
      return
    }
    setCampaign(campaignData)

    // Track recent visit
    trackRecentItem({
      id: campaignData.id,
      type: 'campaign',
      name: campaignData.name,
      href: `/campaigns/${campaignData.id}/dashboard`,
      imageUrl: campaignData.image_url,
    })

    // Load characters (only PCs for party overview)
    const { data: charactersData } = await supabase
      .from('characters')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('type', { ascending: true })
      .order('name')

    setCharacters(charactersData || [])

    // Load sessions (most recent first)
    const { data: sessionsData } = await supabase
      .from('sessions')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('session_number', { ascending: false })
      .limit(5)

    setSessions(sessionsData || [])

    // Load upcoming timeline events
    const { data: timelineData } = await supabase
      .from('timeline_events')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('event_date', { ascending: false })
      .limit(5)

    setTimelineEvents(timelineData || [])

    // Load player notes (from player_session_notes if available)
    const { data: notesData } = await supabase
      .from('player_session_notes')
      .select('*')
      .in('session_id', (sessionsData || []).map(s => s.id))
      .order('created_at', { ascending: false })
      .limit(5)

    setPlayerNotes(notesData || [])

    // Load current user's membership (if they're a member)
    const { data: membershipData } = await supabase
      .from('campaign_members')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('user_id', user!.id)
      .eq('status', 'active')
      .single()

    if (membershipData) {
      setMembership(membershipData)

      // Load the player's linked character
      if (membershipData.character_id) {
        const playerChar = (charactersData || []).find(c => c.id === membershipData.character_id)
        if (playerChar) {
          setMyCharacter(playerChar)
        }
      }
    }

    setLoading(false)
  }

  // Calculate campaign health metrics
  const pcCharacters = characters.filter(c => c.type === 'pc')
  const npcCharacters = characters.filter(c => c.type === 'npc')
  const npcsMissingDetails = npcCharacters.filter(c => !c.description || c.description.length < 50).length
  const sessionsWithoutNotes = sessions.filter(s => !s.notes || s.notes.length < 20).length

  // Get next session (most recent with future date or highest number)
  const nextSession = sessions[0]

  if (loading || permissionsLoading) {
    return (
      <AppLayout campaignId={campaignId}>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      </AppLayout>
    )
  }

  // Permission check - must be a member to view dashboard
  if (!isMember) {
    return (
      <AppLayout campaignId={campaignId}>
        <AccessDeniedPage
          campaignId={campaignId}
          message="You don't have permission to view this campaign."
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout campaignId={campaignId}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">{campaign?.name}</h1>
            <p className="text-gray-400 text-sm mt-1">
              {isPlayer ? 'Player Dashboard' : 'Campaign Dashboard'}
            </p>
          </div>
          {!isPlayer && (
            <Link
                href={`/campaigns/${campaignId}/canvas`}
                className="btn btn-secondary btn-sm"
              >
                <LayoutGrid className="w-4 h-4 mr-1.5" />
                Canvas
              </Link>
          )}
        </div>

        {/* Player Dashboard - My Character */}
        {isPlayer && (
          <div className="mb-6">
            <DashboardWidget
              title="My Character"
              icon={Users}
              className="mb-4"
            >
              {myCharacter ? (
                <MyCharacterCard character={myCharacter} campaignId={campaignId} />
              ) : (
                <div className="text-center py-6">
                  <Users className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No character assigned yet</p>
                  <p className="text-gray-600 text-xs mt-1">Ask your DM to assign you a character</p>
                </div>
              )}
            </DashboardWidget>
          </div>
        )}

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Quick Actions - Different for players */}
          <DashboardWidget
            title="Quick Actions"
            icon={Sparkles}
            className="lg:col-span-1"
          >
            <div className="grid grid-cols-3 gap-2">
              {isPlayer ? (
                <>
                  <QuickAction
                    icon={FileText}
                    label="Add Notes"
                    href={`/campaigns/${campaignId}/sessions`}
                    variant="primary"
                  />
                  <QuickAction
                    icon={Clock}
                    label="Timeline"
                    href={`/campaigns/${campaignId}/timeline`}
                  />
                  <QuickAction
                    icon={BookOpen}
                    label="Sessions"
                    href={`/campaigns/${campaignId}/sessions`}
                  />
                </>
              ) : (
                <>
                  <QuickAction
                    icon={Plus}
                    label="New Session"
                    href={`/campaigns/${campaignId}/sessions`}
                    variant="primary"
                  />
                  <QuickAction
                    icon={UsersRound}
                    label="Members"
                    onClick={() => setShowMembersModal(true)}
                  />
                  <QuickAction
                    icon={UserPlus}
                    label="Add Character"
                    href={`/campaigns/${campaignId}/canvas`}
                  />
                  {canUseAI && (
                    <QuickAction
                      icon={Brain}
                      label="Intelligence"
                      href={`/campaigns/${campaignId}/intelligence`}
                    />
                  )}
                </>
              )}
              <QuickAction
                icon={Clock}
                label="Timeline"
                href={`/campaigns/${campaignId}/timeline`}
              />
              <QuickAction
                icon={BookOpen}
                label="Lore"
                href={`/campaigns/${campaignId}/lore`}
              />
              <QuickAction
                icon={Map}
                label="Map"
                href={`/campaigns/${campaignId}/map`}
              />
            </div>
          </DashboardWidget>

          {/* Next Session */}
          <DashboardWidget
            title="Next Session"
            icon={Calendar}
            action={nextSession ? { label: 'View All', href: `/campaigns/${campaignId}/sessions` } : undefined}
          >
            {nextSession ? (
              <Link
                href={`/campaigns/${campaignId}/sessions/${nextSession.id}`}
                className="block p-3 bg-purple-600/10 border border-purple-500/20 rounded-lg hover:bg-purple-600/20 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-purple-400 font-medium">Session {nextSession.session_number}</span>
                  <span className="text-xs text-gray-500">{new Date(nextSession.date).toLocaleDateString()}</span>
                </div>
                <p className="text-white font-medium text-sm">
                  {nextSession.title || `Session ${nextSession.session_number}`}
                </p>
                {nextSession.summary && (
                  <p className="text-gray-400 text-xs mt-1 line-clamp-2">{nextSession.summary}</p>
                )}
              </Link>
            ) : (
              <div className="text-center py-6">
                <Calendar className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No sessions yet</p>
                <Link
                  href={`/campaigns/${campaignId}/sessions`}
                  className="text-purple-400 text-sm hover:underline mt-2 inline-block"
                >
                  Create your first session
                </Link>
              </div>
            )}
          </DashboardWidget>

          {/* Campaign Health / Campaign Stats */}
          <DashboardWidget
            title={isPlayer ? "Campaign Stats" : "Campaign Health"}
            icon={isPlayer ? CheckCircle2 : AlertCircle}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Party Members</span>
                <span className="text-white font-medium">{pcCharacters.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Sessions Played</span>
                <span className="text-white font-medium">{sessions.length}</span>
              </div>
              {!isPlayer && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Total Characters</span>
                    <span className="text-white font-medium">{characters.length}</span>
                  </div>
                  {npcsMissingDetails > 0 && (
                    <div className="flex items-center gap-2 p-2 bg-amber-500/10 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                      <span className="text-amber-400 text-xs">{npcsMissingDetails} NPCs need more details</span>
                    </div>
                  )}
                  {sessionsWithoutNotes > 0 && (
                    <div className="flex items-center gap-2 p-2 bg-amber-500/10 rounded-lg">
                      <FileText className="w-4 h-4 text-amber-400" />
                      <span className="text-amber-400 text-xs">{sessionsWithoutNotes} sessions need notes</span>
                    </div>
                  )}
                  {npcsMissingDetails === 0 && sessionsWithoutNotes === 0 && (
                    <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span className="text-green-400 text-xs">Campaign is well documented!</span>
                    </div>
                  )}
                </>
              )}
              {isPlayer && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Timeline Events</span>
                  <span className="text-white font-medium">{timelineEvents.length}</span>
                </div>
              )}
            </div>
          </DashboardWidget>

          {/* Party Overview */}
          <DashboardWidget
            title="Party"
            icon={Users}
            action={{ label: 'View All', href: `/campaigns/${campaignId}/canvas` }}
            className="lg:col-span-2"
          >
            {pcCharacters.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {pcCharacters.slice(0, 6).map(character => (
                  <PartyMemberCard key={character.id} character={character} />
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Users className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No player characters yet</p>
                <Link
                  href={`/campaigns/${campaignId}/canvas`}
                  className="text-purple-400 text-sm hover:underline mt-2 inline-block"
                >
                  Add your first PC
                </Link>
              </div>
            )}
          </DashboardWidget>

          {/* Recent Timeline */}
          <DashboardWidget
            title="Recent Events"
            icon={Clock}
            action={{ label: 'View Timeline', href: `/campaigns/${campaignId}/timeline` }}
          >
            {timelineEvents.length > 0 ? (
              <div className="space-y-3">
                {timelineEvents.slice(0, 4).map(event => (
                  <div key={event.id} className="flex items-start gap-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full mt-1.5",
                      event.is_major ? "bg-purple-500" : "bg-gray-600"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{event.title}</p>
                      <p className="text-gray-500 text-xs">
                        {new Date(event.event_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Clock className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No timeline events yet</p>
                <Link
                  href={`/campaigns/${campaignId}/timeline`}
                  className="text-purple-400 text-sm hover:underline mt-2 inline-block"
                >
                  Add timeline events
                </Link>
              </div>
            )}
          </DashboardWidget>

          {/* Recent Sessions */}
          <DashboardWidget
            title="Recent Sessions"
            icon={BookOpen}
            action={{ label: 'View All', href: `/campaigns/${campaignId}/sessions` }}
            className="lg:col-span-2"
          >
            {sessions.length > 0 ? (
              <div className="space-y-2">
                {sessions.slice(0, 4).map(session => (
                  <Link
                    key={session.id}
                    href={`/campaigns/${campaignId}/sessions/${session.id}`}
                    className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg border border-[--border] hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center text-purple-400 text-sm font-medium">
                        {session.session_number}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">
                          {session.title || `Session ${session.session_number}`}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {new Date(session.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <BookOpen className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No sessions recorded yet</p>
                <Link
                  href={`/campaigns/${campaignId}/sessions`}
                  className="text-purple-400 text-sm hover:underline mt-2 inline-block"
                >
                  Record your first session
                </Link>
              </div>
            )}
          </DashboardWidget>

          {/* Player Notes (if any) */}
          {playerNotes.length > 0 && (
            <DashboardWidget
              title="Player Notes"
              icon={FileText}
              className="lg:col-span-3"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {playerNotes.map(note => (
                  <div
                    key={note.id}
                    className="p-3 bg-white/[0.02] rounded-lg border border-[--border]"
                  >
                    <p className="text-gray-300 text-sm line-clamp-3">{note.notes}</p>
                    <p className="text-gray-500 text-xs mt-2">
                      {new Date(note.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </DashboardWidget>
          )}
        </div>
      </div>

      {/* Party Modal */}
      <PartyModal
        campaignId={campaignId}
        characters={characters}
        isOpen={showMembersModal}
        onClose={() => setShowMembersModal(false)}
      />
    </AppLayout>
  )
}
