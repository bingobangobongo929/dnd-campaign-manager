'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { CharacterEditor } from '@/components/vault/CharacterEditor'
import { Button } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import type { VaultCharacter } from '@/types/database'

export default function EditVaultCharacterPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const characterId = params.id as string

  const [character, setCharacter] = useState<VaultCharacter | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const loadCharacter = async () => {
      const { data, error } = await supabase
        .from('vault_characters')
        .select('*')
        .eq('id', characterId)
        .single()

      if (error || !data) {
        setNotFound(true)
      } else {
        setCharacter(data)
      }
      setLoading(false)
    }

    loadCharacter()
  }, [characterId, supabase])

  if (loading) {
    return (
      <AppLayout characterId={characterId}>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[--arcane-purple]" />
        </div>
      </AppLayout>
    )
  }

  if (notFound || !character) {
    return (
      <AppLayout>
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
      </AppLayout>
    )
  }

  return (
    <AppLayout characterId={characterId} fullBleed>
      <CharacterEditor character={character} mode="edit" />
    </AppLayout>
  )
}
