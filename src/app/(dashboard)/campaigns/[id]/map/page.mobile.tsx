'use client'

import { Map, Upload, Plus, Trash2, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui'
import { AppLayout } from '@/components/layout/app-layout'
import { MobileLayout, MobileBottomSheet } from '@/components/mobile'
import { InteractiveMap } from '@/components/maps'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import type { WorldMap } from '@/types/database'

export interface CampaignMapPageMobileProps {
  campaignId: string
  maps: WorldMap[]
  selectedMap: WorldMap | null
  setSelectedMap: (map: WorldMap | null) => void
  loading: boolean
  uploading: boolean
  error: string | null
  isNameModalOpen: boolean
  setIsNameModalOpen: (open: boolean) => void
  mapName: string
  setMapName: (name: string) => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
  handleFileSelect: () => void
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleUpload: () => void
  handleDelete: (map: WorldMap) => void
  setPendingFile: (file: File | null) => void
}

export function CampaignMapPageMobile({
  campaignId,
  maps,
  selectedMap,
  setSelectedMap,
  loading,
  uploading,
  error,
  isNameModalOpen,
  setIsNameModalOpen,
  mapName,
  setMapName,
  fileInputRef,
  handleFileSelect,
  handleFileChange,
  handleUpload,
  handleDelete,
  setPendingFile,
}: CampaignMapPageMobileProps) {
  if (loading) {
    return (
      <AppLayout campaignId={campaignId}>
        <MobileLayout title="World Map" showBackButton backHref={`/campaigns/${campaignId}/canvas`}>
          <div className="flex items-center justify-center h-[60vh]">
            <div className="w-10 h-10 border-2 border-[--arcane-purple] border-t-transparent rounded-full spinner" />
          </div>
        </MobileLayout>
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

      <MobileLayout
        title={selectedMap?.name || 'World Map'}
        showBackButton
        backHref={`/campaigns/${campaignId}/canvas`}
        actions={
          <div className="flex items-center gap-1">
            {selectedMap && (
              <button
                onClick={() => handleDelete(selectedMap)}
                className="p-2 rounded-lg active:bg-red-500/20 transition-colors"
              >
                <Trash2 className="w-5 h-5 text-red-400" />
              </button>
            )}
            <button
              onClick={handleFileSelect}
              disabled={uploading}
              className="p-2 rounded-lg bg-[--arcane-purple] active:bg-[--arcane-purple]/80 transition-colors"
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Plus className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        }
      >
        {maps.length === 0 ? (
          /* Empty State */
          <div className="flex items-center justify-center h-[60vh] px-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[--arcane-purple]/10 flex items-center justify-center">
                <Map className="w-8 h-8 text-[--arcane-purple]" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">
                No World Maps Yet
              </h2>
              <p className="text-sm text-gray-400 mb-6">
                Upload maps of your campaign world, dungeons, or regions
              </p>
              <button
                onClick={handleFileSelect}
                disabled={uploading}
                className="btn btn-primary"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload First Map
                  </>
                )}
              </button>
              {error && (
                <p className="mt-4 text-sm text-red-400">{error}</p>
              )}
            </div>
          </div>
        ) : (
          /* Map Viewer */
          <div className="flex flex-col h-[calc(100vh-180px)]">
            {/* Interactive Map Display with Pins */}
            <div className="flex-1 overflow-hidden p-2">
              {selectedMap && (
                <InteractiveMap
                  campaignId={campaignId}
                  mapId={selectedMap.id}
                  imageUrl={selectedMap.image_url}
                  isDm={true}
                  className="h-full"
                />
              )}
            </div>

            {/* Map Thumbnails */}
            {maps.length > 1 && (
              <div className="px-4 py-3 border-t border-white/[0.06] bg-white/[0.02]">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {maps.map(map => (
                    <button
                      key={map.id}
                      onClick={() => setSelectedMap(map)}
                      className={cn(
                        'relative w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all',
                        selectedMap?.id === map.id
                          ? 'border-[--arcane-purple] ring-2 ring-[--arcane-purple]/30'
                          : 'border-white/10 active:border-white/30'
                      )}
                    >
                      <Image
                        src={map.image_url}
                        alt={map.name || 'Map thumbnail'}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </MobileLayout>

      {/* Name Modal as Bottom Sheet */}
      <MobileBottomSheet
        isOpen={isNameModalOpen}
        onClose={() => {
          setIsNameModalOpen(false)
          setPendingFile(null)
          setMapName('')
        }}
        title="Name Your Map"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Map Name</label>
            <Input
              value={mapName}
              onChange={(e) => setMapName(e.target.value)}
              placeholder="e.g., Sword Coast, Dungeon Level 1..."
              autoFocus
              className="form-input"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              className="flex-1 btn btn-secondary"
              onClick={() => {
                setIsNameModalOpen(false)
                setPendingFile(null)
                setMapName('')
              }}
            >
              Cancel
            </button>
            <button
              className="flex-1 btn btn-primary"
              onClick={handleUpload}
              disabled={!mapName.trim()}
            >
              Upload Map
            </button>
          </div>
        </div>
      </MobileBottomSheet>
    </AppLayout>
  )
}
