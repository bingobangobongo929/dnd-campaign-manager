'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  ArrowLeft,
  Save,
  Loader2,
  Camera,
  Upload,
  Trash2,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  Gamepad2,
  BookOpen,
  Users,
  MapPin,
  Target,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { Modal } from '@/components/ui'
import { useSupabase, useUser } from '@/hooks'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'
import { v4 as uuidv4 } from 'uuid'

// Helper to create centered crop with aspect ratio
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

const GAME_SYSTEMS = [
  { value: 'D&D 5e', label: 'D&D 5e' },
  { value: 'D&D 3.5e', label: 'D&D 3.5e' },
  { value: 'Pathfinder 2e', label: 'Pathfinder 2e' },
  { value: 'Lancer', label: 'Lancer' },
  { value: 'Call of Cthulhu', label: 'Call of Cthulhu' },
  { value: 'Vampire: The Masquerade', label: 'Vampire: The Masquerade' },
  { value: 'Custom', label: 'Custom System' },
]

const CAMPAIGN_STATUSES = [
  { value: 'active', label: 'Active', color: 'bg-emerald-500' },
  { value: 'hiatus', label: 'On Hiatus', color: 'bg-amber-500' },
  { value: 'completed', label: 'Completed', color: 'bg-purple-500' },
  { value: 'archived', label: 'Archived', color: 'bg-gray-500' },
]

// Styled input/textarea classes
const inputStyles = "w-full py-3 px-4 text-[15px] bg-white/[0.02] border border-white/[0.06] rounded-xl text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.04] focus:border-purple-500/30 transition-all duration-200"
const textareaStyles = "w-full py-4 px-5 text-[15px] bg-white/[0.02] border border-white/[0.06] rounded-xl text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.04] focus:border-purple-500/30 transition-all duration-200 resize-none min-h-[150px] leading-relaxed"

