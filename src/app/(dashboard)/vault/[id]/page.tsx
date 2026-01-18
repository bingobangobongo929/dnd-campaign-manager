'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { CharacterEditor } from '@/components/vault/CharacterEditor'
import { Button } from '@/components/ui'
import { BackToTopButton } from '@/components/ui/back-to-top'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/store'
import { useIsMobile } from '@/hooks'
import type { VaultCharacter } from '@/types/database'

export default function EditVaultCharacterPage() {
  const params = useParams()
  const router = useRouter()
  const isMobile = useIsMobile()
  // Memoize supabase client to prevent recreation on each render
  const supabase = useMemo(() => createClient(), [])
  const { trackRecentItem } = useAppStore()
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
        // Track recent visit
        trackRecentItem({
          id: data.id,
          type: 'character',
          name: data.name,
          href: `/vault/${data.id}`,
          imageUrl: data.image_url || data.detail_image_url,
        })
      }
      setLoading(false)
    }

    loadCharacter()
  }, [characterId, supabase, trackRecentItem])

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
      <BackToTopButton />
    </AppLayout>
  )
}
