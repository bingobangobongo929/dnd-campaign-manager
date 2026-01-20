'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Upload,
  FileText,
  Users,
  Heart,
  Scroll,
  BookOpen,
  Table2,
  Check,
  X,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  User,
  Quote,
  Target,
  FileQuestion,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { MobileLayout } from '@/components/mobile'
import { useIsMobile } from '@/hooks'
import { cn } from '@/lib/utils'

// Types for parsed data
interface BackstoryPhase {
  title: string
  content: string
}

interface NPC {
  name: string
  nickname?: string | null
  relationship_type: string
  relationship_label?: string | null
  faction_affiliations?: string[]
  location?: string | null
  occupation?: string | null
  needs?: string | null
  can_provide?: string | null
  goals?: string | null
  secrets?: string | null
  personality_traits?: string[]
  full_notes: string
  relationship_status?: string
}

interface Companion {
  name: string
  companion_type: string
  companion_species: string
  description?: string | null
  abilities?: string | null
}

interface SessionNote {
  session_number: number
  session_date?: string | null
  title?: string | null
  campaign_name?: string | null
  summary?: string | null
  notes: string
  kill_count?: number | null
  loot?: string | null
  thoughts_for_next?: string | null
  npcs_met?: string[]
  locations_visited?: string[]
}

interface Writing {
  title: string
  writing_type: string
  content: string
  recipient?: string | null
  in_universe_date?: string | null
}

interface ReferenceTable {
  title: string
  headers: string[]
  rows: string[][]
}

interface ParsedCharacter {
  name: string
  race?: string | null
  class?: string | null
  subclass?: string | null
  level?: number | null
  age?: string | null
  pronouns?: string | null
  background?: string | null
  alignment?: string | null
  backstory?: string | null
  backstory_phases?: BackstoryPhase[]
  tldr?: string[]
  appearance?: string | null
  personality?: string | null
  ideals?: string | null
  bonds?: string | null
  flaws?: string | null
  goals?: string | null
  secrets?: string | null
  fears?: string[]
  quotes?: string[]
  plot_hooks?: string[]
  pre_session_hook?: string | null
  theme_music_url?: string | null
  character_sheet_url?: string | null
  player_discord?: string | null
  player_timezone?: string | null
  player_experience?: string | null
  gameplay_tips?: string[]
  possessions?: { name: string; quantity: number; notes?: string }[]
  gold?: number | null
  rumors?: { statement: string; is_true: boolean }[]
  dm_qa?: { question: string; answer: string }[]
}

interface ParsedData {
  character: ParsedCharacter
  npcs?: NPC[]
  companions?: Companion[]
  session_notes?: SessionNote[]
  writings?: Writing[]
  reference_tables?: ReferenceTable[]
  secondary_characters?: { name: string; concept: string; notes?: string }[]
  unclassified_content?: string | null
}

interface ParseStats {
  characterName: string
  npcCount: number
  companionCount: number
  sessionCount: number
  writingCount: number
  quoteCount: number
  plotHookCount: number
  tldrCount: number
  hasBackstory: boolean
  backstoryLength: number
  backstoryPhaseCount: number
  backstoryPhases: string[]
  dmQaCount: number
  rumorCount: number
  fearCount: number
  referenceTableCount: number
  secondaryCharacterCount: number
  hasUnclassifiedContent: boolean
  unclassifiedContentLength: number
}

// Section approval states
type SectionStatus = 'pending' | 'approved' | 'rejected'

interface SectionApproval {
  character: SectionStatus
  npcs: SectionStatus
  companions: SectionStatus
  sessions: SectionStatus
  writings: SectionStatus
  tables: SectionStatus
}

// Relationship type colors (matching NPCCard)
const RELATIONSHIP_COLORS: Record<string, string> = {
  family: 'bg-red-500/15 text-red-400 border-red-500/20',
  mentor: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  friend: 'bg-green-500/15 text-green-400 border-green-500/20',
  enemy: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  patron: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  contact: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  ally: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  employer: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  love_interest: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  rival: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  acquaintance: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
  party_member: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
  other: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
}

// Companion type colors (matching CompanionCard)
const COMPANION_TYPE_COLORS: Record<string, string> = {
  familiar: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  pet: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  mount: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  animal_companion: 'bg-green-500/15 text-green-400 border-green-500/20',
  construct: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  other: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
}

