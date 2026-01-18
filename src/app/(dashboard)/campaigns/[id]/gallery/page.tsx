'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Image as ImageIcon, Upload, Plus, Trash2, X, Loader2, Grid, LayoutGrid } from 'lucide-react'
import { Modal, Input } from '@/components/ui'
import { AppLayout } from '@/components/layout/app-layout'
import { BackToTopButton } from '@/components/ui/back-to-top'
import { useSupabase, useUser, useIsMobile } from '@/hooks'
import { CampaignGalleryPageMobile } from './page.mobile'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { v4 as uuidv4 } from 'uuid'
import type { Campaign, MediaItem } from '@/types/database'

export default function GalleryPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const campaignId = params.id as string
  const isMobile = useIsMobile()

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [items, setItems] = useState<MediaItem[]>([])
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [gridSize, setGridSize] = useState<'sm' | 'md' | 'lg'>('md')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user && campaignId) {
      loadData()
    }
  }, [user, campaignId])

  const loadData = async () => {
    setLoading(true)

    const { data: campaignData } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (!campaignData) {
      router.push('/campaigns')
      return
    }
    setCampaign(campaignData)

    const { data: itemsData } = await supabase
      .from('media_gallery')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })

    setItems(itemsData || [])
    setLoading(false)
  }

  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setError(null)
    setUploading(true)

    const uploadPromises = Array.from(files).map(async (file) => {
      if (!file.type.startsWith('image/')) {
        return null
      }

      if (file.size > 10 * 1024 * 1024) {
        return null
      }

      try {
        const uniqueId = uuidv4()
        const ext = file.name.split('.').pop()
        const path = `${campaignId}/${uniqueId}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('media-gallery')
          .upload(path, file, {
            contentType: file.type,
          })

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('media-gallery')
          .getPublicUrl(path)

        const title = file.name.replace(/\.[^/.]+$/, '')

        const { data: itemData, error: insertError } = await supabase
          .from('media_gallery')
          .insert({
            campaign_id: campaignId,
            image_url: urlData.publicUrl,
            title: title,
          })
          .select()
          .single()

        if (insertError) throw insertError
        return itemData
      } catch (err) {
        console.error('Upload error:', err)
        return null
      }
    })

    const results = await Promise.all(uploadPromises)
    const newItems = results.filter(Boolean) as MediaItem[]

    if (newItems.length > 0) {
      setItems([...newItems, ...items])
    }

    if (newItems.length < files.length) {
      setError(`Some files couldn't be uploaded (max 10MB, images only)`)
    }

    setUploading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [campaignId, items, supabase])

  const handleDelete = async (item: MediaItem) => {
    if (!confirm('Delete this image? This cannot be undone.')) return

    // Extract path from URL for deletion
    const urlParts = item.image_url.split('/media-gallery/')
    if (urlParts.length > 1) {
      await supabase.storage.from('media-gallery').remove([urlParts[1]])
    }

    await supabase.from('media_gallery').delete().eq('id', item.id)
    setItems(items.filter(i => i.id !== item.id))
    if (selectedItem?.id === item.id) {
      setSelectedItem(null)
    }
  }

  const gridClasses = {
    sm: 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10',
    md: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
    lg: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
  }

  const itemSizes = {
    sm: 'aspect-square',
    md: 'aspect-square',
    lg: 'aspect-[4/3]',
  }

  // ============ MOBILE LAYOUT ============
  if (isMobile) {
    return (
      <CampaignGalleryPageMobile
        campaignId={campaignId}
        items={items}
        loading={loading}
        uploading={uploading}
        error={error}
        selectedItem={selectedItem}
        setSelectedItem={setSelectedItem}
        handleFileSelect={handleFileSelect}
        handleDelete={handleDelete}
        fileInputRef={fileInputRef}
        handleFileChange={handleFileChange}
      />
    )
  }

  // ============ DESKTOP LAYOUT ============
  if (loading) {
    return (
      <AppLayout campaignId={campaignId}>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-10 h-10 border-2 border-[--arcane-purple] border-t-transparent rounded-full spinner" />
        </div>
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

      {items.length === 0 && !uploading ? (
        /* Empty State */
        <div className="flex items-center justify-center h-[70vh]">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[--arcane-gold]/10 flex items-center justify-center">
              <ImageIcon className="w-10 h-10 text-[--arcane-gold]" />
            </div>
            <h2 className="text-2xl font-display font-semibold text-[--text-primary] mb-3">
              Your Gallery is Empty
            </h2>
            <p className="text-[--text-secondary] mb-8 leading-relaxed">
              Upload reference images, character art, item illustrations, or any
              visual inspiration for your campaign. You can upload multiple images at once.
            </p>
            <button
              onClick={handleFileSelect}
              disabled={uploading}
              className="btn btn-primary btn-lg"
            >
              <Upload className="w-5 h-5" />
              Upload Images
            </button>
            {error && (
              <p className="mt-4 text-sm text-[--arcane-ember]">{error}</p>
            )}
          </div>
        </div>
      ) : (
        /* Gallery View */
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="page-title">Gallery</h1>
              <p className="text-sm text-[--text-tertiary]">{items.length} images</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Grid size toggle */}
              <div className="flex items-center gap-1 p-1 bg-[--bg-elevated] rounded-lg">
                <button
                  onClick={() => setGridSize('sm')}
                  className={cn(
                    'p-1.5 rounded',
                    gridSize === 'sm' ? 'bg-[--bg-surface] shadow-sm' : 'hover:bg-[--bg-hover]'
                  )}
                  title="Small grid"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setGridSize('md')}
                  className={cn(
                    'p-1.5 rounded',
                    gridSize === 'md' ? 'bg-[--bg-surface] shadow-sm' : 'hover:bg-[--bg-hover]'
                  )}
                  title="Medium grid"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={handleFileSelect}
                disabled={uploading}
                className="btn btn-primary"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add Images
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="mb-4 text-sm text-[--arcane-ember]">{error}</p>
          )}

          {/* Grid */}
          <div className={cn('grid gap-3', gridClasses[gridSize])}>
            {items.map((item, index) => (
              <div
                key={item.id}
                className={cn(
                  'group relative rounded-xl overflow-hidden bg-[--bg-elevated] cursor-pointer',
                  'border border-[--border] hover:border-[--arcane-purple]/50 transition-all',
                  itemSizes[gridSize]
                )}
                style={{ animationDelay: `${index * 30}ms` }}
                onClick={() => setSelectedItem(item)}
              >
                <Image
                  src={item.image_url}
                  alt={item.title || 'Gallery image'}
                  fill
                  className="object-cover"
                  sizes={gridSize === 'sm' ? '100px' : gridSize === 'md' ? '200px' : '400px'}
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-sm text-white truncate">{item.title}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(item)
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-[--arcane-ember] transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedItem(null)}
        >
          <button
            onClick={() => setSelectedItem(null)}
            className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div
            className="relative max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedItem.image_url}
              alt={selectedItem.title || 'Gallery image'}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            {selectedItem.title && (
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent rounded-b-lg">
                <p className="text-white text-lg">{selectedItem.title}</p>
              </div>
            )}
          </div>
        </div>
      )}
      <BackToTopButton />
    </AppLayout>
  )
}
