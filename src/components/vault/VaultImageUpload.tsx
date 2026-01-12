'use client'

import { useState, useRef, useCallback } from 'react'
import { Camera, Loader2, Upload, X } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { VaultImageCropModal } from './VaultImageCropModal'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { v4 as uuidv4 } from 'uuid'

interface VaultImageUploadProps {
  characterId: string | null
  characterName: string
  cardImageUrl: string | null
  detailImageUrl: string | null
  onUpdate: (cardUrl: string | null, detailUrl: string | null) => void
  className?: string
}

export function VaultImageUpload({
  characterId,
  characterName,
  cardImageUrl,
  detailImageUrl,
  onUpdate,
  className,
}: VaultImageUploadProps) {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)

  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null)

  const handleFileSelect = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be less than 10MB')
      return
    }

    setError(null)

    const objectUrl = URL.createObjectURL(file)
    setPendingImageSrc(objectUrl)
    setCropModalOpen(true)

    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }, [])

  const handleCropSave = useCallback(async (cardBlob: Blob, detailBlob: Blob) => {
    setIsUploading(true)
    setError(null)

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Not authenticated')

      const timestamp = Date.now()
      const uniqueId = uuidv4().slice(0, 8)
      const basePath = `${userData.user.id}/vault/${characterId || 'new'}-${timestamp}-${uniqueId}`

      // Upload card crop (16:9)
      const cardPath = `${basePath}-card.jpg`
      const { error: cardError } = await supabase.storage
        .from('vault-images')
        .upload(cardPath, cardBlob, {
          contentType: 'image/jpeg',
          upsert: true,
        })

      if (cardError) throw cardError

      // Upload detail crop (4:3)
      const detailPath = `${basePath}-detail.jpg`
      const { error: detailError } = await supabase.storage
        .from('vault-images')
        .upload(detailPath, detailBlob, {
          contentType: 'image/jpeg',
          upsert: true,
        })

      if (detailError) throw detailError

      // Get public URLs
      const { data: cardUrlData } = supabase.storage
        .from('vault-images')
        .getPublicUrl(cardPath)

      const { data: detailUrlData } = supabase.storage
        .from('vault-images')
        .getPublicUrl(detailPath)

      onUpdate(cardUrlData.publicUrl, detailUrlData.publicUrl)

      setCropModalOpen(false)
      setPendingImageSrc(null)
    } catch (err) {
      console.error('Upload error:', err)
      setError('Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }, [characterId, supabase, onUpdate])

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onUpdate(null, null)
  }, [onUpdate])

  const handleCropClose = useCallback(() => {
    setCropModalOpen(false)
    if (pendingImageSrc && pendingImageSrc.startsWith('blob:')) {
      URL.revokeObjectURL(pendingImageSrc)
    }
    setPendingImageSrc(null)
  }, [pendingImageSrc])

  return (
    <div className={cn('relative', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Detail image preview (4:3) */}
      {detailImageUrl ? (
        <div className="relative group">
          <div className="relative w-32 aspect-[4/3] rounded-xl overflow-hidden border-2 border-[--border] bg-[--bg-base]">
            <Image
              src={detailImageUrl}
              alt={characterName}
              fill
              className="object-cover"
              sizes="128px"
            />
            {/* Hover overlay */}
            <button
              type="button"
              onClick={handleFileSelect}
              disabled={isUploading}
              className={cn(
                'absolute inset-0 bg-black/60 flex items-center justify-center',
                'opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer'
              )}
            >
              <Camera className="w-8 h-8 text-white" />
            </button>
          </div>
          {/* Remove button */}
          {!isUploading && (
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
          {/* Card preview in corner */}
          {cardImageUrl && (
            <div className="absolute -bottom-2 -right-2 w-12 aspect-[16/9] rounded overflow-hidden border-2 border-[--bg-surface] shadow-lg">
              <Image
                src={cardImageUrl}
                alt={`${characterName} card`}
                fill
                className="object-cover"
                sizes="48px"
              />
            </div>
          )}
        </div>
      ) : (
        /* Empty state */
        <div className="relative group">
          <button
            type="button"
            onClick={handleFileSelect}
            disabled={isUploading}
            className={cn(
              'relative w-28 h-28 rounded-xl overflow-hidden transition-all',
              'focus:outline-none focus:ring-2 focus:ring-[--arcane-purple] focus:ring-offset-2 focus:ring-offset-[--bg-surface]',
              'border-2 border-dashed border-[--text-tertiary] hover:border-[--arcane-purple]',
              isUploading && 'opacity-70 cursor-wait',
              !isUploading && 'cursor-pointer'
            )}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[--bg-hover] gap-1">
              {isUploading ? (
                <Loader2 className="w-6 h-6 text-[--text-secondary] animate-spin" />
              ) : characterName ? (
                <span className="text-3xl font-bold text-[--text-tertiary]">
                  {getInitials(characterName)}
                </span>
              ) : (
                <Camera className="w-6 h-6 text-[--text-tertiary] group-hover:text-[--arcane-purple] transition-colors" />
              )}
            </div>
          </button>
        </div>
      )}

      {/* Upload button */}
      <div className="mt-3">
        <button
          type="button"
          onClick={handleFileSelect}
          disabled={isUploading}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
            'bg-[--bg-elevated] border border-[--border] text-[--text-secondary]',
            'hover:bg-[--bg-hover] hover:text-[--text-primary]',
            isUploading && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Upload className="w-3.5 h-3.5" />
          {detailImageUrl ? 'Change' : 'Upload'}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-2 text-xs text-[--arcane-ember]">{error}</p>
      )}

      {/* Crop Modal */}
      {pendingImageSrc && (
        <VaultImageCropModal
          isOpen={cropModalOpen}
          imageSrc={pendingImageSrc}
          onClose={handleCropClose}
          onSave={handleCropSave}
        />
      )}
    </div>
  )
}
