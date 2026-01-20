'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { X, RotateCcw, Check, Loader2 } from 'lucide-react'

interface AvatarCropModalProps {
  isOpen: boolean
  imageSrc: string
  onClose: () => void
  onSave: (blob: Blob) => Promise<void>
}

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

export function AvatarCropModal({
  isOpen,
  imageSrc,
  onClose,
  onSave,
}: AvatarCropModalProps) {
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [saving, setSaving] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  // Initialize crop when image loads
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    setCrop(centerAspectCrop(width, height, 1))
  }, [])

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setCrop(undefined)
      setCompletedCrop(undefined)
      setSaving(false)
    }
  }, [isOpen])

  const handleReset = useCallback(() => {
    if (imgRef.current) {
      const { width, height } = imgRef.current
      setCrop(centerAspectCrop(width, height, 1))
    }
  }, [])

  const getCroppedImg = useCallback(
    async (pixelCrop: PixelCrop): Promise<Blob> => {
      const image = imgRef.current
      if (!image) throw new Error('No image')

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('No canvas context')

      const scaleX = image.naturalWidth / image.width
      const scaleY = image.naturalHeight / image.height

      // Output 256x256 for profile avatars (good balance of quality and size)
      canvas.width = 256
      canvas.height = 256

      ctx.drawImage(
        image,
        pixelCrop.x * scaleX,
        pixelCrop.y * scaleY,
        pixelCrop.width * scaleX,
        pixelCrop.height * scaleY,
        0,
        0,
        256,
        256
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
          'image/webp',
          0.9
        )
      })
    },
    []
  )

  const handleSave = async () => {
    if (!completedCrop) return

    setSaving(true)
    try {
      const blob = await getCroppedImg(completedCrop)
      await onSave(blob)
      onClose()
    } catch (error) {
      console.error('Error saving avatar:', error)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="w-[600px] max-w-[95vw] max-h-[90vh] bg-[--bg-surface] border border-[--border] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[--border]">
          <div>
            <h2 className="text-lg font-semibold text-[--text-primary]">Crop Profile Picture</h2>
            <p className="text-sm text-[--text-tertiary]">Drag to position the square crop area</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[--bg-hover] transition-colors"
          >
            <X className="w-5 h-5 text-[--text-secondary]" />
          </button>
        </div>

        {/* Crop area */}
        <div className="flex-1 flex gap-6 p-6 overflow-hidden">
          {/* Main crop area */}
          <div className="flex-1 flex items-center justify-center bg-[--bg-base] rounded-xl overflow-hidden">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={1}
              circularCrop
              className="max-h-[50vh]"
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop preview"
                onLoad={onImageLoad}
                className="max-h-[50vh] object-contain"
              />
            </ReactCrop>
          </div>

          {/* Preview */}
          <div className="w-[140px] flex flex-col gap-4">
            <div>
              <h3 className="text-xs font-semibold text-[--text-tertiary] uppercase tracking-wide mb-2">
                Preview
              </h3>

              <div className="p-3 rounded-xl border border-[--border] bg-[--bg-elevated]">
                <p className="text-xs text-[--text-tertiary] mb-2 text-center">How it will look</p>
                <div className="w-20 h-20 mx-auto rounded-full overflow-hidden bg-[--bg-base] border-2 border-[--border]">
                  {completedCrop && imgRef.current ? (
                    <canvas
                      ref={(canvas) => {
                        if (canvas && imgRef.current && completedCrop) {
                          const ctx = canvas.getContext('2d')
                          if (!ctx) return
                          const scaleX = imgRef.current.naturalWidth / imgRef.current.width
                          const scaleY = imgRef.current.naturalHeight / imgRef.current.height
                          canvas.width = 80
                          canvas.height = 80
                          ctx.drawImage(
                            imgRef.current,
                            completedCrop.x * scaleX,
                            completedCrop.y * scaleY,
                            completedCrop.width * scaleX,
                            completedCrop.height * scaleY,
                            0, 0, 80, 80
                          )
                        }
                      }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[--text-muted] text-xs">
                      Adjust
                    </div>
                  )}
                </div>
              </div>
            </div>

            <p className="text-xs text-[--text-tertiary]">
              Drag to reposition. The image will be cropped to a square.
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
            Reset
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
              disabled={!completedCrop || saving}
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
                  Save
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
