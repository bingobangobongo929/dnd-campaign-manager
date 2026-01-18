'use client'

import { Loader2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui'
import { CharacterViewer } from '@/components/vault/CharacterViewer'
import { MobileLayout } from '@/components/mobile'
import type { VaultCharacter } from '@/types/database'

export interface CharacterViewPageMobileProps {
  characterId: string
  character: VaultCharacter | null
  loading: boolean
  notFound: boolean
  onNavigate: (path: string) => void
}

export function CharacterViewPageMobile({
  characterId,
  character,
  loading,
  notFound,
  onNavigate,
}: CharacterViewPageMobileProps) {
  if (loading) {
    return (
      <AppLayout characterId={characterId}>
        <MobileLayout title="Character" showBackButton backHref="/vault">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="w-10 h-10 border-2 border-[--arcane-purple] border-t-transparent rounded-full spinner" />
          </div>
        </MobileLayout>
      </AppLayout>
    )
  }

  if (notFound || !character) {
    return (
      <AppLayout>
        <MobileLayout title="Not Found" showBackButton backHref="/vault">
          <div className="flex items-center justify-center h-[60vh] px-6">
            <div className="text-center">
              <h1 className="text-xl font-bold text-white mb-3">Character Not Found</h1>
              <p className="text-sm text-gray-400 mb-6">
                This character doesn't exist or you don't have access.
              </p>
              <Button onClick={() => onNavigate('/vault')}>
                Back to Vault
              </Button>
            </div>
          </div>
        </MobileLayout>
      </AppLayout>
    )
  }

  return (
    <AppLayout characterId={characterId}>
      <MobileLayout title={character.name} showBackButton backHref="/vault">
        <div className="pb-24">
          <CharacterViewer character={character} />
        </div>
      </MobileLayout>
    </AppLayout>
  )
}
