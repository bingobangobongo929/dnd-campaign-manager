'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Gamepad2, Camera, Loader2, X, ChevronDown, ChevronUp, Scroll, Grid, List, Star } from 'lucide-react'
import { Modal, Input, Textarea, Dropdown } from '@/components/ui'
import { CampaignCard } from '@/components/ui/campaign-card'
import { OneshotCard } from '@/components/ui/oneshot-card'
import { AppLayout } from '@/components/layout/app-layout'
import { useSupabase, useUser } from '@/hooks'
import { v4 as uuidv4 } from 'uuid'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { Campaign, Oneshot, OneshotGenreTag, OneshotRun } from '@/types/database'

const GAME_SYSTEMS = [
  { value: 'D&D 5e', label: 'D&D 5e' },
  { value: 'D&D 3.5e', label: 'D&D 3.5e' },
  { value: 'Pathfinder 2e', label: 'Pathfinder 2e' },
  { value: 'Lancer', label: 'Lancer' },
  { value: 'Call of Cthulhu', label: 'Call of Cthulhu' },
  { value: 'Vampire: The Masquerade', label: 'Vampire: The Masquerade' },
  { value: 'Custom', label: 'Custom System' },
]

type ViewMode = 'grid' | 'list' | 'featured'

export default function CampaignsPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const { user, loading: userLoading } = useUser()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [oneshots, setOneshots] = useState<Oneshot[]>([])
  const [genreTags, setGenreTags] = useState<OneshotGenreTag[]>([])
  const [oneshotRuns, setOneshotRuns] = useState<Record<string, OneshotRun[]>>({})
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    game_system: 'D&D 5e',
    description: '',
    image_url: null as string | null,
  })
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // View mode and one-shots expanded state
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [oneshotsExpanded, setOneshotsExpanded] = useState(true)

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    // Load campaigns
    const { data: campaignsData } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', user!.id)
      .order('updated_at', { ascending: false })

    if (campaignsData) {
      setCampaigns(campaignsData)
    }

    // Load one-shots
    const { data: oneshotsData } = await supabase
      .from('oneshots')
      .select('*')
      .eq('user_id', user!.id)
      .order('updated_at', { ascending: false })

    if (oneshotsData) {
      setOneshots(oneshotsData)

      // Load runs for each oneshot
      const runsMap: Record<string, OneshotRun[]> = {}
      for (const oneshot of oneshotsData) {
        const { data: runsData } = await supabase
          .from('oneshot_runs')
          .select('*')
          .eq('oneshot_id', oneshot.id)
          .order('run_date', { ascending: false })

        if (runsData) {
          runsMap[oneshot.id] = runsData
        }
      }
      setOneshotRuns(runsMap)
    }

    // Load genre tags
    const { data: tagsData } = await supabase
      .from('oneshot_genre_tags')
      .select('*')
      .eq('user_id', user!.id)
      .order('sort_order')

    if (tagsData) {
      setGenreTags(tagsData)
    }

    setLoading(false)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be less than 10MB')
      return
    }

    setUploadingImage(true)
    try {
      const uniqueId = uuidv4()
      const ext = file.name.split('.').pop()
      const path = `campaigns/${uniqueId}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('campaign-images')
        .upload(path, file, { contentType: file.type })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('campaign-images')
        .getPublicUrl(path)

      setFormData({ ...formData, image_url: urlData.publicUrl })
    } catch (err) {
      console.error('Upload error:', err)
      alert('Failed to upload image')
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleCreate = async () => {
    if (!formData.name.trim() || !user) return

    setSaving(true)
    const { data } = await supabase
      .from('campaigns')
      .insert({
        user_id: user.id,
        name: formData.name,
        game_system: formData.game_system,
        description: formData.description || null,
        image_url: formData.image_url,
      })
      .select()
      .single()

    if (data) {
      setCampaigns([data, ...campaigns])
      setIsCreateModalOpen(false)
      setFormData({ name: '', game_system: 'D&D 5e', description: '', image_url: null })
      router.push(`/campaigns/${data.id}/canvas`)
    }
    setSaving(false)
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

  const handleDeleteOneshot = async (id: string) => {
    if (!confirm('Are you sure you want to delete this one-shot? This cannot be undone.')) return

    const { error } = await supabase.from('oneshots').delete().eq('id', id)

    if (!error) {
      setOneshots(oneshots.filter((o) => o.id !== id))
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
          <div className="w-10 h-10 border-2 border-[--arcane-purple] border-t-transparent rounded-full spinner" />
        </div>
      </AppLayout>
    )
  }

  const isEmpty = campaigns.length === 0 && oneshots.length === 0

  return (
    <AppLayout>
      {/* Page Header */}
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Your Campaigns</h1>
          <p className="page-subtitle">Manage your tabletop adventures</p>
        </div>

        {/* View Mode Toggle */}
        {campaigns.length > 0 && (
          <div className="flex items-center gap-1 bg-white/[0.03] rounded-lg p-1 border border-white/[0.06]">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-2 rounded-md transition-colors",
                viewMode === 'grid' ? "bg-purple-500/20 text-purple-400" : "text-gray-500 hover:text-gray-300"
              )}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "p-2 rounded-md transition-colors",
                viewMode === 'list' ? "bg-purple-500/20 text-purple-400" : "text-gray-500 hover:text-gray-300"
              )}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('featured')}
              className={cn(
                "p-2 rounded-md transition-colors",
                viewMode === 'featured' ? "bg-purple-500/20 text-purple-400" : "text-gray-500 hover:text-gray-300"
              )}
              title="Featured View"
            >
              <Star className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {isEmpty ? (
        /* Empty State */
        <div className="empty-state">
          <Gamepad2 className="empty-state-icon" />
          <h2 className="empty-state-title">No campaigns yet</h2>
          <p className="empty-state-description">
            Create your first campaign to start organizing your world, characters, and stories.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              className="btn btn-primary"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="w-5 h-5" />
              Create Campaign
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => router.push('/oneshots/new')}
            >
              <Scroll className="w-5 h-5" />
              Create One-Shot
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Campaign Grid/List/Featured */}
          {campaigns.length > 0 && (
            <div className={cn(
              viewMode === 'grid' && "campaign-grid",
              viewMode === 'list' && "space-y-3",
              viewMode === 'featured' && "grid grid-cols-1 md:grid-cols-2 gap-6"
            )}>
              {campaigns.map((campaign, index) => (
                viewMode === 'list' ? (
                  <CampaignListItem
                    key={campaign.id}
                    campaign={campaign}
                    onClick={() => router.push(`/campaigns/${campaign.id}/canvas`)}
                    onEdit={() => openEditModal(campaign)}
                    onDelete={() => handleDelete(campaign.id)}
                  />
                ) : viewMode === 'featured' ? (
                  <FeaturedCampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    onClick={() => router.push(`/campaigns/${campaign.id}/canvas`)}
                    onEdit={() => openEditModal(campaign)}
                    onDelete={() => handleDelete(campaign.id)}
                  />
                ) : (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    onClick={() => router.push(`/campaigns/${campaign.id}/canvas`)}
                    onEdit={() => openEditModal(campaign)}
                    onDelete={() => handleDelete(campaign.id)}
                    animationDelay={index * 50}
                  />
                )
              ))}
            </div>
          )}

          {/* One-Shots Section */}
          <div className="mt-12">
            <button
              onClick={() => setOneshotsExpanded(!oneshotsExpanded)}
              className="w-full flex items-center justify-between py-4 px-1 group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                  <Scroll className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-left">
                  <h2 className="text-lg font-semibold text-white/90">One-Shots</h2>
                  <p className="text-sm text-gray-500">{oneshots.length} adventure{oneshots.length !== 1 ? 's' : ''} ready to run</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push('/oneshots/new')
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-purple-400 bg-purple-500/10 rounded-lg hover:bg-purple-500/20 transition-colors border border-purple-500/20"
                >
                  <Plus className="w-4 h-4" />
                  New
                </button>
                {oneshotsExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-500 group-hover:text-gray-300 transition-colors" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500 group-hover:text-gray-300 transition-colors" />
                )}
              </div>
            </button>

            {oneshotsExpanded && (
              <div className="mt-4">
                {oneshots.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 bg-white/[0.015] border border-dashed border-white/[0.08] rounded-xl">
                    <Scroll className="w-10 h-10 mb-4 text-gray-600" />
                    <p className="text-sm text-gray-500 mb-4">No one-shots yet</p>
                    <button
                      onClick={() => router.push('/oneshots/new')}
                      className="btn btn-secondary text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Create Your First One-Shot
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {oneshots.map((oneshot, index) => (
                      <OneshotCard
                        key={oneshot.id}
                        oneshot={oneshot}
                        genreTags={genreTags}
                        runs={oneshotRuns[oneshot.id] || []}
                        onClick={() => router.push(`/oneshots/${oneshot.id}`)}
                        onEdit={() => router.push(`/oneshots/${oneshot.id}`)}
                        onDelete={() => handleDeleteOneshot(oneshot.id)}
                        animationDelay={index * 50}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Floating Action Button */}
      {!isEmpty && (
        <button
          className="fab"
          onClick={() => setIsCreateModalOpen(true)}
          aria-label="Create new campaign"
        >
          <Plus className="fab-icon" />
        </button>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setFormData({ name: '', game_system: 'D&D 5e', description: '', image_url: null })
        }}
        title="Create Campaign"
        description="Start a new campaign for your players"
        size="lg"
      >
        <div className="space-y-5">
          {/* Campaign Image */}
          <div className="form-group">
            <label className="form-label">Campaign Image</label>
            <div className="flex items-start gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="relative w-32 h-24 rounded-xl overflow-hidden transition-all group"
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
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                    {uploadingImage ? (
                      <Loader2 className="w-6 h-6 text-[#606070] animate-spin" />
                    ) : (
                      <>
                        <Camera className="w-6 h-6 text-[#606070] group-hover:text-[#8B5CF6] transition-colors" />
                        <span className="text-xs text-[#606070] group-hover:text-[#8B5CF6] transition-colors">Add Image</span>
                      </>
                    )}
                  </div>
                )}
              </button>
              {formData.image_url && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, image_url: null })}
                  className="text-sm text-[#e85d4c] hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
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
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={!formData.name.trim() || saving || uploadingImage}
            >
              {saving ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </div>
      </Modal>

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
            <div className="flex items-start gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="relative w-32 h-24 rounded-xl overflow-hidden transition-all group"
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
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                    {uploadingImage ? (
                      <Loader2 className="w-6 h-6 text-[#606070] animate-spin" />
                    ) : (
                      <>
                        <Camera className="w-6 h-6 text-[#606070] group-hover:text-[#8B5CF6] transition-colors" />
                        <span className="text-xs text-[#606070] group-hover:text-[#8B5CF6] transition-colors">Add Image</span>
                      </>
                    )}
                  </div>
                )}
              </button>
              {formData.image_url && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, image_url: null })}
                  className="text-sm text-[#e85d4c] hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
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
              disabled={!formData.name.trim() || saving || uploadingImage}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}

// List View Item Component
function CampaignListItem({
  campaign,
  onClick,
  onEdit,
  onDelete,
}: {
  campaign: Campaign
  onClick: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 p-4 bg-[--bg-elevated] rounded-xl border border-white/[0.06] hover:border-purple-500/30 cursor-pointer transition-all group"
    >
      {/* Image */}
      <div className="relative w-20 h-14 rounded-lg overflow-hidden bg-[--bg-surface] flex-shrink-0">
        {campaign.image_url ? (
          <Image src={campaign.image_url} alt={campaign.name} fill className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Gamepad2 className="w-6 h-6 text-gray-600" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="font-display font-semibold text-white/90 truncate">{campaign.name}</h3>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-purple-400 bg-purple-500/15 px-2 py-0.5 rounded">{campaign.game_system}</span>
          {campaign.description && (
            <span className="text-xs text-gray-500 truncate">{campaign.description}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit() }}
          className="p-2 text-gray-400 hover:text-purple-400 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="p-2 text-gray-400 hover:text-red-400 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

// Featured Card Component - Expanded for longer summaries
function FeaturedCampaignCard({
  campaign,
  onClick,
  onEdit,
  onDelete,
}: {
  campaign: Campaign
  onClick: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div
      onClick={onClick}
      className="relative rounded-2xl overflow-hidden cursor-pointer group border border-white/[0.06] hover:border-purple-500/30 transition-all"
    >
      {/* 16:9 Image Container */}
      <div className="relative aspect-video">
        {campaign.image_url ? (
          <Image
            src={campaign.image_url}
            alt={campaign.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 to-indigo-900/30" />
        )}

        {/* Gradient Overlay - stronger at bottom for text */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

        {/* Game System Badge */}
        <div className="absolute top-4 left-4">
          <span className="inline-block text-xs text-purple-400 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-md border border-purple-500/30">
            {campaign.game_system}
          </span>
        </div>

        {/* Hover Actions */}
        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit() }}
            className="px-3 py-1.5 text-sm bg-black/60 backdrop-blur-sm rounded-lg text-white hover:bg-purple-500/80 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="px-3 py-1.5 text-sm bg-black/60 backdrop-blur-sm rounded-lg text-white hover:bg-red-500/80 transition-colors"
          >
            Delete
          </button>
        </div>

        {/* Title at bottom of image */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h3 className="font-display text-2xl font-bold text-white drop-shadow-lg">{campaign.name}</h3>
        </div>
      </div>

      {/* Description below image - full text visible */}
      {campaign.description && (
        <div className="p-5 pt-3 bg-[--bg-elevated]">
          <p className="text-sm text-gray-300 leading-relaxed">{campaign.description}</p>
        </div>
      )}
    </div>
  )
}
