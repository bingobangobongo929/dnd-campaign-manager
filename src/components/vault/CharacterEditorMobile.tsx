'use client'

import { useState } from 'react'
import Image from 'next/image'
import { EditorContent, Editor } from '@tiptap/react'
import {
  ArrowLeft,
  User,
  Users,
  ChevronDown,
  ChevronUp,
  Plus,
  BookOpen,
  FileText,
  Quote,
  Image as GalleryIcon,
  Camera,
  Loader2,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Share2,
  ExternalLink,
  Music,
  Check,
  Sparkles,
  Edit2,
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { Modal } from '@/components/ui'
import {
  BulletListDisplay,
  QuotesDisplay,
  LifePhaseDisplay,
} from './display'
import type { CharacterLink, VaultCharacterRelationship, VaultCharacterImage } from '@/types/database'

// Section types
type SectionType = 'backstory' | 'details' | 'people' | 'writings' | 'gallery'

const SECTIONS: { id: SectionType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'backstory', label: 'Backstory', icon: BookOpen },
  { id: 'details', label: 'Details', icon: FileText },
  { id: 'people', label: 'People', icon: Users },
  { id: 'writings', label: 'Writings', icon: Quote },
  { id: 'gallery', label: 'Gallery', icon: GalleryIcon },
]

// Props interface for mobile component
export interface CharacterEditorMobileProps {
  mode: 'create' | 'edit'
  characterId: string | null
  formData: any
  setFormData: React.Dispatch<React.SetStateAction<any>>
  status: string // Matches SaveStatus type which includes 'idle' | 'saving' | 'saved' | 'error'
  summaryEditor: Editor | null
  notesEditor: Editor | null
  expandedSections: Record<SectionType, boolean>
  toggleSection: (section: SectionType) => void
  activeSection: SectionType
  scrollToSection: (sectionId: SectionType) => void
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
  // Portrait
  portraitInputRef: React.RefObject<HTMLInputElement | null>
  isUploading: boolean
  handlePortraitSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  // Related data (derived from relationships in parent)
  npcs: VaultCharacterRelationship[]
  companions: VaultCharacterRelationship[]
  galleryImages: VaultCharacterImage[]
  links: CharacterLink[]
  // Modals
  isDeleteConfirmOpen: boolean
  setIsDeleteConfirmOpen: (open: boolean) => void
  duplicateModalOpen: boolean
  setDuplicateModalOpen: (open: boolean) => void
  shareModalOpen: boolean
  setShareModalOpen: (open: boolean) => void
  // Handlers
  handleClose: () => void
  handleDelete: () => void
  handleDuplicate: () => void
  // Secrets
  showSecrets: boolean
  setShowSecrets: (show: boolean) => void
  // AI
  canUseAI: boolean
  generatingPrompt: boolean
  handleGenerateAiPrompt: () => void
}

// Mobile Collapsible Section
function MobileSection({
  id,
  title,
  icon: Icon,
  isExpanded,
  onToggle,
  children,
  count,
}: {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
  count?: number
}) {
  return (
    <div id={id} className="bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden scroll-mt-16">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 active:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Icon className="w-4 h-4 text-purple-400" />
          </div>
          <span className="font-medium text-white/90">{title}</span>
          {count !== undefined && count > 0 && (
            <span className="text-xs text-gray-500">({count})</span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 pt-0 space-y-4">
          {children}
        </div>
      )}
    </div>
  )
}

// Editor Toolbar for mobile
function MobileEditorToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null

  return (
    <div className="flex items-center gap-1 p-2 border-b border-white/[0.06] overflow-x-auto">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={cn(
          "p-2 rounded-lg transition-colors",
          editor.isActive('bold') ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 active:bg-white/[0.05]'
        )}
      >
        <span className="font-bold text-sm">B</span>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={cn(
          "p-2 rounded-lg transition-colors",
          editor.isActive('italic') ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 active:bg-white/[0.05]'
        )}
      >
        <span className="italic text-sm">I</span>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={cn(
          "p-2 rounded-lg transition-colors",
          editor.isActive('bulletList') ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 active:bg-white/[0.05]'
        )}
      >
        <span className="text-sm">•</span>
      </button>
    </div>
  )
}

