'use client'

import { X, Pencil, User, Scroll, Target, Eye, Lock, Quote, Users, Shield, Tag as TagIcon, Heart, Swords, Briefcase, Crown, Link2 } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { sanitizeHtml, MarkdownContent, getGroupIcon } from '@/components/ui'
import Image from 'next/image'
import type { Character, Tag, CharacterTag, CanvasRelationship, RelationshipTemplate, CampaignFaction, FactionMembership, RelationshipCategory } from '@/types/database'

// Extended types for relationships and factions
interface RelationshipWithDetails extends CanvasRelationship {
  template?: RelationshipTemplate | null
  to_character: Character
}

interface MembershipWithFaction extends FactionMembership {
  faction: CampaignFaction
}

interface CharacterViewModalProps {
  character: Character
  tags: (CharacterTag & { tag: Tag; related_character?: Character | null })[]
  relationships?: RelationshipWithDetails[]
  factionMemberships?: MembershipWithFaction[]
  onEdit: () => void
  onClose: () => void
}

// Category icons for relationships
const CATEGORY_ICONS: Record<RelationshipCategory, React.ReactNode> = {
  family: <Crown className="w-3.5 h-3.5" />,
  professional: <Briefcase className="w-3.5 h-3.5" />,
  romantic: <Heart className="w-3.5 h-3.5" />,
  conflict: <Swords className="w-3.5 h-3.5" />,
  social: <Users className="w-3.5 h-3.5" />,
  other: <Link2 className="w-3.5 h-3.5" />,
}

// Helper component for info rows
function InfoRow({ label, value, icon: Icon }: { label: string; value: string | number | null | undefined; icon?: React.ComponentType<{ className?: string }> }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon className="w-4 h-4 text-[--text-tertiary] mt-0.5 flex-shrink-0" />}
      <div>
        <span className="text-xs text-[--text-tertiary] uppercase tracking-wider">{label}</span>
        <p className="text-sm text-[--text-primary]">{value}</p>
      </div>
    </div>
  )
}

// Helper for section titles
function SectionTitle({ children, icon: Icon }: { children: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-semibold text-[--arcane-gold] uppercase tracking-wider mb-3">
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </h3>
  )
}

