'use client'

import { useParams } from 'next/navigation'
import { Swords } from 'lucide-react'

export default function EncountersPage() {
  const params = useParams()
  const campaignId = params.id as string

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="mx-auto w-16 h-16 rounded-full bg-[--arcane-purple]/10 flex items-center justify-center mb-4">
          <Swords className="w-8 h-8 text-[--arcane-purple]" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Encounters</h1>
        <p className="text-[--text-secondary] mb-6">
          Plan combat, social, and exploration encounters. Link them to sessions
          and track what the party has faced.
        </p>
        <p className="text-sm text-[--text-tertiary]">
          Coming soon - database ready, UI in progress.
        </p>
      </div>
    </div>
  )
}
