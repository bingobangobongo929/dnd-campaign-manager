'use client'

import { useState } from 'react'
import {
  User,
  Quote,
  Target,
  Eye,
  EyeOff,
  Lock,
  Heart,
  ChevronDown,
  ChevronUp,
  Scroll,
  Music,
  ExternalLink,
  MapPin,
  Briefcase,
  Users,
  Shield,
  Coins,
  AlertTriangle,
  Lightbulb,
  BookOpen,
  MessageSquare,
  HelpCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  renderMarkdown,
  RELATIONSHIP_COLORS,
  COMPANION_TYPE_COLORS,
  DISPLAY_EMOJIS,
  getInitials,
  formatDate,
} from '@/lib/character-display'
import type { VaultCharacter, VaultCharacterRelationship } from '@/types/database'

interface CharacterViewProps {
  character: VaultCharacter
  relationships?: VaultCharacterRelationship[]
  showDMNotes?: boolean
  className?: string
}

// Section wrapper with collapse functionality
function Section({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
  count,
  color = 'purple',
}: {
  title: string
  icon?: typeof User
  children: React.ReactNode
  defaultOpen?: boolean
  count?: number
  color?: 'purple' | 'amber' | 'green' | 'red' | 'blue' | 'gray'
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const colorClasses = {
    purple: 'text-purple-400',
    amber: 'text-amber-400',
    green: 'text-green-400',
    red: 'text-red-400',
    blue: 'text-blue-400',
    gray: 'text-gray-400',
  }

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className={cn('w-4 h-4', colorClasses[color])} />}
          <h3 className="text-sm font-semibold text-white/90 uppercase tracking-wider">
            {title}
          </h3>
          {count !== undefined && count > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-white/[0.06] text-gray-400">
              {count}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

// Info card for displaying key-value pairs
function InfoCard({ label, value, icon }: { label: string; value?: string | number | null; icon?: string }) {
  if (!value) return null
  return (
    <div className="bg-white/[0.03] rounded-lg p-3">
      <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">
        {icon && <span className="mr-1">{icon}</span>}
        {label}
      </div>
      <div className="text-sm text-white/80">{value}</div>
    </div>
  )
}

// Badge/tag component
function Tag({ children, color = 'purple' }: { children: React.ReactNode; color?: string }) {
  const colorClasses: Record<string, string> = {
    purple: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    green: 'bg-green-500/15 text-green-400 border-green-500/20',
    red: 'bg-red-500/15 text-red-400 border-red-500/20',
    blue: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    gray: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
    orange: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  }

  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-md border', colorClasses[color] || colorClasses.gray)}>
      {children}
    </span>
  )
}

export function CharacterView({
  character,
  relationships = [],
  showDMNotes = false,
  className,
}: CharacterViewProps) {
  const [dmNotesVisible, setDmNotesVisible] = useState(showDMNotes)

  // Separate NPCs and companions from relationships
  const npcs = relationships.filter(r => !r.is_companion)
  const companions = relationships.filter(r => r.is_companion)

  // Parse backstory_phases if it's a string
  const backstoryPhases = typeof character.backstory_phases === 'string'
    ? JSON.parse(character.backstory_phases || '[]')
    : character.backstory_phases || []

  // Parse other JSON fields
  const tldr = Array.isArray(character.tldr) ? character.tldr : []
  const quotes = Array.isArray(character.quotes) ? character.quotes : []
  const plotHooks = Array.isArray(character.plot_hooks) ? character.plot_hooks : []
  const fears = Array.isArray(character.fears) ? character.fears : []
  const weaknesses = Array.isArray(character.weaknesses) ? character.weaknesses : []
  const dmQa = Array.isArray(character.dm_qa) ? character.dm_qa : []
  const rumors = Array.isArray(character.rumors) ? character.rumors : []
  const possessions = Array.isArray(character.possessions) ? character.possessions : []

  return (
    <div className={cn('space-y-6', className)}>
      {/* ================================================================== */}
      {/* HEADER */}
      {/* ================================================================== */}
      <div className="flex items-start gap-6">
        {/* Avatar */}
        <div className="w-32 h-32 rounded-2xl bg-purple-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-purple-500/30">
          {character.image_url ? (
            <img
              src={character.image_url}
              alt={character.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-4xl font-bold text-purple-400">
              {getInitials(character.name || '')}
            </span>
          )}
        </div>

        {/* Name and basic info */}
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold text-white">{character.name}</h1>
            {character.status && (
              <span
                className="text-sm px-3 py-1 rounded-full font-medium"
                style={{
                  backgroundColor: `${character.status_color || '#6b7280'}20`,
                  color: character.status_color || '#6b7280',
                }}
              >
                {character.status}
              </span>
            )}
            <Tag color={character.type === 'pc' ? 'purple' : 'gray'}>
              {character.type === 'pc' ? 'Player Character' : 'NPC'}
            </Tag>
          </div>

          {/* Class/race badges */}
          <div className="flex flex-wrap gap-2 mt-3">
            {character.race && <Tag color="gray">{character.race}</Tag>}
            {character.class && (
              <Tag color="purple">
                {character.class}
                {character.subclass && ` (${character.subclass})`}
                {character.level && ` • Lvl ${character.level}`}
              </Tag>
            )}
            {character.background && <Tag color="gray">{character.background}</Tag>}
            {character.alignment && <Tag color="blue">{character.alignment}</Tag>}
          </div>

          {/* Summary */}
          {character.summary && (
            <p className="text-gray-400 mt-4 text-sm leading-relaxed">
              {character.summary}
            </p>
          )}
        </div>
      </div>

      {/* ================================================================== */}
      {/* TL;DR */}
      {/* ================================================================== */}
      {tldr.length > 0 && (
        <Section title="TL;DR" icon={Lightbulb} count={tldr.length} color="amber">
          <ul className="space-y-2">
            {tldr.map((item, i) => (
              <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                <span className="text-purple-400 flex-shrink-0">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ================================================================== */}
      {/* OVERVIEW - Basic Info Grid */}
      {/* ================================================================== */}
      <Section title="Overview" icon={User} defaultOpen={true}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <InfoCard label="Age" value={character.age} />
          <InfoCard label="Pronouns" value={character.pronouns} />
          <InfoCard label="Deity" value={character.deity} icon="🙏" />
          <InfoCard label="Party" value={character.party_name} icon="👥" />
          <InfoCard label="Campaign" value={character.dm_name} icon="🎲" />
          <InfoCard label="Game System" value={character.game_system} />
        </div>
      </Section>

      {/* ================================================================== */}
      {/* APPEARANCE */}
      {/* ================================================================== */}
      {(character.appearance || character.height || character.hair || character.eyes) && (
        <Section title="Appearance" icon={Eye} defaultOpen={true}>
          {character.appearance && (
            <div className="text-sm text-gray-300 mb-4">
              {renderMarkdown(character.appearance)}
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <InfoCard label="Height" value={character.height} />
            <InfoCard label="Weight" value={character.weight} />
            <InfoCard label="Hair" value={character.hair} />
            <InfoCard label="Eyes" value={character.eyes} />
            <InfoCard label="Skin" value={character.skin} />
            <InfoCard label="Voice" value={character.voice} icon="🗣️" />
          </div>
          {character.distinguishing_marks && (
            <div className="mt-4">
              <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                Distinguishing Marks
              </div>
              <div className="text-sm text-gray-300">
                {renderMarkdown(character.distinguishing_marks)}
              </div>
            </div>
          )}
          {character.typical_attire && (
            <div className="mt-4">
              <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                Typical Attire
              </div>
              <div className="text-sm text-gray-300">
                {renderMarkdown(character.typical_attire)}
              </div>
            </div>
          )}
        </Section>
      )}

      {/* ================================================================== */}
      {/* PERSONALITY */}
      {/* ================================================================== */}
      {(character.personality || character.ideals || character.bonds || character.flaws) && (
        <Section title="Personality" icon={Heart} defaultOpen={true} color="red">
          {character.personality && (
            <div className="text-sm text-gray-300 mb-4">
              {renderMarkdown(character.personality)}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {character.ideals && (
              <div className="bg-white/[0.03] rounded-lg p-3">
                <div className="text-[10px] font-medium text-blue-400 uppercase tracking-wider mb-2">
                  ⭐ Ideals
                </div>
                <div className="text-sm text-gray-300">{renderMarkdown(character.ideals)}</div>
              </div>
            )}
            {character.bonds && (
              <div className="bg-white/[0.03] rounded-lg p-3">
                <div className="text-[10px] font-medium text-green-400 uppercase tracking-wider mb-2">
                  🔗 Bonds
                </div>
                <div className="text-sm text-gray-300">{renderMarkdown(character.bonds)}</div>
              </div>
            )}
            {character.flaws && (
              <div className="bg-white/[0.03] rounded-lg p-3">
                <div className="text-[10px] font-medium text-red-400 uppercase tracking-wider mb-2">
                  💔 Flaws
                </div>
                <div className="text-sm text-gray-300">{renderMarkdown(character.flaws)}</div>
              </div>
            )}
            {character.mannerisms && (
              <div className="bg-white/[0.03] rounded-lg p-3">
                <div className="text-[10px] font-medium text-purple-400 uppercase tracking-wider mb-2">
                  🎭 Mannerisms
                </div>
                <div className="text-sm text-gray-300">{renderMarkdown(character.mannerisms)}</div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ================================================================== */}
      {/* FEARS & WEAKNESSES */}
      {/* ================================================================== */}
      {(fears.length > 0 || weaknesses.length > 0) && (
        <Section title="Fears & Weaknesses" icon={AlertTriangle} count={fears.length + weaknesses.length} color="amber">
          <div className="flex flex-wrap gap-2">
            {fears.map((fear, i) => (
              <Tag key={`fear-${i}`} color="orange">
                😨 {fear}
              </Tag>
            ))}
            {weaknesses.map((weakness, i) => (
              <Tag key={`weak-${i}`} color="red">
                ⚠️ {weakness}
              </Tag>
            ))}
          </div>
        </Section>
      )}

      {/* ================================================================== */}
      {/* QUOTES */}
      {/* ================================================================== */}
      {quotes.length > 0 && (
        <Section title="Quotes" icon={Quote} count={quotes.length} color="green">
          <div className="space-y-3">
            {quotes.map((quote, i) => (
              <blockquote
                key={i}
                className="text-sm text-gray-300 italic border-l-2 border-purple-500/50 pl-4 py-1"
              >
                "{quote}"
              </blockquote>
            ))}
          </div>
        </Section>
      )}

      {/* ================================================================== */}
      {/* BACKSTORY */}
      {/* ================================================================== */}
      {character.backstory && (
        <Section title="Backstory" icon={BookOpen} defaultOpen={true}>
          <div className="text-sm text-gray-300 leading-relaxed">
            {renderMarkdown(character.backstory)}
          </div>
        </Section>
      )}

      {/* ================================================================== */}
      {/* LIFE PHASES */}
      {/* ================================================================== */}
      {backstoryPhases.length > 0 && (
        <Section title="Life Phases" icon={Scroll} count={backstoryPhases.length} color="purple">
          <div className="space-y-4">
            {backstoryPhases.map((phase: { title: string; content: string }, i: number) => (
              <div
                key={i}
                className="bg-white/[0.02] rounded-lg p-4 border-l-4 border-purple-500/50"
              >
                <h5 className="text-sm font-semibold text-purple-400 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-xs">
                    {i + 1}
                  </span>
                  {phase.title}
                </h5>
                <div className="text-sm text-gray-400 pl-8">
                  {renderMarkdown(phase.content)}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ================================================================== */}
      {/* GOALS & SECRETS */}
      {/* ================================================================== */}
      {(character.goals || character.secrets) && (
        <Section title="Goals & Secrets" icon={Target} defaultOpen={true}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {character.goals && (
              <div className="bg-white/[0.03] rounded-lg p-4">
                <div className="text-[10px] font-medium text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  ⭐ Goals
                </div>
                <div className="text-sm text-gray-300">{renderMarkdown(character.goals)}</div>
              </div>
            )}
            {character.secrets && (
              <div className="bg-white/[0.03] rounded-lg p-4">
                <div className="text-[10px] font-medium text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  🔒 Secrets
                </div>
                <div className="text-sm text-gray-300">{renderMarkdown(character.secrets)}</div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ================================================================== */}
      {/* PLOT HOOKS */}
      {/* ================================================================== */}
      {plotHooks.length > 0 && (
        <Section title="Plot Hooks" icon={Target} count={plotHooks.length} color="amber">
          <ul className="space-y-2">
            {plotHooks.map((hook, i) => (
              <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                <span className="text-amber-400 flex-shrink-0">💡</span>
                <span>{hook}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ================================================================== */}
      {/* RELATIONSHIPS (NPCs) */}
      {/* ================================================================== */}
      {npcs.length > 0 && (
        <Section title="Relationships" icon={Users} count={npcs.length} color="blue">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {npcs.map((npc) => {
              const relationshipColor = RELATIONSHIP_COLORS[npc.relationship_type] || RELATIONSHIP_COLORS.other
              return (
                <div
                  key={npc.id}
                  className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3"
                >
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    {npc.related_image_url ? (
                      <img
                        src={npc.related_image_url}
                        alt={npc.related_name || 'NPC'}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <span className="font-medium text-white/90">{npc.related_name || 'Unknown'}</span>
                      {npc.nickname && (
                        <span className="text-sm text-gray-500 italic ml-2">"{npc.nickname}"</span>
                      )}
                    </div>
                    <span className={cn('text-xs px-2 py-0.5 rounded-md capitalize border', relationshipColor)}>
                      {npc.relationship_type?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {npc.occupation && (
                    <p className="text-xs text-gray-500">💼 {npc.occupation}</p>
                  )}
                  {npc.location && (
                    <p className="text-xs text-gray-500">📍 {npc.location}</p>
                  )}
                  {npc.description && (
                    <p className="text-sm text-gray-400 mt-2">{npc.description}</p>
                  )}
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* ================================================================== */}
      {/* COMPANIONS */}
      {/* ================================================================== */}
      {companions.length > 0 && (
        <Section title="Companions" icon={Heart} count={companions.length} color="red">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {companions.map((companion) => {
              const typeColor = COMPANION_TYPE_COLORS[companion.companion_type || 'other'] || COMPANION_TYPE_COLORS.other
              return (
                <div
                  key={companion.id}
                  className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3"
                >
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    {companion.related_image_url ? (
                      <img
                        src={companion.related_image_url}
                        alt={companion.related_name || 'Companion'}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                        <Heart className="w-5 h-5 text-pink-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <span className="font-medium text-white/90">{companion.related_name || 'Unknown'}</span>
                      {companion.companion_species && (
                        <span className="text-sm text-gray-500 ml-2">({companion.companion_species})</span>
                      )}
                    </div>
                    {companion.companion_type && (
                      <span className={cn('text-xs px-2 py-0.5 rounded-md capitalize border', typeColor)}>
                        {companion.companion_type.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                  {companion.description && (
                    <p className="text-sm text-gray-400">{companion.description}</p>
                  )}
                  {companion.companion_abilities && (
                    <p className="text-xs text-gray-500 mt-1">✨ {companion.companion_abilities}</p>
                  )}
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* ================================================================== */}
      {/* POSSESSIONS & INVENTORY */}
      {/* ================================================================== */}
      {(possessions.length > 0 || character.gold || character.inventory) && (
        <Section title="Possessions & Inventory" icon={Briefcase} color="amber">
          {character.gold && (
            <div className="flex items-center gap-2 mb-4 text-amber-400">
              <Coins className="w-5 h-5" />
              <span className="font-semibold">{character.gold} Gold</span>
            </div>
          )}
          {possessions.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {possessions.map((item, i: number) => (
                <Tag key={i} color="amber">
                  {typeof item === 'string' ? item : typeof item === 'object' && item && 'name' in item ? String(item.name) : String(item)}
                </Tag>
              ))}
            </div>
          )}
          {character.inventory && (
            <div className="text-sm text-gray-300">
              {renderMarkdown(typeof character.inventory === 'string' ? character.inventory : JSON.stringify(character.inventory))}
            </div>
          )}
        </Section>
      )}

      {/* ================================================================== */}
      {/* DM Q&A */}
      {/* ================================================================== */}
      {dmQa.length > 0 && (
        <Section title="DM Q&A" icon={HelpCircle} count={dmQa.length}>
          <div className="space-y-3">
            {dmQa.map((qa, i: number) => {
              const qaObj = qa as { question?: string; answer?: string } | null
              if (!qaObj) return null
              return (
                <div key={i} className="bg-white/[0.02] rounded-lg p-3">
                  <p className="text-sm text-purple-400 font-medium mb-1">
                    <MessageSquare className="w-3 h-3 inline mr-1" />
                    Q: {qaObj.question || ''}
                  </p>
                  <p className="text-sm text-gray-400 pl-4">A: {qaObj.answer || ''}</p>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* ================================================================== */}
      {/* RUMORS */}
      {/* ================================================================== */}
      {rumors.length > 0 && (
        <Section title="Rumors" count={rumors.length}>
          <ul className="space-y-2">
            {rumors.map((rumor, i: number) => {
              const rumorObj = rumor as { statement?: string; is_true?: boolean } | null
              if (!rumorObj) return null
              const isTrue = rumorObj.is_true ?? false
              return (
                <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                  <span className={isTrue ? 'text-green-400' : 'text-red-400'}>
                    {isTrue ? '✓' : '✗'}
                  </span>
                  <span>{rumorObj.statement || ''}</span>
                  <span className={cn('text-xs', isTrue ? 'text-green-400/60' : 'text-red-400/60')}>
                    ({isTrue ? 'true' : 'false'})
                  </span>
                </li>
              )
            })}
          </ul>
        </Section>
      )}

      {/* ================================================================== */}
      {/* DM NOTES (Collapsible) */}
      {/* ================================================================== */}
      {character.dm_notes && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl overflow-hidden">
          <button
            onClick={() => setDmNotesVisible(!dmNotesVisible)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-500/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
                DM Notes
              </h3>
              {!dmNotesVisible && (
                <span className="text-xs text-amber-400/60">(Click to reveal)</span>
              )}
            </div>
            {dmNotesVisible ? (
              <EyeOff className="w-4 h-4 text-amber-400" />
            ) : (
              <Eye className="w-4 h-4 text-amber-400" />
            )}
          </button>
          {dmNotesVisible && (
            <div className="px-4 pb-4 text-sm text-gray-300">
              {renderMarkdown(character.dm_notes)}
            </div>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* EXTERNAL LINKS */}
      {/* ================================================================== */}
      {(character.theme_music_url || character.character_sheet_url) && (
        <Section title="Links & Media" icon={ExternalLink} color="gray">
          <div className="flex flex-wrap gap-3">
            {character.theme_music_url && (
              <a
                href={character.theme_music_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-sm text-gray-300"
              >
                <Music className="w-4 h-4 text-purple-400" />
                Theme Music
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {character.character_sheet_url && (
              <a
                href={character.character_sheet_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-sm text-gray-300"
              >
                <Shield className="w-4 h-4 text-blue-400" />
                Character Sheet
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </Section>
      )}

      {/* ================================================================== */}
      {/* PLAYER INFO (for PCs) */}
      {/* ================================================================== */}
      {character.type === 'pc' && (character.player_discord || character.player_timezone) && (
        <Section title="Player Info" icon={User} color="gray" defaultOpen={false}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <InfoCard label="Discord" value={character.player_discord} />
            <InfoCard label="Timezone" value={character.player_timezone} />
            <InfoCard label="Experience" value={character.player_experience} />
          </div>
          {character.player_preferences && (
            <div className="mt-4">
              <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                Preferences
              </div>
              <div className="text-sm text-gray-300">
                {typeof character.player_preferences === 'string' && renderMarkdown(character.player_preferences)}
              </div>
            </div>
          )}
        </Section>
      )}
    </div>
  )
}
