'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Map,
  Plus,
  Trash2,
  ArrowLeft,
  MapPin,
  Filter,
  Eye,
  Pencil,
  Loader2,
} from 'lucide-react'
import { Modal, AccessDeniedPage } from '@/components/ui'
import { AppLayout } from '@/components/layout'
import { MapViewer, CreateMapModal } from '@/components/maps'
import { useSupabase, useUser, useIsMobile, usePermissions } from '@/hooks'
import { CampaignMapPageMobile } from './page.mobile'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import type { Campaign, WorldMap as WorldMapBase } from '@/types/database'

// Extended WorldMap type with custom type fields (added in migration 090)
interface WorldMap extends WorldMapBase {
  custom_type?: string | null
  custom_emoji?: string | null
}

// Map type configuration with icons
const MAP_TYPES = {
  world: { icon: '🌍', label: 'World' },
  region: { icon: '🗺️', label: 'Region' },
  settlement: { icon: '🏰', label: 'Settlement' },
  fortress: { icon: '🏯', label: 'Fortress' },
  dungeon: { icon: '⚔️', label: 'Dungeon' },
  interior: { icon: '🏠', label: 'Interior' },
  wilderness: { icon: '⛺', label: 'Wilderness' },
  vehicle: { icon: '⛵', label: 'Vehicle' },
  plane: { icon: '✨', label: 'Plane' },
  custom: { icon: '✏️', label: 'Custom' },
} as const

type MapType = keyof typeof MAP_TYPES

