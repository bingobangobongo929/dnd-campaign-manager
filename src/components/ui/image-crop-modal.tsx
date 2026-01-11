'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { X, RotateCcw, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageCropModalProps {
  isOpen: boolean
  imageSrc: string
  onClose: () => void
  onSave: (avatarBlob: Blob, detailBlob: Blob) => Promise<void>
}

type CropMode = 'avatar' | 'detail'

// Avatar: 1:1 square
const AVATAR_ASPECT = 1
// Detail: 2:3 portrait
const DETAIL_ASPECT = 2 / 3

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
): Crop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 50,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  )
}

export function ImageCropModal({
  isOpen,
  imageSrc,
  onClose,
  onSave,
}: ImageCropModalProps) {
  const [activeMode, setActiveMode] = useState<CropMode>('avatar')
  const [avatarCrop, setAvatarCrop] = useState<Crop>()
  const [detailCrop, setDetailCrop] = useState<Crop>()
  const [completedAvatarCrop, setCompletedAvatarCrop] = useState<PixelCrop>()
  const [completedDetailCrop, setCompletedDetailCrop] = useState<PixelCrop>()
  const [saving, setSaving] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  // Initialize crops when image loads
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget

    // Center both crops on image
    const avatarInitialCrop = centerAspectCrop(width, height, AVATAR_ASPECT)
    const detailInitialCrop = centerAspectCrop(width, height, DETAIL_ASPECT)

    setAvatarCrop(avatarInitialCrop)
    setDetailCrop(detailInitialCrop)
  }, [])

  // Reset crops when modal opens
  useEffect(() => {
    if (isOpen) {
      setAvatarCrop(undefined)
      setDetailCrop(undefined)
      setCompletedAvatarCrop(undefined)
      setCompletedDetailCrop(undefined)
      setActiveMode('avatar')
      setSaving(false)
    }
  }, [isOpen])

  const handleReset = useCallback(() => {
    if (imgRef.current) {
      const { width, height } = imgRef.current
      if (activeMode === 'avatar') {
        setAvatarCrop(centerAspectCrop(width, height, AVATAR_ASPECT))
      } else {
        setDetailCrop(centerAspectCrop(width, height, DETAIL_ASPECT))
      }
    }
  }, [activeMode])

  const getCroppedImg = useCallback(
    async (crop: PixelCrop, targetWidth: number, targetHeight: number): Promise<Blob> => {
      const image = imgRef.current
      if (!image) throw new Error('No image')

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('No canvas context')

      // Calculate scale between natural size and displayed size
      const scaleX = image.naturalWidth / image.width
      const scaleY = image.naturalHeight / image.height

      // Set canvas to target output size
      canvas.width = targetWidth
      canvas.height = targetHeight

      // Draw cropped portion scaled to target size
      ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        targetWidth,
        targetHeight
      )

      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Canvas is empty'))
            }
          },
          'image/jpeg',
          0.9
        )
      })
    },
    []
  )

  const handleSave = async () => {
    if (!completedAvatarCrop || !completedDetailCrop) {
      // If user hasn't adjusted both crops, use the current crops
      // But we need pixel versions
      return
    }

    setSaving(true)
    try {
      // Avatar: 192x192 (2x for retina)
      const avatarBlob = await getCroppedImg(completedAvatarCrop, 192, 192)
      // Detail: 400x600 (2:3 ratio, 2x for retina)
      const detailBlob = await getCroppedImg(completedDetailCrop, 400, 600)

      await onSave(avatarBlob, detailBlob)
      onClose()
    } catch (error) {
      console.error('Error saving crops:', error)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const currentCrop = activeMode === 'avatar' ? avatarCrop : detailCrop
  const setCurrentCrop = activeMode === 'avatar' ? setAvatarCrop : setDetailCrop
  const currentAspect = activeMode === 'avatar' ? AVATAR_ASPECT : DETAIL_ASPECT

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="w-[900px] max-w-[95vw] max-h-[90vh] bg-[--bg-surface] border border-[--border] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[--border]">
          <div>
            <h2 className="text-lg font-semibold text-[--text-primary]">Crop Image</h2>
            <p className="text-sm text-[--text-tertiary]">Adjust crop areas for avatar and detail views</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[--bg-hover] transition-colors"
          >
            <X className="w-5 h-5 text-[--text-secondary]" />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-2 px-6 py-3 border-b border-[--border] bg-[--bg-elevated]">
          <button
            onClick={() => setActiveMode('avatar')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeMode === 'avatar'
                ? 'bg-[--arcane-purple] text-white shadow-md'
                : 'text-[--text-secondary] hover:bg-[--bg-hover]'
            )}
          >
            <div className="w-4 h-4 border-2 border-current rounded" />
            Avatar (1:1)
            {completedAvatarCrop && <Check className="w-3 h-3 text-green-400" />}
          </button>
          <button
            onClick={() => setActiveMode('detail')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeMode === 'detail'
                ? 'bg-[--arcane-purple] text-white shadow-md'
                : 'text-[--text-secondary] hover:bg-[--bg-hover]'
            )}
          >
            <div className="w-3 h-4 border-2 border-current rounded" />
            Detail (2:3)
            {completedDetailCrop && <Check className="w-3 h-3 text-green-400" />}
          </button>
        </div>

        {/* Crop area */}
        <div className="flex-1 flex gap-6 p-6 overflow-hidden">
          {/* Main crop area */}
          <div className="flex-1 flex items-center justify-center bg-[--bg-base] rounded-xl overflow-hidden">
            <ReactCrop
              crop={currentCrop}
              onChange={(_, percentCrop) => setCurrentCrop(percentCrop)}
              onComplete={(c) => {
                if (activeMode === 'avatar') {
                  setCompletedAvatarCrop(c)
                } else {
                  setCompletedDetailCrop(c)
                }
              }}
              aspect={currentAspect}
              className="max-h-[60vh]"
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop preview"
                onLoad={onImageLoad}
                className="max-h-[60vh] object-contain"
                crossOrigin="anonymous"
              />
            </ReactCrop>
          </div>

          {/* Preview panel */}
          <div className="w-[200px] flex flex-col gap-4">
            <div>
              <h3 className="text-xs font-semibold text-[--text-tertiary] uppercase tracking-wide mb-2">
                Preview
              </h3>

              {/* Avatar preview */}
              <div className={cn(
                'p-3 rounded-xl border transition-all mb-3',
                activeMode === 'avatar'
                  ? 'border-[--arcane-purple] bg-[--arcane-purple]/5'
                  : 'border-[--border] bg-[--bg-elevated]'
              )}>
                <p className="text-xs text-[--text-tertiary] mb-2">Avatar (Canvas)</p>
                <div className="w-24 h-24 mx-auto rounded-lg overflow-hidden bg-[--bg-base] border border-[--border]">
                  {completedAvatarCrop && imgRef.current ? (
                    <canvas
                      ref={(canvas) => {
                        if (canvas && imgRef.current && completedAvatarCrop) {
                          const ctx = canvas.getContext('2d')
                          if (!ctx) return
                          const scaleX = imgRef.current.naturalWidth / imgRef.current.width
                          const scaleY = imgRef.current.naturalHeight / imgRef.current.height
                          canvas.width = 96
                          canvas.height = 96
                          ctx.drawImage(
                            imgRef.current,
                            completedAvatarCrop.x * scaleX,
                            completedAvatarCrop.y * scaleY,
                            completedAvatarCrop.width * scaleX,
                            completedAvatarCrop.height * scaleY,
                            0, 0, 96, 96
                          )
                        }
                      }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[--text-muted] text-xs">
                      Adjust crop
                    </div>
                  )}
                </div>
              </div>

              {/* Detail preview */}
              <div className={cn(
                'p-3 rounded-xl border transition-all',
                activeMode === 'detail'
                  ? 'border-[--arcane-purple] bg-[--arcane-purple]/5'
                  : 'border-[--border] bg-[--bg-elevated]'
              )}>
                <p className="text-xs text-[--text-tertiary] mb-2">Detail (Modal)</p>
                <div className="w-24 h-36 mx-auto rounded-lg overflow-hidden bg-[--bg-base] border border-[--border]">
                  {completedDetailCrop && imgRef.current ? (
                    <canvas
                      ref={(canvas) => {
                        if (canvas && imgRef.current && completedDetailCrop) {
                          const ctx = canvas.getContext('2d')
                          if (!ctx) return
                          const scaleX = imgRef.current.naturalWidth / imgRef.current.width
                          const scaleY = imgRef.current.naturalHeight / imgRef.current.height
                          canvas.width = 96
                          canvas.height = 144
                          ctx.drawImage(
                            imgRef.current,
                            completedDetailCrop.x * scaleX,
                            completedDetailCrop.y * scaleY,
                            completedDetailCrop.width * scaleX,
                            completedDetailCrop.height * scaleY,
                            0, 0, 96, 144
                          )
                        }
                      }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[--text-muted] text-xs text-center px-2">
                      Adjust crop
                    </div>
                  )}
                </div>
              </div>
            </div>

            <p className="text-xs text-[--text-tertiary]">
              Drag the crop area to position. Switch tabs to adjust each crop independently.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[--border]">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[--text-secondary] hover:text-[--text-primary] rounded-lg hover:bg-[--bg-hover] transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset {activeMode === 'avatar' ? 'Avatar' : 'Detail'}
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[--text-secondary] bg-[--bg-elevated] border border-[--border] rounded-lg hover:bg-[--bg-hover] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!completedAvatarCrop || !completedDetailCrop || saving}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-[--arcane-purple] rounded-lg hover:bg-[--arcane-purple-dim] disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save Both Crops
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