// Helper to render markdown text with basic formatting
function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null

  // First, normalize the text:
  // - Handle escaped newlines from JSON (\\n → actual newline)
  // - Handle literal \n strings that didn't get parsed
  let normalizedText = text
    .replace(/\\n/g, '\n')  // Escaped newlines to actual newlines

  // Split by newlines and process each line
  const lines = normalizedText.split('\n')

  return lines.map((line, lineIndex) => {
    // Process inline formatting
    let processed: React.ReactNode[] = []
    let remaining = line
    let keyIndex = 0

    // Handle bold (**text** or __text__)
    // Use a more permissive regex that allows asterisks within the bold text
    const boldRegex = /\*\*(.+?)\*\*|__(.+?)__/g
    let lastIndex = 0
    let match

    while ((match = boldRegex.exec(remaining)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        processed.push(remaining.slice(lastIndex, match.index))
      }
      // Add bold text
      processed.push(
        <strong key={`b-${lineIndex}-${keyIndex++}`} className="text-white/90 font-semibold">
          {match[1] || match[2]}
        </strong>
      )
      lastIndex = match.index + match[0].length
    }

    // Add remaining text after last match
    if (lastIndex < remaining.length) {
      // Process remaining text for italics (*text* or _text_)
      const remainingStr = remaining.slice(lastIndex)
      const italicRegex = /(?<![*\w])\*([^*]+)\*(?![*\w])|(?<![_\w])_([^_]+)_(?![_\w])/g
      let italicLastIndex = 0
      let italicMatch

      while ((italicMatch = italicRegex.exec(remainingStr)) !== null) {
        if (italicMatch.index > italicLastIndex) {
          processed.push(remainingStr.slice(italicLastIndex, italicMatch.index))
        }
        processed.push(
          <em key={`i-${lineIndex}-${keyIndex++}`} className="text-gray-300 italic">
            {italicMatch[1] || italicMatch[2]}
          </em>
        )
        italicLastIndex = italicMatch.index + italicMatch[0].length
      }

      if (italicLastIndex < remainingStr.length) {
        processed.push(remainingStr.slice(italicLastIndex))
      } else if (italicLastIndex === 0) {
        processed.push(remainingStr)
      }
    }

    // If no formatting was found, just use the line
    if (processed.length === 0) {
      processed = [line]
    }

    // Check if line is a bullet point
    const trimmedLine = line.trim()
    const isBullet = trimmedLine.startsWith('- ') || trimmedLine.startsWith('• ') || trimmedLine.startsWith('* ')

    if (isBullet) {
      const bulletContent = processed.map((p, i) =>
        typeof p === 'string' ? p.replace(/^[\s]*[-•*]\s*/, '') : p
      )
      return (
        <div key={lineIndex} className="flex items-start gap-2 ml-2">
          <span className="text-purple-400 flex-shrink-0">•</span>
          <span>{bulletContent}</span>
        </div>
      )
    }

    // Regular line
    return (
      <div key={lineIndex}>
        {processed}
        {lineIndex < lines.length - 1 && line === '' && <br />}
      </div>
    )
  })
}

