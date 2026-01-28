'use client'

import { Image as ImageIcon, Upload, Plus, Trash2, X, Loader2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { MobileLayout } from '@/components/mobile'
import Image from 'next/image'
import type { MediaItem } from '@/types/database'

export interface CampaignGalleryPageMobileProps {
  campaignId: string
  items: MediaItem[]
  loading: boolean
  uploading: boolean
  error: string | null
  selectedItem: MediaItem | null
  setSelectedItem: (item: MediaItem | null) => void
  handleFileSelect: () => void
  handleDelete: (item: MediaItem) => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function CampaignGalleryPageMobile({
  campaignId,
  items,
  loading,
  uploading,
  error,
  selectedItem,
  setSelectedItem,
  handleFileSelect,
  handleDelete,
  fileInputRef,
  handleFileChange,
}: CampaignGalleryPageMobileProps) {
  if (loading) {
    return (
      <AppLayout campaignId={campaignId}>
        <MobileLayout title="Gallery" showBackButton backHref={`/campaigns/${campaignId}/canvas`}>
          <div className="flex items-center justify-center h-[60vh]">
            <Loader2 className="w-10 h-10 animate-spin text-[--arcane-purple]" />
          </div>
        </MobileLayout>
      </AppLayout>
    )
  }

  return (
    <AppLayout campaignId={campaignId}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      <MobileLayout
        title="Gallery"
        showBackButton
        backHref={`/campaigns/${campaignId}/canvas`}
        actions={
          <button
            onClick={handleFileSelect}
            disabled={uploading}
            className="p-2 rounded-lg bg-[--arcane-gold] active:bg-[--arcane-gold]/80 transition-colors"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 text-[--bg-base] animate-spin" />
            ) : (
              <Plus className="w-5 h-5 text-[--bg-base]" />
            )}
          </button>
        }
      >
        {items.length === 0 && !uploading ? (
          /* Empty State */
          <div className="flex items-center justify-center h-[60vh] px-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[--arcane-gold]/10 flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-[--arcane-gold]" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">Your Gallery is Empty</h2>
              <p className="text-sm text-gray-400 mb-6">
                Upload reference images, character art, or visual inspiration
              </p>
              <button
                onClick={handleFileSelect}
                disabled={uploading}
                className="btn btn-primary"
              >
                <Upload className="w-4 h-4" />
                Upload Images
              </button>
              {error && (
                <p className="mt-4 text-sm text-red-400">{error}</p>
              )}
            </div>
          </div>
        ) : (
          /* Gallery Grid */
          <div className="px-4 pb-24">
            <p className="text-sm text-gray-500 mb-4">{items.length} images</p>

            {error && (
              <p className="mb-4 text-sm text-red-400">{error}</p>
            )}

            <div className="grid grid-cols-3 gap-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="relative aspect-square rounded-lg overflow-hidden bg-white/5 active:opacity-80 transition-opacity"
                >
                  <Image
                    src={item.image_url}
                    alt={item.title || 'Gallery image'}
                    fill
                    className="object-cover"
                    sizes="33vw"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </MobileLayout>

      {/* Lightbox Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col"
          onClick={() => setSelectedItem(null)}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDelete(selectedItem)
              }}
              className="p-2 rounded-lg bg-red-500/10 text-red-400 active:bg-red-500/20 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <h3 className="text-white font-medium truncate flex-1 text-center px-4">
              {selectedItem.title || 'Image'}
            </h3>
            <button
              onClick={() => setSelectedItem(null)}
              className="p-2 rounded-lg bg-white/10 text-white active:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Image */}
          <div
            className="flex-1 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedItem.image_url}
              alt={selectedItem.title || 'Gallery image'}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </AppLayout>
  )
}
