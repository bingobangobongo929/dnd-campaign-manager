'use client'

import { useState, useRef } from 'react'
import {
  Upload,
  Wand2,
  FileImage,
  LayoutTemplate,
  Paintbrush,
  PenTool,
  Loader2,
  ArrowLeft,
  Check,
} from 'lucide-react'
import { Modal, Input } from '@/components/ui'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { v4 as uuidv4 } from 'uuid'
import type { MapTemplate, WorldMapType } from '@/types/database'

type CreationMode = 'select' | 'upload' | 'conjure' | 'template' | 'build' | 'sketch'

interface CreateMapModalProps {
  isOpen: boolean
  onClose: () => void
  campaignId: string
  templates?: MapTemplate[]
  onMapCreated: (mapId: string) => void
  supabase: any // SupabaseClient
}

export function CreateMapModal({
  isOpen,
  onClose,
  campaignId,
  templates = [],
  onMapCreated,
  supabase,
}: CreateMapModalProps) {
  const [mode, setMode] = useState<CreationMode>('select')
  const [loading, setLoading] = useState(false)

  // Upload state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Common form state
  const [mapName, setMapName] = useState('')
  const [mapDescription, setMapDescription] = useState('')
  const [mapType, setMapType] = useState<WorldMapType>('world')

  // Conjure state
  const [conjurePrompt, setConjurePrompt] = useState('')
  const [conjureStyle, setConjureStyle] = useState('fantasy-handdrawn')

  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState<MapTemplate | null>(null)

  // Build state
  const [backgroundColor, setBackgroundColor] = useState('#1a1a2e')
  const [gridEnabled, setGridEnabled] = useState(true)
  const [gridSize, setGridSize] = useState(50)

  // Reset state when modal closes
  const handleClose = () => {
    setMode('select')
    setSelectedFile(null)
    setPreviewUrl(null)
    setMapName('')
    setMapDescription('')
    setMapType('world')
    setConjurePrompt('')
    setSelectedTemplate(null)
    onClose()
  }

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error('Image must be less than 20MB')
      return
    }

    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setMapName(file.name.replace(/\.[^/.]+$/, ''))
  }

  // Create map from upload
  const handleUploadCreate = async () => {
    if (!selectedFile || !mapName.trim()) return

    setLoading(true)
    try {
      const uniqueId = uuidv4()
      const ext = selectedFile.name.split('.').pop()
      const path = `${campaignId}/${uniqueId}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('world-maps')
        .upload(path, selectedFile, {
          contentType: selectedFile.type,
        })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('world-maps')
        .getPublicUrl(path)

      const { data: mapData, error: insertError } = await supabase
        .from('world_maps')
        .insert({
          campaign_id: campaignId,
          image_url: urlData.publicUrl,
          name: mapName.trim(),
          description: mapDescription.trim() || null,
          map_type: mapType,
        })
        .select()
        .single()

      if (insertError) throw insertError

      toast.success('Map uploaded successfully!')
      onMapCreated(mapData.id)
      handleClose()
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload map')
    } finally {
      setLoading(false)
    }
  }

  // Create map from conjure (AI generation)
  const handleConjureCreate = async () => {
    if (!conjurePrompt.trim() || !mapName.trim()) return

    setLoading(true)
    try {
      // Call the AI image generation API
      const response = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Fantasy map: ${conjurePrompt}. Style: ${conjureStyle}. Top-down view, detailed cartography.`,
          aspectRatio: '3:2', // Good aspect ratio for maps
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || errorData.details || 'Failed to generate map')
      }

      const result = await response.json()

      // The API returns { image: { dataUrl } } for Gemini or { image: { data, mimeType } } for Imagen
      const imageDataUrl = result.image?.dataUrl
      if (!imageDataUrl) {
        throw new Error('No image generated. Try a different description.')
      }

      // Upload the generated image to storage
      // Convert base64 to blob
      const base64Data = imageDataUrl.split(',')[1]
      const mimeType = result.image?.mimeType || 'image/png'
      const byteCharacters = atob(base64Data)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: mimeType })

      // Upload to storage
      const ext = mimeType === 'image/png' ? 'png' : 'jpg'
      const path = `${campaignId}/${uuidv4()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('world-maps')
        .upload(path, blob, { contentType: mimeType })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('world-maps')
        .getPublicUrl(path)

      // Create the map record
      const { data: mapData, error: insertError } = await supabase
        .from('world_maps')
        .insert({
          campaign_id: campaignId,
          image_url: urlData.publicUrl,
          name: mapName.trim(),
          description: mapDescription.trim() || null,
          map_type: mapType,
        })
        .select()
        .single()

      if (insertError) throw insertError

      toast.success('Map conjured successfully!')
      onMapCreated(mapData.id)
      handleClose()
    } catch (error) {
      console.error('Conjure error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to conjure map')
    } finally {
      setLoading(false)
    }
  }

  // Create map from template
  const handleTemplateCreate = async () => {
    if (!selectedTemplate || !mapName.trim()) return

    setLoading(true)
    try {
      const templateData = selectedTemplate.template_data as {
        grid?: boolean
        gridSize?: number
        background?: string
      }

      const { data: mapData, error: insertError } = await supabase
        .from('world_maps')
        .insert({
          campaign_id: campaignId,
          image_url: selectedTemplate.thumbnail_url || '',
          name: mapName.trim(),
          description: mapDescription.trim() || null,
          map_type: selectedTemplate.category as WorldMapType,
          template_id: selectedTemplate.id,
          grid_enabled: templateData.grid || false,
          grid_size: templateData.gridSize || 50,
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Update template use count
      await supabase
        .from('map_templates')
        .update({ use_count: (selectedTemplate.use_count || 0) + 1 })
        .eq('id', selectedTemplate.id)

      toast.success('Map created from template!')
      onMapCreated(mapData.id)
      handleClose()
    } catch (error) {
      console.error('Template error:', error)
      toast.error('Failed to create map from template')
    } finally {
      setLoading(false)
    }
  }

  // Create blank map (build mode or quick sketch)
  const handleBlankCreate = async () => {
    if (!mapName.trim()) return

    setLoading(true)
    try {
      const { data: mapData, error: insertError } = await supabase
        .from('world_maps')
        .insert({
          campaign_id: campaignId,
          image_url: '', // No image for blank maps
          name: mapName.trim(),
          description: mapDescription.trim() || null,
          map_type: mode === 'sketch' ? 'sketch' : mapType,
          grid_enabled: gridEnabled,
          grid_size: gridSize,
          terrain_data: { background: backgroundColor },
        })
        .select()
        .single()

      if (insertError) throw insertError

      toast.success('Map created!')
      onMapCreated(mapData.id)
      handleClose()
    } catch (error) {
      console.error('Create error:', error)
      toast.error('Failed to create map')
    } finally {
      setLoading(false)
    }
  }

  // Map type options
  const mapTypeOptions: { value: WorldMapType; label: string }[] = [
    { value: 'world', label: 'World Map' },
    { value: 'region', label: 'Regional Map' },
    { value: 'city', label: 'City Map' },
    { value: 'dungeon', label: 'Dungeon Map' },
    { value: 'building', label: 'Building/Interior' },
    { value: 'encounter', label: 'Encounter Map' },
  ]

  // Conjure style options
  const styleOptions = [
    { value: 'fantasy-handdrawn', label: 'Fantasy Hand-drawn' },
    { value: 'parchment', label: 'Aged Parchment' },
    { value: 'realistic', label: 'Realistic Terrain' },
    { value: 'stylized', label: 'Stylized/Artistic' },
    { value: 'sketch', label: 'Sketch/Blueprint' },
  ]

  // Creation mode options for the selector
  const creationModes = [
    {
      id: 'upload' as CreationMode,
      icon: Upload,
      title: 'Upload',
      description: 'Bring your own map image',
    },
    {
      id: 'conjure' as CreationMode,
      icon: Wand2,
      title: 'Conjure',
      description: 'Describe it, we\'ll create it',
    },
    {
      id: 'template' as CreationMode,
      icon: LayoutTemplate,
      title: 'Template',
      description: 'Start from a preset layout',
    },
    {
      id: 'build' as CreationMode,
      icon: Paintbrush,
      title: 'Build',
      description: 'Terrain tools, stamps, paint',
    },
    {
      id: 'sketch' as CreationMode,
      icon: PenTool,
      title: 'Quick Sketch',
      description: 'Blank canvas for improvised maps',
    },
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === 'select' ? 'Create New Map' : undefined}
      size="lg"
    >
      <div className="min-h-[400px]">
        {/* Mode Selector */}
        {mode === 'select' && (
          <div className="space-y-6">
            <p className="text-gray-400 text-sm">
              Choose how you want to create your map
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {creationModes.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className="flex flex-col items-center p-6 bg-white/[0.02] border border-white/[0.06] rounded-xl hover:border-purple-500/50 hover:bg-purple-500/5 transition-all text-center group"
                >
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-3 group-hover:bg-purple-500/20 transition-colors">
                    <m.icon className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="font-medium text-white mb-1">{m.title}</h3>
                  <p className="text-xs text-gray-500">{m.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Upload Mode */}
        {mode === 'upload' && (
          <div className="space-y-6">
            <button
              onClick={() => setMode('select')}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <h2 className="text-lg font-semibold text-white">Upload Map Image</h2>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />

            {previewUrl ? (
              <div className="space-y-4">
                <div className="relative aspect-video rounded-lg overflow-hidden bg-black/20">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                  <button
                    onClick={() => {
                      setSelectedFile(null)
                      setPreviewUrl(null)
                    }}
                    className="absolute top-2 right-2 p-1 bg-black/50 rounded hover:bg-black/70"
                  >
                    <span className="text-xs text-white">Change</span>
                  </button>
                </div>

                <div className="form-group">
                  <label className="form-label">Map Name</label>
                  <Input
                    value={mapName}
                    onChange={(e) => setMapName(e.target.value)}
                    placeholder="e.g., Sword Coast, Dungeon Level 1..."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description (optional)</label>
                  <textarea
                    value={mapDescription}
                    onChange={(e) => setMapDescription(e.target.value)}
                    placeholder="What does this map show?"
                    rows={2}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Map Type</label>
                  <select
                    value={mapType}
                    onChange={(e) => setMapType(e.target.value as WorldMapType)}
                    className="form-input"
                  >
                    {mapTypeOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleUploadCreate}
                  disabled={loading || !mapName.trim()}
                  className="btn btn-primary w-full"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Map'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-video border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center hover:border-purple-500/50 hover:bg-purple-500/5 transition-all"
              >
                <Upload className="w-10 h-10 text-gray-500 mb-3" />
                <p className="text-gray-400 mb-1">Click to upload or drag and drop</p>
                <p className="text-xs text-gray-600">PNG, JPG, WebP up to 20MB</p>
              </button>
            )}
          </div>
        )}

        {/* Conjure Mode */}
        {mode === 'conjure' && (
          <div className="space-y-6">
            <button
              onClick={() => setMode('select')}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-purple-400" />
              Conjure Map
            </h2>

            <div className="form-group">
              <label className="form-label">Describe your map</label>
              <textarea
                value={conjurePrompt}
                onChange={(e) => setConjurePrompt(e.target.value)}
                placeholder="A coastal kingdom with three major cities connected by roads. Mountains to the north, dense forest to the east. A river runs from the mountains to the sea..."
                rows={4}
                className="form-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Style</label>
                <select
                  value={conjureStyle}
                  onChange={(e) => setConjureStyle(e.target.value)}
                  className="form-input"
                >
                  {styleOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Map Type</label>
                <select
                  value={mapType}
                  onChange={(e) => setMapType(e.target.value as WorldMapType)}
                  className="form-input"
                >
                  {mapTypeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Map Name</label>
              <Input
                value={mapName}
                onChange={(e) => setMapName(e.target.value)}
                placeholder="e.g., The Kingdom of Valdris"
              />
            </div>

            <button
              onClick={handleConjureCreate}
              disabled={loading || !conjurePrompt.trim() || !mapName.trim()}
              className="btn btn-primary w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Conjuring...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Conjure Map
                </>
              )}
            </button>
          </div>
        )}

        {/* Template Mode */}
        {mode === 'template' && (
          <div className="space-y-6">
            <button
              onClick={() => setMode('select')}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <h2 className="text-lg font-semibold text-white">Choose a Template</h2>

            {selectedTemplate ? (
              <div className="space-y-4">
                <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-white">{selectedTemplate.name}</h3>
                      <p className="text-xs text-gray-400 capitalize">{selectedTemplate.category}</p>
                    </div>
                    <button
                      onClick={() => setSelectedTemplate(null)}
                      className="text-xs text-purple-400 hover:text-purple-300"
                    >
                      Change
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Map Name</label>
                  <Input
                    value={mapName}
                    onChange={(e) => setMapName(e.target.value)}
                    placeholder="Name your map..."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description (optional)</label>
                  <textarea
                    value={mapDescription}
                    onChange={(e) => setMapDescription(e.target.value)}
                    placeholder="What does this map show?"
                    rows={2}
                    className="form-input"
                  />
                </div>

                <button
                  onClick={handleTemplateCreate}
                  disabled={loading || !mapName.trim()}
                  className="btn btn-primary w-full"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create from Template'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto">
                {templates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => {
                      setSelectedTemplate(template)
                      setMapName(template.name)
                    }}
                    className="flex flex-col items-center p-4 bg-white/[0.02] border border-white/[0.06] rounded-lg hover:border-purple-500/50 hover:bg-purple-500/5 transition-all text-center"
                  >
                    {template.thumbnail_url ? (
                      <img
                        src={template.thumbnail_url}
                        alt={template.name}
                        className="w-full h-20 object-cover rounded mb-2"
                      />
                    ) : (
                      <div className="w-full h-20 bg-gray-800 rounded mb-2 flex items-center justify-center">
                        <FileImage className="w-8 h-8 text-gray-600" />
                      </div>
                    )}
                    <h4 className="text-sm font-medium text-white">{template.name}</h4>
                    <p className="text-xs text-gray-500 capitalize">{template.category}</p>
                  </button>
                ))}
                {templates.length === 0 && (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No templates available
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Build Mode */}
        {mode === 'build' && (
          <div className="space-y-6">
            <button
              onClick={() => setMode('select')}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Paintbrush className="w-5 h-5 text-purple-400" />
              Build New Map
            </h2>

            <div className="form-group">
              <label className="form-label">Map Name</label>
              <Input
                value={mapName}
                onChange={(e) => setMapName(e.target.value)}
                placeholder="Name your map..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Map Type</label>
              <select
                value={mapType}
                onChange={(e) => setMapType(e.target.value as WorldMapType)}
                className="form-input"
              >
                {mapTypeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Background Color</label>
                <div className="flex gap-2">
                  {['#1a1a2e', '#2d3436', '#1b4332', '#3e2723', '#1a1a1a', '#f5f0e1'].map(color => (
                    <button
                      key={color}
                      onClick={() => setBackgroundColor(color)}
                      className={cn(
                        "w-8 h-8 rounded border-2 transition-transform",
                        backgroundColor === color ? "border-white scale-110" : "border-transparent"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={gridEnabled}
                    onChange={(e) => setGridEnabled(e.target.checked)}
                    className="accent-purple-500"
                  />
                  Enable Grid
                </label>
                {gridEnabled && (
                  <select
                    value={gridSize}
                    onChange={(e) => setGridSize(Number(e.target.value))}
                    className="form-input mt-2"
                  >
                    <option value="25">Small (25px)</option>
                    <option value="50">Medium (50px)</option>
                    <option value="75">Large (75px)</option>
                    <option value="100">X-Large (100px)</option>
                  </select>
                )}
              </div>
            </div>

            <button
              onClick={handleBlankCreate}
              disabled={loading || !mapName.trim()}
              className="btn btn-primary w-full"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Map'}
            </button>
          </div>
        )}

        {/* Sketch Mode */}
        {mode === 'sketch' && (
          <div className="space-y-6">
            <button
              onClick={() => setMode('select')}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <PenTool className="w-5 h-5 text-purple-400" />
              Quick Sketch
            </h2>

            <p className="text-sm text-gray-400">
              Create a minimal canvas for improvised maps during play. Perfect for quickly sketching dungeon layouts or encounter areas.
            </p>

            <div className="form-group">
              <label className="form-label">Map Name</label>
              <Input
                value={mapName}
                onChange={(e) => setMapName(e.target.value)}
                placeholder="e.g., Improvised Dungeon, Quick Encounter..."
              />
            </div>

            <div className="form-group">
              <label className="form-label flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={gridEnabled}
                  onChange={(e) => setGridEnabled(e.target.checked)}
                  className="accent-purple-500"
                />
                Show Grid
              </label>
            </div>

            <button
              onClick={handleBlankCreate}
              disabled={loading || !mapName.trim()}
              className="btn btn-primary w-full"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Start Sketching'}
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}
