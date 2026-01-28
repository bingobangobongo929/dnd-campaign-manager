'use client'

import Image from 'next/image'
import {
  Plus,
  Image as ImageIcon,
  X,
  Star,
  Trash2,
  Loader2,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { MobileLayout } from '@/components/mobile'
import { Button } from '@/components/ui'
import { UnifiedImageModal } from '@/components/ui/unified-image-modal'
import type { VaultCharacterImage, VaultCharacter } from '@/types/database'

export interface CharacterGalleryPageMobileProps {
  characterId: string
  character: VaultCharacter | null
  images: VaultCharacterImage[]
  loading: boolean
  isAddModalOpen: boolean
  setIsAddModalOpen: (open: boolean) => void
  lightboxImage: VaultCharacterImage | null
  setLightboxImage: (image: VaultCharacterImage | null) => void
  handleAddImage: (imageUrl: string | null) => void
  uploadGalleryImage: (blob: Blob) => Promise<string>
  handleSetPrimary: (imageId: string) => void
  handleDelete: (imageId: string) => void
}

export function CharacterGalleryPageMobile({
  characterId,
  character,
  images,
  loading,
  isAddModalOpen,
  setIsAddModalOpen,
  lightboxImage,
  setLightboxImage,
  handleAddImage,
  uploadGalleryImage,
  handleSetPrimary,
  handleDelete,
}: CharacterGalleryPageMobileProps) {
  if (loading) {
    return (
      <AppLayout characterId={characterId}>
        <MobileLayout title="Gallery" showBackButton backHref={`/vault/${characterId}`}>
          <div className="flex items-center justify-center h-[60vh]">
            <Loader2 className="w-10 h-10 animate-spin text-[--arcane-purple]" />
          </div>
        </MobileLayout>
      </AppLayout>
    )
  }

  const primaryImage = images.find(i => i.is_primary)
  const otherImages = images.filter(i => !i.is_primary)

  return (
    <AppLayout characterId={characterId}>
      <MobileLayout
        title="Gallery"
        showBackButton
        backHref={`/vault/${characterId}`}
        actions={
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="p-2 rounded-lg bg-[--arcane-gold] active:bg-[--arcane-gold]/80 transition-colors"
          >
            <Plus className="w-5 h-5 text-[--bg-base]" />
          </button>
        }
      >
        {images.length === 0 ? (
          <div className="flex items-center justify-center h-[60vh] px-6">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-white/5 flex items-center justify-center">
                <ImageIcon className="w-7 h-7 text-gray-500" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">No Images</h2>
              <p className="text-sm text-gray-400 mb-6">Add portraits and reference images</p>
              <Button onClick={() => setIsAddModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Image
              </Button>
            </div>
          </div>
        ) : (
          <div className="px-4 pb-24">
            {/* Primary Image */}
            {primaryImage && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Primary</h2>
                </div>
                <button
                  className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-[--bg-elevated]"
                  onClick={() => setLightboxImage(primaryImage)}
                >
                  <Image
                    src={primaryImage.image_url}
                    alt={primaryImage.caption || 'Primary portrait'}
                    fill
                    className="object-cover"
                    sizes="100vw"
                  />
                </button>
              </div>
            )}

            {/* Other Images */}
            {otherImages.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Gallery ({otherImages.length})
                </h2>
                <div className="grid grid-cols-3 gap-2">
                  {otherImages.map((image) => (
                    <button
                      key={image.id}
                      className="relative aspect-square rounded-lg overflow-hidden bg-[--bg-elevated] active:opacity-80"
                      onClick={() => setLightboxImage(image)}
                    >
                      <Image
                        src={image.image_url}
                        alt={image.caption || 'Character image'}
                        fill
                        className="object-cover"
                        sizes="33vw"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </MobileLayout>

      {/* Add Image Modal */}
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

      {/* Mobile Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col"
          onClick={() => setLightboxImage(null)}
        >
          <div className="flex items-center justify-between p-4">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDelete(lightboxImage.id)
              }}
              className="p-2 rounded-lg bg-red-500/10 text-red-400 active:bg-red-500/20"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              {!lightboxImage.is_primary && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSetPrimary(lightboxImage.id)
                    setLightboxImage(null)
                  }}
                  className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400 active:bg-yellow-500/20"
                >
                  <Star className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={() => setLightboxImage(null)}
                className="p-2 rounded-lg bg-white/10 text-white active:bg-white/20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div
            className="flex-1 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImage.image_url}
              alt={lightboxImage.caption || 'Character image'}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </AppLayout>
  )
}
