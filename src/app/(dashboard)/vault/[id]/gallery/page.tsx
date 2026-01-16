'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  Loader2,
  Plus,
  Image as ImageIcon,
  X,
  Star,
  Trash2,
  Upload,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { AppLayout } from '@/components/layout/app-layout'
import { Button, Modal } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import type { VaultCharacterImage, VaultCharacter } from '@/types/database'

export default function CharacterGalleryPage() {
  const params = useParams()
  const supabase = createClient()
  const characterId = params.id as string

  const [character, setCharacter] = useState<VaultCharacter | null>(null)
  const [images, setImages] = useState<VaultCharacterImage[]>([])
  const [loading, setLoading] = useState(true)

  // Add image modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [imageCaption, setImageCaption] = useState('')
  const [saving, setSaving] = useState(false)

  // Lightbox
  const [lightboxImage, setLightboxImage] = useState<VaultCharacterImage | null>(null)

  useEffect(() => {
    loadData()
  }, [characterId])

  const loadData = async () => {
    setLoading(true)

    // Load character
    const { data: charData } = await supabase
      .from('vault_characters')
      .select('*')
      .eq('id', characterId)
      .single()

    if (charData) {
      setCharacter(charData)
    }

    // Load images
    const { data: imageData } = await supabase
      .from('vault_character_images')
      .select('*')
      .eq('character_id', characterId)
      .order('is_primary', { ascending: false })
      .order('display_order', { ascending: true })

    if (imageData) {
      setImages(imageData)
    }

    setLoading(false)
  }

  const handleAddImage = async () => {
    if (!imageUrl.trim()) {
      toast.error('Image URL is required')
      return
    }

    setSaving(true)

    const maxOrder = Math.max(0, ...images.map(i => i.display_order || 0))

    const { error } = await supabase
      .from('vault_character_images')
      .insert({
        character_id: characterId,
        image_url: imageUrl,
        caption: imageCaption || null,
        is_primary: images.length === 0, // First image is primary
        display_order: maxOrder + 1,
      })

    if (error) {
      toast.error('Failed to add image')
    } else {
      toast.success('Image added')
      setIsAddModalOpen(false)
      setImageUrl('')
      setImageCaption('')
      loadData()
    }

    setSaving(false)
  }

  const handleSetPrimary = async (imageId: string) => {
    // First, unset all primary flags
    await supabase
      .from('vault_character_images')
      .update({ is_primary: false })
      .eq('character_id', characterId)

    // Then set the selected image as primary
    const { error } = await supabase
      .from('vault_character_images')
      .update({ is_primary: true })
      .eq('id', imageId)

    if (error) {
      toast.error('Failed to set primary image')
    } else {
      // Also update the character's main image_url
      const image = images.find(i => i.id === imageId)
      if (image) {
        await supabase
          .from('vault_characters')
          .update({ image_url: image.image_url })
          .eq('id', characterId)
      }

      toast.success('Primary image updated')
      loadData()
    }
  }

  const handleDelete = async (imageId: string) => {
    if (!confirm('Delete this image?')) return

    const image = images.find(i => i.id === imageId)
    const wasPrimary = image?.is_primary

    const { error } = await supabase
      .from('vault_character_images')
      .delete()
      .eq('id', imageId)

    if (error) {
      toast.error('Failed to delete image')
    } else {
      // If deleted image was primary, clear character's image_url
      if (wasPrimary) {
        await supabase
          .from('vault_characters')
          .update({ image_url: null })
          .eq('id', characterId)
      }

      toast.success('Image deleted')
      setLightboxImage(null)
      loadData()
    }
  }

  if (loading) {
    return (
      <AppLayout characterId={characterId}>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[--arcane-purple]" />
        </div>
      </AppLayout>
    )
  }

  const primaryImage = images.find(i => i.is_primary)
  const otherImages = images.filter(i => !i.is_primary)

  return (
    <AppLayout characterId={characterId}>
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[--text-primary]">Gallery</h1>
            <p className="text-sm text-[--text-secondary]">
              Manage character portraits and reference images
            </p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Image
          </Button>
        </div>

        {images.length === 0 ? (
          <div className="text-center py-16">
            <ImageIcon className="w-12 h-12 mx-auto mb-4 text-[--text-tertiary]" />
            <h3 className="text-lg font-medium text-[--text-primary] mb-2">No Images</h3>
            <p className="text-sm text-[--text-secondary] mb-6">
              Add portraits, art, and reference images for your character
            </p>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Image
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Primary Image */}
            {primaryImage && (
              <div>
                <h2 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400" />
                  Primary Portrait
                </h2>
                <div
                  className="relative group max-w-md cursor-pointer"
                  onClick={() => setLightboxImage(primaryImage)}
                >
                  <img
                    src={primaryImage.image_url}
                    alt={primaryImage.caption || 'Primary portrait'}
                    className="w-full rounded-xl border border-white/[0.06] hover:border-white/[0.1] transition-colors"
                  />
                  {primaryImage.caption && (
                    <p className="text-sm text-[--text-secondary] mt-2">{primaryImage.caption}</p>
                  )}
                </div>
              </div>
            )}

            {/* Other Images */}
            {otherImages.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-wider mb-4">
                  Additional Images ({otherImages.length})
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {otherImages.map((image) => (
                    <div
                      key={image.id}
                      className="relative group cursor-pointer"
                      onClick={() => setLightboxImage(image)}
                    >
                      <div className="aspect-square rounded-xl overflow-hidden bg-[--bg-elevated] border border-white/[0.06] hover:border-white/[0.1] transition-colors">
                        <img
                          src={image.image_url}
                          alt={image.caption || 'Character image'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {image.caption && (
                        <p className="text-xs text-[--text-secondary] mt-1 truncate">{image.caption}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Add Image Modal */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Add Image"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[--text-secondary] mb-1">
                Image URL *
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[--bg-elevated] border border-[--border] text-[--text-primary] focus:outline-none focus:border-[--arcane-purple]"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[--text-secondary] mb-1">
                Caption
              </label>
              <input
                type="text"
                value={imageCaption}
                onChange={(e) => setImageCaption(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[--bg-elevated] border border-[--border] text-[--text-primary] focus:outline-none focus:border-[--arcane-purple]"
                placeholder="Description or notes"
              />
            </div>

            {imageUrl && (
              <div>
                <label className="block text-sm font-medium text-[--text-secondary] mb-1">
                  Preview
                </label>
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="max-h-48 rounded-lg border border-[--border]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-[--border]">
              <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddImage} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Add Image
              </Button>
            </div>
          </div>
        </Modal>

        {/* Lightbox */}
        {lightboxImage && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightboxImage(null)}
          >
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div
              className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={lightboxImage.image_url}
                alt={lightboxImage.caption || 'Character image'}
                className="max-w-full max-h-[75vh] object-contain rounded-lg"
              />

              {lightboxImage.caption && (
                <p className="text-white/70 text-sm mt-4 text-center">{lightboxImage.caption}</p>
              )}

              <div className="flex gap-3 mt-4">
                {!lightboxImage.is_primary && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      handleSetPrimary(lightboxImage.id)
                      setLightboxImage(null)
                    }}
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Set as Primary
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={() => window.open(lightboxImage.image_url, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Original
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleDelete(lightboxImage.id)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
