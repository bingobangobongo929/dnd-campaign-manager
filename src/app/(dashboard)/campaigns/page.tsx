'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  Plus,
  Swords,
  Camera,
  Loader2,
  Play,
  ChevronRight,
  Edit,
  Trash2,
  Sparkles,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { Modal, Input, Textarea, Dropdown, UnifiedImageModal } from '@/components/ui'
import { AppLayout } from '@/components/layout/app-layout'
import { useSupabase, useUser } from '@/hooks'
import { v4 as uuidv4 } from 'uuid'
import type { Campaign } from '@/types/database'

const GAME_SYSTEMS = [
  { value: 'D&D 5e', label: 'D&D 5e' },
  { value: 'D&D 3.5e', label: 'D&D 3.5e' },
  { value: 'Pathfinder 2e', label: 'Pathfinder 2e' },
  { value: 'Lancer', label: 'Lancer' },
  { value: 'Call of Cthulhu', label: 'Call of Cthulhu' },
  { value: 'Vampire: The Masquerade', label: 'Vampire: The Masquerade' },
  { value: 'Custom', label: 'Custom System' },
]

export default function CampaignsPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const { user, loading: userLoading } = useUser()

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    game_system: 'D&D 5e',
    description: '',
    image_url: null as string | null,
  })
  const [saving, setSaving] = useState(false)
  const [imageModalOpen, setImageModalOpen] = useState(false)

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    const { data: campaignsData } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', user!.id)
      .order('updated_at', { ascending: false })

    if (campaignsData) {
      setCampaigns(campaignsData)
    }
    setLoading(false)
  }

  const handleImageUpload = async (blob: Blob): Promise<string> => {
    const uniqueId = uuidv4()
    const path = `campaigns/${uniqueId}.webp`

    const { error: uploadError } = await supabase.storage
      .from('campaign-images')
      .upload(path, blob, { contentType: 'image/webp' })

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage
      .from('campaign-images')
      .getPublicUrl(path)

    return urlData.publicUrl
  }

  const handleUpdate = async () => {
    if (!formData.name.trim() || !editingCampaign) return

    setSaving(true)
    const { data } = await supabase
      .from('campaigns')
      .update({
        name: formData.name,
        game_system: formData.game_system,
        description: formData.description || null,
        image_url: formData.image_url,
      })
      .eq('id', editingCampaign.id)
      .select()
      .single()

    if (data) {
      setCampaigns(campaigns.map((c) => (c.id === data.id ? data : c)))
      setEditingCampaign(null)
      setFormData({ name: '', game_system: 'D&D 5e', description: '', image_url: null })
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign? This cannot be undone.')) return

    const { error } = await supabase.from('campaigns').delete().eq('id', id)

    if (!error) {
      setCampaigns(campaigns.filter((c) => c.id !== id))
    }
  }

  const openEditModal = (campaign: Campaign) => {
    setFormData({
      name: campaign.name,
      game_system: campaign.game_system,
      description: campaign.description || '',
      image_url: campaign.image_url || null,
    })
    setEditingCampaign(campaign)
  }

  if (userLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
        </div>
      </AppLayout>
    )
  }

  const featuredCampaign = campaigns[0]

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-white">Your Campaigns</h1>
            <p className="text-gray-400 mt-1">Epic adventures await</p>
          </div>
          <Link
            href="/campaigns/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Campaign
          </Link>
        </div>

        {campaigns.length === 0 ? (
          /* Empty State */
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-purple-900/20 via-gray-900 to-gray-950 border border-white/[0.06] p-16 text-center">
            <Sparkles className="w-20 h-20 mx-auto mb-6 text-purple-400/50" />
            <h2 className="text-2xl font-display font-bold text-white mb-3">
              Begin Your Adventure
            </h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              Create your first campaign and start building an unforgettable story with your players.
            </p>
            <Link
              href="/campaigns/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-colors"
            >
              <Swords className="w-5 h-5" />
              Create Your First Campaign
            </Link>
          </div>
        ) : (
          <>
            {/* Featured Campaign (Hero) */}
            {featuredCampaign && (
              <section className="group relative">
                <Link
                  href={`/campaigns/${featuredCampaign.id}/canvas`}
                  className="relative block rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-950 border border-white/[0.06] hover:border-purple-500/30 transition-all duration-500"
                >
                  <div className="relative h-[350px] md:h-[450px]">
                    {featuredCampaign.image_url ? (
                      <>
                        <Image
                          src={featuredCampaign.image_url}
                          alt={featuredCampaign.name}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                          priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-gray-900 to-gray-950 flex items-center justify-center">
                        <Swords className="w-32 h-32 text-purple-400/20" />
                      </div>
                    )}

                    {/* Content Overlay */}
                    <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-12">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-purple-600 text-white">
                          Continue Playing
                        </span>
                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-white/10 text-gray-300">
                          {featuredCampaign.game_system}
                        </span>
                      </div>

                      <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-3 group-hover:text-purple-400 transition-colors">
                        {featuredCampaign.name}
                      </h2>

                      {featuredCampaign.description && (
                        <p className="text-gray-300 text-base md:text-lg max-w-2xl line-clamp-2 mb-4">
                          {featuredCampaign.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 text-purple-400 font-medium">
                        <Play className="w-5 h-5" />
                        <span>Enter Campaign</span>
                        <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Edit/Delete buttons - positioned outside the link */}
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEditModal(featuredCampaign) }}
                    className="p-2.5 bg-black/70 backdrop-blur-sm rounded-lg hover:bg-purple-500 transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(featuredCampaign.id) }}
                    className="p-2.5 bg-black/70 backdrop-blur-sm rounded-lg hover:bg-red-500 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>
              </section>
            )}

            {/* Campaign Grid */}
            {campaigns.length > 1 && (
              <section>
                <h3 className="text-xl font-semibold text-white mb-6">All Campaigns</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {campaigns.map((campaign) => (
                    <div key={campaign.id} className="group relative">
                      <Link
                        href={`/campaigns/${campaign.id}/canvas`}
                        className="relative block rounded-xl overflow-hidden bg-gray-900/50 border border-white/[0.06] hover:border-purple-500/40 transition-all"
                      >
                        {/* Large Image */}
                        <div className="relative h-48 sm:h-56">
                          {campaign.image_url ? (
                            <>
                              <Image
                                src={campaign.image_url}
                                alt={campaign.name}
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
                            </>
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 to-gray-900 flex items-center justify-center">
                              <Swords className="w-16 h-16 text-purple-400/30" />
                            </div>
                          )}

                          {/* Game system badge */}
                          <div className="absolute top-3 left-3">
                            <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-black/60 backdrop-blur-sm text-purple-300 border border-purple-500/30">
                              {campaign.game_system}
                            </span>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-5">
                          <h4 className="font-display font-semibold text-lg text-white truncate group-hover:text-purple-400 transition-colors">
                            {campaign.name}
                          </h4>
                          {campaign.description && (
                            <p className="text-sm text-gray-400 mt-2 line-clamp-2">
                              {campaign.description}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-3">
                            Updated {formatDate(campaign.updated_at)}
                          </p>
                        </div>
                      </Link>

                      {/* Edit/Delete buttons */}
                      <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEditModal(campaign) }}
                          className="p-2 bg-black/70 backdrop-blur-sm rounded-lg hover:bg-purple-500 transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5 text-white" />
                        </button>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(campaign.id) }}
                          className="p-2 bg-black/70 backdrop-blur-sm rounded-lg hover:bg-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Create New Card */}
                  <Link
                    href="/campaigns/new"
                    className="group relative rounded-xl overflow-hidden bg-gradient-to-br from-purple-900/10 to-gray-900/50 border-2 border-dashed border-purple-500/20 hover:border-purple-500/50 transition-all flex flex-col items-center justify-center gap-4 min-h-[280px]"
                  >
                    <div className="p-4 rounded-full bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                      <Plus className="w-8 h-8 text-purple-400" />
                    </div>
                    <span className="text-sm font-medium text-purple-400">Create New Campaign</span>
                  </Link>
                </div>
              </section>
            )}

            {/* Single campaign - show create prompt */}
            {campaigns.length === 1 && (
              <section>
                <div className="flex flex-col items-center justify-center py-12 bg-white/[0.015] border border-dashed border-white/[0.08] rounded-xl">
                  <p className="text-gray-400 mb-4">Great start! Add more campaigns to your collection.</p>
                  <Link
                    href="/campaigns/new"
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600/80 hover:bg-purple-500 text-white font-medium rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create Another Campaign
                  </Link>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Edit Modal */}
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
          {/* Campaign Image */}
          <div className="form-group">
            <label className="form-label">Campaign Image</label>
            <button
              type="button"
              onClick={() => setImageModalOpen(true)}
              className="relative w-full aspect-video rounded-xl overflow-hidden transition-all group"
              style={{
                backgroundColor: formData.image_url ? 'transparent' : '#1a1a24',
                border: formData.image_url ? '2px solid #2a2a3a' : '2px dashed #606070',
              }}
            >
              {formData.image_url ? (
                <>
                  <Image
                    src={formData.image_url}
                    alt="Campaign"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <Camera className="w-8 h-8 text-[#606070] group-hover:text-[#8B5CF6] transition-colors" />
                  <span className="text-sm text-[#606070] group-hover:text-[#8B5CF6] transition-colors">Click to add image</span>
                </div>
              )}
            </button>
          </div>

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
          <div className="flex justify-end gap-3 pt-4">
            <button
              className="btn btn-secondary"
              onClick={() => setEditingCampaign(null)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleUpdate}
              disabled={!formData.name.trim() || saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Unified Image Modal */}
      <UnifiedImageModal
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        imageType="campaign"
        currentImageUrl={formData.image_url}
        onImageChange={(url) => setFormData({ ...formData, image_url: url })}
        onUpload={handleImageUpload}
        promptData={{
          title: formData.name,
          summary: formData.description,
          game_system: formData.game_system,
        }}
        title="Campaign"
      />
    </AppLayout>
  )
}
