'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui'
import { BackToTopButton } from '@/components/ui/back-to-top'
import { CharacterViewer } from '@/components/vault/CharacterViewer'
import { AttributionBanner } from '@/components/templates'
import { useIsMobile } from '@/hooks'
import { createClient } from '@/lib/supabase/client'
import { CharacterViewPageMobile } from './page.mobile'
import type { VaultCharacter } from '@/types/database'

interface TemplateInfo {
  name: string
  attribution_name: string | null
}

export default function CharacterViewPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const characterId = params.id as string
  const isMobile = useIsMobile()

  const [character, setCharacter] = useState<VaultCharacter | null>(null)
  const [templateInfo, setTemplateInfo] = useState<TemplateInfo | null>(null)
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
        // Fetch template info if this character was created from a template
        if (data.template_id) {
          const { data: template } = await supabase
            .from('vault_characters')
            .select('name, attribution_name')
            .eq('id', data.template_id)
            .single()
          setTemplateInfo(template)
        }
      }
      setLoading(false)
    }

    loadCharacter()
  }, [characterId, supabase])

  // ============ MOBILE LAYOUT ============
  if (isMobile) {
    return (
      <CharacterViewPageMobile
        characterId={characterId}
        character={character}
        loading={loading}
        notFound={notFound}
        onNavigate={(path) => router.push(path)}
        templateInfo={templateInfo}
      />
    )
  }

  // ============ DESKTOP LAYOUT ============
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
    <AppLayout characterId={characterId}>
      {/* Attribution banner if created from a template */}
      {templateInfo && character && (
        <div className="max-w-4xl mx-auto px-6 pt-6">
          <AttributionBanner
            templateName={templateInfo.name}
            creatorName={templateInfo.attribution_name}
            templateId={character.template_id}
            contentType="character"
            version={character.saved_template_version}
          />
        </div>
      )}
      <CharacterViewer character={character} />
      <BackToTopButton />
    </AppLayout>
  )
}