export default function WorldMapPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()

  const campaignId = params.id as string
  const isMobile = useIsMobile()

  // Permissions
  const { can, loading: permissionsLoading, isMember, isOwner, isDm } = usePermissions(campaignId)

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [maps, setMaps] = useState<WorldMap[]>([])
  const [pinCounts, setPinCounts] = useState<Record<string, number>>({})
  const [selectedMap, setSelectedMap] = useState<WorldMap | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [filterType, setFilterType] = useState<MapType | 'all'>('all')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user && campaignId) {
      loadData()
    }
  }, [user, campaignId])

  const loadData = async () => {
    // Only show loading spinner on initial load, not refetches
    if (!hasLoadedOnce) {
      setLoading(true)
    }

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

    // Load maps
    const { data: mapsData } = await supabase
      .from('world_maps')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })

    setMaps(mapsData || [])

    // Load pin counts for each map
    if (mapsData && mapsData.length > 0) {
      const mapIds = mapsData.map(m => m.id)
      const { data: pinsData } = await supabase
        .from('map_pins')
        .select('map_id')
        .in('map_id', mapIds)

      const counts: Record<string, number> = {}
      pinsData?.forEach(pin => {
        counts[pin.map_id] = (counts[pin.map_id] || 0) + 1
      })
      setPinCounts(counts)
    }

    setLoading(false)
    setHasLoadedOnce(true)
  }

  const handleMapCreated = async (mapId: string) => {
    const { data: newMap } = await supabase
      .from('world_maps')
      .select('*')
      .eq('id', mapId)
      .single()

    if (newMap) {
      setMaps([newMap, ...maps])
      setSelectedMap(newMap) // Open the new map in viewer
    }
    setIsCreateModalOpen(false)
  }

  const handleDelete = async (map: WorldMap, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!confirm(`Delete "${map.name || 'this map'}"? This cannot be undone.`)) return

    if (map.image_url) {
      const urlParts = map.image_url.split('/world-maps/')
      if (urlParts.length > 1) {
        await supabase.storage.from('world-maps').remove([urlParts[1]])
      }
    }

    await supabase.from('world_maps').delete().eq('id', map.id)

    setMaps(maps.filter(m => m.id !== map.id))
    if (selectedMap?.id === map.id) {
      setSelectedMap(null)
    }
  }

  const handleNavigateToMap = (mapId: string) => {
    const targetMap = maps.find(m => m.id === mapId)
    if (targetMap) {
      setSelectedMap(targetMap)
    }
  }

  // Filter maps
  const filteredMaps = filterType === 'all'
    ? maps
    : maps.filter(m => m.map_type === filterType || (filterType === 'custom' && m.custom_type))

  // Get unique types that exist in the campaign
  const existingTypes = [...new Set(maps.map(m => m.map_type || 'world'))]

  const getMapTypeInfo = (map: WorldMap) => {
    if (map.custom_type && map.custom_emoji) {
      return { icon: map.custom_emoji, label: map.custom_type }
    }
    const mapType = (map.map_type || 'world') as MapType
    return MAP_TYPES[mapType] || MAP_TYPES.world
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
          <Loader2 className="w-10 h-10 animate-spin text-[--arcane-purple]" />
        </div>
      </AppLayout>
    )
  }

  // Permission check
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

  // ============ LIGHTBOX VIEW (when a map is selected) ============
  if (selectedMap) {
    return (
      <AppLayout campaignId={campaignId} fullBleed>
        <MapViewer
          campaignId={campaignId}
          map={selectedMap}
          maps={maps}
          isDm={isDm}
          canEditPins={can.editPin}
          canDelete={can.deleteMap}
          onBack={() => setSelectedMap(null)}
          onNavigateToMap={handleNavigateToMap}
          onDelete={() => handleDelete(selectedMap)}
          onUpdate={(updates) => {
            setMaps(maps.map(m => m.id === selectedMap.id ? { ...m, ...updates } : m))
            setSelectedMap({ ...selectedMap, ...updates })
          }}
        />
      </AppLayout>
    )
  }

  // ============ GALLERY VIEW (default) ============
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
              No Maps Yet
            </h2>
            <p className="text-[--text-secondary] mb-4 leading-relaxed">
              Upload world maps, city maps, dungeons, or any other maps for your campaign.
              Add pins to mark important locations and link them to your campaign content.
            </p>
            <p className="text-xs text-purple-400/80 mb-6 max-w-sm mx-auto italic">
              Create maps with Inkarnate, Dungeondraft, or hand-draw and scan them.
            </p>
            {can.addMap && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="btn btn-primary btn-lg"
              >
                <Plus className="w-5 h-5" />
                Add Your First Map
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Gallery Grid */
        <div className="p-6">
          {/* Filter bar - only show if multiple types exist */}
          {existingTypes.length > 1 && (
            <div className="flex items-center gap-2 mb-6">
              <Filter className="w-4 h-4 text-[--text-tertiary]" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as MapType | 'all')}
                className="form-input py-1.5 text-sm min-w-[140px]"
              >
                <option value="all">All Types ({maps.length})</option>
                {existingTypes.map(type => {
                  const info = MAP_TYPES[type as MapType] || MAP_TYPES.world
                  const count = maps.filter(m => m.map_type === type).length
                  return (
                    <option key={type} value={type}>
                      {info.icon} {info.label} ({count})
                    </option>
                  )
                })}
              </select>
            </div>
          )}

          {/* Map Cards - Dynamic sizing based on count */}
          {(() => {
            // Total items including the "Add Map" card
            const totalItems = filteredMaps.length + (can.addMap ? 1 : 0)

            // Dynamic card sizing based on count
            // 1-2 items: Large cards (max 2 per row)
            // 3-4 items: Medium cards (max 3 per row)
            // 5+ items: Small cards (4-5 per row)
            const getCardClass = () => {
              if (totalItems <= 2) {
                return "w-full sm:w-[calc(50%-1rem)] max-w-[420px]"
              } else if (totalItems <= 4) {
                return "w-full sm:w-[calc(50%-0.75rem)] md:w-[calc(33.333%-1rem)] max-w-[340px]"
              } else {
                return "w-full sm:w-[calc(50%-0.5rem)] md:w-[calc(33.333%-0.75rem)] lg:w-[calc(25%-0.75rem)] xl:w-[calc(20%-0.8rem)] max-w-[280px]"
              }
            }

            const cardClass = getCardClass()
            const gapClass = totalItems <= 2 ? "gap-6" : totalItems <= 4 ? "gap-5" : "gap-4"

            return (
              <div className={cn("flex flex-wrap justify-center", gapClass)}>
                {filteredMaps.map((map) => {
                  const typeInfo = getMapTypeInfo(map)
                  const count = pinCounts[map.id] || 0

                  return (
                    <button
                      key={map.id}
                      onClick={() => setSelectedMap(map)}
                      className={cn(
                        "group relative rounded-xl overflow-hidden text-left hover:ring-2 hover:ring-[--arcane-purple]/50 transition-all",
                        cardClass
                      )}
                    >
                      {/* Thumbnail */}
                      <div className="aspect-[4/3] relative bg-[--bg-elevated]">
                        {map.image_url ? (
                          <Image
                            src={map.image_url}
                            alt={map.name || 'Map'}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[--bg-elevated] to-[--bg-surface]">
                            <Map className="w-12 h-12 text-[--text-tertiary]/50" />
                          </div>
                        )}

                        {/* Gradient overlay for text readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-[--arcane-purple]/0 group-hover:bg-[--arcane-purple]/10 transition-colors" />

                        {/* Delete button (DM only) */}
                        {can.deleteMap && (
                          <button
                            onClick={(e) => handleDelete(map, e)}
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white/70 opacity-0 group-hover:opacity-100 hover:bg-[--arcane-ember] hover:text-white transition-all"
                            title="Delete map"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Card info - overlaid on image */}
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h3 className={cn(
                            "font-medium text-white truncate text-shadow-sm",
                            totalItems <= 2 ? "text-lg" : "text-base"
                          )}>
                            {map.name || 'Untitled Map'}
                          </h3>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sm text-white/70 flex items-center gap-1.5">
                              <span>{typeInfo.icon}</span>
                              <span>{typeInfo.label}</span>
                            </span>
                            {count > 0 && (
                              <span className="text-sm text-white/70 flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {count}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}

                {/* Add Map Card */}
                {can.addMap && (
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className={cn(
                      "aspect-[4/3] flex flex-col items-center justify-center rounded-xl border border-dashed border-[--border-subtle] hover:border-[--arcane-purple]/40 hover:bg-[--arcane-purple]/5 transition-colors group",
                      cardClass
                    )}
                  >
                    <div className={cn(
                      "rounded-full bg-[--bg-elevated] group-hover:bg-[--arcane-purple]/10 flex items-center justify-center mb-3 transition-colors",
                      totalItems <= 2 ? "w-14 h-14" : "w-10 h-10"
                    )}>
                      <Plus className={cn(
                        "text-[--text-tertiary] group-hover:text-[--arcane-purple]",
                        totalItems <= 2 ? "w-7 h-7" : "w-5 h-5"
                      )} />
                    </div>
                    <span className={cn(
                      "text-[--text-tertiary] group-hover:text-[--text-secondary]",
                      totalItems <= 2 ? "text-base" : "text-sm"
                    )}>
                      Add Map
                    </span>
                  </button>
                )}
              </div>
            )
          })()}
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
    </AppLayout>
  )
}
