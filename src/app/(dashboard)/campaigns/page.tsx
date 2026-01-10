'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, MoreHorizontal, Trash2, Edit, Gamepad2 } from 'lucide-react'
import { Button, Card, CardContent, Modal, Input, Textarea, Dropdown, EmptyState, Avatar } from '@/components/ui'
import { DashboardLayout } from '@/components/layout'
import { useSupabase, useUser } from '@/hooks'
import { formatDate } from '@/lib/utils'
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
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-2 border-[--accent-primary] border-t-transparent rounded-full spinner" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[--text-primary]">Campaigns</h1>
            <p className="text-[--text-secondary]">Manage your TTRPG campaigns</p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        </div>

        {campaigns.length === 0 ? (
          <EmptyState
            icon={<Gamepad2 className="h-12 w-12" />}
            title="No campaigns yet"
            description="Create your first campaign to start organizing your world"
            action={
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map((campaign) => (
              <Card
                key={campaign.id}
                hover
                onClick={() => router.push(`/campaigns/${campaign.id}/canvas`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar name={campaign.name} src={campaign.image_url} size="lg" />
                      <div>
                        <h3 className="font-semibold text-[--text-primary]">{campaign.name}</h3>
                        <p className="text-sm text-[--text-secondary]">{campaign.game_system}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditModal(campaign)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-[--accent-danger]"
                        onClick={() => handleDelete(campaign.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {campaign.description && (
                    <p className="mt-3 text-sm text-[--text-secondary] line-clamp-2">
                      {campaign.description}
                    </p>
                  )}
                  <p className="mt-3 text-xs text-[--text-tertiary]">
                    Updated {formatDate(campaign.updated_at)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
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
            <div className="space-y-2">
              <label className="text-sm font-medium text-[--text-primary]">Campaign Name</label>
              <Input
                placeholder="e.g., Curse of Strahd"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[--text-primary]">Game System</label>
              <Dropdown
                options={GAME_SYSTEMS}
                value={formData.game_system}
                onChange={(value) => setFormData({ ...formData, game_system: value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[--text-primary]">Description (optional)</label>
              <Textarea
                placeholder="Brief description of your campaign..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} loading={saving} disabled={!formData.name.trim()}>
                Create Campaign
              </Button>
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
            <div className="space-y-2">
              <label className="text-sm font-medium text-[--text-primary]">Campaign Name</label>
              <Input
                placeholder="e.g., Curse of Strahd"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[--text-primary]">Game System</label>
              <Dropdown
                options={GAME_SYSTEMS}
                value={formData.game_system}
                onChange={(value) => setFormData({ ...formData, game_system: value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[--text-primary]">Description (optional)</label>
              <Textarea
                placeholder="Brief description of your campaign..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" onClick={() => setEditingCampaign(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} loading={saving} disabled={!formData.name.trim()}>
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  )
}
