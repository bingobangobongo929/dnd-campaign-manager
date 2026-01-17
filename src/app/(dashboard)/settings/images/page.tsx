'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import {
  ImagePlus,
  Loader2,
  Check,
  X,
  Sparkles,
  CircleDot,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Zap,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { logActivity } from '@/lib/activity-log'

interface Character {
  id: string
  name: string
  image_url: string | null // 16:9 card/feature image
  image_original_url: string | null
  image_enhanced_at: string | null
}

type EnhancementStep = 'select' | 'processing' | 'review' | 'complete'

export default function ImageEnhancementPage() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState<'unenhanced' | 'all'>('unenhanced')
  const [step, setStep] = useState<EnhancementStep>('select')

  // Enhancement process state
  const [currentIndex, setCurrentIndex] = useState(0)
  const [enhancedImages, setEnhancedImages] = useState<Map<string, string>>(new Map())
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Results tracking
  const [accepted, setAccepted] = useState<Set<string>>(new Set())
  const [skipped, setSkipped] = useState<Set<string>>(new Set())

  const supabase = createClient()

  useEffect(() => {
    loadCharacters()
  }, [])

  const loadCharacters = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('vault_characters')
        .select('id, name, image_url, image_original_url, image_enhanced_at')
        .eq('user_id', user.id)
        .not('image_url', 'is', null)
        .order('name')

      if (error) throw error
      setCharacters(data || [])

      // Auto-select unenhanced characters
      const unenhanced = (data || []).filter(c => !c.image_enhanced_at)
      setSelected(new Set(unenhanced.map(c => c.id)))
    } catch (err) {
      console.error('Failed to load characters:', err)
      toast.error('Failed to load characters')
    } finally {
      setLoading(false)
    }
  }

  const enhancedCount = characters.filter(c => c.image_enhanced_at).length
  const unenhancedCount = characters.length - enhancedCount

  const handleSelectModeChange = (mode: 'unenhanced' | 'all') => {
    setSelectMode(mode)
    if (mode === 'unenhanced') {
      const unenhanced = characters.filter(c => !c.image_enhanced_at)
      setSelected(new Set(unenhanced.map(c => c.id)))
    } else {
      setSelected(new Set(characters.map(c => c.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selected)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelected(newSelected)
  }

  const selectedCharacters = characters.filter(c => selected.has(c.id))

  const startEnhancement = async () => {
    if (selectedCharacters.length === 0) return

    setStep('processing')
    setCurrentIndex(0)
    setEnhancedImages(new Map())
    setAccepted(new Set())
    setSkipped(new Set())
    setError(null)

    // Start enhancing the first image
    await enhanceCurrentImage(0)
  }

  const enhanceCurrentImage = async (index: number) => {
    const char = selectedCharacters[index]
    if (!char) {
      setStep('complete')
      return
    }

    setProcessingId(char.id)
    setError(null)

    try {
      const response = await fetch('/api/ai/enhance-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: char.image_url,
          character_id: char.id,
          enhancement_type: 'quality',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Enhancement failed')
      }

      // Store the enhanced image
      setEnhancedImages(prev => new Map(prev).set(char.id, data.enhanced_image.dataUrl))
      setStep('review')
    } catch (err) {
      console.error('Enhancement error:', err)
      setError(err instanceof Error ? err.message : 'Failed to enhance image')
    } finally {
      setProcessingId(null)
    }
  }

  const acceptEnhancement = async () => {
    const char = selectedCharacters[currentIndex]
    const enhancedDataUrl = enhancedImages.get(char.id)

    if (!char || !enhancedDataUrl) return

    try {
      // Upload enhanced image to storage
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Convert data URL to blob
      const response = await fetch(enhancedDataUrl)
      const blob = await response.blob()

      // Upload to storage
      const fileName = `enhanced_${char.id}_${Date.now()}.png`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('character-images')
        .upload(filePath, blob, {
          contentType: 'image/png',
          upsert: true,
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('character-images')
        .getPublicUrl(filePath)

      // Update character record
      const { error: updateError } = await supabase
        .from('vault_characters')
        .update({
          image_original_url: char.image_original_url || char.image_url,
          image_url: publicUrl,
          image_enhanced_at: new Date().toISOString(),
        })
        .eq('id', char.id)

      if (updateError) throw updateError

      // Log activity
      await logActivity(supabase, user.id, {
        action: 'character.image_change',
        entity_type: 'character',
        entity_id: char.id,
        entity_name: char.name,
        metadata: {
          type: 'ai_enhancement',
          original_url: char.image_original_url || char.image_url,
          enhanced_url: publicUrl,
        },
      })

      setAccepted(prev => new Set(prev).add(char.id))
      toast.success(`Enhanced ${char.name}`)

      // Move to next
      moveToNext()
    } catch (err) {
      console.error('Failed to save enhancement:', err)
      toast.error('Failed to save enhanced image')
    }
  }

  const skipEnhancement = () => {
    const char = selectedCharacters[currentIndex]
    if (char) {
      setSkipped(prev => new Set(prev).add(char.id))
    }
    moveToNext()
  }

  const moveToNext = async () => {
    const nextIndex = currentIndex + 1
    if (nextIndex >= selectedCharacters.length) {
      setStep('complete')
      loadCharacters() // Refresh the list
    } else {
      setCurrentIndex(nextIndex)
      setStep('processing')
      await enhanceCurrentImage(nextIndex)
    }
  }

  const acceptAllRemaining = async () => {
    // Accept current one first
    await acceptEnhancement()
    // Note: acceptEnhancement will call moveToNext which continues the chain
  }

  const resetAndStartOver = () => {
    setStep('select')
    setCurrentIndex(0)
    setEnhancedImages(new Map())
    setAccepted(new Set())
    setSkipped(new Set())
    setError(null)
    loadCharacters()
  }

  const currentChar = selectedCharacters[currentIndex]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[--arcane-purple]" />
      </div>
    )
  }

  if (characters.length === 0) {
    return (
      <>
        <div className="page-header">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[--arcane-purple] to-indigo-600 flex items-center justify-center">
              <ImagePlus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="page-title">Image Enhancement</h1>
              <p className="page-subtitle">Upscale character feature images</p>
            </div>
          </div>
        </div>

        <div className="text-center py-20">
          <ImagePlus className="w-12 h-12 text-[--text-tertiary] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[--text-primary] mb-2">No feature images found</h3>
          <p className="text-sm text-[--text-tertiary]">
            Generate 16:9 feature images for your characters first, then come back to enhance them.
          </p>
        </div>
      </>
    )
  }

  // Selection step
  if (step === 'select') {
    return (
      <>
        <div className="page-header">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[--arcane-purple] to-indigo-600 flex items-center justify-center">
              <ImagePlus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="page-title">Image Enhancement</h1>
              <p className="page-subtitle">Upscale character feature images for crisp display</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card p-4">
            <p className="text-2xl font-bold text-[--text-primary]">{characters.length}</p>
            <p className="text-xs text-[--text-tertiary]">Total Characters</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <p className="text-2xl font-bold text-emerald-400">{enhancedCount}</p>
            </div>
            <p className="text-xs text-[--text-tertiary]">Enhanced</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              <CircleDot className="w-4 h-4 text-gray-400" />
              <p className="text-2xl font-bold text-gray-400">{unenhancedCount}</p>
            </div>
            <p className="text-xs text-[--text-tertiary]">Original</p>
          </div>
        </div>

        {/* Selection Mode */}
        <div className="card p-4 mb-6">
          <p className="text-sm font-medium text-[--text-secondary] mb-3">Selection</p>
          <div className="flex gap-3">
            <button
              onClick={() => handleSelectModeChange('unenhanced')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                selectMode === 'unenhanced'
                  ? 'bg-[--arcane-purple] text-white'
                  : 'bg-white/[0.04] text-gray-400 hover:text-white'
              )}
            >
              <CircleDot className="w-4 h-4" />
              Unenhanced only ({unenhancedCount})
            </button>
            <button
              onClick={() => handleSelectModeChange('all')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                selectMode === 'all'
                  ? 'bg-[--arcane-purple] text-white'
                  : 'bg-white/[0.04] text-gray-400 hover:text-white'
              )}
            >
              <Check className="w-4 h-4" />
              Select all ({characters.length})
            </button>
          </div>
        </div>

        {/* Character Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          {characters.map((char) => {
            const isSelected = selected.has(char.id)
            const isEnhanced = !!char.image_enhanced_at

            return (
              <button
                key={char.id}
                onClick={() => toggleSelect(char.id)}
                className={cn(
                  'relative group rounded-xl overflow-hidden border-2 transition-all',
                  isSelected
                    ? 'border-[--arcane-purple] ring-2 ring-[--arcane-purple]/30'
                    : 'border-transparent hover:border-white/20'
                )}
              >
                {/* Image */}
                <div className="relative aspect-video bg-gray-900">
                  {char.image_url ? (
                    <Image
                      src={char.image_url}
                      alt={char.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                      <span className="text-gray-600">No image</span>
                    </div>
                  )}

                  {/* Selection overlay */}
                  <div className={cn(
                    'absolute inset-0 transition-opacity',
                    isSelected ? 'bg-[--arcane-purple]/20' : 'bg-black/0 group-hover:bg-black/20'
                  )} />

                  {/* Checkbox */}
                  <div className={cn(
                    'absolute top-2 left-2 w-6 h-6 rounded-md flex items-center justify-center transition-all',
                    isSelected
                      ? 'bg-[--arcane-purple] text-white'
                      : 'bg-black/50 text-white/50 group-hover:text-white'
                  )}>
                    {isSelected && <Check className="w-4 h-4" />}
                  </div>

                  {/* Status badge */}
                  <div className={cn(
                    'absolute top-2 right-2 px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 backdrop-blur-sm',
                    isEnhanced
                      ? 'bg-emerald-900/90 text-emerald-300 border border-emerald-500/50'
                      : 'bg-gray-900/90 text-gray-200 border border-gray-500/50'
                  )}>
                    {isEnhanced ? (
                      <>
                        <Sparkles className="w-3 h-3" />
                        Enhanced
                      </>
                    ) : (
                      <>
                        <CircleDot className="w-3 h-3" />
                        Original
                      </>
                    )}
                  </div>
                </div>

                {/* Name */}
                <div className="p-3 bg-[--bg-surface]">
                  <p className="text-sm font-medium text-[--text-primary] truncate">{char.name}</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Action Bar */}
        <div className="sticky bottom-4 flex items-center justify-between p-4 bg-[--bg-elevated]/95 backdrop-blur-sm rounded-xl border border-[--border] shadow-xl">
          <div className="text-sm text-[--text-secondary]">
            <span className="font-medium text-[--text-primary]">{selected.size}</span> characters selected
          </div>
          <button
            onClick={startEnhancement}
            disabled={selected.size === 0}
            className="btn btn-primary flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Enhance Selected
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </>
    )
  }

  // Processing step
  if (step === 'processing') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[--arcane-purple] to-indigo-600 flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-[--text-primary] mb-2">
            Enhancing Image {currentIndex + 1} of {selectedCharacters.length}
          </h2>
          <p className="text-[--text-secondary] mb-8">
            Processing {currentChar?.name}...
          </p>

          {/* Progress bar */}
          <div className="w-full max-w-md mx-auto h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[--arcane-purple] to-indigo-500 transition-all duration-500"
              style={{ width: `${((currentIndex) / selectedCharacters.length) * 100}%` }}
            />
          </div>

          {error && (
            <div className="mt-8 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <div className="text-left">
                <p className="font-medium">Enhancement failed</p>
                <p className="text-sm opacity-80">{error}</p>
              </div>
              <button
                onClick={skipEnhancement}
                className="ml-auto px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm font-medium transition-colors"
              >
                Skip
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Review step
  if (step === 'review' && currentChar) {
    const enhancedDataUrl = enhancedImages.get(currentChar.id)

    return (
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-[--text-primary]">
              Review Enhancement ({currentIndex + 1} of {selectedCharacters.length})
            </h2>
            <p className="text-[--text-secondary]">{currentChar.name}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-[--text-tertiary]">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {accepted.size} accepted
            <span className="mx-2">·</span>
            <X className="w-4 h-4 text-gray-400" />
            {skipped.size} skipped
          </div>
        </div>

        {/* Comparison - Stacked for better viewing */}
        <div className="space-y-6 mb-6">
          {/* Before */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 bg-white/[0.02] border-b border-[--border] flex items-center justify-between">
              <p className="text-sm font-medium text-[--text-secondary]">Before (Original)</p>
              <span className="text-xs text-[--text-tertiary]">Current image</span>
            </div>
            <div className="relative w-full bg-black/50" style={{ aspectRatio: '16/9' }}>
              {currentChar.image_url && (
                <Image
                  src={currentChar.image_url}
                  alt={`${currentChar.name} - Original`}
                  fill
                  className="object-contain"
                />
              )}
            </div>
          </div>

          {/* After */}
          <div className="card overflow-hidden border-2 border-emerald-500/30">
            <div className="px-4 py-3 bg-emerald-500/5 border-b border-emerald-500/20 flex items-center justify-between">
              <p className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                After (Enhanced)
              </p>
              <span className="text-xs text-emerald-400/70">AI upscaled</span>
            </div>
            <div className="relative w-full bg-black/50" style={{ aspectRatio: '16/9' }}>
              {enhancedDataUrl && (
                <Image
                  src={enhancedDataUrl}
                  alt={`${currentChar.name} - Enhanced`}
                  fill
                  className="object-contain"
                  unoptimized
                />
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-4 bg-[--bg-elevated] rounded-xl border border-[--border]">
          <button
            onClick={skipEnhancement}
            className="btn btn-secondary flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Skip
          </button>

          <div className="flex items-center gap-3">
            {currentIndex < selectedCharacters.length - 1 && (
              <button
                onClick={acceptAllRemaining}
                className="btn btn-secondary flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Accept All Remaining
              </button>
            )}
            <button
              onClick={acceptEnhancement}
              className="btn btn-primary flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Accept & Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Complete step
  if (step === 'complete') {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-[--text-primary] mb-2">Enhancement Complete</h2>
        <p className="text-[--text-secondary] mb-8">
          Successfully processed {selectedCharacters.length} images
        </p>

        {/* Results */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="card p-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              <span className="text-3xl font-bold text-emerald-400">{accepted.size}</span>
            </div>
            <p className="text-sm text-[--text-tertiary]">Accepted</p>
          </div>
          <div className="card p-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <X className="w-6 h-6 text-gray-400" />
              <span className="text-3xl font-bold text-gray-400">{skipped.size}</span>
            </div>
            <p className="text-sm text-[--text-tertiary]">Skipped</p>
          </div>
        </div>

        <button
          onClick={resetAndStartOver}
          className="btn btn-primary flex items-center gap-2 mx-auto"
        >
          <RefreshCw className="w-4 h-4" />
          Enhance More Images
        </button>
      </div>
    )
  }

  return null
}
