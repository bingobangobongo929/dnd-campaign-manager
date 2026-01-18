'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { v4 as uuidv4 } from 'uuid'
import {
  Loader2,
  Plus,
  Image as ImageIcon,
  X,
  Star,
  Trash2,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { AppLayout } from '@/components/layout/app-layout'
import { useIsMobile } from '@/hooks'
import { CharacterGalleryPageMobile } from './page.mobile'
import { Button } from '@/components/ui'
import { BackToTopButton } from '@/components/ui/back-to-top'
import { UnifiedImageModal } from '@/components/ui/unified-image-modal'
import { createClient } from '@/lib/supabase/client'
import type { VaultCharacterImage, VaultCharacter } from '@/types/database'

export default function CharacterGalleryPage() {
  const params = useParams()
  const supabase = createClient()
  const characterId = params.id as string
  const isMobile = useIsMobile()

  const [character, setCharacter] = useState<VaultCharacter | null>(null)
  const [images, setImages] = useState<VaultCharacterImage[]>([])
  const [loading, setLoading] = useState(true)

  // Add image modal (now uses UnifiedImageModal)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

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

  // Upload image to storage
  const uploadGalleryImage = async (blob: Blob): Promise<string> => {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) throw new Error('Not authenticated')

    const timestamp = Date.now()
    const uniqueId = uuidv4().slice(0, 8)
    const path = `${userData.user.id}/gallery/${timestamp}-${uniqueId}.webp`

    const { error } = await supabase.storage
      .from('vault-images')
      .upload(path, blob, {
        contentType: 'image/webp',
        upsert: true,
      })

    if (error) throw error

    const { data: urlData } = supabase.storage
      .from('vault-images')
      .getPublicUrl(path)

    return urlData.publicUrl
  }

  // Handle adding image from UnifiedImageModal
  const handleAddImage = async (imageUrl: string | null) => {
    if (!imageUrl || !imageUrl.trim()) {
      toast.error('Image URL is required')
      return
    }

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      toast.error('Not authenticated')
      return
    }

    const maxOrder = Math.max(0, ...images.map(i => i.display_order || 0))

    const { error, data } = await supabase
      .from('vault_character_images')
      .insert({
        user_id: userData.user.id,
        character_id: characterId,
        image_url: imageUrl,
        is_primary: images.length === 0, // First image is primary
        display_order: maxOrder + 1,
      })
      .select()
      .single()

    if (error) {
      toast.error('Failed to add image')
    } else {
      toast.success('Image added')
      setIsAddModalOpen(false)
      if (data) {
        setImages(prev => [...prev, data])
      }
    }
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
      setImages(prev => prev.filter(i => i.id !== imageId))
    }
  }

  // ============ MOBILE LAYOUT ============
  if (isMobile) {
    return (
      <CharacterGalleryPageMobile
        characterId={characterId}
        character={character}
        images={images}
        loading={loading}
        isAddModalOpen={isAddModalOpen}
        setIsAddModalOpen={setIsAddModalOpen}
        lightboxImage={lightboxImage}
        setLightboxImage={setLightboxImage}
        handleAddImage={handleAddImage}
        uploadGalleryImage={uploadGalleryImage}
        handleSetPrimary={handleSetPrimary}
        handleDelete={handleDelete}
      />
    )
  }

  // ============ DESKTOP LAYOUT ============
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
                  <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-white/[0.06] hover:border-white/[0.1] transition-colors">
                    <Image
                      src={primaryImage.image_url}
                      alt={primaryImage.caption || 'Primary portrait'}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 400px"
                    />
                  </div>
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
                        <Image
                          src={image.image_url}
                          alt={image.caption || 'Character image'}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
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

        {/* Add Image Modal - Uses UnifiedImageModal */}
        <UnifiedImageModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          imageType="gallery"
          currentImageUrl={null}
          onImageChange={handleAddImage}
          onUpload={uploadGalleryImage}
          promptData={{
            type: 'gallery',
            name: character?.name || '',
            race: character?.race || '',
            class: character?.class || '',
            appearance: character?.appearance || '',
          }}
          title="Add Gallery Image"
        />

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
              <div className="relative max-w-full max-h-[75vh]">
                <img
                  src={lightboxImage.image_url}
                  alt={lightboxImage.caption || 'Character image'}
                  className="max-w-full max-h-[75vh] object-contain rounded-lg"
                />
              </div>

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
      <BackToTopButton />
    </AppLayout>
  )
}
