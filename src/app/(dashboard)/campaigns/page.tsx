'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Gamepad2 } from 'lucide-react'
import { Modal, Input, Textarea, Dropdown } from '@/components/ui'
import { CampaignCard } from '@/components/ui/campaign-card'
import { AppLayout } from '@/components/layout/app-layout'
import { useSupabase, useUser } from '@/hooks'
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
  })
  const [saving, setSaving] = useState(false)

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
      })
      .select()
      .single()

    if (data) {
      setCampaigns([data, ...campaigns])
      setIsCreateModalOpen(false)
      setFormData({ name: '', game_system: 'D&D 5e', description: '' })
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
      })
      .eq('id', editingCampaign.id)
      .select()
      .single()

    if (data) {
      setCampaigns(campaigns.map((c) => (c.id === data.id ? data : c)))
      setEditingCampaign(null)
      setFormData({ name: '', game_system: 'D&D 5e', description: '' })
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

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setFormData({ name: '', game_system: 'D&D 5e', description: '' })
        }}
        title="Create Campaign"
        description="Start a new campaign for your players"
      >
        <div className="space-y-4">
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
              disabled={!formData.name.trim() || saving}
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
          setFormData({ name: '', game_system: 'D&D 5e', description: '' })
        }}
        title="Edit Campaign"
      >
        <div className="space-y-4">
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
    </AppLayout>
  )
}
