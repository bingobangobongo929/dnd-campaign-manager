'use client'

import {
  Plus,
  Users,
  Trash2,
  PawPrint,
  ExternalLink,
  Swords,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { MobileLayout } from '@/components/mobile'
import { Button } from '@/components/ui'
import { RELATIONSHIP_COLORS, COMPANION_TYPE_COLORS, getInitials } from '@/lib/character-display'
import type { VaultCharacterRelationship } from '@/types/database'

export interface CharacterRelationshipsPageMobileProps {
  characterId: string
  loading: boolean
  activeTab: 'party' | 'npcs' | 'companions'
  setActiveTab: (tab: 'party' | 'npcs' | 'companions') => void
  partyMembers: VaultCharacterRelationship[]
  npcs: VaultCharacterRelationship[]
  companions: VaultCharacterRelationship[]
  goToEditor: () => void
  handleDelete: (id: string) => void
}

export function CharacterRelationshipsPageMobile({
  characterId,
  loading,
  activeTab,
  setActiveTab,
  partyMembers,
  npcs,
  companions,
  goToEditor,
  handleDelete,
}: CharacterRelationshipsPageMobileProps) {
  if (loading) {
    return (
      <AppLayout characterId={characterId}>
        <MobileLayout title="Relationships" showBackButton backHref={`/vault/${characterId}`}>
          <div className="flex items-center justify-center h-[60vh]">
            <div className="w-10 h-10 border-2 border-[--arcane-purple] border-t-transparent rounded-full spinner" />
          </div>
        </MobileLayout>
      </AppLayout>
    )
  }

  const currentItems = activeTab === 'party' ? partyMembers : activeTab === 'npcs' ? npcs : companions

  return (
    <AppLayout characterId={characterId}>
      <MobileLayout
        title="Relationships"
        showBackButton
        backHref={`/vault/${characterId}`}
        actions={
          <button
            onClick={goToEditor}
            className="p-2 rounded-lg active:bg-white/10 text-gray-400"
          >
            <ExternalLink className="w-5 h-5" />
          </button>
        }
      >
        <div className="px-4 pb-24">
          {/* Tab Pills */}
          <div className="flex gap-2 mb-4 -mx-4 px-4 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveTab('party')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === 'party'
                  ? 'bg-[--arcane-purple] text-white'
                  : 'bg-white/5 text-gray-400 active:bg-white/10'
              }`}
            >
              <Swords className="w-4 h-4" />
              Party ({partyMembers.length})
            </button>
            <button
              onClick={() => setActiveTab('npcs')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === 'npcs'
                  ? 'bg-[--arcane-purple] text-white'
                  : 'bg-white/5 text-gray-400 active:bg-white/10'
              }`}
            >
              <Users className="w-4 h-4" />
              NPCs ({npcs.length})
            </button>
            <button
              onClick={() => setActiveTab('companions')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === 'companions'
                  ? 'bg-[--arcane-purple] text-white'
                  : 'bg-white/5 text-gray-400 active:bg-white/10'
              }`}
            >
              <PawPrint className="w-4 h-4" />
              Companions ({companions.length})
            </button>
          </div>

          {/* Empty State */}
          {currentItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center mb-4">
                {activeTab === 'party' ? <Swords className="w-7 h-7 text-gray-500" /> :
                 activeTab === 'npcs' ? <Users className="w-7 h-7 text-gray-500" /> :
                 <PawPrint className="w-7 h-7 text-gray-500" />}
              </div>
              <h3 className="text-lg font-medium text-white mb-2">
                No {activeTab === 'party' ? 'Party Members' : activeTab === 'npcs' ? 'NPCs' : 'Companions'}
              </h3>
              <p className="text-sm text-gray-400 mb-6">Add them in the Character Editor</p>
              <Button onClick={goToEditor}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Editor
              </Button>
            </div>
          ) : (
            /* Cards */
            <div className="space-y-3">
              {currentItems.map((item) => {
                const colors = item.is_companion
                  ? COMPANION_TYPE_COLORS[item.companion_type || 'other'] || COMPANION_TYPE_COLORS.other
                  : RELATIONSHIP_COLORS[item.relationship_type || 'other'] || RELATIONSHIP_COLORS.other

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-[--bg-elevated] flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {item.related_image_url ? (
                          <img
                            src={item.related_image_url}
                            alt={item.related_name || 'Character'}
                            className="w-full h-full object-cover"
                          />
                        ) : item.is_companion ? (
                          <PawPrint className="w-5 h-5 text-gray-500" />
                        ) : (
                          <span className="text-base font-bold text-gray-500">
                            {getInitials(item.related_name || '?')}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-white truncate">{item.related_name}</h3>
                          {item.nickname && (
                            <span className="text-xs text-gray-500">"{item.nickname}"</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-1">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${colors}`}>
                            {item.is_companion
                              ? item.companion_type?.replace('_', ' ')
                              : item.relationship_label || item.relationship_type?.replace('_', ' ')}
                          </span>
                          {item.companion_species && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400">
                              {item.companion_species}
                            </span>
                          )}
                        </div>
                        {item.occupation && (
                          <p className="text-xs text-gray-500 truncate">{item.occupation}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 rounded-lg active:bg-white/10 text-gray-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-400 mt-2 line-clamp-2">{item.description}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </MobileLayout>
    </AppLayout>
  )
}
