'use client'

import Image from 'next/image'
import { Plus, FolderPlus, Users, ChevronRight } from 'lucide-react'
import { Modal, Input, ColorPicker, getGroupIcon } from '@/components/ui'
import { CharacterModal, CharacterViewModal } from '@/components/character'
import { AppLayout } from '@/components/layout/app-layout'
import { MobileLayout, MobileFAB, MobileBottomSheet } from '@/components/mobile'
import { getInitials } from '@/lib/utils'
import type { Campaign, Character, Tag, CharacterTag } from '@/types/database'

interface KanbanColumn {
  id: string
  name: string
  color: string
  icon: string
  characters: Character[]
}

export interface CampaignCanvasPageMobileProps {
  campaignId: string
  campaign: Campaign | null
  characters: Character[]
  characterTags: Map<string, (CharacterTag & { tag: Tag; related_character?: Character | null })[]>
  kanbanColumns: KanbanColumn[]
  // Modals
  isCreateCharacterModalOpen: boolean
  setIsCreateCharacterModalOpen: (open: boolean) => void
  isCreateGroupOpen: boolean
  setIsCreateGroupOpen: (open: boolean) => void
  mobileActionSheet: boolean
  setMobileActionSheet: (open: boolean) => void
  // Viewing/Editing
  viewingCharacter: Character | null
  editingCharacter: Character | null
  setSelectedCharacterId: (id: string | null) => void
  setViewingCharacterId: (id: string | null) => void
  // Handlers
  handleViewToEdit: () => void
  handleCloseViewModal: () => void
  handleCloseEditModal: () => void
  handleCloseCreateCharacterModal: () => void
  handleCharacterUpdate: (character: Character) => void
  handleCharacterDelete: (id: string) => void
  handleCharacterCreate: (character: Character) => void
  loadCampaignData: () => void
  // Group form
  groupForm: { name: string; color: string; icon: string }
  setGroupForm: (form: { name: string; color: string; icon: string }) => void
  handleCreateGroup: () => void
  saving: boolean
  // Navigation
  onNavigate: (path: string) => void
}

