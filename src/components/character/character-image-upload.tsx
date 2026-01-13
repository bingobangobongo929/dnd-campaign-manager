'use client'

import { useState, useRef, useCallback } from 'react'
import { Camera, Sparkles, Loader2, Upload, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ImageCropModal } from '@/components/ui/image-crop-modal'
import { useSupabase } from '@/hooks'
import Image from 'next/image'
import { v4 as uuidv4 } from 'uuid'

interface CharacterImageUploadProps {
  characterId: string
  characterName: string
  characterType: 'pc' | 'npc'
  characterDescription?: string | null
  characterSummary?: string | null
  avatarUrl: string | null
  detailUrl: string | null
  onUpdate: (avatarUrl: string | null, detailUrl: string | null, aiGenerated: boolean) => void
  size?: 'md' | 'lg' | 'xl'
  className?: string
}

// TODO: Set to true once REPLICATE_API_TOKEN is configured in .env.local
const AI_IMAGE_GENERATION_ENABLED = false

export function CharacterImageUpload({
  characterId,
  characterName,
  characterType,
  characterDescription,
  characterSummary,
  avatarUrl,
  detailUrl,
  onUpdate,
  size = 'xl',
  className,
}: CharacterImageUploadProps) {
  const supabase = useSupabase()
  const inputRef = useRef<HTMLInputElement>(null)

  const [isGenerating, setIsGenerating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Crop modal state
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null)
  const [pendingIsAiGenerated, setPendingIsAiGenerated] = useState(false)

  const sizes = {
    md: 'h-16 w-16',
    lg: 'h-20 w-20',
    xl: 'h-24 w-24',
  }

  // Handle file selection
  const handleFileSelect = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be less than 10MB')
      return
    }

    setError(null)

    // Create object URL for crop modal
    const objectUrl = URL.createObjectURL(file)
    setPendingImageSrc(objectUrl)
    setPendingIsAiGenerated(false)
    setCropModalOpen(true)

    // Reset input
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }, [])

  // Handle AI generation
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterName,
          characterType,
          description: characterDescription,
          summary: characterSummary,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate image')
      }

      const { imageUrl } = await response.json()

      // Open crop modal with generated image
      setPendingImageSrc(imageUrl)
      setPendingIsAiGenerated(true)
      setCropModalOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate image')
    } finally {
      setIsGenerating(false)
    }
  }, [characterName, characterType, characterDescription, characterSummary])

  // Handle save from crop modal
  const handleCropSave = useCallback(async (avatarBlob: Blob, detailBlob: Blob) => {
    setIsUploading(true)
    setError(null)

    try {
      const timestamp = Date.now()
      const uniqueId = uuidv4().slice(0, 8)
      const basePath = `${characterId}/${timestamp}-${uniqueId}`

      // Upload avatar crop
      const avatarPath = `${basePath}-avatar.jpg`
      const { error: avatarError } = await supabase.storage
        .from('character-images')
        .upload(avatarPath, avatarBlob, {
          contentType: 'image/jpeg',
          upsert: true,
        })

      if (avatarError) throw avatarError

      // Upload detail crop
      const detailPath = `${basePath}-detail.jpg`
      const { error: detailError } = await supabase.storage
        .from('character-images')
        .upload(detailPath, detailBlob, {
          contentType: 'image/jpeg',
          upsert: true,
        })

      if (detailError) throw detailError

      // Get public URLs
      const { data: avatarUrlData } = supabase.storage
        .from('character-images')
        .getPublicUrl(avatarPath)

      const { data: detailUrlData } = supabase.storage
        .from('character-images')
        .getPublicUrl(detailPath)

      // Update parent with new URLs
      onUpdate(avatarUrlData.publicUrl, detailUrlData.publicUrl, pendingIsAiGenerated)

      // Clean up
      setCropModalOpen(false)
      setPendingImageSrc(null)
    } catch (err) {
      console.error('Upload error:', err)
      setError('Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }, [characterId, supabase, onUpdate, pendingIsAiGenerated])

  // Handle removing image
  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onUpdate(null, null, false)
  }, [onUpdate])

  // Close crop modal
  const handleCropClose = useCallback(() => {
    setCropModalOpen(false)
    // Clean up object URL if it was a local file
    if (pendingImageSrc && pendingImageSrc.startsWith('blob:')) {
      URL.revokeObjectURL(pendingImageSrc)
    }
    setPendingImageSrc(null)
  }, [pendingImageSrc])

  const isLoading = isGenerating || isUploading

  return (
    <div className={cn('relative', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Detail image preview (2:3 aspect ratio) - shown when available */}
      {detailUrl ? (
        <div className="relative group mb-3">
          <div className="relative w-32 h-48 rounded-xl overflow-hidden border-2 border-[--border] bg-[--bg-base]">
            <Image
              src={detailUrl}
              alt={characterName}
              fill
              className="object-cover"
              sizes="128px"
            />
            {/* Hover overlay */}
            <button
              type="button"
              onClick={handleFileSelect}
              disabled={isLoading}
              className={cn(
                'absolute inset-0 bg-black/60 flex items-center justify-center',
                'opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer'
              )}
            >
              <Camera className="w-8 h-8 text-white" />
            </button>
          </div>
          {/* Remove button */}
          {!isLoading && (
            <button
              type="button"
              onClick={handleRemove}
              className={cn(
                'absolute -top-2 -right-2 p-1.5 rounded-full',
                'bg-[--bg-surface] border border-[--border]',
                'text-[--text-secondary] hover:text-[--arcane-ember] hover:border-[--arcane-ember]',
                'opacity-0 group-hover:opacity-100 transition-all shadow-lg',
                'focus:outline-none focus:opacity-100'
              )}
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {/* Small avatar preview in corner */}
          {avatarUrl && (
            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full overflow-hidden border-2 border-[--bg-surface] shadow-lg">
              <Image
                src={avatarUrl}
                alt={`${characterName} avatar`}
                fill
                className="object-cover"
                sizes="40px"
              />
            </div>
          )}
        </div>
      ) : (
        /* Empty state - circular upload button */
        <div className={cn('relative group mb-3', sizes[size])}>
          <button
            type="button"
            onClick={handleFileSelect}
            disabled={isLoading}
            className={cn(
              'relative w-full h-full rounded-full overflow-hidden transition-all',
              'focus:outline-none focus:ring-2 focus:ring-[--arcane-purple] focus:ring-offset-2 focus:ring-offset-[--bg-surface]',
              'border-2 border-dashed border-[--text-tertiary] hover:border-[--arcane-purple]',
              isLoading && 'opacity-70 cursor-wait',
              !isLoading && 'cursor-pointer'
            )}
          >
            <div className="absolute inset-0 flex items-center justify-center bg-[--bg-hover]">
              {isLoading ? (
                <Loader2 className="w-6 h-6 text-[--text-secondary] animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-[--text-tertiary] group-hover:text-[--arcane-purple] transition-colors" />
              )}
            </div>
          </button>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleFileSelect}
          disabled={isLoading}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
            'bg-[--bg-elevated] border border-[--border] text-[--text-secondary]',
            'hover:bg-[--bg-hover] hover:text-[--text-primary]',
            isLoading && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Upload className="w-3.5 h-3.5" />
          {detailUrl ? 'Change' : 'Upload'}
        </button>
        {AI_IMAGE_GENERATION_ENABLED && (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              'bg-[--arcane-gold]/10 border border-[--arcane-gold]/30 text-[--arcane-gold]',
              'hover:bg-[--arcane-gold]/20 hover:border-[--arcane-gold]/50',
              isLoading && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Generate
              </>
            )}
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-2 text-xs text-[--arcane-ember]">{error}</p>
      )}

      {/* Crop Modal */}
      {pendingImageSrc && (
        <ImageCropModal
          isOpen={cropModalOpen}
          imageSrc={pendingImageSrc}
          onClose={handleCropClose}
          onSave={handleCropSave}
        />
      )}
    </div>
  )
}
