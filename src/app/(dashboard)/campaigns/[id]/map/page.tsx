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
} from 'lucide-react'
import { Modal, AccessDeniedPage } from '@/components/ui'
import { AppLayout, CampaignPageHeader } from '@/components/layout'
import {
  PartyModal,
  TagManager,
  FactionManager,
  RelationshipManager,
} from '@/components/campaign'
import { ResizeToolbar } from '@/components/canvas'
import { UnifiedShareModal } from '@/components/share/UnifiedShareModal'
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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [filterType, setFilterType] = useState<MapType | 'all'>('all')
  const [error, setError] = useState<string | null>(null)

  // Modal state for burger menu
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [showLabelsModal, setShowLabelsModal] = useState(false)
  const [showFactionsModal, setShowFactionsModal] = useState(false)
  const [showRelationshipsModal, setShowRelationshipsModal] = useState(false)
  const [showResizeModal, setShowResizeModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)

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
      <AppLayout campaignId={campaignId} hideHeader>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-10 h-10 border-2 border-[--arcane-purple] border-t-transparent rounded-full spinner" />
        </div>
      </AppLayout>
    )
  }

  // Permission check
  if (!isMember || !can.viewMaps) {
    return (
      <AppLayout campaignId={campaignId} hideHeader>
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
      <AppLayout campaignId={campaignId} hideHeader fullBleed>
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
    <AppLayout campaignId={campaignId} hideHeader>
      {/* Page Header with Burger Menu */}
      <CampaignPageHeader
        campaign={campaign}
        campaignId={campaignId}
        title="Maps"
        isOwner={isOwner}
        isDm={isDm}
        onOpenMembers={() => setShowMembersModal(true)}
        onOpenLabels={() => setShowLabelsModal(true)}
        onOpenFactions={() => setShowFactionsModal(true)}
        onOpenRelationships={() => setShowRelationshipsModal(true)}
        onOpenResize={() => setShowResizeModal(true)}
        onOpenShare={() => setShowShareModal(true)}
        actions={can.addMap && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Map</span>
          </button>
        )}
      />

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
          {/* Header with filter */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="page-title">Maps</h1>
              <p className="text-sm text-[--text-tertiary]">{maps.length} map{maps.length !== 1 ? 's' : ''}</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Filter dropdown */}
              {existingTypes.length > 1 && (
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[--text-tertiary]" />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as MapType | 'all')}
                    className="form-input py-1.5 text-sm min-w-[140px]"
                  >
                    <option value="all">All Types</option>
                    {existingTypes.map(type => {
                      const info = MAP_TYPES[type as MapType] || MAP_TYPES.world
                      return (
                        <option key={type} value={type}>
                          {info.icon} {info.label}
                        </option>
                      )
                    })}
                  </select>
                </div>
              )}

              {can.addMap && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="btn btn-primary"
                >
                  <Plus className="w-4 h-4" />
                  Add Map
                </button>
              )}
            </div>
          </div>

          {/* Map Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredMaps.map((map) => {
              const typeInfo = getMapTypeInfo(map)
              const count = pinCounts[map.id] || 0

              return (
                <button
                  key={map.id}
                  onClick={() => setSelectedMap(map)}
                  className="group relative bg-[--bg-elevated] rounded-xl border border-[--border] overflow-hidden text-left hover:border-[--arcane-purple]/50 hover:shadow-lg hover:shadow-purple-500/5 transition-all"
                >
                  {/* Thumbnail */}
                  <div className="aspect-[4/3] relative bg-[--bg-surface]">
                    {map.image_url ? (
                      <Image
                        src={map.image_url}
                        alt={map.name || 'Map'}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Map className="w-12 h-12 text-[--text-tertiary]" />
                      </div>
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <span className="text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        View Map
                      </span>
                    </div>

                    {/* Delete button (DM only) */}
                    {can.deleteMap && (
                      <button
                        onClick={(e) => handleDelete(map, e)}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:bg-[--arcane-ember] transition-all"
                        title="Delete map"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Card info */}
                  <div className="p-3">
                    <h3 className="font-medium text-[--text-primary] truncate">
                      {map.name || 'Untitled Map'}
                    </h3>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-[--text-tertiary] flex items-center gap-1">
                        <span>{typeInfo.icon}</span>
                        <span>{typeInfo.label}</span>
                      </span>
                      {count > 0 && (
                        <span className="text-xs text-[--text-tertiary] flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}

            {/* Add Map Card */}
            {can.addMap && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="aspect-[4/3] flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[--border] hover:border-[--arcane-purple]/50 hover:bg-[--bg-elevated] transition-colors group"
              >
                <div className="w-12 h-12 rounded-full bg-[--bg-elevated] group-hover:bg-[--arcane-purple]/10 flex items-center justify-center mb-3 transition-colors">
                  <Plus className="w-6 h-6 text-[--text-tertiary] group-hover:text-[--arcane-purple]" />
                </div>
                <span className="text-sm text-[--text-secondary] group-hover:text-[--text-primary]">
                  Add Map
                </span>
              </button>
            )}
          </div>
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

      {/* Burger Menu Modals */}
      <PartyModal
        campaignId={campaignId}
        characters={[]}
        isOpen={showMembersModal}
        onClose={() => setShowMembersModal(false)}
      />

      {showLabelsModal && (
        <TagManager
          campaignId={campaignId}
          isOpen={showLabelsModal}
          onClose={() => setShowLabelsModal(false)}
        />
      )}

      {showFactionsModal && (
        <FactionManager
          campaignId={campaignId}
          characters={[]}
          isOpen={showFactionsModal}
          onClose={() => setShowFactionsModal(false)}
        />
      )}

      {showRelationshipsModal && (
        <RelationshipManager
          campaignId={campaignId}
          isOpen={showRelationshipsModal}
          onClose={() => setShowRelationshipsModal(false)}
        />
      )}

      {showResizeModal && (
        <ResizeToolbar
          onClose={() => setShowResizeModal(false)}
          characters={[]}
          onResize={async () => {}}
        />
      )}

      {campaign && (
        <UnifiedShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          contentType="campaign"
          contentId={campaignId}
          contentName={campaign.name}
          contentMode="active"
        />
      )}
    </AppLayout>
  )
}
