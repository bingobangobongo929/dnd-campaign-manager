'use client'

import { Map, Upload, Plus, Trash2, Loader2, ZoomIn, ZoomOut } from 'lucide-react'
import { Input } from '@/components/ui'
import { AppLayout } from '@/components/layout/app-layout'
import { MobileLayout, MobileBottomSheet } from '@/components/mobile'
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
  zoom: number
  setZoom: (zoom: number | ((z: number) => number)) => void
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
  zoom,
  setZoom,
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
            {/* Zoom Controls */}
            <div className="flex items-center justify-center gap-3 py-2 border-b border-white/[0.06]">
              <button
                onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
                className="p-2 rounded-lg bg-white/5 active:bg-white/10 transition-colors"
              >
                <ZoomOut className="w-5 h-5 text-gray-400" />
              </button>
              <span className="text-sm text-gray-400 w-16 text-center font-medium">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom(z => Math.min(3, z + 0.25))}
                className="p-2 rounded-lg bg-white/5 active:bg-white/10 transition-colors"
              >
                <ZoomIn className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Map Display */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
              {selectedMap && (
                <div
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.2s ease',
                  }}
                >
                  <img
                    src={selectedMap.image_url}
                    alt={selectedMap.name || 'World map'}
                    className="rounded-lg shadow-2xl max-w-full"
                    style={{
                      maxHeight: 'calc(100vh - 350px)',
                      objectFit: 'contain',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Map Thumbnails */}
            {maps.length > 1 && (
              <div className="px-4 py-3 border-t border-white/[0.06] bg-white/[0.02]">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {maps.map(map => (
                    <button
                      key={map.id}
                      onClick={() => {
                        setSelectedMap(map)
                        setZoom(1) // Reset zoom when switching maps
                      }}
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