export default function VaultImportPage() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const importResultRef = useRef<HTMLDivElement>(null)

  // State
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [stats, setStats] = useState<ParseStats | null>(null)
  const [sourceFileName, setSourceFileName] = useState<string | null>(null)

  // Approval state
  const [approvals, setApprovals] = useState<SectionApproval>({
    character: 'pending',
    npcs: 'pending',
    companions: 'pending',
    sessions: 'pending',
    writings: 'pending',
    tables: 'pending',
  })

  // Expanded sections
  const [expandedSections, setExpandedSections] = useState({
    character: true,
    npcs: true,
    companions: true,
    sessions: false,
    writings: false,
    tables: false,
  })

  // Import state
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    success: boolean
    message: string
    characterId?: string
    stats?: {
      npcsImported: number
      companionsImported: number
      sessionsImported: number
      writingsImported: number
    }
  } | null>(null)

  // Auto-scroll to import result when it appears
  useEffect(() => {
    if (importResult && importResultRef.current) {
      importResultRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [importResult])

  // File handling
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      setFile(droppedFile)
      setParseError(null)
      setParsedData(null)
      setImportResult(null)
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setParseError(null)
      setParsedData(null)
      setImportResult(null)
    }
  }, [])

  // Parse file with Gemini
  const handleParseFile = useCallback(async () => {
    if (!file) return

    setParsing(true)
    setParseError(null)
    setParsedData(null)
    setStats(null)
    setApprovals({
      character: 'pending',
      npcs: 'pending',
      companions: 'pending',
      sessions: 'pending',
      writings: 'pending',
      tables: 'pending',
    })

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/vault/parse-file', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to parse document')
      }

      if (result.success && result.parsed) {
        setParsedData(result.parsed)
        setStats(result.stats)
        setSourceFileName(result.sourceFile)
      } else {
        throw new Error(result.error || 'Invalid response from parser')
      }
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Failed to parse document')
    } finally {
      setParsing(false)
    }
  }, [file])

  // Toggle section approval (without scrolling)
  const toggleApproval = (section: keyof SectionApproval, e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    setApprovals(prev => ({
      ...prev,
      [section]: prev[section] === 'approved' ? 'rejected' : 'approved',
    }))
  }

  // Toggle section expansion
  const toggleExpanded = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  // Check if any section is approved
  const hasApprovedSections = Object.values(approvals).some(s => s === 'approved')

  // Approve all sections that have content
  const approveAll = () => {
    if (!parsedData) return
    setApprovals({
      character: parsedData.character ? 'approved' : 'pending',
      npcs: parsedData.npcs && parsedData.npcs.length > 0 ? 'approved' : 'pending',
      companions: parsedData.companions && parsedData.companions.length > 0 ? 'approved' : 'pending',
      sessions: parsedData.session_notes && parsedData.session_notes.length > 0 ? 'approved' : 'pending',
      writings: parsedData.writings && parsedData.writings.length > 0 ? 'approved' : 'pending',
      tables: parsedData.reference_tables && parsedData.reference_tables.length > 0 ? 'approved' : 'pending',
    })
  }

  // Check if all sections with content are approved
  const allApproved = !!(parsedData && (
    (!parsedData.character || approvals.character === 'approved') &&
    (!parsedData.npcs?.length || approvals.npcs === 'approved') &&
    (!parsedData.companions?.length || approvals.companions === 'approved') &&
    (!parsedData.session_notes?.length || approvals.sessions === 'approved') &&
    (!parsedData.writings?.length || approvals.writings === 'approved') &&
    (!parsedData.reference_tables?.length || approvals.tables === 'approved')
  ))

  // Import approved sections
  const handleImport = useCallback(async () => {
    if (!parsedData || !hasApprovedSections) return

    setImporting(true)
    setImportResult(null)

    try {
      // Build the import payload based on approvals
      const importData: any = {
        character: parsedData.character,
        npcs: approvals.npcs === 'approved' ? parsedData.npcs : [],
        companions: approvals.companions === 'approved' ? parsedData.companions : [],
        session_notes: approvals.sessions === 'approved' ? parsedData.session_notes : [],
        writings: approvals.writings === 'approved' ? parsedData.writings : [],
        reference_tables: approvals.tables === 'approved' ? parsedData.reference_tables : [],
        secondary_characters: parsedData.secondary_characters || [],
      }

      // Add source file info
      if (sourceFileName) {
        importData.sourceFile = sourceFileName
      }

      // Include unclassified content to ensure zero data loss
      if (parsedData.unclassified_content) {
        importData.unclassified_content = parsedData.unclassified_content
      }

      const response = await fetch('/api/vault/import-structured', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importData),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setImportResult({
          success: true,
          message: result.message || 'Character imported successfully!',
          characterId: result.results?.character_id,
          stats: {
            npcsImported: result.results?.npcs_created || 0,
            companionsImported: result.results?.companions_created || 0,
            sessionsImported: result.results?.sessions_created || 0,
            writingsImported: result.results?.writings_created || 0,
          },
        })
      } else {
        throw new Error(result.error || 'Import failed')
      }
    } catch (error) {
      setImportResult({
        success: false,
        message: error instanceof Error ? error.message : 'Import failed',
      })
    } finally {
      setImporting(false)
    }
  }, [parsedData, approvals, sourceFileName, hasApprovedSections])

  // Toggle NPC between party_member and their original/default relationship type
  const toggleNpcPartyMember = useCallback((npcIndex: number) => {
    if (!parsedData?.npcs) return

    setParsedData(prev => {
      if (!prev?.npcs) return prev

      const updatedNpcs = [...prev.npcs]
      const npc = { ...updatedNpcs[npcIndex] }

      if (npc.relationship_type === 'party_member') {
        // Switch back to a default NPC type (friend or acquaintance)
        npc.relationship_type = 'friend'
        // Keep the relationship_label if it was previously set, otherwise clear it
        if (npc.relationship_label === 'Party Member') {
          npc.relationship_label = null
        }
      } else {
        // Switch to party_member
        npc.relationship_type = 'party_member'
      }

      updatedNpcs[npcIndex] = npc
      return { ...prev, npcs: updatedNpcs }
    })
  }, [parsedData])

  // Section header with approval controls
  const SectionHeader = ({
    title,
    icon: Icon,
    count,
    section,
    hasContent,
  }: {
    title: string
    icon: React.ComponentType<{ className?: string }>
    count?: number
    section: keyof SectionApproval
    hasContent: boolean
  }) => {
    const status = approvals[section]
    const isExpanded = expandedSections[section as keyof typeof expandedSections]

    if (!hasContent) return null

    return (
      <div className="border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 bg-white/[0.02]">
          <button
            onClick={() => toggleExpanded(section as keyof typeof expandedSections)}
            className="flex items-center gap-3 flex-1 text-left"
          >
            <Icon className="w-5 h-5 text-purple-400" />
            <span className="font-medium text-white">
              {title}
              {count !== undefined && count > 0 && (
                <span className="ml-2 text-sm text-gray-500">({count})</span>
              )}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500 ml-auto" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500 ml-auto" />
            )}
          </button>

          {/* Approval buttons */}
          <div className="flex items-center gap-2 ml-4">
            <button
              type="button"
              onClick={(e) => toggleApproval(section, e)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                status === 'approved'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : status === 'rejected'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-white/[0.04] text-gray-400 border border-white/[0.06] hover:bg-white/[0.08]'
              )}
            >
              {status === 'approved' ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Approved
                </>
              ) : status === 'rejected' ? (
                <>
                  <XCircle className="w-4 h-4" />
                  Rejected
                </>
              ) : (
                <>
                  <FileQuestion className="w-4 h-4" />
                  Pending
                </>
              )}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="p-4 border-t border-white/[0.06]">
            {/* Content rendered based on section type */}
            {section === 'character' && parsedData?.character && (
              <CharacterPreview character={parsedData.character} />
            )}
            {section === 'npcs' && parsedData?.npcs && (
              <NPCsPreview npcs={parsedData.npcs} onTogglePartyMember={toggleNpcPartyMember} />
            )}
            {section === 'companions' && parsedData?.companions && (
              <CompanionsPreview companions={parsedData.companions} />
            )}
            {section === 'sessions' && parsedData?.session_notes && (
              <SessionsPreview sessions={parsedData.session_notes} />
            )}
            {section === 'writings' && parsedData?.writings && (
              <WritingsPreview writings={parsedData.writings} />
            )}
            {section === 'tables' && parsedData?.reference_tables && (
              <TablesPreview tables={parsedData.reference_tables} />
            )}
          </div>
        )}
      </div>
    )
  }

  // Character preview component
  const CharacterPreview = ({ character }: { character: ParsedCharacter }) => (
    <div className="space-y-4">
      {/* Basic info */}
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
          <User className="w-8 h-8 text-purple-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white">{character.name}</h3>
          <div className="flex flex-wrap gap-2 mt-1">
            {character.race && (
              <span className="text-xs px-2 py-0.5 bg-white/[0.04] text-gray-400 rounded">
                {character.race}
              </span>
            )}
            {character.class && (
              <span className="text-xs px-2 py-0.5 bg-purple-500/15 text-purple-400 rounded">
                {character.class}
                {character.subclass && ` (${character.subclass})`}
                {character.level && ` Lvl ${character.level}`}
              </span>
            )}
            {character.background && (
              <span className="text-xs px-2 py-0.5 bg-white/[0.04] text-gray-400 rounded">
                {character.background}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Backstory - FULL content */}
      {character.backstory && (
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Backstory ({character.backstory.length.toLocaleString()} characters)
          </h4>
          <div className="text-sm text-gray-400 bg-white/[0.02] rounded-lg p-3 max-h-96 overflow-y-auto">
            {renderMarkdown(character.backstory)}
          </div>
        </div>
      )}

      {/* Backstory Phases - CRITICAL: These are often missed! */}
      {character.backstory_phases && character.backstory_phases.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Backstory Phases ({character.backstory_phases.length} phases)
          </h4>
          <div className="space-y-3">
            {character.backstory_phases.map((phase, i) => (
              <div key={i} className="bg-white/[0.02] rounded-lg p-3 border-l-2 border-purple-500/50">
                <h5 className="text-sm font-medium text-purple-400 mb-2">{phase.title}</h5>
                <div className="text-sm text-gray-400">
                  {renderMarkdown(phase.content)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TL;DR - ALL items */}
      {character.tldr && character.tldr.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            TL;DR ({character.tldr.length} points)
          </h4>
          <ul className="space-y-1">
            {character.tldr.map((item, i) => (
              <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                <span className="text-purple-400">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quotes - ALL quotes */}
      {character.quotes && character.quotes.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Quote className="w-3 h-3" />
            Quotes ({character.quotes.length})
          </h4>
          <div className="space-y-1">
            {character.quotes.map((quote, i) => (
              <p key={i} className="text-sm text-gray-400 italic">"{quote}"</p>
            ))}
          </div>
        </div>
      )}

      {/* Plot hooks - ALL hooks */}
      {character.plot_hooks && character.plot_hooks.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Target className="w-3 h-3" />
            Plot Hooks ({character.plot_hooks.length})
          </h4>
          <ul className="space-y-1">
            {character.plot_hooks.map((hook, i) => (
              <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                <span className="text-amber-400">•</span>
                <span>{hook}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* DM Q&A */}
      {character.dm_qa && character.dm_qa.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            DM Q&A ({character.dm_qa.length} questions)
          </h4>
          <div className="space-y-2">
            {character.dm_qa.map((qa, i) => (
              <div key={i} className="bg-white/[0.02] rounded-lg p-3">
                <p className="text-sm text-purple-400 font-medium mb-1">Q: {qa.question}</p>
                <p className="text-sm text-gray-400">A: {qa.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rumors */}
      {character.rumors && character.rumors.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Rumors ({character.rumors.length})
          </h4>
          <ul className="space-y-1">
            {character.rumors.map((rumor, i) => (
              <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                <span className={rumor.is_true ? 'text-green-400' : 'text-red-400'}>
                  {rumor.is_true ? '✓' : '✗'}
                </span>
                <span>{rumor.statement}</span>
                <span className={`text-xs ${rumor.is_true ? 'text-green-400/60' : 'text-red-400/60'}`}>
                  ({rumor.is_true ? 'true' : 'false'})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Fears */}
      {character.fears && character.fears.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Fears ({character.fears.length})
          </h4>
          <ul className="space-y-1">
            {character.fears.map((fear, i) => (
              <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                <span className="text-orange-400">•</span>
                <span>{fear}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )

  // NPCs preview component - FULL content, no truncation
  const NPCsPreview = ({ npcs, onTogglePartyMember }: { npcs: NPC[]; onTogglePartyMember: (index: number) => void }) => (
    <div className="space-y-3">
      {npcs.map((npc, i) => {
        const relationshipColor = RELATIONSHIP_COLORS[npc.relationship_type] || RELATIONSHIP_COLORS.other
        const isPartyMember = npc.relationship_type === 'party_member'
        return (
          <div
            key={i}
            className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap flex-1">
                <span className="font-medium text-white/90">{npc.name}</span>
                {npc.nickname && (
                  <span className="text-sm text-gray-500 italic">"{npc.nickname}"</span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-md capitalize border ${relationshipColor}`}>
                  {npc.relationship_label || npc.relationship_type.replace(/_/g, ' ')}
                </span>
                {npc.relationship_status && npc.relationship_status !== 'active' && (
                  <span className="text-xs px-2 py-0.5 bg-gray-500/15 text-gray-400 rounded capitalize">
                    {npc.relationship_status}
                  </span>
                )}
              </div>
              {/* Toggle party member / NPC button */}
              <button
                onClick={() => onTogglePartyMember(i)}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors",
                  isPartyMember
                    ? "bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30"
                    : "bg-gray-500/15 text-gray-400 hover:bg-gray-500/25"
                )}
                title={isPartyMember ? "Click to change to NPC" : "Click to change to Party Member"}
              >
                <Users className="w-3.5 h-3.5" />
                {isPartyMember ? 'PC' : 'NPC'}
              </button>
            </div>
            {npc.occupation && (
              <p className="text-xs text-gray-500 mt-1">💼 {npc.occupation}</p>
            )}
            {npc.location && (
              <p className="text-xs text-gray-500 mt-1">📍 {npc.location}</p>
            )}
            {npc.faction_affiliations && npc.faction_affiliations.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">🏛️ {npc.faction_affiliations.join(', ')}</p>
            )}
            {npc.needs && (
              <p className="text-xs text-gray-500 mt-1">🎯 Needs: {npc.needs}</p>
            )}
            {npc.can_provide && (
              <p className="text-xs text-gray-500 mt-1">🎁 Can provide: {npc.can_provide}</p>
            )}
            {npc.goals && (
              <p className="text-xs text-gray-500 mt-1">⭐ Goals: {npc.goals}</p>
            )}
            {npc.secrets && (
              <p className="text-xs text-amber-400/70 mt-1">🔒 Secrets: {npc.secrets}</p>
            )}
            {npc.full_notes && (
              <div className="mt-2 pt-2 border-t border-white/[0.06]">
                <p className="text-xs text-gray-500 mb-1">Full Notes:</p>
                <div className="text-xs text-gray-400">
                  {renderMarkdown(npc.full_notes)}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  // Companions preview component - FULL content
  const CompanionsPreview = ({ companions }: { companions: Companion[] }) => (
    <div className="space-y-3">
      {companions.map((companion, i) => {
        const typeColor = COMPANION_TYPE_COLORS[companion.companion_type] || COMPANION_TYPE_COLORS.other
        return (
          <div
            key={i}
            className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3"
          >
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-400" />
              <span className="font-medium text-white/90">{companion.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-md capitalize border ${typeColor}`}>
                {companion.companion_type.replace(/_/g, ' ')}
              </span>
              {companion.companion_species && (
                <span className="text-xs text-gray-500">({companion.companion_species})</span>
              )}
            </div>
            {companion.description && (
              <div className="text-xs text-gray-400 mt-2">{renderMarkdown(companion.description)}</div>
            )}
            {companion.abilities && (
              <p className="text-xs text-purple-400/80 mt-1">✨ Abilities: {companion.abilities}</p>
            )}
          </div>
        )
      })}
    </div>
  )

  // Sessions preview component - FULL content
  const SessionsPreview = ({ sessions }: { sessions: SessionNote[] }) => (
    <div className="space-y-3">
      {sessions.map((session, i) => (
        <div
          key={i}
          className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm px-2 py-0.5 bg-yellow-500/15 text-yellow-400 rounded font-medium">
              Session {session.session_number}
            </span>
            {session.title && (
              <span className="font-medium text-white/90">{session.title}</span>
            )}
            {session.session_date && (
              <span className="text-xs text-gray-500">{session.session_date}</span>
            )}
            {session.campaign_name && (
              <span className="text-xs px-2 py-0.5 bg-purple-500/15 text-purple-400 rounded">
                {session.campaign_name}
              </span>
            )}
            {session.kill_count != null && session.kill_count > 0 && (
              <span className="text-xs px-2 py-0.5 bg-red-500/15 text-red-400 rounded">
                {session.kill_count} kills
              </span>
            )}
          </div>
          {session.summary && (
            <p className="text-xs text-gray-500 mt-2 italic">{session.summary}</p>
          )}
          {session.notes && (
            <div className="mt-2 pt-2 border-t border-white/[0.06]">
              <div className="text-xs text-gray-400">{renderMarkdown(session.notes)}</div>
            </div>
          )}
          {session.loot && (
            <p className="text-xs text-yellow-400/80 mt-2">💰 Loot: {session.loot}</p>
          )}
          {session.thoughts_for_next && (
            <p className="text-xs text-purple-400/80 mt-1">💭 Next: {session.thoughts_for_next}</p>
          )}
          {session.npcs_met && session.npcs_met.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">👥 NPCs: {session.npcs_met.join(', ')}</p>
          )}
          {session.locations_visited && session.locations_visited.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">📍 Locations: {session.locations_visited.join(', ')}</p>
          )}
        </div>
      ))}
    </div>
  )

  // Writings preview component - FULL content
  const WritingsPreview = ({ writings }: { writings: Writing[] }) => (
    <div className="space-y-3">
      {writings.map((writing, i) => (
        <div
          key={i}
          className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span className="font-medium text-white/90">{writing.title}</span>
            <span className="text-xs px-2 py-0.5 bg-amber-500/15 text-amber-400 rounded capitalize">
              {writing.writing_type.replace(/_/g, ' ')}
            </span>
          </div>
          {writing.recipient && (
            <p className="text-xs text-gray-500 mt-1">To: {writing.recipient}</p>
          )}
          {writing.in_universe_date && (
            <p className="text-xs text-gray-500 mt-1">Date: {writing.in_universe_date}</p>
          )}
          <div className="mt-2 pt-2 border-t border-white/[0.06]">
            <div className="text-xs text-gray-400">{renderMarkdown(writing.content)}</div>
          </div>
        </div>
      ))}
    </div>
  )

  // Tables preview component - FULL content with actual table
  const TablesPreview = ({ tables }: { tables: ReferenceTable[] }) => (
    <div className="space-y-4">
      {tables.map((table, i) => (
        <div
          key={i}
          className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3"
        >
          <div className="flex items-center gap-2 mb-3">
            <Table2 className="w-4 h-4 text-blue-400" />
            <span className="font-medium text-white/90">{table.title}</span>
            <span className="text-xs text-gray-500">
              ({table.rows.length} rows, {table.headers.length} columns)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.1]">
                  {table.headers.map((header, hi) => (
                    <th key={hi} className="text-left py-2 px-2 text-gray-500 font-medium">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, ri) => (
                  <tr key={ri} className="border-b border-white/[0.04]">
                    {row.map((cell, ci) => (
                      <td key={ci} className="py-2 px-2 text-gray-400">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )

  // ============ MOBILE LAYOUT ============
  if (isMobile) {
    return (
      <AppLayout>
        <MobileLayout title="Import Character" showBackButton backHref="/vault">
          <div className="px-4 pb-24">
            {/* File Upload Area */}
            {!parsedData && (
              <div className="mb-6">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,.pdf,.png,.jpg,.jpeg,.webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    'w-full border-2 border-dashed rounded-xl p-8 text-center transition-all active:scale-[0.98]',
                    isDragging
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-white/10 active:bg-white/[0.04]'
                  )}
                >
                  <Upload className="w-10 h-10 mx-auto mb-3 text-gray-500" />
                  <h3 className="text-base font-medium text-white mb-1">
                    {file ? file.name : 'Tap to upload document'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    .docx, .pdf, .png, .jpg, .webp
                  </p>
                </button>

                {/* Parse button */}
                {file && (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg">
                      <FileText className="w-5 h-5 text-purple-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button
                      onClick={handleParseFile}
                      disabled={parsing}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-500 text-white rounded-xl active:bg-purple-600 disabled:opacity-50 font-medium min-h-[48px]"
                    >
                      {parsing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Parsing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Parse with AI
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Parse error */}
                {parseError && (
                  <div className="mt-4 flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">{parseError}</p>
                  </div>
                )}
              </div>
            )}

            {/* Stats overview - Mobile */}
            {stats && parsedData && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold text-white truncate flex-1">
                    {stats.characterName}
                  </h2>
                  <button
                    onClick={() => {
                      setParsedData(null)
                      setStats(null)
                      setFile(null)
                      setImportResult(null)
                    }}
                    className="text-sm text-gray-500 active:text-gray-300 px-2 py-1"
                  >
                    Reset
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-3">
                  <div className="bg-white/[0.02] rounded-lg p-2 text-center">
                    <p className="text-sm font-semibold text-white">{stats.npcCount}</p>
                    <p className="text-[10px] text-gray-500">NPCs</p>
                  </div>
                  <div className="bg-white/[0.02] rounded-lg p-2 text-center">
                    <p className="text-sm font-semibold text-white">{stats.companionCount}</p>
                    <p className="text-[10px] text-gray-500">Companions</p>
                  </div>
                  <div className="bg-white/[0.02] rounded-lg p-2 text-center">
                    <p className="text-sm font-semibold text-white">{stats.sessionCount}</p>
                    <p className="text-[10px] text-gray-500">Sessions</p>
                  </div>
                  <div className="bg-white/[0.02] rounded-lg p-2 text-center">
                    <p className="text-sm font-semibold text-white">{stats.writingCount}</p>
                    <p className="text-[10px] text-gray-500">Writings</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-4">
                  <div className="bg-white/[0.02] rounded-lg p-2 text-center">
                    <p className="text-sm font-semibold text-white">{stats.backstoryPhaseCount}</p>
                    <p className="text-[10px] text-gray-500">Phases</p>
                  </div>
                  <div className="bg-white/[0.02] rounded-lg p-2 text-center">
                    <p className="text-sm font-semibold text-white">{stats.quoteCount}</p>
                    <p className="text-[10px] text-gray-500">Quotes</p>
                  </div>
                  <div className="bg-white/[0.02] rounded-lg p-2 text-center">
                    <p className="text-sm font-semibold text-white">{stats.plotHookCount}</p>
                    <p className="text-[10px] text-gray-500">Hooks</p>
                  </div>
                  <div className="bg-white/[0.02] rounded-lg p-2 text-center">
                    <p className="text-sm font-semibold text-white">{Math.round(stats.backstoryLength / 1000)}k</p>
                    <p className="text-[10px] text-gray-500">Chars</p>
                  </div>
                </div>

                {/* Life phases preview */}
                {stats.backstoryPhases && stats.backstoryPhases.length > 0 && (
                  <div className="mb-3 p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <p className="text-[10px] text-purple-400 font-medium mb-1">Life phases:</p>
                    <p className="text-xs text-gray-400">{stats.backstoryPhases.join(' → ')}</p>
                  </div>
                )}

                <p className="text-xs text-gray-500">
                  Review and approve sections below.
                </p>
              </div>
            )}

            {/* Sections for approval - Mobile */}
            {parsedData && (
              <div className="space-y-3">
                <SectionHeader title="Character" icon={User} section="character" hasContent={!!parsedData.character} />
                <SectionHeader title="NPCs" icon={Users} count={parsedData.npcs?.length} section="npcs" hasContent={!!parsedData.npcs && parsedData.npcs.length > 0} />
                <SectionHeader title="Companions" icon={Heart} count={parsedData.companions?.length} section="companions" hasContent={!!parsedData.companions && parsedData.companions.length > 0} />
                <SectionHeader title="Sessions" icon={Scroll} count={parsedData.session_notes?.length} section="sessions" hasContent={!!parsedData.session_notes && parsedData.session_notes.length > 0} />
                <SectionHeader title="Writings" icon={BookOpen} count={parsedData.writings?.length} section="writings" hasContent={!!parsedData.writings && parsedData.writings.length > 0} />
                <SectionHeader title="Tables" icon={Table2} count={parsedData.reference_tables?.length} section="tables" hasContent={!!parsedData.reference_tables && parsedData.reference_tables.length > 0} />

                {/* Unclassified content warning */}
                {parsedData.unclassified_content && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-yellow-400 mb-1">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Unclassified Content</span>
                    </div>
                    <p className="text-xs text-gray-400 whitespace-pre-wrap line-clamp-3">
                      {parsedData.unclassified_content}
                    </p>
                  </div>
                )}

                {/* Import buttons - Mobile */}
                <div className="pt-4 border-t border-white/[0.06] space-y-3">
                  <button
                    type="button"
                    onClick={approveAll}
                    disabled={allApproved}
                    className={cn(
                      'w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium min-h-[48px]',
                      allApproved
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-white/[0.04] text-gray-300 border border-white/[0.08] active:bg-white/[0.08]'
                    )}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {allApproved ? 'All Approved' : 'Approve All'}
                  </button>

                  <button
                    onClick={handleImport}
                    disabled={importing || !hasApprovedSections || approvals.character !== 'approved'}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-purple-500 text-white rounded-xl active:bg-purple-600 disabled:opacity-50 font-medium min-h-[48px]"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        Import
                      </>
                    )}
                  </button>

                  {approvals.character !== 'approved' && (
                    <p className="text-center text-xs text-gray-500">
                      Approve Character section to import
                    </p>
                  )}
                </div>

                {/* Import result - Mobile */}
                {importResult && (
                  <div
                    ref={importResultRef}
                    className={cn(
                      'p-3 rounded-lg border',
                      importResult.success
                        ? 'bg-green-500/10 border-green-500/20'
                        : 'bg-red-500/10 border-red-500/20'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {importResult.success ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                      <span className={cn('text-sm font-medium', importResult.success ? 'text-green-400' : 'text-red-400')}>
                        {importResult.message}
                      </span>
                    </div>

                    {importResult.success && importResult.stats && (
                      <div className="text-xs text-gray-400 space-y-0.5 ml-7">
                        <p>{importResult.stats.npcsImported} NPCs</p>
                        <p>{importResult.stats.companionsImported} Companions</p>
                        <p>{importResult.stats.sessionsImported} Sessions</p>
                        <p>{importResult.stats.writingsImported} Writings</p>
                      </div>
                    )}

                    {importResult.success && importResult.characterId && (
                      <button
                        onClick={() => router.push(`/vault/${importResult.characterId}`)}
                        className="mt-2 ml-7 text-sm text-purple-400 active:text-purple-300 underline"
                      >
                        View character →
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </MobileLayout>
      </AppLayout>
    )
  }

  // ============ DESKTOP LAYOUT ============
  return (
    <AppLayout>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Import Character</h1>
            <p className="text-sm text-gray-500">
              Upload a character document to import with AI-powered extraction
            </p>
          </div>

        {/* File Upload Area */}
        {!parsedData && (
          <div className="mb-8">
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.pdf,.png,.jpg,.jpeg,.webp"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all',
                isDragging
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-white/10 hover:border-purple-500/50 hover:bg-white/[0.02]'
              )}
            >
              <Upload className={cn(
                'w-12 h-12 mx-auto mb-4',
                isDragging ? 'text-purple-400' : 'text-gray-500'
              )} />
              <h3 className="text-lg font-medium text-white mb-2">
                {file ? file.name : 'Drop your character document here'}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                or click to browse
              </p>
              <p className="text-xs text-gray-600">
                Supported formats: .docx, .pdf, .png, .jpg, .jpeg, .webp
              </p>
            </div>

            {/* Parse button */}
            {file && (
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="text-sm text-white font-medium">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleParseFile}
                  disabled={parsing}
                  className="flex items-center gap-2 px-6 py-2.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {parsing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Parsing with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Parse Document
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Parse error */}
            {parseError && (
              <div className="mt-4 flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{parseError}</p>
              </div>
            )}
          </div>
        )}

        {/* Stats overview */}
        {stats && parsedData && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                Extracted: {stats.characterName}
              </h2>
              <button
                onClick={() => {
                  setParsedData(null)
                  setStats(null)
                  setFile(null)
                  setImportResult(null)
                }}
                className="text-sm text-gray-500 hover:text-gray-300"
              >
                Start over
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-white/[0.02] rounded-lg p-3 text-center">
                <p className="text-lg font-semibold text-white">{stats.npcCount}</p>
                <p className="text-xs text-gray-500">NPCs</p>
              </div>
              <div className="bg-white/[0.02] rounded-lg p-3 text-center">
                <p className="text-lg font-semibold text-white">{stats.companionCount}</p>
                <p className="text-xs text-gray-500">Companions</p>
              </div>
              <div className="bg-white/[0.02] rounded-lg p-3 text-center">
                <p className="text-lg font-semibold text-white">{stats.sessionCount}</p>
                <p className="text-xs text-gray-500">Sessions</p>
              </div>
              <div className="bg-white/[0.02] rounded-lg p-3 text-center">
                <p className="text-lg font-semibold text-white">{stats.writingCount}</p>
                <p className="text-xs text-gray-500">Writings</p>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-white/[0.02] rounded-lg p-3 text-center">
                <p className="text-lg font-semibold text-white">{stats.backstoryPhaseCount}</p>
                <p className="text-xs text-gray-500">Life Phases</p>
              </div>
              <div className="bg-white/[0.02] rounded-lg p-3 text-center">
                <p className="text-lg font-semibold text-white">{stats.quoteCount}</p>
                <p className="text-xs text-gray-500">Quotes</p>
              </div>
              <div className="bg-white/[0.02] rounded-lg p-3 text-center">
                <p className="text-lg font-semibold text-white">{stats.plotHookCount}</p>
                <p className="text-xs text-gray-500">Plot Hooks</p>
              </div>
              <div className="bg-white/[0.02] rounded-lg p-3 text-center">
                <p className="text-lg font-semibold text-white">{Math.round(stats.backstoryLength / 1000)}k</p>
                <p className="text-xs text-gray-500">Backstory Chars</p>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-6">
              <div className="bg-white/[0.02] rounded-lg p-3 text-center">
                <p className="text-lg font-semibold text-white">{stats.dmQaCount}</p>
                <p className="text-xs text-gray-500">DM Q&A</p>
              </div>
              <div className="bg-white/[0.02] rounded-lg p-3 text-center">
                <p className="text-lg font-semibold text-white">{stats.rumorCount}</p>
                <p className="text-xs text-gray-500">Rumors</p>
              </div>
              <div className="bg-white/[0.02] rounded-lg p-3 text-center">
                <p className="text-lg font-semibold text-white">{stats.fearCount}</p>
                <p className="text-xs text-gray-500">Fears</p>
              </div>
              <div className="bg-white/[0.02] rounded-lg p-3 text-center">
                <p className="text-lg font-semibold text-white">{stats.referenceTableCount}</p>
                <p className="text-xs text-gray-500">Tables</p>
              </div>
            </div>

            {/* Show backstory phases titles for quick verification */}
            {stats.backstoryPhases && stats.backstoryPhases.length > 0 && (
              <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <p className="text-xs text-purple-400 font-medium mb-1">Life phases detected:</p>
                <p className="text-sm text-gray-400">{stats.backstoryPhases.join(' → ')}</p>
              </div>
            )}

            <p className="text-sm text-gray-500">
              Review each section below and approve what you want to import.
            </p>
          </div>
        )}

        {/* Sections for approval */}
        {parsedData && (
          <div className="space-y-4">
            <SectionHeader
              title="Character"
              icon={User}
              section="character"
              hasContent={!!parsedData.character}
            />

            <SectionHeader
              title="NPCs"
              icon={Users}
              count={parsedData.npcs?.length}
              section="npcs"
              hasContent={!!parsedData.npcs && parsedData.npcs.length > 0}
            />

            <SectionHeader
              title="Companions"
              icon={Heart}
              count={parsedData.companions?.length}
              section="companions"
              hasContent={!!parsedData.companions && parsedData.companions.length > 0}
            />

            <SectionHeader
              title="Session Notes"
              icon={Scroll}
              count={parsedData.session_notes?.length}
              section="sessions"
              hasContent={!!parsedData.session_notes && parsedData.session_notes.length > 0}
            />

            <SectionHeader
              title="Writings"
              icon={BookOpen}
              count={parsedData.writings?.length}
              section="writings"
              hasContent={!!parsedData.writings && parsedData.writings.length > 0}
            />

            <SectionHeader
              title="Reference Tables"
              icon={Table2}
              count={parsedData.reference_tables?.length}
              section="tables"
              hasContent={!!parsedData.reference_tables && parsedData.reference_tables.length > 0}
            />

            {/* Unclassified content warning */}
            {parsedData.unclassified_content && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 text-yellow-400 mb-2">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">Unclassified Content</span>
                </div>
                <p className="text-sm text-gray-400 whitespace-pre-wrap">
                  {parsedData.unclassified_content}
                </p>
              </div>
            )}

            {/* Approve All and Import buttons */}
            <div className="pt-6 border-t border-white/[0.06] space-y-4">
              {/* Approve All button */}
              <button
                type="button"
                onClick={approveAll}
                disabled={allApproved}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all',
                  allApproved
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-default'
                    : 'bg-white/[0.04] text-gray-300 border border-white/[0.08] hover:bg-white/[0.08] hover:border-purple-500/30'
                )}
              >
                <CheckCircle2 className="w-4 h-4" />
                {allApproved ? 'All Sections Approved' : 'Approve All Sections'}
              </button>

              {/* Import button */}
              <button
                onClick={handleImport}
                disabled={importing || !hasApprovedSections || approvals.character !== 'approved'}
                className="w-full flex items-center justify-center gap-2 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Import Approved Sections
                  </>
                )}
              </button>

              {approvals.character !== 'approved' && parsedData && (
                <p className="text-center text-sm text-gray-500">
                  You must approve the Character section to import
                </p>
              )}
            </div>

            {/* Import result */}
            {importResult && (
              <div
                ref={importResultRef}
                className={cn(
                  'p-4 rounded-lg border',
                  importResult.success
                    ? 'bg-green-500/10 border-green-500/20'
                    : 'bg-red-500/10 border-red-500/20'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  {importResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  <span className={cn(
                    'font-medium',
                    importResult.success ? 'text-green-400' : 'text-red-400'
                  )}>
                    {importResult.message}
                  </span>
                </div>

                {importResult.success && importResult.stats && (
                  <div className="text-sm text-gray-400 space-y-1 ml-7">
                    <p>NPCs imported: {importResult.stats.npcsImported}</p>
                    <p>Companions imported: {importResult.stats.companionsImported}</p>
                    <p>Sessions imported: {importResult.stats.sessionsImported}</p>
                    <p>Writings imported: {importResult.stats.writingsImported}</p>
                  </div>
                )}

                {importResult.success && importResult.characterId && (
                  <button
                    onClick={() => router.push(`/vault/${importResult.characterId}`)}
                    className="mt-3 ml-7 text-sm text-purple-400 hover:text-purple-300 underline"
                  >
                    View imported character →
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </AppLayout>
  )
}
