'use client'

import { useState, useRef, useCallback } from 'react'
import { Camera, Sparkles, Loader2, Upload, Trash2, Expand, Copy, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ImageCropModal } from '@/components/ui/image-crop-modal'
import { Modal } from '@/components/ui'
import { useSupabase } from '@/hooks'
import { useCanUseAI } from '@/store'
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
  // Extended data for richer AI prompts
  characterRace?: string | null
  characterClass?: string | null
  characterStatus?: string | null
  characterSecrets?: string | null
  characterImportantPeople?: string[] | null
  characterStoryHooks?: string[] | null
  characterQuotes?: string[] | null
  gameSystem?: string | null
}

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
  characterRace,
  characterClass,
  characterStatus,
  characterSecrets,
  characterImportantPeople,
  characterStoryHooks,
  characterQuotes,
  gameSystem,
}: CharacterImageUploadProps) {
  const supabase = useSupabase()
  const canUseAI = useCanUseAI()
  const inputRef = useRef<HTMLInputElement>(null)

  const [isGenerating, setIsGenerating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [optionsModalOpen, setOptionsModalOpen] = useState(false)
  const [promptModalOpen, setPromptModalOpen] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [generatedPrompt, setGeneratedPrompt] = useState({ prompt: '', shortPrompt: '' })
  const [promptCopied, setPromptCopied] = useState(false)

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
    setOptionsModalOpen(false)
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

  // Handle AI prompt generation for character portraits
  const handleGeneratePrompt = useCallback(async () => {
    setIsGenerating(true)
    setError(null)
    setOptionsModalOpen(false)

    try {
      const response = await fetch('/api/ai/generate-character-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: characterName,
          type: characterType,
          race: characterRace,
          class: characterClass,
          backstory: characterDescription,
          personality: characterSummary,
          summary: characterSummary,
          status: characterStatus,
          secrets: characterSecrets,
          important_people: characterImportantPeople,
          story_hooks: characterStoryHooks,
          quotes: characterQuotes,
          game_system: gameSystem,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate prompt')
      }

      const data = await response.json()
      setGeneratedPrompt({ prompt: data.prompt, shortPrompt: data.shortPrompt })
      setPromptModalOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate prompt')
    } finally {
      setIsGenerating(false)
    }
  }, [characterName, characterType, characterDescription, characterSummary, characterRace, characterClass, characterStatus, characterSecrets, characterImportantPeople, characterStoryHooks, characterQuotes, gameSystem])

  // Copy prompt to clipboard
  const copyPromptToClipboard = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text)
    setPromptCopied(true)
    setTimeout(() => setPromptCopied(false), 2000)
  }, [])

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
  const handleRemove = useCallback(() => {
    onUpdate(null, null, false)
    setOptionsModalOpen(false)
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

      {/* Detail image preview (2:3 aspect ratio) - click to open options modal */}
      {detailUrl ? (
        <div className="relative group mb-3">
          <div
            onClick={() => setOptionsModalOpen(true)}
            className="relative w-32 h-48 rounded-xl overflow-hidden border-2 border-[--border] bg-[--bg-base] cursor-pointer"
          >
            <Image
              src={detailUrl}
              alt={characterName}
              fill
              className="object-cover"
              sizes="128px"
            />
            {/* Hover overlay with options hint */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
              <Camera className="w-6 h-6 text-white" />
              <span className="text-xs text-white/80">Click to edit</span>
            </div>
          </div>
          {/* Fullscreen indicator */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setLightboxOpen(true)
            }}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white/80 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
            title="View fullscreen"
          >
            <Expand className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Empty state - click to open options modal */
        <div className={cn('relative group mb-3', sizes[size])}>
          <button
            type="button"
            onClick={() => setOptionsModalOpen(true)}
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

      {/* Error message */}
      {error && (
        <p className="mt-2 text-xs text-[--arcane-ember]">{error}</p>
      )}

      {/* Image Options Modal */}
      <Modal
        isOpen={optionsModalOpen}
        onClose={() => setOptionsModalOpen(false)}
        title="Character Image"
        description="Upload an image or generate an AI prompt for character art"
      >
        <div className="space-y-3 py-4">
          {/* Upload Option */}
          <button
            onClick={handleFileSelect}
            className="w-full flex items-center gap-4 p-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] rounded-xl transition-colors text-left"
          >
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Upload className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="font-medium text-white">Upload Image</p>
              <p className="text-sm text-gray-500">Choose an image from your device</p>
            </div>
          </button>

          {/* AI Prompt Option - only show if user can use AI */}
          {canUseAI && (
            <button
              onClick={handleGeneratePrompt}
              disabled={isGenerating}
              className="w-full flex items-center gap-4 p-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] rounded-xl transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="p-3 bg-purple-500/20 rounded-lg">
                {isGenerating ? (
                  <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5 text-purple-400" />
                )}
              </div>
              <div>
                <p className="font-medium text-white">Generate AI Prompt</p>
                <p className="text-sm text-gray-500">Get a prompt optimized for character portraits</p>
              </div>
            </button>
          )}

          {/* Delete Option - only show if image exists */}
          {detailUrl && (
            <button
              onClick={handleRemove}
              className="w-full flex items-center gap-4 p-4 bg-white/[0.03] hover:bg-red-500/10 border border-white/[0.08] hover:border-red-500/30 rounded-xl transition-colors text-left"
            >
              <div className="p-3 bg-red-500/20 rounded-lg">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="font-medium text-red-400">Remove Image</p>
                <p className="text-sm text-gray-500">Delete the current character image</p>
              </div>
            </button>
          )}
        </div>
        <div className="flex justify-end pt-2">
          <button
            onClick={() => setOptionsModalOpen(false)}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </Modal>

      {/* AI Prompt Modal */}
      <Modal
        isOpen={promptModalOpen}
        onClose={() => setPromptModalOpen(false)}
        title="AI Image Prompt"
        description="Copy this prompt to use with Midjourney, DALL-E, or other AI image tools"
      >
        <div className="space-y-4 py-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-300">Full Prompt</span>
              <button
                onClick={() => copyPromptToClipboard(generatedPrompt.prompt)}
                className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                {promptCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {promptCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="p-3 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-gray-300 max-h-48 overflow-y-auto">
              {generatedPrompt.prompt}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-300">Short Version</span>
              <button
                onClick={() => copyPromptToClipboard(generatedPrompt.shortPrompt)}
                className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
            <div className="p-3 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-gray-300">
              {generatedPrompt.shortPrompt}
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Optimized for character portraits with centered composition that works for both 1:1 avatars and 2:3 detail crops.
          </p>
        </div>
        <div className="flex justify-end">
          <button className="btn btn-secondary" onClick={() => setPromptModalOpen(false)}>Close</button>
        </div>
      </Modal>

      {/* Lightbox for fullscreen image viewing */}
      {lightboxOpen && detailUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-8"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="w-8 h-8" />
          </button>
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full">
            <Image
              src={detailUrl}
              alt={characterName}
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>
        </div>
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
