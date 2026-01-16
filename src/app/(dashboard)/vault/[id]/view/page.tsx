'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Edit3, Loader2 } from 'lucide-react'
import { VaultLayout } from '@/components/layout/VaultLayout'
import { CharacterView } from '@/components/vault/CharacterView'
import { Button } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import type { VaultCharacter, VaultCharacterRelationship } from '@/types/database'

export default function CharacterViewPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const characterId = params.id as string

  const [character, setCharacter] = useState<VaultCharacter | null>(null)
  const [relationships, setRelationships] = useState<VaultCharacterRelationship[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const loadCharacter = async () => {
      // Load character
      const { data: charData, error: charError } = await supabase
        .from('vault_characters')
        .select('*')
        .eq('id', characterId)
        .single()

      if (charError || !charData) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setCharacter(charData)

      // Load relationships
      const { data: relData } = await supabase
        .from('vault_character_relationships')
        .select('*')
        .eq('character_id', characterId)
        .order('sort_order', { ascending: true })

      if (relData) {
        setRelationships(relData)
      }

      setLoading(false)
    }

    loadCharacter()
  }, [characterId, supabase])

  if (loading) {
    return (
      <VaultLayout characterId={characterId}>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[--arcane-purple]" />
        </div>
      </VaultLayout>
    )
  }

  if (notFound || !character) {
    return (
      <VaultLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[--text-primary] mb-4">Character Not Found</h1>
            <p className="text-[--text-secondary] mb-6">
              This character doesn't exist or you don't have access to it.
            </p>
            <Button onClick={() => router.push('/vault')}>
              Back to Vault
            </Button>
          </div>
        </div>
      </VaultLayout>
    )
  }

  return (
    <VaultLayout
      characterId={characterId}
      topBarActions={
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push(`/vault/${characterId}`)}
          className="gap-2"
        >
          <Edit3 className="w-4 h-4" />
          Edit Character
        </Button>
      }
    >
      <div className="max-w-5xl mx-auto px-6 py-8">
        <CharacterView
          character={character}
          relationships={relationships}
          showDMNotes={false}
        />
      </div>
    </VaultLayout>
  )
}
