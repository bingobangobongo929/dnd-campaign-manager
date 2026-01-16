'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Edit3, Loader2, Eye } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import type { VaultCharacter } from '@/types/database'

export default function CharacterViewPage() {
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

  // Placeholder view page - will be enhanced once editor is perfected
  return (
    <AppLayout characterId={characterId}>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-6">
            <Eye className="w-10 h-10 text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold text-[--text-primary] mb-2">
            {character.name}
          </h1>
          {character.class && (
            <p className="text-[--text-secondary] mb-6">
              Level {character.level || '?'} {character.class}
            </p>
          )}
          <p className="text-[--text-tertiary] mb-8 max-w-md mx-auto">
            The rich view page is coming soon. For now, use the editor to view and manage your character.
          </p>
          <Button onClick={() => router.push(`/vault/${characterId}`)}>
            <Edit3 className="w-4 h-4 mr-2" />
            Open Editor
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}
