'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Gamepad2, Camera, Loader2, X } from 'lucide-react'
import { Modal, Input, Textarea, Dropdown } from '@/components/ui'
import { CampaignCard } from '@/components/ui/campaign-card'
import { AppLayout } from '@/components/layout/app-layout'
import { useSupabase, useUser } from '@/hooks'
import { v4 as uuidv4 } from 'uuid'
import Image from 'next/image'
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

  useEffect(() => {
    if (user) {
      loadCampaigns()
    }
  }, [user])

  const loadCampaigns = async () => {
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', user!.id)
      .order('updated_at', { ascending: false })

    if (data) {
      setCampaigns(data)
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

  return (
    <AppLayout>
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Your Campaigns</h1>
        <p className="page-subtitle">Manage your tabletop adventures</p>
      </div>

      {campaigns.length === 0 ? (
        /* Empty State */
        <div className="empty-state">
          <Gamepad2 className="empty-state-icon" />
          <h2 className="empty-state-title">No campaigns yet</h2>
          <p className="empty-state-description">
            Create your first campaign to start organizing your world, characters, and stories.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="w-5 h-5" />
            Create Your First Campaign
          </button>
        </div>
      ) : (
        /* Campaign Grid */
        <div className="campaign-grid">
          {campaigns.map((campaign, index) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onClick={() => router.push(`/campaigns/${campaign.id}/canvas`)}
              onEdit={() => openEditModal(campaign)}
              onDelete={() => handleDelete(campaign.id)}
              animationDelay={index * 50}
            />
          ))}
        </div>
      )}

      {/* Floating Action Button */}
      {campaigns.length > 0 && (
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
