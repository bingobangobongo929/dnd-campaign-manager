'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { X, RotateCcw, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VaultImageCropModalProps {
  isOpen: boolean
  imageSrc: string
  onClose: () => void
  onSave: (cardBlob: Blob, detailBlob: Blob) => Promise<void>
}

type CropMode = 'card' | 'detail'

// Card: 16:9 for vault grid
const CARD_ASPECT = 16 / 9
// Detail: 2:3 portrait for editor/preview
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
        width: 80,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  )
}

export function VaultImageCropModal({
  isOpen,
  imageSrc,
  onClose,
  onSave,
}: VaultImageCropModalProps) {
  const [activeMode, setActiveMode] = useState<CropMode>('card')
  const [cardCrop, setCardCrop] = useState<Crop>()
  const [detailCrop, setDetailCrop] = useState<Crop>()
  const [completedCardCrop, setCompletedCardCrop] = useState<PixelCrop>()
  const [completedDetailCrop, setCompletedDetailCrop] = useState<PixelCrop>()
  const [saving, setSaving] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  // Initialize crops when image loads
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget

    const cardInitialCrop = centerAspectCrop(width, height, CARD_ASPECT)
    const detailInitialCrop = centerAspectCrop(width, height, DETAIL_ASPECT)

    setCardCrop(cardInitialCrop)
    setDetailCrop(detailInitialCrop)
  }, [])

  // Reset crops when modal opens
  useEffect(() => {
    if (isOpen) {
      setCardCrop(undefined)
      setDetailCrop(undefined)
      setCompletedCardCrop(undefined)
      setCompletedDetailCrop(undefined)
      setActiveMode('card')
      setSaving(false)
    }
  }, [isOpen])

  const handleReset = useCallback(() => {
    if (imgRef.current) {
      const { width, height } = imgRef.current
      if (activeMode === 'card') {
        setCardCrop(centerAspectCrop(width, height, CARD_ASPECT))
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

      const scaleX = image.naturalWidth / image.width
      const scaleY = image.naturalHeight / image.height

      canvas.width = targetWidth
      canvas.height = targetHeight

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
    if (!completedCardCrop || !completedDetailCrop) return

    setSaving(true)
    try {
      // Card: 640x360 (16:9, 2x for retina)
      const cardBlob = await getCroppedImg(completedCardCrop, 640, 360)
      // Detail: 400x600 (2:3 portrait, 2x for retina)
      const detailBlob = await getCroppedImg(completedDetailCrop, 400, 600)

      await onSave(cardBlob, detailBlob)
      onClose()
    } catch (error) {
      console.error('Error saving crops:', error)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const currentCrop = activeMode === 'card' ? cardCrop : detailCrop
  const setCurrentCrop = activeMode === 'card' ? setCardCrop : setDetailCrop
  const currentAspect = activeMode === 'card' ? CARD_ASPECT : DETAIL_ASPECT

  return (
    <div className="modal-backdrop" style={{ zIndex: 200 }} onClick={onClose}>
      <div
        className="w-[900px] max-w-[95vw] max-h-[90vh] bg-[--bg-surface] border border-[--border] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[--border]">
          <div>
            <h2 className="text-lg font-semibold text-[--text-primary]">Crop Portrait</h2>
            <p className="text-sm text-[--text-tertiary]">Adjust crop for card and detail views</p>
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
            onClick={() => setActiveMode('card')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeMode === 'card'
                ? 'bg-[--arcane-purple] text-white shadow-md'
                : 'text-[--text-secondary] hover:bg-[--bg-hover]'
            )}
          >
            <div className="w-5 h-3 border-2 border-current rounded-sm" />
            Card (16:9)
            {completedCardCrop && <Check className="w-3 h-3 text-green-400" />}
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
            <div className="w-4 h-3 border-2 border-current rounded-sm" />
            Detail (4:3)
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
                if (activeMode === 'card') {
                  setCompletedCardCrop(c)
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

              {/* Card preview */}
              <div className={cn(
                'p-3 rounded-xl border transition-all mb-3',
                activeMode === 'card'
                  ? 'border-[--arcane-purple] bg-[--arcane-purple]/5'
                  : 'border-[--border] bg-[--bg-elevated]'
              )}>
                <p className="text-xs text-[--text-tertiary] mb-2">Card (Vault Grid)</p>
                <div className="w-full aspect-[16/9] rounded-lg overflow-hidden bg-[--bg-base] border border-[--border]">
                  {completedCardCrop && imgRef.current ? (
                    <canvas
                      ref={(canvas) => {
                        if (canvas && imgRef.current && completedCardCrop) {
                          const ctx = canvas.getContext('2d')
                          if (!ctx) return
                          const scaleX = imgRef.current.naturalWidth / imgRef.current.width
                          const scaleY = imgRef.current.naturalHeight / imgRef.current.height
                          canvas.width = 160
                          canvas.height = 90
                          ctx.drawImage(
                            imgRef.current,
                            completedCardCrop.x * scaleX,
                            completedCardCrop.y * scaleY,
                            completedCardCrop.width * scaleX,
                            completedCardCrop.height * scaleY,
                            0, 0, 160, 90
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
                <p className="text-xs text-[--text-tertiary] mb-2">Detail (Editor)</p>
                <div className="w-full aspect-[2/3] rounded-lg overflow-hidden bg-[--bg-base] border border-[--border]">
                  {completedDetailCrop && imgRef.current ? (
                    <canvas
                      ref={(canvas) => {
                        if (canvas && imgRef.current && completedDetailCrop) {
                          const ctx = canvas.getContext('2d')
                          if (!ctx) return
                          const scaleX = imgRef.current.naturalWidth / imgRef.current.width
                          const scaleY = imgRef.current.naturalHeight / imgRef.current.height
                          canvas.width = 160
                          canvas.height = 240
                          ctx.drawImage(
                            imgRef.current,
                            completedDetailCrop.x * scaleX,
                            completedDetailCrop.y * scaleY,
                            completedDetailCrop.width * scaleX,
                            completedDetailCrop.height * scaleY,
                            0, 0, 160, 240
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
            </div>

            <p className="text-xs text-[--text-tertiary]">
              Drag to position. Switch tabs to adjust each crop.
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
            Reset {activeMode === 'card' ? 'Card' : 'Detail'}
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
              disabled={!completedCardCrop || !completedDetailCrop || saving}
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
