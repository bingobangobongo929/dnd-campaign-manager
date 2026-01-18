'use client'

import Image from 'next/image'
import {
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
  MapPin,
  Target,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { Modal } from '@/components/ui'
import { MobileLayout } from '@/components/mobile'
import { cn } from '@/lib/utils'

// Props interface for mobile component
export interface NewCampaignMobileProps {
  formData: {
    name: string
    description: string
    game_system: string
    status: string
    image_url: string | null
    setting_notes: string
    party_goals: string
    dm_notes: string
  }
  setFormData: React.Dispatch<React.SetStateAction<NewCampaignMobileProps['formData']>>
  expandedSections: {
    overview: boolean
    setting: boolean
    goals: boolean
    notes: boolean
  }
  toggleSection: (section: 'overview' | 'setting' | 'goals' | 'notes') => void
  saving: boolean
  uploadingImage: boolean
  imageInputRef: React.RefObject<HTMLInputElement | null>
  imageOptionsModalOpen: boolean
  setImageOptionsModalOpen: (open: boolean) => void
  promptModalOpen: boolean
  setPromptModalOpen: (open: boolean) => void
  generatedPrompt: { prompt: string; shortPrompt: string }
  promptCopied: boolean
  generatingPrompt: boolean
  cropModalOpen: boolean
  pendingImage: string | null
  crop: Crop | undefined
  setCrop: (crop: Crop) => void
  completedCrop: PixelCrop | undefined
  setCompletedCrop: (crop: PixelCrop) => void
  cropImgRef: React.RefObject<HTMLImageElement | null>
  handleSave: () => void
  handleImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleGeneratePrompt: () => void
  copyPromptToClipboard: (text: string) => void
  onCropImageLoad: (e: React.SyntheticEvent<HTMLImageElement>) => void
  handleCropComplete: () => void
  handleCropCancel: () => void
  centerAspectCrop: (width: number, height: number, aspect: number) => Crop
  aiEnabled: boolean
  GAME_SYSTEMS: { value: string; label: string }[]
  CAMPAIGN_STATUSES: { value: string; label: string; color: string }[]
}

// Mobile Collapsible Section Component
function MobileCollapsibleSection({
  title,
  icon: Icon,
  expanded,
  onToggle,
  warning,
  children,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  expanded: boolean
  onToggle: () => void
  warning?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 active:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-purple-500/10 rounded-lg">
            <Icon className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-sm font-medium text-white/90">{title}</span>
          {warning && (
            <span className="text-xs px-1.5 py-0.5 bg-amber-500/15 text-amber-400 rounded">
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
      {expanded && <div className="px-3 pb-3 pt-0">{children}</div>}
    </div>
  )
}

export function NewCampaignMobile({
  formData,
  setFormData,
  expandedSections,
  toggleSection,
  saving,
  uploadingImage,
  imageInputRef,
  imageOptionsModalOpen,
  setImageOptionsModalOpen,
  promptModalOpen,
  setPromptModalOpen,
  generatedPrompt,
  promptCopied,
  generatingPrompt,
  cropModalOpen,
  pendingImage,
  crop,
  setCrop,
  completedCrop,
  setCompletedCrop,
  cropImgRef,
  handleSave,
  handleImageSelect,
  handleGeneratePrompt,
  copyPromptToClipboard,
  onCropImageLoad,
  handleCropComplete,
  handleCropCancel,
  centerAspectCrop,
  aiEnabled,
  GAME_SYSTEMS,
  CAMPAIGN_STATUSES,
}: NewCampaignMobileProps) {
  return (
    <>
      <MobileLayout
        title="New Campaign"
        backHref="/campaigns"
        actions={
          <button
            onClick={handleSave}
            disabled={!formData.name.trim() || saving}
            className="p-2 text-purple-400 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          </button>
        }
      >
        {/* Hidden file input */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageSelect}
        />

        <div className="px-4 pb-32 space-y-6">
          {/* Campaign Image */}
          <div
            onClick={() => setImageOptionsModalOpen(true)}
            className={cn(
              "relative aspect-video rounded-xl overflow-hidden border-2 transition-all",
              formData.image_url
                ? "border-white/10"
                : "border-dashed border-white/20 bg-white/[0.02]"
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
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Camera className="w-8 h-8 text-white/80" />
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500">
                <Camera className="w-10 h-10" />
                <span className="text-sm">Tap to add image</span>
              </div>
            )}
          </div>

          {/* Campaign Name */}
          <input
            type="text"
            value={formData.name}
            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Campaign Name"
            className="w-full text-2xl font-display font-bold bg-transparent border-none outline-none text-white placeholder:text-gray-600"
          />

          {/* Description */}
          <textarea
            value={formData.description}
            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="A brief description of your campaign..."
            className="w-full p-4 text-[15px] bg-white/[0.02] border border-white/[0.06] rounded-xl text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.04] focus:border-purple-500/30 resize-none min-h-[100px]"
            rows={3}
          />

          {/* Quick Meta */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Game System</label>
              <select
                value={formData.game_system}
                onChange={e => setFormData(prev => ({ ...prev, game_system: e.target.value }))}
                className="w-full p-3 text-sm bg-white/[0.02] border border-white/[0.06] rounded-xl text-white/85 focus:outline-none"
                style={{ colorScheme: 'dark' }}
              >
                {GAME_SYSTEMS.map(sys => (
                  <option key={sys.value} value={sys.value}>{sys.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full p-3 text-sm bg-white/[0.02] border border-white/[0.06] rounded-xl text-white/85 focus:outline-none"
                style={{ colorScheme: 'dark' }}
              >
                {CAMPAIGN_STATUSES.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Collapsible Sections */}
          <div className="space-y-3">
            {/* Setting Notes */}
            <MobileCollapsibleSection
              title="Setting Notes"
              icon={MapPin}
              expanded={expandedSections.setting}
              onToggle={() => toggleSection('setting')}
            >
              <textarea
                value={formData.setting_notes}
                onChange={e => setFormData(prev => ({ ...prev, setting_notes: e.target.value }))}
                placeholder="World details, homebrew rules, tone guidance..."
                className="w-full p-3 text-sm bg-white/[0.02] border border-white/[0.06] rounded-lg text-white/85 placeholder:text-gray-600 focus:outline-none resize-none min-h-[120px]"
              />
            </MobileCollapsibleSection>

            {/* Campaign Goals */}
            <MobileCollapsibleSection
              title="Campaign Goals"
              icon={Target}
              expanded={expandedSections.goals}
              onToggle={() => toggleSection('goals')}
            >
              <textarea
                value={formData.party_goals}
                onChange={e => setFormData(prev => ({ ...prev, party_goals: e.target.value }))}
                placeholder="Main objectives, narrative drivers..."
                className="w-full p-3 text-sm bg-white/[0.02] border border-white/[0.06] rounded-lg text-white/85 placeholder:text-gray-600 focus:outline-none resize-none min-h-[120px]"
              />
            </MobileCollapsibleSection>

            {/* DM Notes */}
            <MobileCollapsibleSection
              title="DM Notes"
              icon={BookOpen}
              expanded={expandedSections.notes}
              onToggle={() => toggleSection('notes')}
              warning="Private"
            >
              <textarea
                value={formData.dm_notes}
                onChange={e => setFormData(prev => ({ ...prev, dm_notes: e.target.value }))}
                placeholder="Private notes, plot ideas, secrets..."
                className="w-full p-3 text-sm bg-white/[0.02] border border-amber-500/20 rounded-lg text-white/85 placeholder:text-gray-600 focus:outline-none resize-none min-h-[120px]"
              />
            </MobileCollapsibleSection>
          </div>

          {/* Tips */}
          <div className="p-4 bg-purple-500/5 rounded-xl border border-purple-500/20">
            <div className="flex items-start gap-3">
              <Gamepad2 className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-purple-300">Quick Start</p>
                <p className="text-xs text-gray-500 mt-1">
                  Just add a name and game system to get started. Add more details later.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Save Button */}
        <div className="fixed bottom-20 left-4 right-4 p-4 bg-[#0d0d0f]/95 backdrop-blur-xl rounded-xl border border-white/[0.08] shadow-xl">
          <button
            onClick={handleSave}
            disabled={!formData.name.trim() || saving}
            className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600 active:bg-purple-500 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Create Campaign
              </>
            )}
          </button>
        </div>
      </MobileLayout>

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
            className="w-full flex items-center gap-4 p-4 bg-white/[0.03] active:bg-white/[0.06] border border-white/[0.08] rounded-xl transition-colors text-left"
          >
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Upload className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="font-medium text-white">Upload Image</p>
              <p className="text-sm text-gray-500">Choose from your device</p>
            </div>
          </button>

          {aiEnabled && (
            <button
              onClick={() => {
                setImageOptionsModalOpen(false)
                handleGeneratePrompt()
              }}
              disabled={generatingPrompt || !formData.name.trim()}
              className="w-full flex items-center gap-4 p-4 bg-white/[0.03] active:bg-white/[0.06] border border-white/[0.08] rounded-xl transition-colors text-left disabled:opacity-50"
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
                <p className="text-sm text-gray-500">For Midjourney, DALL-E, etc.</p>
              </div>
            </button>
          )}

          {formData.image_url && (
            <button
              onClick={() => {
                setFormData(prev => ({ ...prev, image_url: null }))
                setImageOptionsModalOpen(false)
              }}
              className="w-full flex items-center gap-4 p-4 bg-white/[0.03] active:bg-red-500/10 border border-white/[0.08] rounded-xl transition-colors text-left"
            >
              <div className="p-3 bg-red-500/20 rounded-lg">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="font-medium text-red-400">Remove Image</p>
                <p className="text-sm text-gray-500">Delete current image</p>
              </div>
            </button>
          )}
        </div>
        <div className="flex justify-end pt-2">
          <button
            onClick={() => setImageOptionsModalOpen(false)}
            className="px-4 py-2 text-sm text-gray-400 active:text-white transition-colors"
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
        description="Copy this prompt to use in your image AI"
        size="lg"
      >
        <div className="space-y-4 py-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-400">Full Prompt</label>
              <button
                onClick={() => copyPromptToClipboard(generatedPrompt.prompt)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-400 bg-purple-500/10 rounded-lg active:bg-purple-500/20"
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
            <div className="p-3 bg-white/[0.03] border border-white/[0.08] rounded-xl max-h-48 overflow-y-auto">
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
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 bg-white/5 rounded-lg active:bg-white/10"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy
              </button>
            </div>
            <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl">
              <p className="text-sm text-gray-400">
                {generatedPrompt.shortPrompt}
              </p>
            </div>
          </div>

          <p className="text-xs text-gray-500 text-center">
            Paste into Midjourney, DALL-E, Leonardo AI, or similar
          </p>
        </div>
        <div className="flex justify-end pt-2">
          <button
            onClick={() => setPromptModalOpen(false)}
            className="px-4 py-2 text-sm font-medium text-gray-400 active:text-white transition-colors"
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
        description="Adjust the crop area for 16:9 aspect ratio"
        size="xl"
      >
        <div className="space-y-4 py-4">
          {pendingImage && (
            <div className="flex justify-center bg-black/30 rounded-xl p-2 max-h-[50vh] overflow-auto">
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
                  className="max-h-[40vh] w-auto"
                />
              </ReactCrop>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Aspect ratio: 16:9</span>
            <span>Full resolution preserved</span>
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
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 active:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleCropCancel}
              className="px-4 py-2 text-sm text-gray-400 active:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCropComplete}
              disabled={!completedCrop}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 active:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Check className="w-4 h-4" />
              Apply
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
