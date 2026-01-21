'use client'

import Image from 'next/image'
import {
  Plus,
  Swords,
  Sparkles,
  ChevronRight,
  Bookmark,
  RotateCcw,
  Play,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { Modal, Input, Textarea, Dropdown } from '@/components/ui'
import { AppLayout } from '@/components/layout/app-layout'
import { MobileLayout, MobileSectionHeader, MobileFAB } from '@/components/mobile'
import { MobileContentModeToggle, TemplateStateBadge, type ContentModeTab } from '@/components/templates'
import type { Campaign, ContentSave } from '@/types/database'

const GAME_SYSTEMS = [
  { value: 'D&D 5e', label: 'D&D 5e' },
  { value: 'D&D 3.5e', label: 'D&D 3.5e' },
  { value: 'Pathfinder 2e', label: 'Pathfinder 2e' },
  { value: 'Lancer', label: 'Lancer' },
  { value: 'Call of Cthulhu', label: 'Call of Cthulhu' },
  { value: 'Vampire: The Masquerade', label: 'Vampire: The Masquerade' },
  { value: 'Custom', label: 'Custom System' },
]

export interface CampaignsPageMobileProps {
  campaigns: Campaign[]
  savedCampaigns: ContentSave[]
  featuredCampaign: Campaign | null | undefined
  editingCampaign: Campaign | null
  setEditingCampaign: (campaign: Campaign | null) => void
  formData: {
    name: string
    game_system: string
    description: string
    image_url: string | null
  }
  setFormData: React.Dispatch<React.SetStateAction<{
    name: string
    game_system: string
    description: string
    image_url: string | null
  }>>
  saving: boolean
  handleUpdate: () => void
  onNavigate: (path: string) => void
  activeTab: ContentModeTab
  setActiveTab: (tab: ContentModeTab) => void
  tabCounts: {
    active: number
    inactive: number
    template: number
    saved: number
  }
  onReactivate: (campaignId: string) => void
}

export function CampaignsPageMobile({
  campaigns,
  savedCampaigns,
  featuredCampaign,
  editingCampaign,
  setEditingCampaign,
  formData,
  setFormData,
  saving,
  handleUpdate,
  onNavigate,
  activeTab,
  setActiveTab,
  tabCounts,
  onReactivate,
}: CampaignsPageMobileProps) {
  return (
    <AppLayout>
      <MobileLayout title="Campaigns" showBackButton={false}>
        {/* Tabs */}
        <div className="px-4 pt-2 pb-4">
          <MobileContentModeToggle
            value={activeTab}
            onChange={setActiveTab}
            counts={tabCounts}
            contentType="campaign"
          />
        </div>

        {/* Saved Campaigns Tab */}
        {activeTab === 'saved' && (
          savedCampaigns.length === 0 ? (
            <div className="mobile-empty-state">
              <Bookmark className="mobile-empty-icon" />
              <h3 className="mobile-empty-title">No saved campaigns</h3>
              <p className="mobile-empty-description">Campaign templates you save will appear here</p>
            </div>
          ) : (
            <div className="px-4 space-y-3 pb-20">
              {savedCampaigns.map((save) => (
                <div
                  key={save.id}
                  className="bg-[--bg-surface] rounded-xl border border-white/[0.06] overflow-hidden"
                >
                  <div className="relative h-32">
                    {save.source_image_url ? (
                      <>
                        <Image
                          src={save.source_image_url}
                          alt={save.source_name}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 to-gray-900 flex items-center justify-center">
                        <Swords className="w-10 h-10 text-purple-400/30" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-1 text-[10px] bg-purple-500/20 text-purple-300 rounded">Saved</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="font-semibold text-white">{save.source_name}</h4>
                    <p className="text-xs text-gray-500 mt-1">v{save.saved_version}</p>
                    {save.instance_id ? (
                      <button
                        onClick={() => onNavigate(`/campaigns/${save.instance_id}/canvas`)}
                        className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg"
                      >
                        <Play className="w-4 h-4" />
                        Continue Playing
                      </button>
                    ) : (
                      <button
                        onClick={() => onNavigate(`/campaigns?startPlaying=${save.id}`)}
                        className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg"
                      >
                        <Play className="w-4 h-4" />
                        Start Playing
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Inactive Campaigns Tab */}
        {activeTab === 'inactive' && (
          campaigns.length === 0 ? (
            <div className="mobile-empty-state">
              <Swords className="mobile-empty-icon opacity-50" />
              <h3 className="mobile-empty-title">No inactive campaigns</h3>
              <p className="mobile-empty-description">Completed or retired campaigns will appear here</p>
            </div>
          ) : (
            <div className="px-4 space-y-3 pb-20">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="flex items-center gap-4 p-3 bg-[--bg-surface] rounded-xl border border-white/[0.04] opacity-75"
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-900 flex-shrink-0">
                    {campaign.image_url ? (
                      <Image
                        src={campaign.image_url}
                        alt={campaign.name}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover grayscale"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-900">
                        <Swords className="w-6 h-6 text-gray-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-400 truncate">{campaign.name}</h4>
                    <TemplateStateBadge mode="inactive" inactiveReason={campaign.inactive_reason} size="sm" />
                  </div>
                  <button
                    onClick={() => onReactivate(campaign.id)}
                    className="p-2 bg-white/5 rounded-lg"
                  >
                    <RotateCcw className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              ))}
            </div>
          )
        )}

        {/* Templates Tab */}
        {activeTab === 'template' && (
          campaigns.length === 0 ? (
            <div className="mobile-empty-state">
              <Sparkles className="mobile-empty-icon" />
              <h3 className="mobile-empty-title">No templates</h3>
              <p className="mobile-empty-description">Publish your campaigns as templates to share with others</p>
            </div>
          ) : (
            <div className="px-4 space-y-3 pb-20">
              {campaigns.map((campaign) => (
                <button
                  key={campaign.id}
                  onClick={() => onNavigate(`/campaigns/${campaign.id}/canvas`)}
                  className="w-full flex items-center gap-4 p-3 bg-[--bg-surface] rounded-xl border border-purple-500/20 active:bg-[--bg-hover]"
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-900 flex-shrink-0">
                    {campaign.image_url ? (
                      <Image
                        src={campaign.image_url}
                        alt={campaign.name}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/30 to-gray-900">
                        <Swords className="w-6 h-6 text-purple-400/50" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <h4 className="font-semibold text-white truncate">{campaign.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <TemplateStateBadge mode="template" size="sm" />
                      {campaign.template_save_count > 0 && (
                        <span className="text-xs text-gray-500">{campaign.template_save_count} saves</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              ))}
            </div>
          )
        )}

        {/* Active Campaigns Tab */}
        {activeTab === 'active' && (
          campaigns.length === 0 ? (
            <div className="mobile-empty-state">
              <Sparkles className="mobile-empty-icon" />
              <h3 className="mobile-empty-title">Begin Your Adventure</h3>
              <p className="mobile-empty-description">Create your first campaign to start building an epic story</p>
              <button
                onClick={() => onNavigate('/campaigns/new')}
                className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-medium rounded-xl"
              >
                <Swords className="w-5 h-5" />
                Create Campaign
              </button>
            </div>
          ) : (
            <div className="space-y-4 pb-20">
              {/* Featured Campaign */}
              {featuredCampaign && (
              <button
                onClick={() => onNavigate(`/campaigns/${featuredCampaign.id}/canvas`)}
                className="w-full mx-4 max-w-[calc(100%-32px)] relative rounded-2xl overflow-hidden bg-gray-900 border border-white/[0.06] active:scale-[0.98] transition-transform"
              >
                <div className="relative h-52">
                  {featuredCampaign.image_url ? (
                    <>
                      <Image
                        src={featuredCampaign.image_url}
                        alt={featuredCampaign.name}
                        fill
                        className="object-cover"
                        priority
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 to-gray-900 flex items-center justify-center">
                      <Swords className="w-16 h-16 text-purple-400/30" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider rounded bg-purple-600 text-white">
                        Continue
                      </span>
                      <span className="px-2 py-1 text-[10px] font-medium rounded bg-white/10 text-gray-300">
                        {featuredCampaign.game_system}
                      </span>
                    </div>
                    <h2 className="text-xl font-display font-bold text-white">{featuredCampaign.name}</h2>
                    {featuredCampaign.description && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-1">{featuredCampaign.description}</p>
                    )}
                  </div>
                </div>
              </button>
            )}

            {/* All Campaigns List */}
            {campaigns.length > 1 && (
              <>
                <MobileSectionHeader title="All Campaigns" />
                <div className="px-4 space-y-3">
                  {campaigns.map((campaign) => (
                    <button
                      key={campaign.id}
                      onClick={() => onNavigate(`/campaigns/${campaign.id}/canvas`)}
                      className="w-full flex items-center gap-4 p-3 bg-[--bg-surface] rounded-xl border border-white/[0.06] active:bg-[--bg-hover] transition-colors"
                    >
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-900 flex-shrink-0">
                        {campaign.image_url ? (
                          <Image
                            src={campaign.image_url}
                            alt={campaign.name}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/30 to-gray-900">
                            <Swords className="w-6 h-6 text-purple-400/50" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <h4 className="font-semibold text-white truncate">{campaign.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded">
                            {campaign.game_system}
                          </span>
                          <span className="text-xs text-gray-500">
                            Updated {formatDate(campaign.updated_at)}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          )
        )}

        {/* FAB for new campaign */}
        <MobileFAB
          icon={<Plus className="w-6 h-6" />}
          onClick={() => onNavigate('/campaigns/new')}
          label="New Campaign"
        />
      </MobileLayout>

      {/* Edit Modal - Shared with desktop */}
      <Modal
        isOpen={!!editingCampaign}
        onClose={() => {
          setEditingCampaign(null)
          setFormData({ name: '', game_system: 'D&D 5e', description: '', image_url: null })
        }}
        title="Edit Campaign"
        size="lg"
      >
        <div className="space-y-5">
          <div className="form-group">
            <label className="form-label">Campaign Name</label>
            <Input
              className="form-input"
              placeholder="e.g., Curse of Strahd"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Game System</label>
            <Dropdown
              options={GAME_SYSTEMS}
              value={formData.game_system}
              onChange={(value) => setFormData({ ...formData, game_system: value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <Textarea
              className="form-textarea"
              placeholder="Brief description of your campaign..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              className="flex-1 py-3 bg-gray-800 text-white rounded-xl"
              onClick={() => setEditingCampaign(null)}
            >
              Cancel
            </button>
            <button
              className="flex-1 py-3 bg-purple-600 text-white rounded-xl"
              onClick={handleUpdate}
              disabled={!formData.name.trim() || saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}
