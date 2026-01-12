'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { VaultEditor } from '@/components/vault/VaultEditor'
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
      <div className="min-h-screen bg-[--bg-base] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[--arcane-purple] border-t-transparent rounded-full spinner" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[--bg-base] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[--text-primary] mb-4">Character Not Found</h1>
          <p className="text-[--text-secondary] mb-6">
            This character doesn't exist or you don't have access to it.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => router.push('/vault')}
          >
            Back to Vault
          </button>
        </div>
      </div>
    )
  }

  return <VaultEditor character={character} mode="edit" />
}
