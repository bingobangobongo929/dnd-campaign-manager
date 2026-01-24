'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Map, Trash2, Loader2, Pencil, Eye, ChevronLeft, Plus, Settings, Layers } from 'lucide-react'
import { Modal, AccessDeniedPage } from '@/components/ui'
import { AppLayout } from '@/components/layout/app-layout'
import { InteractiveMap, MapEditor, CreateMapModal } from '@/components/maps'
import { useSupabase, useUser, useIsMobile, usePermissions } from '@/hooks'
import { CampaignMapPageMobile } from './page.mobile'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import type { Campaign, WorldMap, MapPin } from '@/types/database'

type ViewMode = 'view' | 'edit'

export default function WorldMapPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()

  const campaignId = params.id as string
  const isMobile = useIsMobile()

  // Permissions
  const { can, loading: permissionsLoading, isMember, isDm } = usePermissions(campaignId)

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [maps, setMaps] = useState<WorldMap[]>([])
  const [selectedMap, setSelectedMap] = useState<WorldMap | null>(null)
  const [pins, setPins] = useState<MapPin[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('view')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user && campaignId) {
      loadData()
    }
  }, [user, campaignId])

  // Load pins and drawings when selected map changes
  useEffect(() => {
    if (selectedMap) {
      loadMapData(selectedMap.id)
    }
  }, [selectedMap?.id])

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

  const loadMapData = async (mapId: string) => {
    // Load pins
    const { data: pinsData } = await supabase
      .from('map_pins')
      .select('*')
      .eq('map_id', mapId)
      .order('created_at', { ascending: true })

    setPins(pinsData || [])
  }

  const handleMapCreated = async (mapId: string) => {
    // Fetch the newly created map
    const { data: newMap } = await supabase
      .from('world_maps')
      .select('*')
      .eq('id', mapId)
      .single()

    if (newMap) {
      setMaps([newMap, ...maps])
      setSelectedMap(newMap)
    }
    setIsCreateModalOpen(false)
    // Start in edit mode for new maps
    if (isDm) {
      setViewMode('edit')
    }
  }

  const handleDelete = async (map: WorldMap) => {
    if (!confirm(`Delete "${map.name || 'this map'}"? This cannot be undone.`)) return

    // Extract path from URL for deletion
    if (map.image_url) {
      const urlParts = map.image_url.split('/world-maps/')
      if (urlParts.length > 1) {
        await supabase.storage.from('world-maps').remove([urlParts[1]])
      }
    }

    await supabase.from('world_maps').delete().eq('id', map.id)

    const newMaps = maps.filter(m => m.id !== map.id)
    setMaps(newMaps)
    if (selectedMap?.id === map.id) {
      setSelectedMap(newMaps[0] || null)
      setViewMode('view')
    }
  }

  const handleMapSettingsUpdate = async (settings: Partial<WorldMap>) => {
    if (!selectedMap) return

    const { data, error } = await supabase
      .from('world_maps')
      .update(settings)
      .eq('id', selectedMap.id)
      .select()
      .single()

    if (!error && data) {
      setSelectedMap(data)
      setMaps(maps.map(m => m.id === data.id ? data : m))
    }
  }

  const handleNavigateToMap = (mapId: string) => {
    const targetMap = maps.find(m => m.id === mapId)
    if (targetMap) {
      setSelectedMap(targetMap)
      setViewMode('view')
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
        uploading={false}
        error={error}
        isNameModalOpen={isCreateModalOpen}
        setIsNameModalOpen={setIsCreateModalOpen}
        mapName=""
        setMapName={() => {}}
        fileInputRef={{ current: null }}
        handleFileSelect={() => setIsCreateModalOpen(true)}
        handleFileChange={() => {}}
        handleUpload={() => {}}
        handleDelete={handleDelete}
        setPendingFile={() => {}}
      />
    )
  }

  // ============ DESKTOP LAYOUT ============
  if (loading || permissionsLoading) {
    return (
      <AppLayout campaignId={campaignId}>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-10 h-10 border-2 border-[--arcane-purple] border-t-transparent rounded-full spinner" />
        </div>
      </AppLayout>
    )
  }

  // Permission check - must be a member with view permission
  if (!isMember || !can.viewMaps) {
    return (
      <AppLayout campaignId={campaignId}>
        <AccessDeniedPage
          campaignId={campaignId}
          message="You don't have permission to view maps for this campaign."
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout campaignId={campaignId}>
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
              Create interactive maps for your campaign world, dungeons, cities, or regions.
              Upload existing maps, conjure new ones with AI, or build from scratch.
            </p>
            {can.addMap && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="btn btn-primary btn-lg"
              >
                <Plus className="w-5 h-5" />
                Create Your First Map
              </button>
            )}
            {error && (
              <p className="mt-4 text-sm text-[--arcane-ember]">{error}</p>
            )}
          </div>
        </div>
      ) : (
        /* Map Viewer/Editor */
        <div className="h-[calc(100vh-120px)] flex flex-col">
          {/* Map Toolbar */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-[--border] bg-[--bg-surface]">
            <div className="flex items-center gap-3">
              {/* Back button when in nested map */}
              {selectedMap?.parent_map_id && (
                <button
                  onClick={() => handleNavigateToMap(selectedMap.parent_map_id!)}
                  className="btn-ghost btn-icon w-8 h-8"
                  title="Back to parent map"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}

              <h1 className="text-lg font-semibold text-[--text-primary]">
                {selectedMap?.name || 'World Map'}
              </h1>

              {selectedMap?.map_type && selectedMap.map_type !== 'world' && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-[--arcane-purple]/10 text-[--arcane-purple] capitalize">
                  {selectedMap.map_type}
                </span>
              )}

              {maps.length > 1 && (
                <select
                  value={selectedMap?.id || ''}
                  onChange={(e) => {
                    setSelectedMap(maps.find(m => m.id === e.target.value) || null)
                    setViewMode('view')
                  }}
                  className="form-input py-1.5 text-sm"
                >
                  {maps.map(m => (
                    <option key={m.id} value={m.id}>{m.name || 'Untitled Map'}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* View/Edit Toggle - Only for DMs */}
              {isDm && selectedMap && (
                <div className="flex items-center rounded-lg border border-[--border] overflow-hidden">
                  <button
                    onClick={() => setViewMode('view')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors',
                      viewMode === 'view'
                        ? 'bg-[--arcane-purple] text-white'
                        : 'text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-elevated]'
                    )}
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button
                    onClick={() => setViewMode('edit')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors',
                      viewMode === 'edit'
                        ? 'bg-[--arcane-purple] text-white'
                        : 'text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-elevated]'
                    )}
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                </div>
              )}

              {/* Map Settings */}
              {isDm && selectedMap && (
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="btn-ghost btn-icon w-8 h-8"
                  title="Map settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}

              {can.addMap && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="btn btn-secondary btn-sm"
                >
                  <Plus className="w-4 h-4" />
                  New Map
                </button>
              )}

              {can.deleteMap && selectedMap && (
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
          <div className="flex-1 overflow-hidden bg-[--bg-base]">
            {selectedMap && viewMode === 'view' && (
              <InteractiveMap
                campaignId={campaignId}
                mapId={selectedMap.id}
                imageUrl={selectedMap.image_url}
                isDm={isDm}
                className="h-full"
                onPinClick={(pin) => {
                  if (pin.linked_map_id) {
                    handleNavigateToMap(pin.linked_map_id)
                  }
                }}
              />
            )}

            {selectedMap && viewMode === 'edit' && (
              <MapEditor
                campaignId={campaignId}
                map={selectedMap}
                isDm={isDm}
                onPinClick={(pin) => {
                  if (pin.linked_map_id) {
                    handleNavigateToMap(pin.linked_map_id)
                  }
                }}
                onMapLinkClick={handleNavigateToMap}
                onSave={(updates) => {
                  handleMapSettingsUpdate(updates)
                  loadMapData(selectedMap.id)
                }}
                className="h-full"
              />
            )}
          </div>

          {/* Map Thumbnails */}
          {maps.length > 1 && viewMode === 'view' && (
            <div className="px-6 py-3 border-t border-[--border] bg-[--bg-surface]">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {maps.map(map => (
                  <button
                    key={map.id}
                    onClick={() => {
                      setSelectedMap(map)
                      setViewMode('view')
                    }}
                    className={cn(
                      'relative w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all',
                      selectedMap?.id === map.id
                        ? 'border-[--arcane-purple] ring-2 ring-[--arcane-purple]/30'
                        : 'border-[--border] hover:border-[--text-tertiary]'
                    )}
                  >
                    {map.image_url ? (
                      <Image
                        src={map.image_url}
                        alt={map.name || 'Map thumbnail'}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[--bg-elevated]">
                        <Map className="w-6 h-6 text-[--text-tertiary]" />
                      </div>
                    )}
                    {map.map_type && map.map_type !== 'world' && (
                      <span className="absolute bottom-0.5 right-0.5 px-1 py-0.5 text-[9px] rounded bg-black/50 text-white capitalize">
                        {map.map_type}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Map Modal */}
      <CreateMapModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        campaignId={campaignId}
        onMapCreated={handleMapCreated}
        supabase={supabase}
      />

      {/* Map Settings Modal */}
      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Map Settings"
        description="Configure map display options"
      >
        {selectedMap && (
          <div className="space-y-4">
            {/* Map Name */}
            <div className="form-group">
              <label className="form-label">Map Name</label>
              <input
                type="text"
                value={selectedMap.name || ''}
                onChange={(e) => handleMapSettingsUpdate({ name: e.target.value })}
                className="form-input"
                placeholder="Enter map name"
              />
            </div>

            {/* Map Type */}
            <div className="form-group">
              <label className="form-label">Map Type</label>
              <select
                value={selectedMap.map_type || 'world'}
                onChange={(e) => handleMapSettingsUpdate({ map_type: e.target.value as WorldMap['map_type'] })}
                className="form-input"
              >
                <option value="world">World</option>
                <option value="region">Region</option>
                <option value="city">City</option>
                <option value="dungeon">Dungeon</option>
                <option value="building">Building</option>
                <option value="encounter">Encounter</option>
                <option value="sketch">Sketch</option>
              </select>
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                value={selectedMap.description || ''}
                onChange={(e) => handleMapSettingsUpdate({ description: e.target.value })}
                className="form-input min-h-[80px]"
                placeholder="Optional description..."
              />
            </div>

            {/* Grid Settings */}
            <div className="space-y-3">
              <label className="form-label flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Grid Settings
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedMap.grid_enabled || false}
                  onChange={(e) => handleMapSettingsUpdate({ grid_enabled: e.target.checked })}
                  className="rounded border-[--border]"
                />
                <span className="text-sm text-[--text-primary]">Show grid overlay</span>
              </label>

              {selectedMap.grid_enabled && (
                <div className="pl-6 space-y-3">
                  <div className="form-group">
                    <label className="form-label text-sm">Grid Size (px)</label>
                    <input
                      type="number"
                      value={selectedMap.grid_size || 50}
                      onChange={(e) => handleMapSettingsUpdate({ grid_size: parseInt(e.target.value) || 50 })}
                      className="form-input"
                      min={10}
                      max={200}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label text-sm">Grid Color</label>
                    <input
                      type="text"
                      value={selectedMap.grid_color || 'rgba(255,255,255,0.1)'}
                      onChange={(e) => handleMapSettingsUpdate({ grid_color: e.target.value })}
                      className="form-input"
                      placeholder="rgba(255,255,255,0.1)"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Scale Settings */}
            <div className="space-y-3">
              <label className="form-label">Scale (for distance measurement)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={selectedMap.scale_value || ''}
                  onChange={(e) => handleMapSettingsUpdate({ scale_value: parseFloat(e.target.value) || null })}
                  className="form-input flex-1"
                  placeholder="e.g., 10"
                />
                <select
                  value={selectedMap.scale_unit || 'miles'}
                  onChange={(e) => handleMapSettingsUpdate({ scale_unit: e.target.value as 'miles' | 'km' | 'feet' | 'meters' })}
                  className="form-input w-28"
                >
                  <option value="miles">miles</option>
                  <option value="km">km</option>
                  <option value="feet">feet</option>
                  <option value="meters">meters</option>
                </select>
              </div>
              <p className="text-xs text-[--text-tertiary]">
                1 inch on the map = {selectedMap.scale_value || '?'} {selectedMap.scale_unit || 'miles'}
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[--border]">
              <button
                className="btn btn-secondary"
                onClick={() => setIsSettingsOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  )
}
