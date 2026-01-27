'use client'

import { useState, useRef } from 'react'
import { Upload, Loader2, X, ImageIcon } from 'lucide-react'
import { Modal, Input } from '@/components/ui'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { v4 as uuidv4 } from 'uuid'
import Image from 'next/image'

// Map types with emojis
const MAP_TYPES = [
  { value: 'world', icon: '🌍', label: 'World' },
  { value: 'region', icon: '🗺️', label: 'Region' },
  { value: 'settlement', icon: '🏰', label: 'Settlement' },
  { value: 'fortress', icon: '🏯', label: 'Fortress' },
  { value: 'dungeon', icon: '⚔️', label: 'Dungeon' },
  { value: 'interior', icon: '🏠', label: 'Interior' },
  { value: 'wilderness', icon: '⛺', label: 'Wilderness' },
  { value: 'vehicle', icon: '⛵', label: 'Vehicle' },
  { value: 'plane', icon: '✨', label: 'Plane' },
] as const

type MapType = typeof MAP_TYPES[number]['value']

interface CreateMapModalProps {
  isOpen: boolean
  onClose: () => void
  campaignId: string
  onMapCreated: (mapId: string) => void
  supabase: any
}

export function CreateMapModal({
  isOpen,
  onClose,
  campaignId,
  onMapCreated,
  supabase,
}: CreateMapModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)

  // Form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [mapName, setMapName] = useState('')
  const [mapType, setMapType] = useState<MapType | 'custom'>('world')
  const [customType, setCustomType] = useState('')
  const [customEmoji, setCustomEmoji] = useState('📍')

  const handleClose = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setMapName('')
    setMapType('world')
    setCustomType('')
    setCustomEmoji('📍')
    onClose()
  }

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

    // Auto-fill name from filename
    if (!mapName) {
      setMapName(file.name.replace(/\.[^/.]+$/, ''))
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error('Image must be less than 20MB')
        return
      }
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      if (!mapName) {
        setMapName(file.name.replace(/\.[^/.]+$/, ''))
      }
    }
  }

  const handleCreate = async () => {
    if (!selectedFile) {
      toast.error('Please select an image')
      return
    }
    if (!mapName.trim()) {
      toast.error('Please enter a map name')
      return
    }

    setLoading(true)
    try {
      // Upload image
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

      // Create map record
      const mapData: Record<string, any> = {
        campaign_id: campaignId,
        image_url: urlData.publicUrl,
        name: mapName.trim(),
        map_type: mapType === 'custom' ? 'custom' : mapType,
      }

      // Add custom type fields if using custom
      if (mapType === 'custom') {
        mapData.custom_type = customType.trim() || 'Custom'
        mapData.custom_emoji = customEmoji || '📍'
      }

      const { data, error: insertError } = await supabase
        .from('world_maps')
        .insert(mapData)
        .select()
        .single()

      if (insertError) throw insertError

      toast.success('Map created!')
      onMapCreated(data.id)
      handleClose()
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to create map')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Map"
      size="lg"
    >
      <div className="space-y-5">
        {/* Image Upload Area */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className={cn(
            "relative border-2 border-dashed rounded-xl transition-colors cursor-pointer",
            previewUrl
              ? "border-[--arcane-purple]/50"
              : "border-[--border] hover:border-[--arcane-purple]/50"
          )}
        >
          {previewUrl ? (
            <div className="relative aspect-[16/10] rounded-lg overflow-hidden">
              <Image
                src={previewUrl}
                alt="Map preview"
                fill
                className="object-contain bg-black/20"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedFile(null)
                  setPreviewUrl(null)
                }}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-16 h-16 rounded-full bg-[--bg-elevated] flex items-center justify-center mb-4">
                <ImageIcon className="w-8 h-8 text-[--text-tertiary]" />
              </div>
              <p className="text-[--text-primary] font-medium mb-1">
                Drop your map image here
              </p>
              <p className="text-sm text-[--text-tertiary] mb-3">
                or click to browse
              </p>
              <p className="text-xs text-[--text-tertiary]">
                PNG, JPG up to 20MB
              </p>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Map Name */}
        <div className="form-group">
          <label className="form-label">Name *</label>
          <Input
            value={mapName}
            onChange={(e) => setMapName(e.target.value)}
            placeholder="e.g., Sword Coast"
          />
        </div>

        {/* Map Type */}
        <div className="form-group">
          <label className="form-label">Type</label>
          <div className="grid grid-cols-5 gap-2">
            {MAP_TYPES.map(type => (
              <button
                key={type.value}
                onClick={() => setMapType(type.value)}
                className="flex flex-col items-center gap-1 p-2.5 rounded-lg transition-all"
                style={{
                  backgroundColor: mapType === type.value ? 'rgba(147, 51, 234, 0.3)' : '#1a1a24',
                  boxShadow: mapType === type.value ? '0 0 0 2px #9333ea, inset 0 0 0 1px rgba(147, 51, 234, 0.5)' : 'none',
                }}
              >
                <span className="text-xl">{type.icon}</span>
                <span className={cn("text-xs", mapType === type.value ? "text-white" : "text-gray-400")}>{type.label}</span>
              </button>
            ))}
            {/* Custom option */}
            <button
              onClick={() => setMapType('custom')}
              className="flex flex-col items-center gap-1 p-2.5 rounded-lg transition-all"
              style={{
                backgroundColor: mapType === 'custom' ? 'rgba(147, 51, 234, 0.3)' : '#1a1a24',
                boxShadow: mapType === 'custom' ? '0 0 0 2px #9333ea, inset 0 0 0 1px rgba(147, 51, 234, 0.5)' : 'none',
              }}
            >
              <span className="text-xl">✏️</span>
              <span className={cn("text-xs", mapType === 'custom' ? "text-white" : "text-gray-400")}>Custom</span>
            </button>
          </div>
        </div>

        {/* Custom Type Fields */}
        {mapType === 'custom' && (
          <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-[--bg-elevated]">
            <div className="form-group">
              <label className="form-label text-sm">Custom Label</label>
              <Input
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                placeholder="e.g., Laboratory"
              />
            </div>
            <div className="form-group">
              <label className="form-label text-sm">Emoji</label>
              <Input
                value={customEmoji}
                onChange={(e) => setCustomEmoji(e.target.value)}
                placeholder="📍"
                maxLength={2}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleClose}
            disabled={loading}
            className="btn btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !selectedFile || !mapName.trim()}
            className="btn btn-primary flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Create Map
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}
