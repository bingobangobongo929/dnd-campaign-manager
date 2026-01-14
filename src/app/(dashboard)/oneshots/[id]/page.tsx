'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import {
  ArrowLeft,
  Save,
  Share2,
  Trash2,
  Plus,
  X,
  Camera,
  Loader2,
  Users,
  Clock,
  Scroll,
  BookOpen,
  Target,
  Eye,
  EyeOff,
  Sparkles,
  Play,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  RotateCcw,
} from 'lucide-react'
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { Modal } from '@/components/ui'
import { ShareOneshotModal } from '@/components/oneshots/ShareOneshotModal'
import { useSupabase, useUser } from '@/hooks'
import { cn } from '@/lib/utils'
import { v4 as uuidv4 } from 'uuid'
import type { Oneshot, OneshotGenreTag, OneshotRun } from '@/types/database'

// Helper to create centered crop with aspect ratio
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

// Default genre tags
const DEFAULT_GENRE_TAGS = [
  { name: 'Horror', color: '#DC2626' },
  { name: 'Mystery', color: '#7C3AED' },
  { name: 'Survival', color: '#059669' },
  { name: 'Comedy', color: '#F59E0B' },
  { name: 'Dark Fantasy', color: '#4B5563' },
  { name: 'Low Magic', color: '#0891B2' },
  { name: 'High Fantasy', color: '#8B5CF6' },
  { name: 'Intrigue', color: '#EC4899' },
]

const GAME_SYSTEMS = [
  'D&D 5e',
  'D&D 3.5e',
  'Pathfinder 2e',
  'Call of Cthulhu',
  'Vampire: The Masquerade',
  'Custom',
]

// Styled input/textarea classes
const inputStyles = "w-full py-3 px-4 text-[15px] bg-white/[0.02] border border-white/[0.06] rounded-xl text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.04] focus:border-purple-500/30 transition-all duration-200"
const textareaStyles = "w-full py-4 px-5 text-[15px] bg-white/[0.02] border border-white/[0.06] rounded-xl text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.04] focus:border-purple-500/30 transition-all duration-200 resize-none min-h-[150px] leading-relaxed"