export function CharacterViewModal({
  character,
  tags,
  relationships = [],
  factionMemberships = [],
  onEdit,
  onClose,
}: CharacterViewModalProps) {
  const isPC = character.type === 'pc'

  // Parse JSON fields if they exist
  const importantPeople = character.important_people as string[] | null
  const storyHooks = character.story_hooks as string[] | null
  const quotes = character.quotes as string[] | null

  // Filter to only general tags (labels)
  const labels = tags.filter(ct => ct.tag.category === 'general')

  // Check if we have any content to show
  const hasBasicInfo = character.race || character.class || character.age || character.background
  const hasAppearanceInfo = character.appearance
  const hasPersonalityInfo = character.personality || character.goals
  const hasSecrets = character.secrets
  const hasNotes = character.notes
  const hasQuotes = quotes && quotes.length > 0
  const hasImportantPeople = importantPeople && importantPeople.length > 0
  const hasStoryHooks = storyHooks && storyHooks.length > 0
  const hasLabels = labels.length > 0
  const hasFactions = factionMemberships.length > 0
  const hasRelationships = relationships.length > 0
  const hasConnectionsSection = hasLabels || hasFactions || hasRelationships

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="character-view-modal-wide relative"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '900px',
          width: '95vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Close button */}
        <button
          className="character-view-close btn btn-ghost btn-icon"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header: Portrait + Basic Info */}
        <div className="character-view-header">
          {/* Portrait - prefer detail image (2:3) over avatar (1:1) */}
          <div className="character-view-portrait">
            {(character.detail_image_url || character.image_url) ? (
              <Image
                src={character.detail_image_url || character.image_url!}
                alt={character.name}
                fill
                className="object-cover"
                sizes="140px"
              />
            ) : (
              <div className="character-view-portrait-placeholder">
                {getInitials(character.name)}
              </div>
            )}
          </div>

          {/* Header Content */}
          <div className="character-view-header-content">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="character-view-name">{character.name}</h2>
                <div className="flex items-center gap-3 mt-2">
                  <span
                    className={cn(
                      'character-view-type',
                      isPC ? 'character-view-type-pc' : 'character-view-type-npc'
                    )}
                  >
                    {character.type === 'pc' ? 'Player Character' : 'Non-Player Character'}
                  </span>
                  {character.status && (
                    <span
                      className="px-2 py-1 text-xs font-medium rounded"
                      style={{
                        backgroundColor: `${character.status_color || '#888'}20`,
                        color: character.status_color || '#888',
                      }}
                    >
                      {character.status}
                    </span>
                  )}
                </div>

                {/* Quick Stats */}
                {hasBasicInfo && (
                  <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-sm text-[--text-secondary]">
                    {character.race && <span>{character.race}</span>}
                    {character.class && <span>{character.class}</span>}
                    {character.age && <span>{character.age} years old</span>}
                    {character.background && <span>{character.background}</span>}
                    {character.role && <span className="text-[--arcane-gold]">{character.role}</span>}
                  </div>
                )}
              </div>
            </div>

            {character.summary && (
              <p className="character-view-summary mt-4">{character.summary}</p>
            )}

            {/* Labels, Factions, Relationships - Combined display */}
            {hasConnectionsSection && (
              <div className="mt-4 space-y-3">
                {/* Labels */}
                {hasLabels && (
                  <div className="flex flex-wrap gap-2">
                    {labels.map((ct) => {
                      const IconComponent = getGroupIcon(ct.tag.icon)
                      return (
                        <span
                          key={ct.id}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: `${ct.tag.color}20`,
                            color: ct.tag.color,
                            border: `1px solid ${ct.tag.color}40`,
                          }}
                        >
                          <IconComponent className="w-3 h-3" />
                          {ct.tag.name}
                        </span>
                      )
                    })}
                  </div>
                )}

                {/* Factions */}
                {hasFactions && (
                  <div className="flex flex-wrap gap-2">
                    {factionMemberships.map((fm) => (
                      <span
                        key={fm.id}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                        style={{
                          backgroundColor: `${fm.faction.color}20`,
                          color: fm.faction.color,
                          border: `1px solid ${fm.faction.color}40`,
                        }}
                      >
                        <Shield className="w-3 h-3" />
                        {fm.faction.name}
                        {fm.title && <span className="opacity-70">• {fm.title}</span>}
                      </span>
                    ))}
                  </div>
                )}

                {/* Relationships with Avatars */}
                {hasRelationships && (
                  <div className="flex flex-wrap gap-2">
                    {relationships.slice(0, 6).map((rel) => {
                      const avatarUrl = rel.to_character.image_url ||
                        `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(rel.to_character.name)}&backgroundColor=1a1a24`
                      const category = rel.template?.category || 'other'
                      const color = rel.template?.color || '#8B5CF6'

                      return (
                        <div
                          key={rel.id}
                          className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06]"
                        >
                          <div className="relative w-6 h-6 rounded-full overflow-hidden shrink-0">
                            <Image
                              src={avatarUrl}
                              alt={rel.to_character.name}
                              fill
                              className="object-cover"
                              sizes="24px"
                            />
                          </div>
                          <span className="text-xs" style={{ color }}>
                            {rel.custom_label || rel.template?.name || 'Related'}
                          </span>
                          <span className="text-xs text-white/80">
                            {rel.to_character.name}
                          </span>
                        </div>
                      )
                    })}
                    {relationships.length > 6 && (
                      <span className="px-2 py-1 rounded-lg text-xs text-gray-400 bg-white/[0.03]">
                        +{relationships.length - 6} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Body - Two Column Layout */}
        <div className="character-view-body">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Appearance */}
              {hasAppearanceInfo && (
                <div className="p-4 rounded-xl bg-[--bg-elevated] border border-[--border]">
                  <SectionTitle icon={Eye}>Appearance</SectionTitle>
                  <MarkdownContent content={character.appearance!} className="text-sm" />
                </div>
              )}

              {/* Personality */}
              {hasPersonalityInfo && (
                <div className="p-4 rounded-xl bg-[--bg-elevated] border border-[--border]">
                  <SectionTitle icon={User}>Personality</SectionTitle>
                  {character.personality && (
                    <div className="mb-3">
                      <MarkdownContent content={character.personality} className="text-sm" />
                    </div>
                  )}
                  {character.goals && (
                    <div className="mt-3 pt-3 border-t border-[--border]">
                      <div className="flex items-center gap-2 text-xs text-[--text-tertiary] uppercase tracking-wider mb-2">
                        <Target className="w-3.5 h-3.5" />
                        Goals
                      </div>
                      <MarkdownContent content={character.goals} className="text-sm" />
                    </div>
                  )}
                </div>
              )}

              {/* Quotes */}
              {hasQuotes && (
                <div className="p-4 rounded-xl bg-[--bg-elevated] border border-[--border]">
                  <SectionTitle icon={Quote}>Memorable Quotes</SectionTitle>
                  <div className="space-y-3">
                    {quotes!.slice(0, 3).map((quote, i) => (
                      <blockquote
                        key={i}
                        className="pl-3 border-l-2 border-[--arcane-purple] text-sm text-[--text-secondary] italic"
                      >
                        "{quote}"
                      </blockquote>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Secrets */}
              {hasSecrets && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <SectionTitle icon={Lock}>Secrets</SectionTitle>
                  <MarkdownContent content={character.secrets!} className="text-sm" />
                </div>
              )}

              {/* Important People */}
              {hasImportantPeople && (
                <div className="p-4 rounded-xl bg-[--bg-elevated] border border-[--border]">
                  <SectionTitle icon={Users}>Important People</SectionTitle>
                  <ul className="space-y-2">
                    {importantPeople!.map((person, i) => (
                      <li key={i} className="text-sm text-[--text-secondary] flex items-start gap-2">
                        <span className="text-[--arcane-gold]">•</span>
                        {person}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Story Hooks */}
              {hasStoryHooks && (
                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <SectionTitle icon={Scroll}>Story Hooks</SectionTitle>
                  <ul className="space-y-2">
                    {storyHooks!.map((hook, i) => (
                      <li key={i} className="text-sm text-[--text-secondary] flex items-start gap-2">
                        <span className="text-[--arcane-purple]">→</span>
                        {hook}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Full-width Notes section */}
          {hasNotes && (
            <div className="mt-6 pt-6 border-t border-[--border]">
              <h3 className="character-view-section-title">Notes</h3>
              <div
                className="character-view-notes"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(character.notes!) }}
              />
            </div>
          )}

          {/* Empty state if nothing to show */}
          {!hasBasicInfo && !hasAppearanceInfo && !hasPersonalityInfo && !hasSecrets && !hasNotes && !hasQuotes && !hasImportantPeople && !hasStoryHooks && !hasConnectionsSection && (
            <div className="text-center py-12">
              <p className="text-[--text-tertiary]">
                No details yet.
              </p>
              <button
                className="btn btn-secondary mt-4"
                onClick={onEdit}
              >
                <Pencil className="w-4 h-4" />
                Add Details
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="character-view-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" onClick={onEdit}>
            <Pencil className="w-4 h-4" />
            Edit Character
          </button>
        </div>
      </div>
    </div>
  )
}
