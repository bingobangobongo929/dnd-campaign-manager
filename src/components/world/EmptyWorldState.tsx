'use client'

import { MapPin, Shield, Users, Plus, Map, Lightbulb, Clock, Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui'
import Link from 'next/link'

interface EmptyWorldStateProps {
  type: 'all' | 'locations' | 'factions' | 'relationships' | 'timeline'
  onAddLocation?: () => void
  onAddFaction?: () => void
  onAddEvent?: () => void
  isPlayer?: boolean
  campaignId?: string
}

export function EmptyWorldState({
  type,
  onAddLocation,
  onAddFaction,
  onAddEvent,
  isPlayer = false,
  campaignId,
}: EmptyWorldStateProps) {
  // Completely empty world state
  if (type === 'all') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <div className="max-w-lg w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20 flex items-center justify-center">
            <Map className="w-10 h-10 text-purple-400" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-3">
            Build Your World
          </h2>

          <p className="text-gray-400 mb-8 leading-relaxed">
            Every great campaign has places to explore, factions to navigate, and connections to uncover.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
            {onAddLocation && (
              <Button onClick={onAddLocation} className="w-full sm:w-auto">
                <MapPin className="w-4 h-4 mr-2" />
                Add Location
              </Button>
            )}
            {onAddFaction && (
              <Button onClick={onAddFaction} variant="secondary" className="w-full sm:w-auto">
                <Shield className="w-4 h-4 mr-2" />
                Add Faction
              </Button>
            )}
          </div>

          <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10">
            <div className="flex items-start gap-3 text-left">
              <Lightbulb className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-purple-300/80">
                <strong className="text-purple-300">Tip:</strong> Start with your main city or the party's home base. You can build the hierarchy outward from there.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Empty locations tab
  if (type === 'locations') {
    if (isPlayer) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-16 h-16 mb-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <MapPin className="w-8 h-8 text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No discovered locations</h3>
          <p className="text-gray-400 max-w-md">
            Your party hasn't discovered any notable locations yet. Explore the world to uncover its secrets!
          </p>
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-16 h-16 mb-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <MapPin className="w-8 h-8 text-blue-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No locations yet</h3>
        <p className="text-gray-400 max-w-md mb-6">
          Add the places that matter to your story. Link them to your maps for easy navigation.
        </p>
        {onAddLocation && (
          <Button onClick={onAddLocation}>
            <Plus className="w-4 h-4 mr-2" />
            Add Location
          </Button>
        )}
      </div>
    )
  }

  // Empty factions tab
  if (type === 'factions') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-16 h-16 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Shield className="w-8 h-8 text-emerald-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No factions yet</h3>
        <p className="text-gray-400 max-w-md mb-2">
          Factions are groups with shared goals: guilds, governments, cults, mercenary bands...
        </p>
        <p className="text-gray-500 text-sm max-w-md mb-6">
          Create factions, then add characters as members to organize your world's power structures.
        </p>
        {onAddFaction && (
          <Button onClick={onAddFaction}>
            <Plus className="w-4 h-4 mr-2" />
            Create Faction
          </Button>
        )}
      </div>
    )
  }

  // Empty relationships tab
  if (type === 'relationships') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-16 h-16 mb-4 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
          <Users className="w-8 h-8 text-purple-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No relationships defined</h3>
        <p className="text-gray-400 max-w-md mb-2">
          Character relationships bring your world to life: allies, rivals, family, lovers...
        </p>
        <p className="text-gray-500 text-sm max-w-md mb-6">
          Create relationships between characters on the Canvas to see them visualized here.
        </p>
        {campaignId && (
          <Link
            href={`/campaigns/${campaignId}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg font-medium text-sm transition-colors"
          >
            Go to Canvas
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    )
  }

  // Empty timeline tab
  if (type === 'timeline') {
    if (isPlayer) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-16 h-16 mb-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Clock className="w-8 h-8 text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No events recorded</h3>
          <p className="text-gray-400 max-w-md">
            The timeline of your adventure will appear here as your story unfolds.
          </p>
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-16 h-16 mb-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Clock className="w-8 h-8 text-amber-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No events yet</h3>
        <p className="text-gray-400 max-w-md mb-2">
          Track your campaign's key moments: battles, discoveries, character introductions, and story beats.
        </p>
        <p className="text-gray-500 text-sm max-w-md mb-6">
          Add events manually or use AI to extract them from your session notes.
        </p>
        {onAddEvent && (
          <Button onClick={onAddEvent}>
            <Plus className="w-4 h-4 mr-2" />
            Add First Event
          </Button>
        )}
      </div>
    )
  }

  return null
}
