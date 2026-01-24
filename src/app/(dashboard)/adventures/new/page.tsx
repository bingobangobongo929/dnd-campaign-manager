'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Compass,
  Camera,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { Input, Textarea, Dropdown, UnifiedImageModal } from '@/components/ui'
import { useSupabase, useUser } from '@/hooks'
import { v4 as uuidv4 } from 'uuid'

const GAME_SYSTEMS = [
  { value: 'D&D 5e', label: 'D&D 5e' },
  { value: 'D&D 3.5e', label: 'D&D 3.5e' },
  { value: 'Pathfinder 2e', label: 'Pathfinder 2e' },
  { value: 'Lancer', label: 'Lancer' },
  { value: 'Call of Cthulhu', label: 'Call of Cthulhu' },
  { value: 'Vampire: The Masquerade', label: 'Vampire: The Masquerade' },
  { value: 'Custom', label: 'Custom System' },
]

const SESSION_ESTIMATES = [
  { value: '3', label: '3 sessions' },
  { value: '4', label: '4 sessions' },
  { value: '5', label: '5 sessions' },
  { value: '6', label: '6 sessions' },
  { value: '7', label: '7 sessions' },
  { value: '8', label: '8 sessions' },
  { value: '9', label: '9 sessions' },
]

export default function NewAdventurePage() {
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()

  const [formData, setFormData] = useState({
    name: '',
    game_system: 'D&D 5e',
    description: '',
    image_url: null as string | null,
    estimated_sessions: '5',
  })
  const [creating, setCreating] = useState(false)
  const [imageModalOpen, setImageModalOpen] = useState(false)

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

  const handleCreate = async () => {
    if (!formData.name.trim() || !user) return

    setCreating(true)

    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        user_id: user.id,
        name: formData.name,
        game_system: formData.game_system,
        description: formData.description || null,
        image_url: formData.image_url,
        duration_type: 'adventure',
        estimated_sessions: parseInt(formData.estimated_sessions),
        status: 'active',
      })
      .select()
      .single()

    if (data) {
      router.push(`/campaigns/${data.id}/dashboard`)
    } else {
      setCreating(false)
    }
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <Compass className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">
            Create New Adventure
          </h1>
          <p className="text-gray-400">
            Multi-session stories that span 3-9 sessions
          </p>
        </div>

        <div className="space-y-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
          {/* Adventure Image */}
          <div className="form-group">
            <label className="form-label">Adventure Cover</label>
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
                    alt="Adventure"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <Camera className="w-8 h-8 text-[#606070] group-hover:text-amber-400 transition-colors" />
                  <span className="text-sm text-[#606070] group-hover:text-amber-400 transition-colors">
                    Click to add cover image
                  </span>
                </div>
              )}
            </button>
          </div>

          {/* Adventure Name */}
          <div className="form-group">
            <label className="form-label">Adventure Name</label>
            <Input
              className="form-input"
              placeholder="e.g., The Lost Mine of Phandelver"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          {/* Game System + Session Estimate */}
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Game System</label>
              <Dropdown
                options={GAME_SYSTEMS}
                value={formData.game_system}
                onChange={(value) => setFormData({ ...formData, game_system: value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Estimated Length</label>
              <Dropdown
                options={SESSION_ESTIMATES}
                value={formData.estimated_sessions}
                onChange={(value) => setFormData({ ...formData, estimated_sessions: value })}
              />
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <Textarea
              className="form-textarea"
              placeholder="Brief description of your adventure..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          {/* Create Button */}
          <button
            onClick={handleCreate}
            disabled={!formData.name.trim() || creating}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-600/50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
          >
            {creating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                Create Adventure
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>

        {/* Image Modal */}
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
          title="Adventure"
        />
      </div>
    </AppLayout>
  )
}
