'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Clock, Swords, Shield, Users, Loader2, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

// Common D&D conditions with colors
const CONDITIONS: Record<string, { name: string; color: string }> = {
  blinded: { name: 'Blinded', color: 'bg-gray-500' },
  charmed: { name: 'Charmed', color: 'bg-pink-500' },
  deafened: { name: 'Deafened', color: 'bg-gray-400' },
  frightened: { name: 'Frightened', color: 'bg-yellow-500' },
  grappled: { name: 'Grappled', color: 'bg-orange-500' },
  incapacitated: { name: 'Incapacitated', color: 'bg-red-700' },
  invisible: { name: 'Invisible', color: 'bg-blue-300' },
  paralyzed: { name: 'Paralyzed', color: 'bg-purple-600' },
  petrified: { name: 'Petrified', color: 'bg-stone-500' },
  poisoned: { name: 'Poisoned', color: 'bg-green-500' },
  prone: { name: 'Prone', color: 'bg-amber-600' },
  restrained: { name: 'Restrained', color: 'bg-orange-600' },
  stunned: { name: 'Stunned', color: 'bg-yellow-600' },
  unconscious: { name: 'Unconscious', color: 'bg-red-900' },
  exhaustion: { name: 'Exhaustion', color: 'bg-slate-600' },
  concentration: { name: 'Concentrating', color: 'bg-cyan-500' },
}

interface InitiativeEntry {
  id: string
  name: string
  initiative: number
  hp?: number
  maxHp?: number
  ac?: number
  isPlayer: boolean
  conditions: string[]
}

interface SessionState {
  initiative: InitiativeEntry[]
  currentTurn: number
  timerSeconds: number
}

export default function PlayerViewPage() {
  const params = useParams()
  const code = params.code as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionState, setSessionState] = useState<SessionState | null>(null)
  const [oneshotTitle, setOneshotTitle] = useState<string>('')

  // Load initial data and subscribe to updates
  useEffect(() => {
    const supabase = createClient()

    const loadSession = async () => {
      // Fetch the run session
      const { data: session, error: sessionError } = await supabase
        .from('run_sessions')
        .select('session_state, oneshot_id, is_active')
        .eq('share_code', code)
        .single()

      if (sessionError || !session) {
        setError('Session not found or has ended')
        setLoading(false)
        return
      }

      if (!session.is_active) {
        setError('This session has ended')
        setLoading(false)
        return
      }

      setSessionState(session.session_state as SessionState)

      // Fetch oneshot title
      const { data: oneshot } = await supabase
        .from('oneshots')
        .select('title')
        .eq('id', session.oneshot_id)
        .single()

      if (oneshot) {
        setOneshotTitle(oneshot.title)
      }

      setLoading(false)
    }

    loadSession()

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`run_session_${code}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'run_sessions',
          filter: `share_code=eq.${code}`,
        },
        (payload) => {
          const newData = payload.new as { session_state: SessionState; is_active: boolean }
          if (!newData.is_active) {
            setError('This session has ended')
          } else {
            setSessionState(newData.session_state)
          }
        }
      )
      .subscribe()

    // Poll every 5 seconds as a fallback
    const pollInterval = setInterval(async () => {
      const { data: session } = await supabase
        .from('run_sessions')
        .select('session_state, is_active')
        .eq('share_code', code)
        .single()

      if (session) {
        if (!session.is_active) {
          setError('This session has ended')
        } else {
          setSessionState(session.session_state as SessionState)
        }
      }
    }, 5000)

    return () => {
      channel.unsubscribe()
      clearInterval(pollInterval)
    }
  }, [code])

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center gap-4 p-4">
        <AlertTriangle className="w-12 h-12 text-amber-400" />
        <h1 className="text-xl font-semibold text-white">{error}</h1>
        <p className="text-gray-400 text-center">
          Ask your DM for a new link if the session is still running.
        </p>
      </div>
    )
  }

  if (!sessionState) return null

  const { initiative, currentTurn, timerSeconds } = sessionState

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0d0d0f]/95 backdrop-blur-xl border-b border-white/[0.06] p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">{oneshotTitle || 'Session'}</h1>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Users className="w-3 h-3" />
              Player View
            </p>
          </div>

          {/* Timer Display */}
          <div className="flex items-center gap-2 bg-white/[0.03] rounded-xl px-4 py-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="font-mono text-xl font-semibold text-white tabular-nums">
              {formatTime(timerSeconds)}
            </span>
          </div>
        </div>
      </header>

      {/* Initiative List */}
      <main className="flex-1 p-4">
        <div className="max-w-2xl mx-auto space-y-2">
          {initiative.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Swords className="w-12 h-12 text-gray-600 mb-3" />
              <p className="text-gray-500">Waiting for combat to begin...</p>
            </div>
          ) : (
            initiative.map((entry, index) => (
              <div
                key={entry.id}
                className={cn(
                  "p-4 rounded-xl transition-all",
                  index === currentTurn
                    ? "bg-purple-500/20 border-2 border-purple-500/50 scale-[1.02]"
                    : "bg-white/[0.02] border border-transparent",
                  entry.hp === 0 && "opacity-40"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center text-lg font-mono font-bold",
                      index === currentTurn
                        ? "bg-purple-500 text-white"
                        : "bg-white/10 text-white"
                    )}>
                      {entry.initiative}
                    </span>
                    <div>
                      <span className={cn(
                        "font-semibold text-lg",
                        entry.isPlayer ? "text-emerald-400" : "text-white"
                      )}>
                        {entry.name}
                      </span>
                      {index === currentTurn && (
                        <span className="ml-2 text-xs text-purple-400 uppercase tracking-wider">
                          Current Turn
                        </span>
                      )}
                    </div>
                  </div>

                  {/* AC Badge */}
                  {entry.ac && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-white/[0.05] rounded-lg">
                      <Shield className="w-3 h-3 text-gray-400" />
                      <span className="text-sm font-medium text-gray-300">{entry.ac}</span>
                    </div>
                  )}
                </div>

                {/* Conditions Display */}
                {entry.conditions && entry.conditions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {entry.conditions.map(condId => {
                      const cond = CONDITIONS[condId]
                      if (!cond) return null
                      return (
                        <span
                          key={condId}
                          className={cn(
                            "px-2 py-0.5 rounded text-xs font-medium text-white",
                            cond.color
                          )}
                        >
                          {cond.name}
                        </span>
                      )
                    })}
                  </div>
                )}

                {/* HP Bar (only for monsters, hidden for players) */}
                {!entry.isPlayer && entry.hp !== undefined && entry.maxHp !== undefined && (
                  <div className="mt-3">
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all",
                          entry.hp > entry.maxHp * 0.5 ? "bg-emerald-500" :
                          entry.hp > entry.maxHp * 0.25 ? "bg-amber-500" : "bg-red-500"
                        )}
                        style={{ width: `${(entry.hp / entry.maxHp) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1 text-center">
                      {entry.hp > entry.maxHp * 0.5 ? 'Healthy' :
                       entry.hp > entry.maxHp * 0.25 ? 'Bloodied' :
                       entry.hp > 0 ? 'Critical' : 'Down'}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 border-t border-white/[0.06]">
        <p className="text-center text-xs text-gray-600">
          Initiative tracker powered by Multiloop
        </p>
      </footer>
    </div>
  )
}