export default function NewCampaignPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()
  const imageInputRef = useRef<HTMLInputElement>(null)
  const { aiEnabled } = useAppStore()

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    game_system: 'D&D 5e',
    status: 'active',
    image_url: null as string | null,
    setting_notes: '',
    party_goals: '',
    dm_notes: '',
  })

  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageOptionsModalOpen, setImageOptionsModalOpen] = useState(false)
  const [generatingPrompt, setGeneratingPrompt] = useState(false)
  const [promptModalOpen, setPromptModalOpen] = useState(false)
  const [generatedPrompt, setGeneratedPrompt] = useState({ prompt: '', shortPrompt: '' })
  const [promptCopied, setPromptCopied] = useState(false)

  // Image cropping state
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const cropImgRef = useRef<HTMLImageElement>(null)

  // Collapsible sections
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    setting: true,
    goals: true,
    notes: false,
  })

  // Handle file selection - opens crop modal
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setCropModalOpen(true)
    }
    reader.readAsDataURL(file)

    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  // Handle crop image load - initialize crop area
  const onCropImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    setCrop(centerAspectCrop(width, height, 16 / 9)) // 16:9 aspect ratio for campaigns
  }, [])

  // Apply crop and upload
  const handleCropComplete = async () => {
    if (!completedCrop || !cropImgRef.current) return

    setUploadingImage(true)
    setCropModalOpen(false)

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

      const uniqueId = uuidv4()
      const path = `campaigns/${uniqueId}.webp`

      const { error: uploadError } = await supabase.storage
        .from('campaign-images')
        .upload(path, blob, { contentType: 'image/webp' })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('campaign-images')
        .getPublicUrl(path)

      setFormData(prev => ({ ...prev, image_url: urlData.publicUrl }))
    } catch (err) {
      console.error('Upload error:', err)
      alert('Failed to upload image')
    } finally {
      setUploadingImage(false)
      setPendingImage(null)
      setCompletedCrop(undefined)
      setCrop(undefined)
    }
  }

  const handleCropCancel = () => {
    setCropModalOpen(false)
    setPendingImage(null)
    setCompletedCrop(undefined)
    setCrop(undefined)
  }

  const handleGeneratePrompt = async () => {
    if (!formData.name.trim()) {
      alert('Please add a name first')
      return
    }

    setGeneratingPrompt(true)
    try {
      const res = await fetch('/api/ai/generate-campaign-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.name,
          summary: formData.description,
          setting: formData.setting_notes,
          game_system: formData.game_system,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to generate prompt')
      }

      const data = await res.json()
      setGeneratedPrompt({ prompt: data.prompt, shortPrompt: data.shortPrompt })
      setPromptModalOpen(true)
    } catch (err: any) {
      console.error('Generate prompt error:', err)
      alert(err.message || 'Failed to generate prompt')
    } finally {
      setGeneratingPrompt(false)
    }
  }

  const copyPromptToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setPromptCopied(true)
    setTimeout(() => setPromptCopied(false), 2000)
  }

  const handleSave = async () => {
    if (!formData.name.trim() || !user) return

    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          user_id: user.id,
          name: formData.name,
          description: formData.description || null,
          game_system: formData.game_system,
          status: formData.status,
          image_url: formData.image_url,
        })
        .select()
        .single()

      if (error) throw error
      router.push(`/campaigns/${data.id}/canvas`)
    } catch (err) {
      console.error('Save error:', err)
      alert('Failed to save campaign')
    } finally {
      setSaving(false)
    }
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  return (
    <>
      <div className="min-h-screen bg-[--bg-base]">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-[--bg-base]/80 backdrop-blur-xl border-b border-white/[0.06]">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => router.push('/campaigns')}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Back</span>
            </button>

            <button
              onClick={handleSave}
              disabled={!formData.name.trim() || saving}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </header>

        {/* Hidden file input */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageSelect}
        />

        {/* Main Content */}
        <main className="max-w-5xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-8">
            {/* Left Sidebar - Image & Meta */}
            <div className="space-y-6">
              {/* Campaign Image - 16:9 aspect ratio */}
              <div
                onClick={() => setImageOptionsModalOpen(true)}
                className={cn(
                  "relative aspect-video rounded-2xl overflow-hidden cursor-pointer group border-2 transition-all",
                  formData.image_url
                    ? "border-white/10 hover:border-purple-500/50"
                    : "border-dashed border-white/20 hover:border-purple-500/50 bg-white/[0.02]"
                )}
              >
                {uploadingImage ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                  </div>
                ) : formData.image_url ? (
                  <>
                    <Image
                      src={formData.image_url}
                      alt={formData.name || 'Campaign'}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-10 h-10 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-500 group-hover:text-purple-400 transition-colors">
                    <Camera className="w-12 h-12" />
                    <span className="text-sm">Add Campaign Image</span>
                  </div>
                )}
              </div>

              {/* Quick Meta */}
              <div className="space-y-4 p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Game System</label>
                  <select
                    value={formData.game_system}
                    onChange={e => setFormData(prev => ({ ...prev, game_system: e.target.value }))}
                    className={cn(inputStyles, "py-2")}
                  >
                    {GAME_SYSTEMS.map(sys => (
                      <option key={sys.value} value={sys.value}>{sys.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className={cn(inputStyles, "py-2")}
                  >
                    {CAMPAIGN_STATUSES.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tips */}
              <div className="p-4 bg-purple-500/5 rounded-xl border border-purple-500/20">
                <div className="flex items-start gap-3">
                  <Gamepad2 className="w-5 h-5 text-purple-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-purple-300">Quick Start</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Just add a name and game system to get started. You can add more details later from the campaign canvas.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right - Main Content */}
            <div className="space-y-6">
              {/* Title & Description */}
              <div className="space-y-4">
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Campaign Name"
                  className="w-full text-3xl font-display font-bold bg-transparent border-none outline-none text-white placeholder:text-gray-600"
                />
                <textarea
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="A brief description of your campaign..."
                  className={cn(inputStyles, "min-h-[100px] resize-none")}
                  rows={3}
                />
              </div>

              {/* Collapsible Sections */}
              <div className="space-y-4">
                {/* Setting Notes */}
                <CollapsibleSection
                  title="Setting Notes"
                  icon={MapPin}
                  expanded={expandedSections.setting}
                  onToggle={() => toggleSection('setting')}
                >
                  <textarea
                    value={formData.setting_notes}
                    onChange={e => setFormData(prev => ({ ...prev, setting_notes: e.target.value }))}
                    placeholder="World details, homebrew rules, tone guidance..."
                    className={textareaStyles}
                  />
                </CollapsibleSection>

                {/* Party Goals */}
                <CollapsibleSection
                  title="Campaign Goals"
                  icon={Target}
                  expanded={expandedSections.goals}
                  onToggle={() => toggleSection('goals')}
                >
                  <textarea
                    value={formData.party_goals}
                    onChange={e => setFormData(prev => ({ ...prev, party_goals: e.target.value }))}
                    placeholder="What are the party's main objectives? What drives the narrative?"
                    className={textareaStyles}
                  />
                </CollapsibleSection>

                {/* DM Notes */}
                <CollapsibleSection
                  title="DM Notes"
                  icon={BookOpen}
                  expanded={expandedSections.notes}
                  onToggle={() => toggleSection('notes')}
                  warning="Private"
                >
                  <textarea
                    value={formData.dm_notes}
                    onChange={e => setFormData(prev => ({ ...prev, dm_notes: e.target.value }))}
                    placeholder="Private notes, future plot ideas, secrets..."
                    className={cn(textareaStyles, "border-amber-500/20 focus:border-amber-500/40")}
                  />
                </CollapsibleSection>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Image Options Modal */}
      <Modal
        isOpen={imageOptionsModalOpen}
        onClose={() => setImageOptionsModalOpen(false)}
        title="Campaign Image"
        description="Upload an image or generate an AI prompt"
      >
        <div className="space-y-3 py-4">
          <button
            onClick={() => {
              setImageOptionsModalOpen(false)
              imageInputRef.current?.click()
            }}
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

          {aiEnabled && (
            <button
              onClick={() => {
                setImageOptionsModalOpen(false)
                handleGeneratePrompt()
              }}
              disabled={generatingPrompt || !formData.name.trim()}
              className="w-full flex items-center gap-4 p-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] rounded-xl transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="p-3 bg-purple-500/20 rounded-lg">
                {generatingPrompt ? (
                  <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5 text-purple-400" />
                )}
              </div>
              <div>
                <p className="font-medium text-white">Generate AI Prompt</p>
                <p className="text-sm text-gray-500">Get a prompt for Midjourney, DALL-E, etc.</p>
              </div>
            </button>
          )}

          {formData.image_url && (
            <button
              onClick={() => {
                setFormData(prev => ({ ...prev, image_url: null }))
                setImageOptionsModalOpen(false)
              }}
              className="w-full flex items-center gap-4 p-4 bg-white/[0.03] hover:bg-red-500/10 border border-white/[0.08] hover:border-red-500/30 rounded-xl transition-colors text-left"
            >
              <div className="p-3 bg-red-500/20 rounded-lg">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="font-medium text-red-400">Remove Image</p>
                <p className="text-sm text-gray-500">Delete the current campaign image</p>
              </div>
            </button>
          )}
        </div>
        <div className="flex justify-end pt-2">
          <button
            onClick={() => setImageOptionsModalOpen(false)}
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
        description="Copy this prompt to use in Midjourney, DALL-E, or your preferred image AI"
        size="lg"
      >
        <div className="space-y-6 py-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-400">Full Prompt</label>
              <button
                onClick={() => copyPromptToClipboard(generatedPrompt.prompt)}
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
            <div className="p-4 bg-white/[0.03] border border-white/[0.08] rounded-xl">
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                {generatedPrompt.prompt}
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-400">Short Version</label>
              <button
                onClick={() => copyPromptToClipboard(generatedPrompt.shortPrompt)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy
              </button>
            </div>
            <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
              <p className="text-sm text-gray-400">
                {generatedPrompt.shortPrompt}
              </p>
            </div>
          </div>

          <p className="text-xs text-gray-500 text-center">
            Paste this prompt into Midjourney, DALL-E, Leonardo AI, or your preferred image generation tool
          </p>
        </div>
        <div className="flex justify-end pt-2">
          <button
            onClick={() => setPromptModalOpen(false)}
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            Done
          </button>
        </div>
      </Modal>

      {/* Image Crop Modal */}
      <Modal
        isOpen={cropModalOpen}
        onClose={handleCropCancel}
        title="Crop Image"
        description="Adjust the crop area to fit the 16:9 widescreen aspect ratio. Full resolution is preserved."
        size="xl"
      >
        <div className="space-y-4 py-4">
          {pendingImage && (
            <div className="flex justify-center bg-black/30 rounded-xl p-4 max-h-[60vh] overflow-auto">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={16 / 9}
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
          )}

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Aspect ratio: 16:9 (widescreen)</span>
            <span>Full resolution will be preserved</span>
          </div>
        </div>

        <div className="flex justify-between pt-4 border-t border-white/10">
          <button
            onClick={() => {
              if (cropImgRef.current) {
                const { width, height } = cropImgRef.current
                setCrop(centerAspectCrop(width, height, 16 / 9))
              }
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleCropCancel}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCropComplete}
              disabled={!completedCrop}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Check className="w-4 h-4" />
              Apply Crop
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}

// Collapsible Section Component
function CollapsibleSection({
  title,
  icon: Icon,
  expanded,
  onToggle,
  warning,
  children,
}: {
  title: string
  icon: any
  expanded: boolean
  onToggle: () => void
  warning?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Icon className="w-4 h-4 text-purple-400" />
          </div>
          <span className="font-medium text-white/90">{title}</span>
          {warning && (
            <span className="text-xs px-2 py-0.5 bg-amber-500/15 text-amber-400 rounded border border-amber-500/20">
              {warning}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>
      {expanded && <div className="p-4 pt-0">{children}</div>}
    </div>
  )
}
