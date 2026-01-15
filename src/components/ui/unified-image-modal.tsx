'use client'

import { useState, useRef, useCallback } from 'react'
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { Modal } from './modal'
import { Upload, Sparkles, Trash2, Loader2, Check, Copy, RotateCcw, X } from 'lucide-react'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'

// Image type configurations
export type ImageType = 'campaign' | 'oneshot' | 'worldmap' | 'npc' | 'companion' | 'character'

interface ImageTypeConfig {
  aspectRatio: number
  aspectLabel: string
  promptEndpoint?: string
  bucketName: string
  generatePromptData?: (data: any) => any
}

const IMAGE_CONFIGS: Record<ImageType, ImageTypeConfig> = {
  campaign: {
    aspectRatio: 16 / 9,
    aspectLabel: '16:9 (widescreen)',
    promptEndpoint: '/api/ai/generate-campaign-image',
    bucketName: 'campaign-images',
  },
  oneshot: {
    aspectRatio: 2 / 3,
    aspectLabel: '2:3 (poster)',
    promptEndpoint: '/api/ai/generate-oneshot-image',
    bucketName: 'oneshot-images',
  },
  worldmap: {
    aspectRatio: 16 / 9,
    aspectLabel: '16:9 (landscape)',
    bucketName: 'world-maps',
  },
  npc: {
    aspectRatio: 1,
    aspectLabel: '1:1 (avatar)',
    promptEndpoint: '/api/ai/generate-avatar-prompt',
    bucketName: 'vault-images',
  },
  companion: {
    aspectRatio: 1,
    aspectLabel: '1:1 (avatar)',
    promptEndpoint: '/api/ai/generate-avatar-prompt',
    bucketName: 'vault-images',
  },
  character: {
    aspectRatio: 2 / 3,
    aspectLabel: '2:3 (portrait)',
    promptEndpoint: '/api/ai/generate-avatar-prompt',
    bucketName: 'vault-images',
  },
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
): Crop {
  return centerCrop(
    makeAspectCrop(
      { unit: '%', width: 80 },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  )
}

interface UnifiedImageModalProps {
  isOpen: boolean
  onClose: () => void
  imageType: ImageType
  currentImageUrl: string | null
  onImageChange: (url: string | null) => void
  onUpload: (blob: Blob) => Promise<string> // Returns the uploaded URL
  promptData?: any // Data to send to prompt generation API
  title?: string
}

export function UnifiedImageModal({
  isOpen,
  onClose,
  imageType,
  currentImageUrl,
  onImageChange,
  onUpload,
  promptData,
  title = 'Image',
}: UnifiedImageModalProps) {
  const { aiEnabled } = useAppStore()
  const config = IMAGE_CONFIGS[imageType]
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cropImgRef = useRef<HTMLImageElement>(null)

  // View states
  const [view, setView] = useState<'options' | 'crop' | 'prompt'>('options')

  // Crop state
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()

  // Prompt state
  const [generatingPrompt, setGeneratingPrompt] = useState(false)
  const [generatedPrompt, setGeneratedPrompt] = useState({ prompt: '', shortPrompt: '' })
  const [promptCopied, setPromptCopied] = useState(false)

  // Loading state
  const [uploading, setUploading] = useState(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be less than 10MB')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setPendingImage(reader.result as string)
      setView('crop')
    }
    reader.readAsDataURL(file)

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const onCropImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    setCrop(centerAspectCrop(width, height, config.aspectRatio))
  }, [config.aspectRatio])

  const handleCropComplete = async () => {
    if (!completedCrop || !cropImgRef.current) return

    setUploading(true)

    try {
      const image = cropImgRef.current
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) throw new Error('No 2d context')

      const scaleX = image.naturalWidth / image.width
      const scaleY = image.naturalHeight / image.height

      const cropX = completedCrop.x * scaleX
      const cropY = completedCrop.y * scaleY
      const cropWidth = completedCrop.width * scaleX
      const cropHeight = completedCrop.height * scaleY

      canvas.width = cropWidth
      canvas.height = cropHeight

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      ctx.drawImage(
        image,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
      )

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => b ? resolve(b) : reject(new Error('Canvas is empty')),
          'image/webp',
          0.92
        )
      })

      const url = await onUpload(blob)
      onImageChange(url)
      handleClose()
    } catch (err) {
      console.error('Upload error:', err)
      alert('Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleGeneratePrompt = async () => {
    if (!config.promptEndpoint || !promptData) return

    setGeneratingPrompt(true)

    try {
      const res = await fetch(config.promptEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(promptData),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to generate prompt')
      }

      const data = await res.json()
      setGeneratedPrompt({ prompt: data.prompt, shortPrompt: data.shortPrompt })
      setView('prompt')
    } catch (err: any) {
      console.error('Generate prompt error:', err)
      alert(err.message || 'Failed to generate prompt')
    } finally {
      setGeneratingPrompt(false)
    }
  }

  const copyPrompt = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setPromptCopied(true)
    setTimeout(() => setPromptCopied(false), 2000)
  }

  const handleDelete = () => {
    onImageChange(null)
    handleClose()
  }

  const handleClose = () => {
    setView('options')
    setPendingImage(null)
    setCrop(undefined)
    setCompletedCrop(undefined)
    setGeneratedPrompt({ prompt: '', shortPrompt: '' })
    onClose()
  }

  const hasPromptSupport = !!config.promptEndpoint && !!promptData

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={view === 'crop' ? 'Crop Image' : view === 'prompt' ? 'AI Image Prompt' : `${title} Image`}
      description={
        view === 'crop'
          ? `Adjust the crop area (${config.aspectLabel}). Full resolution preserved.`
          : view === 'prompt'
          ? 'Copy this prompt to use in your preferred image AI tool'
          : 'Upload your own image or generate an AI prompt'
      }
      size={view === 'crop' ? 'xl' : 'lg'}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Options View */}
      {view === 'options' && (
        <div className="py-4 space-y-4">
          {/* Current Image Preview */}
          {currentImageUrl && (
            <div className="relative rounded-xl overflow-hidden bg-black/20 mb-4">
              <img
                src={currentImageUrl}
                alt="Current"
                className="w-full h-48 object-cover"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-[--border] hover:border-purple-500/50 transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Upload className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-[--text-primary]">Upload Image</p>
                <p className="text-sm text-[--text-tertiary]">
                  Select an image and crop to {config.aspectLabel}
                </p>
              </div>
            </button>

            {aiEnabled && hasPromptSupport && (
              <button
                onClick={handleGeneratePrompt}
                disabled={generatingPrompt}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-[--border] hover:border-purple-500/50 transition-colors text-left disabled:opacity-50"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  {generatingPrompt ? (
                    <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                  ) : (
                    <Sparkles className="w-6 h-6 text-amber-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-[--text-primary]">Generate AI Prompt</p>
                  <p className="text-sm text-[--text-tertiary]">
                    Get a prompt for Midjourney, DALL-E, etc.
                  </p>
                </div>
              </button>
            )}

            {currentImageUrl && (
              <button
                onClick={handleDelete}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-red-500/20 hover:border-red-500/40 transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <p className="font-medium text-red-400">Remove Image</p>
                  <p className="text-sm text-[--text-tertiary]">
                    Delete the current image
                  </p>
                </div>
              </button>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm text-[--text-secondary] hover:text-[--text-primary] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Crop View */}
      {view === 'crop' && pendingImage && (
        <div className="py-4 space-y-4">
          <div className="flex justify-center bg-black/30 rounded-xl p-4 max-h-[60vh] overflow-auto">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={config.aspectRatio}
              className="max-w-full"
            >
              <img
                ref={cropImgRef}
                src={pendingImage}
                alt="Crop preview"
                onLoad={onCropImageLoad}
                className="max-h-[50vh] w-auto"
              />
            </ReactCrop>
          </div>

          <div className="flex items-center justify-between text-xs text-[--text-tertiary]">
            <span>Aspect ratio: {config.aspectLabel}</span>
            <span>Full resolution preserved</span>
          </div>

          <div className="flex justify-between pt-4 border-t border-[--border]">
            <button
              onClick={() => {
                if (cropImgRef.current) {
                  const { width, height } = cropImgRef.current
                  setCrop(centerAspectCrop(width, height, config.aspectRatio))
                }
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm text-[--text-secondary] hover:text-[--text-primary] transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setView('options')
                  setPendingImage(null)
                }}
                className="px-4 py-2 text-sm text-[--text-secondary] hover:text-[--text-primary] transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleCropComplete}
                disabled={!completedCrop || uploading}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Apply Crop
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt View */}
      {view === 'prompt' && (
        <div className="py-4 space-y-6">
          {/* Full Prompt */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-[--text-secondary]">Full Prompt</label>
              <button
                onClick={() => copyPrompt(generatedPrompt.prompt)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-400 bg-purple-500/10 rounded-lg hover:bg-purple-500/20 transition-colors"
              >
                {promptCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <div className="p-4 bg-[--bg-elevated] border border-[--border] rounded-xl">
              <p className="text-sm text-[--text-primary] leading-relaxed whitespace-pre-wrap">
                {generatedPrompt.prompt}
              </p>
            </div>
          </div>

          {/* Short Prompt */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-[--text-secondary]">Short Version</label>
              <button
                onClick={() => copyPrompt(generatedPrompt.shortPrompt)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[--text-tertiary] bg-[--bg-elevated] rounded-lg hover:bg-[--bg-hover] transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy
              </button>
            </div>
            <div className="p-4 bg-[--bg-surface] border border-[--border] rounded-xl">
              <p className="text-sm text-[--text-secondary]">
                {generatedPrompt.shortPrompt}
              </p>
            </div>
          </div>

          <p className="text-xs text-[--text-tertiary] text-center">
            Paste into Midjourney, DALL-E, Leonardo AI, or your preferred tool
          </p>

          <div className="flex justify-between pt-4 border-t border-[--border]">
            <button
              onClick={() => setView('options')}
              className="px-4 py-2 text-sm text-[--text-secondary] hover:text-[--text-primary] transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm text-[--text-secondary] hover:text-[--text-primary] transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
