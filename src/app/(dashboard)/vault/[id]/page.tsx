'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { CharacterEditor, InPlayCharacterView } from '@/components/vault'
import { Button } from '@/components/ui'
import { BackToTopButton } from '@/components/ui/back-to-top'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/store'
import { useIsMobile } from '@/hooks'
import type { VaultCharacter } from '@/types/database'

interface CampaignLink {
  campaign_id: string
  character_id: string
  joined_at: string
}

export default function EditVaultCharacterPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isMobile = useIsMobile()
  const fromTemplate = searchParams.get('fromTemplate') === 'true'
  const viewMode = searchParams.get('view') // 'inplay' to force in-play view
  // Memoize supabase client to prevent recreation on each render
  const supabase = useMemo(() => createClient(), [])
  const { trackRecentItem } = useAppStore()
  const characterId = params.id as string

  const [character, setCharacter] = useState<VaultCharacter | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [showInPlayView, setShowInPlayView] = useState(false)

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

        // ALWAYS show InPlayCharacterView when character is linked to campaigns
        // This prevents players from editing characters that belong to a campaign
        const campaignLinks = data.campaign_links as CampaignLink[] | null
        if (campaignLinks && campaignLinks.length > 0) {
          setShowInPlayView(true)
        }
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

  // Get the first campaign link for in-play view
  const campaignLinks = character.campaign_links as CampaignLink[] | null
  const firstCampaignLink = campaignLinks && campaignLinks.length > 0 ? campaignLinks[0] : null

  // Show in-play view when character is linked to a campaign
  // Linked characters cannot be edited directly - edits happen in the campaign
  if (showInPlayView && firstCampaignLink) {
    return (
      <AppLayout characterId={characterId}>
        <InPlayCharacterView
          character={character}
          campaignLink={firstCampaignLink}
          // No onSwitch - linked characters cannot access the editor
        />
        <BackToTopButton />
      </AppLayout>
    )
  }

  return (
    <AppLayout characterId={characterId} fullBleed>
      <CharacterEditor character={character} mode="edit" standalone={false} fromTemplate={fromTemplate} />
      <BackToTopButton />
    </AppLayout>
  )
}
