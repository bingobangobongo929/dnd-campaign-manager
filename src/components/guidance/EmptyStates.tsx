'use client'

import {
  Plus, Upload, Sparkles, Users, Scroll, Map, Clock,
  BookOpen, FileText, Wand2, Link2, MessageSquare, Heart,
  Swords, MapPin, Image, Calendar, Settings, Shield,
  Eye, Share2, Zap, Folder
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description: string
  guidance?: string // Workflow-aware guidance message
  action?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  guidance,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center py-12 px-6",
      className
    )}>
      {icon && (
        <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-sm max-w-md mb-2">{description}</p>
      {guidance && (
        <p className="text-purple-400 text-xs max-w-md mb-4 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" />
          {guidance}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 mt-2">
          {action && (
            <button onClick={action.onClick} className="btn btn-primary">
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button onClick={secondaryAction.onClick} className="btn btn-secondary">
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Campaign-specific empty states

export function CampaignTimelineEmpty({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={<Clock className="w-8 h-8 text-gray-600" />}
      title="No Timeline Events"
      description="Track your campaign's key moments and story progression here."
      guidance="Add events manually, or let Campaign Intelligence suggest them from your session notes."
      action={onAdd ? { label: 'Add Event', onClick: onAdd } : undefined}
    />
  )
}

export function CampaignSessionsEmpty({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={<BookOpen className="w-8 h-8 text-gray-600" />}
      title="No Sessions Yet"
      description="Sessions are the heart of your campaign. Document what happens each time you play."
      guidance="Session notes feed into Campaign Intelligence for automatic suggestions."
      action={onAdd ? { label: 'Add Session', onClick: onAdd } : undefined}
    />
  )
}

export function CampaignCharactersEmpty({ onAdd, onImport }: { onAdd?: () => void; onImport?: () => void }) {
  return (
    <EmptyState
      icon={<Users className="w-8 h-8 text-gray-600" />}
      title="No Characters"
      description="Add the heroes, villains, and NPCs that populate your world."
      guidance="Import characters from PDFs or images, or create them manually."
      action={onAdd ? { label: 'Add Character', onClick: onAdd } : undefined}
      secondaryAction={onImport ? { label: 'Import', onClick: onImport } : undefined}
    />
  )
}

export function CampaignMembersEmpty({ onInvite }: { onInvite?: () => void }) {
  return (
    <EmptyState
      icon={<Users className="w-8 h-8 text-gray-600" />}
      title="No Players Yet"
      description="Invite your players to join the campaign and contribute their perspectives."
      guidance="Players can add session notes, claim characters, and see shared content."
      action={onInvite ? { label: 'Invite Players', onClick: onInvite } : undefined}
    />
  )
}

export function CampaignLoreEmpty({ type, onAdd }: { type: 'factions' | 'locations' | 'artifacts'; onAdd?: () => void }) {
  const config = {
    factions: {
      icon: <Shield className="w-8 h-8 text-gray-600" />,
      title: 'No Factions',
      description: 'Create the organizations, guilds, and groups that shape your world.',
    },
    locations: {
      icon: <MapPin className="w-8 h-8 text-gray-600" />,
      title: 'No Locations',
      description: 'Map out the cities, dungeons, and regions your players explore.',
    },
    artifacts: {
      icon: <Wand2 className="w-8 h-8 text-gray-600" />,
      title: 'No Artifacts',
      description: 'Track magical items, legendary weapons, and important objects.',
    },
  }

  const { icon, title, description } = config[type]

  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      guidance="Add entries manually, or let Intelligence detect mentions in your session notes."
      action={onAdd ? { label: 'Add Entry', onClick: onAdd } : undefined}
    />
  )
}

export function CampaignMapsEmpty({ onUpload }: { onUpload?: () => void }) {
  return (
    <EmptyState
      icon={<Map className="w-8 h-8 text-gray-600" />}
      title="No Maps"
      description="Upload world maps, dungeon layouts, or city plans to visualize your campaign."
      guidance="Add interactive pins to link locations to your lore entries."
      action={onUpload ? { label: 'Upload Map', onClick: onUpload } : undefined}
    />
  )
}

// Vault-specific empty states

export function VaultEmpty({ onAdd, onImport }: { onAdd?: () => void; onImport?: () => void }) {
  return (
    <EmptyState
      icon={<Folder className="w-8 h-8 text-gray-600" />}
      title="Your Vault is Empty"
      description="The vault is your personal character collection. Characters here can be used across any campaign."
      guidance="Import from D&D Beyond, PDF, or create from scratch."
      action={onAdd ? { label: 'Create Character', onClick: onAdd } : undefined}
      secondaryAction={onImport ? { label: 'Import', onClick: onImport } : undefined}
    />
  )
}

export function VaultPlayJournalEmpty({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={<BookOpen className="w-8 h-8 text-gray-600" />}
      title="No Journal Entries"
      description="Document your character's journey, thoughts, and experiences from their perspective."
      guidance="Journal entries can be shared to campaigns or kept private."
      action={onAdd ? { label: 'Add Entry', onClick: onAdd } : undefined}
    />
  )
}

export function VaultWritingsEmpty({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={<FileText className="w-8 h-8 text-gray-600" />}
      title="No Writings"
      description="Write letters, stories, or other creative pieces from your character's point of view."
      action={onAdd ? { label: 'Start Writing', onClick: onAdd } : undefined}
    />
  )
}

export function VaultRelationshipsEmpty({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={<Heart className="w-8 h-8 text-gray-600" />}
      title="No Relationships"
      description="Track your character's connections to other characters, NPCs, and organizations."
      guidance="Character Intelligence can suggest relationships based on your backstory."
      action={onAdd ? { label: 'Add Relationship', onClick: onAdd } : undefined}
    />
  )
}

// Oneshot-specific empty states

export function OneshotNpcsEmpty({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={<Users className="w-8 h-8 text-gray-600" />}
      title="No NPCs"
      description="Create the characters your players will meet during this adventure."
      guidance="Structured NPCs are included when you publish this as a template."
      action={onAdd ? { label: 'Add NPC', onClick: onAdd } : undefined}
    />
  )
}

export function OneshotEncountersEmpty({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={<Swords className="w-8 h-8 text-gray-600" />}
      title="No Encounters"
      description="Plan the combat encounters, puzzles, and challenges for your adventure."
      action={onAdd ? { label: 'Add Encounter', onClick: onAdd } : undefined}
    />
  )
}

export function OneshotLocationsEmpty({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={<MapPin className="w-8 h-8 text-gray-600" />}
      title="No Locations"
      description="Define the key places your players will explore in this oneshot."
      action={onAdd ? { label: 'Add Location', onClick: onAdd } : undefined}
    />
  )
}

// Session-specific empty states

export function SessionNotesEmpty({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={<FileText className="w-8 h-8 text-gray-600" />}
      title="No Notes Yet"
      description="Document what happened during this session."
      guidance="Notes feed into Campaign Intelligence for timeline events and NPC detection."
      action={onAdd ? { label: 'Add Notes', onClick: onAdd } : undefined}
    />
  )
}

export function PlayerNotesEmpty({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={<MessageSquare className="w-8 h-8 text-gray-600" />}
      title="No Player Notes"
      description="Player perspectives from this session will appear here."
      guidance="Players can add their own notes, or you can add notes on their behalf."
      action={onAdd ? { label: 'Add Note', onClick: onAdd } : undefined}
    />
  )
}

// Intelligence empty states

export function IntelligenceSuggestionsEmpty({ onRun }: { onRun?: () => void }) {
  return (
    <EmptyState
      icon={<Sparkles className="w-8 h-8 text-gray-600" />}
      title="No Suggestions"
      description="Run Intelligence to analyze your content and generate suggestions."
      guidance="Make sure your session notes are up to date for the best results."
      action={onRun ? { label: 'Run Intelligence', onClick: onRun } : undefined}
    />
  )
}

// Template empty states

export function TemplatesEmpty({ onExplore, onCreate }: { onExplore?: () => void; onCreate?: () => void }) {
  return (
    <EmptyState
      icon={<Scroll className="w-8 h-8 text-gray-600" />}
      title="No Templates"
      description="Templates are ready-to-use campaigns, characters, and oneshots."
      guidance="Publish your own content as templates, or explore community creations."
      action={onExplore ? { label: 'Explore Templates', onClick: onExplore } : undefined}
      secondaryAction={onCreate ? { label: 'Create Template', onClick: onCreate } : undefined}
    />
  )
}

// Sharing empty states

export function ShareLinksEmpty({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon={<Share2 className="w-8 h-8 text-gray-600" />}
      title="No Share Links"
      description="Create shareable links to let others view your content."
      guidance="Share links can be password protected and set to expire."
      action={onCreate ? { label: 'Create Share Link', onClick: onCreate } : undefined}
    />
  )
}

// Generic list empty state
export function ListEmpty({
  itemType,
  onAdd,
}: {
  itemType: string
  onAdd?: () => void
}) {
  return (
    <EmptyState
      icon={<Plus className="w-8 h-8 text-gray-600" />}
      title={`No ${itemType}`}
      description={`Add your first ${itemType.toLowerCase()} to get started.`}
      action={onAdd ? { label: `Add ${itemType}`, onClick: onAdd } : undefined}
    />
  )
}