export function CharacterEditorMobile({
  mode,
  characterId,
  formData,
  setFormData,
  status,
  summaryEditor,
  notesEditor,
  expandedSections,
  toggleSection,
  activeSection,
  scrollToSection,
  scrollContainerRef,
  portraitInputRef,
  isUploading,
  handlePortraitSelect,
  npcs,
  companions,
  galleryImages,
  links,
  isDeleteConfirmOpen,
  setIsDeleteConfirmOpen,
  duplicateModalOpen,
  setDuplicateModalOpen,
  shareModalOpen,
  setShareModalOpen,
  handleClose,
  handleDelete,
  handleDuplicate,
  showSecrets,
  setShowSecrets,
  canUseAI,
  generatingPrompt,
  handleGenerateAiPrompt,
}: CharacterEditorMobileProps) {
  const isCreateMode = mode === 'create'

  return (
    <div className="fixed inset-0 z-50 bg-[#0c0c0e] flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 h-[calc(44px+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] border-b border-white/[0.06] bg-white/[0.01]">
        <div className="flex items-center gap-3">
          <button
            onClick={handleClose}
            className="p-2 rounded-lg active:bg-white/[0.05] text-gray-400"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center",
              formData.type === 'pc' ? "bg-purple-500/15 text-purple-400" : "bg-gray-500/15 text-gray-400"
            )}>
              {formData.type === 'pc' ? <User className="w-4 h-4" /> : <Users className="w-4 h-4" />}
            </div>
            <span className="text-[16px] font-medium text-white/90 truncate max-w-[160px]">
              {status === 'saving' ? 'Saving...' : formData.name || (isCreateMode ? 'New Character' : 'Enter a name')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {characterId && (
            <>
              <button
                onClick={() => setDuplicateModalOpen(true)}
                className="p-2 text-gray-500 active:text-gray-300"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="p-2 text-gray-500 active:text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Section Tabs */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-white/[0.06] overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 min-w-max">
          {SECTIONS.map(section => (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap',
                activeSection === section.id
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/[0.04] text-gray-400 active:bg-white/[0.08]'
              )}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-[#131316]" ref={scrollContainerRef}>
        <div className="px-4 py-4 pb-24 space-y-4">
          {/* Quick Details Card */}
          <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
            {/* Portrait and Name */}
            <div className="flex items-center gap-4 mb-4">
              <div
                onClick={() => portraitInputRef.current?.click()}
                className="relative w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-purple-500/20 to-gray-900 flex-shrink-0"
              >
                {isUploading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                  </div>
                ) : formData.detail_image_url || formData.image_url ? (
                  <>
                    <Image
                      src={formData.detail_image_url || formData.image_url}
                      alt={formData.name || 'Character'}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Camera className="w-5 h-5 text-white/80" />
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                    <Camera className="w-6 h-6 mb-1" />
                    <span className="text-[10px]">Add</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, name: e.target.value }))}
                  placeholder="Character Name"
                  className="w-full text-xl font-semibold bg-transparent text-white placeholder:text-gray-600 focus:outline-none"
                />
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded",
                    formData.type === 'pc' ? "bg-purple-500/20 text-purple-400" : "bg-gray-500/20 text-gray-400"
                  )}>
                    {formData.type === 'pc' ? 'PC' : 'NPC'}
                  </span>
                  {formData.status && (
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: `${formData.status_color}20`,
                        color: formData.status_color,
                      }}
                    >
                      {formData.status}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-gray-500 mb-1 uppercase">Race</label>
                <input
                  type="text"
                  value={formData.race}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, race: e.target.value }))}
                  placeholder="Race..."
                  className="w-full py-2 px-3 text-sm bg-white/[0.03] border border-white/[0.06] rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/30"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1 uppercase">Class</label>
                <input
                  type="text"
                  value={formData.class}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, class: e.target.value }))}
                  placeholder="Class..."
                  className="w-full py-2 px-3 text-sm bg-white/[0.03] border border-white/[0.06] rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/30"
                />
              </div>
            </div>

            {/* Type Toggle */}
            <div className="mt-3">
              <div className="flex bg-white/[0.02] rounded-lg p-1 border border-white/[0.06]">
                <button
                  onClick={() => setFormData((prev: any) => ({ ...prev, type: 'pc' }))}
                  className={cn(
                    'flex-1 py-2 px-3 rounded text-xs font-medium transition-all',
                    formData.type === 'pc'
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'text-gray-500'
                  )}
                >
                  Player Character
                </button>
                <button
                  onClick={() => setFormData((prev: any) => ({ ...prev, type: 'npc' }))}
                  className={cn(
                    'flex-1 py-2 px-3 rounded text-xs font-medium transition-all',
                    formData.type === 'npc'
                      ? 'bg-gray-500/20 text-gray-300'
                      : 'text-gray-500'
                  )}
                >
                  NPC
                </button>
              </div>
            </div>
          </div>

          {/* BACKSTORY SECTION */}
          <MobileSection
            id="backstory"
            title="Backstory"
            icon={BookOpen}
            isExpanded={expandedSections.backstory}
            onToggle={() => toggleSection('backstory')}
          >
            {/* Summary */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">Summary</label>
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
                <MobileEditorToolbar editor={summaryEditor} />
                <div className="px-4 py-3 min-h-[120px]">
                  <EditorContent editor={summaryEditor} className="prose prose-invert prose-sm max-w-none" />
                </div>
              </div>
            </div>

            {/* TL;DR */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">Quick Summary (TL;DR)</label>
              <BulletListDisplay
                items={formData.tldr}
                bulletColor="purple"
                emptyMessage="No quick summary"
                placeholder="Add a quick fact..."
                editable
                onSave={(items) => setFormData((prev: any) => ({ ...prev, tldr: items }))}
              />
            </div>

            {/* Full Backstory */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">Full Backstory</label>
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
                <MobileEditorToolbar editor={notesEditor} />
                <div className="px-4 py-3 min-h-[200px]">
                  <EditorContent editor={notesEditor} className="prose prose-invert prose-sm max-w-none" />
                </div>
              </div>
            </div>

            {/* Life Phases */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">Life Phases ({formData.backstory_phases.length})</label>
              <LifePhaseDisplay
                phases={formData.backstory_phases}
                editable
                onSave={(phases) => setFormData((prev: any) => ({ ...prev, backstory_phases: phases }))}
              />
            </div>

            {/* Plot Hooks */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">Plot Hooks ({formData.plot_hooks.length})</label>
              <BulletListDisplay
                items={formData.plot_hooks}
                bulletColor="amber"
                emptyMessage="No plot hooks"
                placeholder="Add a story hook..."
                editable
                onSave={(items) => setFormData((prev: any) => ({ ...prev, plot_hooks: items }))}
              />
            </div>

            {/* Quotes */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">Memorable Quotes ({formData.quotes.length})</label>
              <QuotesDisplay
                quotes={formData.quotes}
                emptyMessage="No quotes"
                editable
                onSave={(quotes) => setFormData((prev: any) => ({ ...prev, quotes: quotes }))}
              />
            </div>
          </MobileSection>

          {/* DETAILS SECTION */}
          <MobileSection
            id="details"
            title="Details"
            icon={FileText}
            isExpanded={expandedSections.details}
            onToggle={() => toggleSection('details')}
          >
            {/* Appearance */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">Appearance</label>
              <textarea
                value={formData.appearance}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, appearance: e.target.value }))}
                placeholder="Physical description..."
                className="w-full p-3 text-sm bg-white/[0.02] border border-white/[0.06] rounded-xl text-white/85 placeholder:text-gray-600 focus:outline-none resize-none min-h-[100px]"
              />
            </div>

            {/* Physical Details Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-gray-500 mb-1 uppercase">Height</label>
                <input
                  type="text"
                  value={formData.height}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, height: e.target.value }))}
                  placeholder="175 cm"
                  className="w-full py-2 px-3 text-sm bg-white/[0.03] border border-white/[0.06] rounded-lg text-white placeholder:text-gray-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1 uppercase">Weight</label>
                <input
                  type="text"
                  value={formData.weight}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, weight: e.target.value }))}
                  placeholder="70 kg"
                  className="w-full py-2 px-3 text-sm bg-white/[0.03] border border-white/[0.06] rounded-lg text-white placeholder:text-gray-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1 uppercase">Hair</label>
                <input
                  type="text"
                  value={formData.hair}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, hair: e.target.value }))}
                  placeholder="Color, style"
                  className="w-full py-2 px-3 text-sm bg-white/[0.03] border border-white/[0.06] rounded-lg text-white placeholder:text-gray-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1 uppercase">Eyes</label>
                <input
                  type="text"
                  value={formData.eyes}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, eyes: e.target.value }))}
                  placeholder="Color"
                  className="w-full py-2 px-3 text-sm bg-white/[0.03] border border-white/[0.06] rounded-lg text-white placeholder:text-gray-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Personality */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">Personality</label>
              <textarea
                value={formData.personality}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, personality: e.target.value }))}
                placeholder="Temperament, quirks..."
                className="w-full p-3 text-sm bg-white/[0.02] border border-white/[0.06] rounded-xl text-white/85 placeholder:text-gray-600 focus:outline-none resize-none min-h-[100px]"
              />
            </div>

            {/* Goals */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">Goals & Motivations</label>
              <textarea
                value={formData.goals}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, goals: e.target.value }))}
                placeholder="What drives this character?"
                className="w-full p-3 text-sm bg-white/[0.02] border border-white/[0.06] rounded-xl text-white/85 placeholder:text-gray-600 focus:outline-none resize-none min-h-[100px]"
              />
            </div>

            {/* Fears */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">Fears ({formData.fears.length})</label>
              <BulletListDisplay
                items={formData.fears}
                bulletColor="orange"
                emptyMessage="No fears"
                placeholder="Add a fear..."
                editable
                onSave={(items) => setFormData((prev: any) => ({ ...prev, fears: items }))}
              />
            </div>

            {/* Secrets */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 text-xs text-gray-500">
                  Secrets
                  <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/15 text-purple-400 rounded">Private</span>
                </label>
                <button
                  onClick={() => setShowSecrets(!showSecrets)}
                  className="text-xs text-gray-500 active:text-purple-400"
                >
                  {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {showSecrets ? (
                <textarea
                  value={formData.secrets}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, secrets: e.target.value }))}
                  placeholder="Hidden secrets..."
                  className="w-full p-3 text-sm bg-white/[0.02] border border-red-500/20 rounded-xl text-white/85 placeholder:text-gray-600 focus:outline-none resize-none min-h-[100px]"
                />
              ) : (
                <div className="py-8 text-center bg-white/[0.01] border border-dashed border-white/[0.08] rounded-xl">
                  <p className="text-xs text-gray-500">Tap eye icon to reveal</p>
                </div>
              )}
            </div>
          </MobileSection>

          {/* PEOPLE SECTION */}
          <MobileSection
            id="people"
            title="People"
            icon={Users}
            isExpanded={expandedSections.people}
            onToggle={() => toggleSection('people')}
            count={npcs.length + companions.length}
          >
            {/* NPCs / Relationships */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">NPCs & Relationships ({npcs.length})</label>
              {npcs.length === 0 ? (
                <p className="text-sm text-gray-600 text-center py-4">No NPCs or relationships</p>
              ) : (
                <div className="space-y-2">
                  {npcs.map(npc => (
                    <div key={npc.id} className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.06]">
                      <p className="text-sm font-medium text-white">{npc.related_name}</p>
                      {npc.relationship_type && <p className="text-xs text-gray-500">{npc.relationship_type}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Companions */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">Companions ({companions.length})</label>
              {companions.length === 0 ? (
                <p className="text-sm text-gray-600 text-center py-4">No companions</p>
              ) : (
                <div className="space-y-2">
                  {companions.map(companion => (
                    <div key={companion.id} className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.06]">
                      <p className="text-sm font-medium text-white">{companion.related_name}</p>
                      {companion.companion_species && <p className="text-xs text-gray-500">{companion.companion_species}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </MobileSection>

          {/* WRITINGS SECTION */}
          <MobileSection
            id="writings"
            title="Writings"
            icon={Quote}
            isExpanded={expandedSections.writings}
            onToggle={() => toggleSection('writings')}
            count={formData.character_writings?.length || 0}
          >
            {formData.character_writings?.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-4">No writings yet</p>
            ) : (
              <div className="space-y-2">
                {formData.character_writings?.map((writing: any, idx: number) => (
                  <div key={idx} className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.06]">
                    <p className="text-sm font-medium text-white">{writing.title || 'Untitled'}</p>
                    <p className="text-xs text-gray-500">{writing.type}</p>
                  </div>
                ))}
              </div>
            )}
          </MobileSection>

          {/* GALLERY SECTION */}
          <MobileSection
            id="gallery"
            title="Gallery"
            icon={GalleryIcon}
            isExpanded={expandedSections.gallery}
            onToggle={() => toggleSection('gallery')}
            count={galleryImages.length}
          >
            {galleryImages.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-4">No gallery images</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {galleryImages.map(img => (
                  <div key={img.id} className="aspect-square rounded-lg overflow-hidden bg-white/[0.02]">
                    <Image
                      src={img.image_url}
                      alt={img.caption || 'Gallery image'}
                      width={120}
                      height={120}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </MobileSection>

          {/* Links */}
          {links.length > 0 && (
            <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
              <label className="block text-xs text-gray-500 mb-2">Links</label>
              <div className="space-y-2">
                {links.map(link => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 bg-white/[0.02] rounded-lg active:bg-white/[0.04]"
                  >
                    <ExternalLink className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-300 truncate">{link.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Hidden file input for portrait */}
      <input
        ref={portraitInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePortraitSelect}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title="Delete Character"
        description="This will move the character to your recycle bin."
        size="sm"
      >
        <div className="space-y-4 py-4">
          <p className="text-sm text-gray-400">
            <strong className="text-white">{formData.name || 'This character'}</strong> will be moved to the recycle bin. You can restore it within 30 days.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="flex-1 py-3 rounded-xl bg-white/[0.04] text-gray-300 font-medium active:bg-white/[0.08]"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 py-3 rounded-xl bg-red-600 text-white font-medium active:bg-red-500"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Duplicate Modal */}
      <Modal
        isOpen={duplicateModalOpen}
        onClose={() => setDuplicateModalOpen(false)}
        title="Duplicate Character"
      >
        <div className="space-y-4 py-4">
          <p className="text-sm text-gray-400">
            Create a copy of <strong className="text-white">{formData.name || 'this character'}</strong>?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setDuplicateModalOpen(false)}
              className="flex-1 py-3 rounded-xl bg-white/[0.04] text-gray-300 font-medium active:bg-white/[0.08]"
            >
              Cancel
            </button>
            <button
              onClick={handleDuplicate}
              className="flex-1 py-3 rounded-xl bg-purple-600 text-white font-medium active:bg-purple-500"
            >
              Duplicate
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