export default function OneshotEditorPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = useSupabase()
  const { user } = useUser()
  const imageInputRef = useRef<HTMLInputElement>(null)

  const isNew = params.id === 'new'
  const oneshotId = isNew ? null : (params.id as string)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    tagline: '',
    image_url: null as string | null,
    genre_tag_ids: [] as string[],
    game_system: 'D&D 5e',
    level: 5,
    player_count_min: 3,
    player_count_max: 5,
    estimated_duration: '3-4 hours',
    introduction: '',
    setting_notes: '',
    character_creation: '',
    session_plan: '',
    twists: '',
    key_npcs: '',
    handouts: '',
    status: 'draft',
  })

  const [genreTags, setGenreTags] = useState<OneshotGenreTag[]>([])
  const [runs, setRuns] = useState<OneshotRun[]>([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [generatingImage, setGeneratingImage] = useState(false)
  const [showTwists, setShowTwists] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [runModalOpen, setRunModalOpen] = useState(false)
  const [addTagModalOpen, setAddTagModalOpen] = useState(false)
  const [promptModalOpen, setPromptModalOpen] = useState(false)
  const [generatedPrompt, setGeneratedPrompt] = useState({ prompt: '', shortPrompt: '' })
  const [promptCopied, setPromptCopied] = useState(false)
  // Image cropping state
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const cropImgRef = useRef<HTMLImageElement>(null)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#8B5CF6')

  // Collapsible sections
  const [expandedSections, setExpandedSections] = useState({
    introduction: true,
    setting: true,
    characterCreation: true,
    sessionPlan: true,
    twists: true,
    npcs: false,
    handouts: false,
    runs: true,
  })

  // Load data
  useEffect(() => {
    if (user) {
      loadGenreTags()
      if (oneshotId) {
        loadOneshot()
      } else {
        setLoading(false)
      }
    }
  }, [user, oneshotId])

  const loadGenreTags = async () => {
    const { data } = await supabase
      .from('oneshot_genre_tags')
      .select('*')
      .eq('user_id', user!.id)
      .order('sort_order')

    if (data && data.length > 0) {
      setGenreTags(data)
    } else {
      // Create default tags
      const defaultTags = DEFAULT_GENRE_TAGS.map((tag, index) => ({
        user_id: user!.id,
        name: tag.name,
        color: tag.color,
        sort_order: index,
      }))

      const { data: newTags } = await supabase
        .from('oneshot_genre_tags')
        .insert(defaultTags)
        .select()

      if (newTags) {
        setGenreTags(newTags)
      }
    }
  }

  const loadOneshot = async () => {
    const { data: oneshot } = await supabase
      .from('oneshots')
      .select('*')
      .eq('id', oneshotId)
      .single()

    if (oneshot) {
      setFormData({
        title: oneshot.title,
        tagline: oneshot.tagline || '',
        image_url: oneshot.image_url,
        genre_tag_ids: oneshot.genre_tag_ids || [],
        game_system: oneshot.game_system,
        level: oneshot.level || 5,
        player_count_min: oneshot.player_count_min,
        player_count_max: oneshot.player_count_max,
        estimated_duration: oneshot.estimated_duration || '',
        introduction: oneshot.introduction || '',
        setting_notes: oneshot.setting_notes || '',
        character_creation: oneshot.character_creation || '',
        session_plan: oneshot.session_plan || '',
        twists: oneshot.twists || '',
        key_npcs: oneshot.key_npcs || '',
        handouts: oneshot.handouts || '',
        status: oneshot.status,
      })
    }

    // Load runs
    const { data: runsData } = await supabase
      .from('oneshot_runs')
      .select('*')
      .eq('oneshot_id', oneshotId)
      .order('run_date', { ascending: false })

    if (runsData) {
      setRuns(runsData)
    }

    setLoading(false)
  }

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

    // Read file as data URL and open crop modal
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
    setCrop(centerAspectCrop(width, height, 2 / 3)) // 2:3 aspect ratio for posters
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

      // Calculate scale from displayed to natural size
      const scaleX = image.naturalWidth / image.width
      const scaleY = image.naturalHeight / image.height

      // Calculate crop at natural resolution (keeps full quality - 3x or more)
      const cropX = completedCrop.x * scaleX
      const cropY = completedCrop.y * scaleY
      const cropWidth = completedCrop.width * scaleX
      const cropHeight = completedCrop.height * scaleY

      // Set canvas to full cropped resolution
      canvas.width = cropWidth
      canvas.height = cropHeight

      // High quality rendering
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      // Draw cropped portion at full resolution
      ctx.drawImage(
        image,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
      )

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => b ? resolve(b) : reject(new Error('Canvas is empty')),
          'image/webp',
          0.92
        )
      })

      // Upload to Supabase
      const uniqueId = uuidv4()
      const path = `oneshots/${uniqueId}.webp`

      const { error: uploadError } = await supabase.storage
        .from('oneshot-images')
        .upload(path, blob, { contentType: 'image/webp' })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('oneshot-images')
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

  // Cancel crop
  const handleCropCancel = () => {
    setCropModalOpen(false)
    setPendingImage(null)
    setCompletedCrop(undefined)
    setCrop(undefined)
  }

  const handleGeneratePrompt = async () => {
    if (!formData.title.trim()) {
      alert('Please add a title first')
      return
    }

    setGeneratingImage(true)
    try {
      // Get the selected genre tag names
      const selectedTagNames = genreTags
        .filter(tag => formData.genre_tag_ids.includes(tag.id))
        .map(tag => tag.name)

      const res = await fetch('/api/ai/generate-oneshot-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          tagline: formData.tagline,
          genreTags: selectedTagNames,
          introduction: formData.introduction,
          settingNotes: formData.setting_notes,
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
      setGeneratingImage(false)
    }
  }

  const copyPromptToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setPromptCopied(true)
    setTimeout(() => setPromptCopied(false), 2000)
  }

  const handleSave = async () => {
    if (!formData.title.trim() || !user) return

    setSaving(true)
    try {
      const saveData = {
        user_id: user.id,
        title: formData.title,
        tagline: formData.tagline || null,
        image_url: formData.image_url,
        genre_tag_ids: formData.genre_tag_ids,
        game_system: formData.game_system,
        level: formData.level,
        player_count_min: formData.player_count_min,
        player_count_max: formData.player_count_max,
        estimated_duration: formData.estimated_duration || null,
        introduction: formData.introduction || null,
        setting_notes: formData.setting_notes || null,
        character_creation: formData.character_creation || null,
        session_plan: formData.session_plan || null,
        twists: formData.twists || null,
        key_npcs: formData.key_npcs || null,
        handouts: formData.handouts || null,
        status: formData.status,
      }

      if (isNew) {
        const { data, error } = await supabase
          .from('oneshots')
          .insert(saveData)
          .select()
          .single()

        if (error) throw error
        router.replace(`/oneshots/${data.id}`)
      } else {
        const { error } = await supabase
          .from('oneshots')
          .update(saveData)
          .eq('id', oneshotId)

        if (error) throw error
      }
    } catch (err) {
      console.error('Save error:', err)
      alert('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!oneshotId) return

    const { error } = await supabase.from('oneshots').delete().eq('id', oneshotId)
    if (!error) {
      router.push('/campaigns')
    }
    setDeleteModalOpen(false)
  }

  const handleAddTag = async () => {
    if (!newTagName.trim() || !user) return

    const { data } = await supabase
      .from('oneshot_genre_tags')
      .insert({
        user_id: user.id,
        name: newTagName.trim(),
        color: newTagColor,
        sort_order: genreTags.length,
      })
      .select()
      .single()

    if (data) {
      setGenreTags(prev => [...prev, data])
      setNewTagName('')
      setNewTagColor('#8B5CF6')
      setAddTagModalOpen(false)
    }
  }

  const toggleTag = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      genre_tag_ids: prev.genre_tag_ids.includes(tagId)
        ? prev.genre_tag_ids.filter(id => id !== tagId)
        : [...prev.genre_tag_ids, tagId],
    }))
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[--bg-base] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
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

            <div className="flex items-center gap-3">
              {!isNew && (
                <>
                  <button
                    onClick={() => setShareModalOpen(true)}
                    className="p-2 text-gray-400 hover:text-purple-400 transition-colors"
                    title="Share"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setDeleteModalOpen(true)}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </>
              )}
              <button
                onClick={handleSave}
                disabled={!formData.title.trim() || saving}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
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
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8">
            {/* Left Sidebar - Poster Image & Meta */}
            <div className="space-y-6">
              {/* Movie Poster Image */}
              <div
                onClick={() => imageInputRef.current?.click()}
                className={cn(
                  "relative aspect-[2/3] rounded-2xl overflow-hidden cursor-pointer group border-2 transition-all",
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
                      alt={formData.title || 'One-Shot'}
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
                    <span className="text-sm">Add Poster Image</span>
                  </div>
                )}
              </div>

              {/* Image Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleGeneratePrompt}
                  disabled={generatingImage || !formData.title.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-purple-600/80 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors"
                >
                  {generatingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Get AI Prompt
                    </>
                  )}
                </button>
                {formData.image_url && (
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, image_url: null }))}
                    className="px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors"
                    title="Remove image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Quick Meta */}
              <div className="space-y-4 p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Level</label>
                  <input
                    type="number"
                    value={formData.level}
                    onChange={e => setFormData(prev => ({ ...prev, level: parseInt(e.target.value) || 1 }))}
                    className={cn(inputStyles, "py-2")}
                    min={1}
                    max={20}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Min Players</label>
                    <input
                      type="number"
                      value={formData.player_count_min}
                      onChange={e => setFormData(prev => ({ ...prev, player_count_min: parseInt(e.target.value) || 1 }))}
                      className={cn(inputStyles, "py-2")}
                      min={1}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Max Players</label>
                    <input
                      type="number"
                      value={formData.player_count_max}
                      onChange={e => setFormData(prev => ({ ...prev, player_count_max: parseInt(e.target.value) || 1 }))}
                      className={cn(inputStyles, "py-2")}
                      min={1}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Duration</label>
                  <input
                    type="text"
                    value={formData.estimated_duration}
                    onChange={e => setFormData(prev => ({ ...prev, estimated_duration: e.target.value }))}
                    placeholder="3-4 hours"
                    className={cn(inputStyles, "py-2")}
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Game System</label>
                  <select
                    value={formData.game_system}
                    onChange={e => setFormData(prev => ({ ...prev, game_system: e.target.value }))}
                    className={cn(inputStyles, "py-2")}
                  >
                    {GAME_SYSTEMS.map(sys => (
                      <option key={sys} value={sys}>{sys}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Genre Tags */}
              <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs text-gray-500 uppercase tracking-wider">Genre Tags</label>
                  <button
                    onClick={() => setAddTagModalOpen(true)}
                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {genreTags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                        formData.genre_tag_ids.includes(tag.id)
                          ? "ring-2 ring-offset-2 ring-offset-[--bg-base]"
                          : "opacity-50 hover:opacity-75"
                      )}
                      style={{
                        backgroundColor: `${tag.color}25`,
                        color: tag.color,
                        borderColor: tag.color,
                        ['--tw-ring-color' as string]: formData.genre_tag_ids.includes(tag.id) ? tag.color : undefined,
                      } as React.CSSProperties}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Run History */}
              {!isNew && runs.length > 0 && (
                <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs text-gray-500 uppercase tracking-wider">Run History</label>
                    <span className="text-xs text-purple-400">{runs.length} runs</span>
                  </div>
                  <div className="space-y-2">
                    {runs.slice(0, 5).map(run => (
                      <div key={run.id} className="text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-white/80">{run.group_name || 'Unknown Group'}</span>
                          <span className="text-gray-500 text-xs">
                            {new Date(run.run_date).toLocaleDateString()}
                          </span>
                        </div>
                        {run.notes && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{run.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right - Main Content */}
            <div className="space-y-6">
              {/* Title & Tagline */}
              <div className="space-y-4">
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="One-Shot Title"
                  className="w-full text-3xl font-display font-bold bg-transparent border-none outline-none text-white placeholder:text-gray-600"
                />
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={e => setFormData(prev => ({ ...prev, tagline: e.target.value }))}
                  placeholder="A brief tagline for your one-shot..."
                  className="w-full text-lg bg-transparent border-none outline-none text-gray-400 placeholder:text-gray-600"
                />
              </div>

              {/* Collapsible Sections */}
              <div className="space-y-4">
                {/* Introduction */}
                <CollapsibleSection
                  title="Introduction"
                  icon={BookOpen}
                  expanded={expandedSections.introduction}
                  onToggle={() => toggleSection('introduction')}
                >
                  <textarea
                    value={formData.introduction}
                    onChange={e => setFormData(prev => ({ ...prev, introduction: e.target.value }))}
                    placeholder="The narrative introduction to read to your players. Set the scene, establish the world, and hook them into the story..."
                    className={cn(textareaStyles, "min-h-[250px]")}
                  />
                  <AIHelper section="introduction" />
                </CollapsibleSection>

                {/* Setting Notes */}
                <CollapsibleSection
                  title="Setting Notes"
                  icon={Scroll}
                  expanded={expandedSections.setting}
                  onToggle={() => toggleSection('setting')}
                >
                  <textarea
                    value={formData.setting_notes}
                    onChange={e => setFormData(prev => ({ ...prev, setting_notes: e.target.value }))}
                    placeholder="Special rules, world details, tone guidance. E.g., 'Low-magic setting', 'Horror tone', 'Gritty realism'..."
                    className={textareaStyles}
                  />
                </CollapsibleSection>

                {/* Character Creation */}
                <CollapsibleSection
                  title="Character Creation"
                  icon={Users}
                  expanded={expandedSections.characterCreation}
                  onToggle={() => toggleSection('characterCreation')}
                >
                  <textarea
                    value={formData.character_creation}
                    onChange={e => setFormData(prev => ({ ...prev, character_creation: e.target.value }))}
                    placeholder="Character creation rules and restrictions. Level, allowed sources, stat method, special requirements..."
                    className={textareaStyles}
                  />
                </CollapsibleSection>

                {/* Session Plan */}
                <CollapsibleSection
                  title="Session Plan"
                  icon={Target}
                  expanded={expandedSections.sessionPlan}
                  onToggle={() => toggleSection('sessionPlan')}
                >
                  <textarea
                    value={formData.session_plan}
                    onChange={e => setFormData(prev => ({ ...prev, session_plan: e.target.value }))}
                    placeholder="The structure of your session. Acts, key beats, encounters, decision points..."
                    className={cn(textareaStyles, "min-h-[300px]")}
                  />
                  <AIHelper section="session_plan" />
                </CollapsibleSection>

                {/* Twists & Secrets */}
                <CollapsibleSection
                  title="Twists & Secrets"
                  icon={showTwists ? Eye : EyeOff}
                  expanded={expandedSections.twists}
                  onToggle={() => toggleSection('twists')}
                  warning="DM Eyes Only"
                  onIconClick={() => setShowTwists(!showTwists)}
                >
                  {showTwists ? (
                    <textarea
                      value={formData.twists}
                      onChange={e => setFormData(prev => ({ ...prev, twists: e.target.value }))}
                      placeholder="Hidden information, plot twists, player-specific secrets..."
                      className={cn(textareaStyles, "border-red-500/20 focus:border-red-500/40")}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 bg-white/[0.015] rounded-xl border border-dashed border-white/10">
                      <EyeOff className="w-8 h-8 text-gray-600 mb-3" />
                      <p className="text-sm text-gray-500">Click the eye icon to reveal secrets</p>
                    </div>
                  )}
                </CollapsibleSection>

                {/* Key NPCs */}
                <CollapsibleSection
                  title="Key NPCs"
                  icon={Users}
                  expanded={expandedSections.npcs}
                  onToggle={() => toggleSection('npcs')}
                >
                  <textarea
                    value={formData.key_npcs}
                    onChange={e => setFormData(prev => ({ ...prev, key_npcs: e.target.value }))}
                    placeholder="Important NPCs, their motivations, and how they interact with the players..."
                    className={textareaStyles}
                  />
                </CollapsibleSection>

                {/* Handouts */}
                <CollapsibleSection
                  title="Handouts & Props"
                  icon={Scroll}
                  expanded={expandedSections.handouts}
                  onToggle={() => toggleSection('handouts')}
                >
                  <textarea
                    value={formData.handouts}
                    onChange={e => setFormData(prev => ({ ...prev, handouts: e.target.value }))}
                    placeholder="In-world documents, rules handouts, maps, or other props for the players..."
                    className={textareaStyles}
                  />
                  <AIHelper section="handouts" />
                </CollapsibleSection>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Delete Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete One-Shot"
        description="Are you sure? This will permanently delete this one-shot and all its run history."
      >
        <div className="flex justify-end gap-3 pt-4">
          <button className="btn btn-secondary" onClick={() => setDeleteModalOpen(false)}>Cancel</button>
          <button
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            onClick={handleDelete}
          >
            Delete
          </button>
        </div>
      </Modal>

      {/* Share Modal */}
      {oneshotId && (
        <ShareOneshotModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          oneshotId={oneshotId}
          oneshotTitle={formData.title || 'Untitled One-Shot'}
        />
      )}

      {/* Add Tag Modal */}
      <Modal
        isOpen={addTagModalOpen}
        onClose={() => setAddTagModalOpen(false)}
        title="Add Genre Tag"
      >
        <div className="space-y-4 py-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Tag Name</label>
            <input
              type="text"
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              placeholder="e.g., Noir, Heist, Romance"
              className={inputStyles}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Tag Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={newTagColor}
                onChange={e => setNewTagColor(e.target.value)}
                className="w-12 h-10 rounded cursor-pointer"
              />
              <input
                type="text"
                value={newTagColor}
                onChange={e => setNewTagColor(e.target.value)}
                className={cn(inputStyles, "flex-1")}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button className="btn btn-secondary" onClick={() => setAddTagModalOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddTag} disabled={!newTagName.trim()}>
            Add Tag
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
          {/* Full Prompt */}
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

          {/* Short Prompt */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-400">Short Version (for character limits)</label>
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
        description="Adjust the crop area to fit the 2:3 poster aspect ratio. Full resolution is preserved."
        size="xl"
      >
        <div className="space-y-4 py-4">
          {pendingImage && (
            <div className="flex justify-center bg-black/30 rounded-xl p-4 max-h-[60vh] overflow-auto">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={2 / 3}
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
            <span>Aspect ratio: 2:3 (portrait poster)</span>
            <span>Full resolution will be preserved</span>
          </div>
        </div>

        <div className="flex justify-between pt-4 border-t border-white/10">
          <button
            onClick={() => {
              if (cropImgRef.current) {
                const { width, height } = cropImgRef.current
                setCrop(centerAspectCrop(width, height, 2 / 3))
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
  onIconClick,
  warning,
  children,
}: {
  title: string
  icon: any
  expanded: boolean
  onToggle: () => void
  onIconClick?: () => void
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
          <div
            className="p-2 bg-purple-500/10 rounded-lg"
            onClick={e => {
              if (onIconClick) {
                e.stopPropagation()
                onIconClick()
              }
            }}
          >
            <Icon className="w-4 h-4 text-purple-400" />
          </div>
          <span className="font-medium text-white/90">{title}</span>
          {warning && (
            <span className="text-xs px-2 py-0.5 bg-red-500/15 text-red-400 rounded border border-red-500/20">
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
      {expanded && <div className="p-4 pt-0 space-y-3">{children}</div>}
    </div>
  )
}

// AI Helper Button
function AIHelper({ section }: { section: string }) {
  return (
    <button className="flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300 transition-colors mt-2">
      <Sparkles className="w-3 h-3" />
      AI Expand
    </button>
  )
}