export function CampaignCanvasPageMobile({
  campaignId,
  campaign,
  characters,
  characterTags,
  kanbanColumns,
  isCreateCharacterModalOpen,
  setIsCreateCharacterModalOpen,
  isCreateGroupOpen,
  setIsCreateGroupOpen,
  mobileActionSheet,
  setMobileActionSheet,
  viewingCharacter,
  editingCharacter,
  setSelectedCharacterId,
  setViewingCharacterId,
  handleViewToEdit,
  handleCloseViewModal,
  handleCloseEditModal,
  handleCloseCreateCharacterModal,
  handleCharacterUpdate,
  handleCharacterDelete,
  handleCharacterCreate,
  loadCampaignData,
  groupForm,
  setGroupForm,
  handleCreateGroup,
  saving,
  onNavigate,
}: CampaignCanvasPageMobileProps) {
  return (
    <AppLayout campaignId={campaignId}>
      <MobileLayout title={campaign?.name || 'Campaign'} showBackButton={true}>
        {/* Campaign Navigation */}
        <div className="px-4 mb-4 flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          <button
            className="flex-shrink-0 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-full"
          >
            Characters
          </button>
          <button
            onClick={() => onNavigate(`/campaigns/${campaignId}/sessions`)}
            className="flex-shrink-0 px-4 py-2 bg-gray-800 text-gray-300 text-sm font-medium rounded-full"
          >
            Sessions
          </button>
          <button
            onClick={() => onNavigate(`/campaigns/${campaignId}/timeline`)}
            className="flex-shrink-0 px-4 py-2 bg-gray-800 text-gray-300 text-sm font-medium rounded-full"
          >
            Timeline
          </button>
          <button
            onClick={() => onNavigate(`/campaigns/${campaignId}/lore`)}
            className="flex-shrink-0 px-4 py-2 bg-gray-800 text-gray-300 text-sm font-medium rounded-full"
          >
            Lore
          </button>
        </div>

        {/* Kanban Columns */}
        {characters.length === 0 ? (
          <div className="mobile-empty-state">
            <Users className="mobile-empty-icon" />
            <h3 className="mobile-empty-title">No Characters Yet</h3>
            <p className="mobile-empty-description">Add characters to bring your campaign to life</p>
            <button
              onClick={() => setIsCreateCharacterModalOpen(true)}
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-medium rounded-xl"
            >
              <Plus className="w-5 h-5" />
              Add Character
            </button>
          </div>
        ) : (
          <div className="mobile-kanban">
            {kanbanColumns.map((column) => {
              const GroupIcon = getGroupIcon(column.icon)
              return (
                <div key={column.id} className="mobile-kanban-column">
                  <div
                    className="mobile-kanban-column-header"
                    style={{ borderBottomColor: `${column.color}40` }}
                  >
                    <div className="flex items-center gap-2">
                      <GroupIcon className="w-4 h-4" style={{ color: column.color }} />
                      <span className="mobile-kanban-column-title">{column.name}</span>
                    </div>
                    <span className="mobile-kanban-column-count">{column.characters.length}</span>
                  </div>
                  <div className="mobile-kanban-cards">
                    {column.characters.map((char) => (
                      <button
                        key={char.id}
                        onClick={() => {
                          setSelectedCharacterId(char.id)
                          setViewingCharacterId(char.id)
                        }}
                        className="mobile-kanban-card"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                            {char.image_url ? (
                              <Image
                                src={char.image_url}
                                alt={char.name}
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-500">
                                {getInitials(char.name)}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="mobile-kanban-card-title truncate">{char.name}</p>
                            <p className="mobile-kanban-card-subtitle truncate">
                              {char.role || char.race || 'Character'}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-600" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* FAB for adding characters */}
        <MobileFAB
          icon={<Plus className="w-6 h-6" />}
          onClick={() => setMobileActionSheet(true)}
          label="Add"
        />

        {/* Action Sheet */}
        <MobileBottomSheet
          isOpen={mobileActionSheet}
          onClose={() => setMobileActionSheet(false)}
          title="Add to Campaign"
        >
          <div className="space-y-2">
            <button
              onClick={() => {
                setMobileActionSheet(false)
                setIsCreateCharacterModalOpen(true)
              }}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-gray-800 active:bg-gray-700"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Plus className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-left">
                <p className="font-medium text-white">Add Character</p>
                <p className="text-sm text-gray-400">Create a new NPC or player</p>
              </div>
            </button>
            <button
              onClick={() => {
                setMobileActionSheet(false)
                setIsCreateGroupOpen(true)
              }}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-gray-800 active:bg-gray-700"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <FolderPlus className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-left">
                <p className="font-medium text-white">Add Group</p>
                <p className="text-sm text-gray-400">Organize characters into groups</p>
              </div>
            </button>
          </div>
        </MobileBottomSheet>

        {/* Character View Modal */}
        {viewingCharacter && (
          <CharacterViewModal
            character={viewingCharacter}
            tags={characterTags.get(viewingCharacter.id) || []}
            onEdit={handleViewToEdit}
            onClose={handleCloseViewModal}
          />
        )}

        {/* Character Edit Modal */}
        {editingCharacter && (
          <CharacterModal
            character={editingCharacter}
            tags={characterTags.get(editingCharacter.id) || []}
            allCharacters={characters}
            campaignId={campaignId}
            onUpdate={handleCharacterUpdate}
            onDelete={handleCharacterDelete}
            onClose={handleCloseEditModal}
            onTagsChange={loadCampaignData}
          />
        )}

        {/* Create Character Modal */}
        {isCreateCharacterModalOpen && (
          <CharacterModal
            character={null}
            tags={[]}
            allCharacters={characters}
            campaignId={campaignId}
            onUpdate={handleCharacterUpdate}
            onCreate={handleCharacterCreate}
            onDelete={handleCharacterDelete}
            onClose={handleCloseCreateCharacterModal}
            onTagsChange={loadCampaignData}
          />
        )}

        {/* Create Group Modal */}
        <Modal
          isOpen={isCreateGroupOpen}
          onClose={() => {
            setIsCreateGroupOpen(false)
            setGroupForm({ name: '', color: '#8B5CF6', icon: 'users' })
          }}
          title="Add Group"
          size="lg"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Group Name</label>
              <Input
                placeholder="e.g., The Party, Villains..."
                value={groupForm.name}
                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Color</label>
              <ColorPicker
                value={groupForm.color}
                onChange={(color) => setGroupForm({ ...groupForm, color })}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                className="flex-1 py-3 bg-gray-800 text-white rounded-xl"
                onClick={() => setIsCreateGroupOpen(false)}
              >
                Cancel
              </button>
              <button
                className="flex-1 py-3 bg-purple-600 text-white rounded-xl"
                onClick={handleCreateGroup}
                disabled={!groupForm.name.trim() || saving}
              >
                {saving ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </Modal>
      </MobileLayout>
    </AppLayout>
  )
}
