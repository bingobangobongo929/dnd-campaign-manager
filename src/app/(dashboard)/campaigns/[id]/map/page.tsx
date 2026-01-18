'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Map, Upload, Plus, Trash2, X, Loader2, ZoomIn, ZoomOut } from 'lucide-react'
import { Modal, Input } from '@/components/ui'
import { AppLayout } from '@/components/layout/app-layout'
import { useSupabase, useUser, useIsMobile } from '@/hooks'
import { CampaignMapPageMobile } from './page.mobile'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { v4 as uuidv4 } from 'uuid'
import type { Campaign, WorldMap } from '@/types/database'

export default function WorldMapPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const campaignId = params.id as string
  const isMobile = useIsMobile()

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [maps, setMaps] = useState<WorldMap[]>([])
  const [selectedMap, setSelectedMap] = useState<WorldMap | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [isNameModalOpen, setIsNameModalOpen] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [mapName, setMapName] = useState('')
  const [zoom, setZoom] = useState(1)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user && campaignId) {
      loadData()
    }
  }, [user, campaignId])

  const loadData = async () => {
    setLoading(true)

    const { data: campaignData } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (!campaignData) {
      router.push('/campaigns')
      return
    }
    setCampaign(campaignData)

    const { data: mapsData } = await supabase
      .from('world_maps')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })

    setMaps(mapsData || [])
    if (mapsData && mapsData.length > 0) {
      setSelectedMap(mapsData[0])
    }
    setLoading(false)
  }

  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    if (file.size > 20 * 1024 * 1024) {
      setError('Image must be less than 20MB')
      return
    }

    setError(null)
    setPendingFile(file)
    setMapName(file.name.replace(/\.[^/.]+$/, '')) // Default name from filename
    setIsNameModalOpen(true)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleUpload = async () => {
    if (!pendingFile || !mapName.trim()) return

    setUploading(true)
    setIsNameModalOpen(false)

    try {
      const uniqueId = uuidv4()
      const ext = pendingFile.name.split('.').pop()
      const path = `${campaignId}/${uniqueId}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('world-maps')
        .upload(path, pendingFile, {
          contentType: pendingFile.type,
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
        })
        .select()
        .single()

      if (insertError) throw insertError

      if (mapData) {
        setMaps([mapData, ...maps])
        setSelectedMap(mapData)
      }
    } catch (err) {
      console.error('Upload error:', err)
      setError('Failed to upload map')
    } finally {
      setUploading(false)
      setPendingFile(null)
      setMapName('')
    }
  }

  const handleDelete = async (map: WorldMap) => {
    if (!confirm(`Delete "${map.name || 'this map'}"? This cannot be undone.`)) return

    // Extract path from URL for deletion
    const urlParts = map.image_url.split('/world-maps/')
    if (urlParts.length > 1) {
      await supabase.storage.from('world-maps').remove([urlParts[1]])
    }

    await supabase.from('world_maps').delete().eq('id', map.id)

    const newMaps = maps.filter(m => m.id !== map.id)
    setMaps(newMaps)
    if (selectedMap?.id === map.id) {
      setSelectedMap(newMaps[0] || null)
    }
  }

  // ============ MOBILE LAYOUT ============
  if (isMobile) {
    return (
      <CampaignMapPageMobile
        campaignId={campaignId}
        maps={maps}
        selectedMap={selectedMap}
        setSelectedMap={setSelectedMap}
        loading={loading}
        uploading={uploading}
        error={error}
        zoom={zoom}
        setZoom={setZoom}
        isNameModalOpen={isNameModalOpen}
        setIsNameModalOpen={setIsNameModalOpen}
        mapName={mapName}
        setMapName={setMapName}
        fileInputRef={fileInputRef}
        handleFileSelect={handleFileSelect}
        handleFileChange={handleFileChange}
        handleUpload={handleUpload}
        handleDelete={handleDelete}
        setPendingFile={setPendingFile}
      />
    )
  }

  // ============ DESKTOP LAYOUT ============
  if (loading) {
    return (
      <AppLayout campaignId={campaignId}>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-10 h-10 border-2 border-[--arcane-purple] border-t-transparent rounded-full spinner" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout campaignId={campaignId}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {maps.length === 0 ? (
        /* Empty State */
        <div className="flex items-center justify-center h-[70vh]">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[--arcane-purple]/10 flex items-center justify-center">
              <Map className="w-10 h-10 text-[--arcane-purple]" />
            </div>
            <h2 className="text-2xl font-display font-semibold text-[--text-primary] mb-3">
              No World Maps Yet
            </h2>
            <p className="text-[--text-secondary] mb-8 leading-relaxed">
              Upload maps of your campaign world, dungeons, cities, or regions.
              High-resolution images work best for zooming and panning.
            </p>
            <button
              onClick={handleFileSelect}
              disabled={uploading}
              className="btn btn-primary btn-lg"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Upload Your First Map
                </>
              )}
            </button>
            {error && (
              <p className="mt-4 text-sm text-[--arcane-ember]">{error}</p>
            )}
          </div>
        </div>
      ) : (
        /* Map Viewer */
        <div className="h-[calc(100vh-120px)] flex flex-col">
          {/* Map Toolbar */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-[--border] bg-[--bg-surface]">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-[--text-primary]">
                {selectedMap?.name || 'World Map'}
              </h1>
              {maps.length > 1 && (
                <select
                  value={selectedMap?.id || ''}
                  onChange={(e) => setSelectedMap(maps.find(m => m.id === e.target.value) || null)}
                  className="form-input py-1.5 text-sm"
                >
                  {maps.map(m => (
                    <option key={m.id} value={m.id}>{m.name || 'Untitled Map'}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Zoom controls */}
              <div className="flex items-center gap-1 mr-2">
                <button
                  onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
                  className="btn-ghost btn-icon w-8 h-8"
                  title="Zoom out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-sm text-[--text-secondary] w-12 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom(z => Math.min(3, z + 0.25))}
                  className="btn-ghost btn-icon w-8 h-8"
                  title="Zoom in"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={handleFileSelect}
                disabled={uploading}
                className="btn btn-secondary btn-sm"
              >
                <Plus className="w-4 h-4" />
                Add Map
              </button>
              {selectedMap && (
                <button
                  onClick={() => handleDelete(selectedMap)}
                  className="btn-ghost btn-icon w-8 h-8 text-[--arcane-ember]"
                  title="Delete map"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Map Display */}
          <div className="flex-1 overflow-auto bg-[--bg-base] p-4 flex items-center justify-center">
            {selectedMap && (
              <div
                className="flex items-center justify-center"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.2s ease',
                }}
              >
                <img
                  src={selectedMap.image_url}
                  alt={selectedMap.name || 'World map'}
                  className="rounded-lg shadow-2xl"
                  style={{
                    maxWidth: '100%',
                    maxHeight: 'calc(100vh - 200px)',
                    objectFit: 'contain',
                  }}
                />
              </div>
            )}
          </div>

          {/* Map Thumbnails */}
          {maps.length > 1 && (
            <div className="px-6 py-3 border-t border-[--border] bg-[--bg-surface]">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {maps.map(map => (
                  <button
                    key={map.id}
                    onClick={() => setSelectedMap(map)}
                    className={cn(
                      'relative w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all',
                      selectedMap?.id === map.id
                        ? 'border-[--arcane-purple] ring-2 ring-[--arcane-purple]/30'
                        : 'border-[--border] hover:border-[--text-tertiary]'
                    )}
                  >
                    <Image
                      src={map.image_url}
                      alt={map.name || 'Map thumbnail'}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Name Modal */}
      <Modal
        isOpen={isNameModalOpen}
        onClose={() => {
          setIsNameModalOpen(false)
          setPendingFile(null)
          setMapName('')
        }}
        title="Name Your Map"
        description="Give this map a descriptive name"
      >
        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label">Map Name</label>
            <Input
              value={mapName}
              onChange={(e) => setMapName(e.target.value)}
              placeholder="e.g., Sword Coast, Dungeon Level 1..."
              autoFocus
              className="form-input"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              className="btn btn-secondary"
              onClick={() => {
                setIsNameModalOpen(false)
                setPendingFile(null)
                setMapName('')
              }}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleUpload}
              disabled={!mapName.trim()}
            >
              Upload Map
            </button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}
