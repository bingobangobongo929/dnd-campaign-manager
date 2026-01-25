'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  Link2,
  ExternalLink,
  BookOpen,
  Clock,
  ChevronRight,
  Pencil,
  Lock,
  Calendar,
  Loader2,
  ArrowLeft,
  MoreHorizontal,
  Copy,
  Unlink,
} from 'lucide-react'
import { cn, getInitials, formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui'
import { Session0SnapshotModal } from './Session0SnapshotModal'
import { toast } from 'sonner'
import type { VaultCharacter, Campaign, Session } from '@/types/database'

interface CampaignLink {
  campaign_id: string
  character_id: string
  joined_at: string
}

interface InPlayCharacterViewProps {
  character: VaultCharacter
  campaignLink: CampaignLink
  onSwitch?: () => void // Switch to normal edit view
}

export function InPlayCharacterView({
  character,
  campaignLink,
  onSwitch,
}: InPlayCharacterViewProps) {
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  // Get private notes for this specific campaign
  const privateNotesData = character.private_campaign_notes as Record<string, string> | null
  const [privateNotes, setPrivateNotes] = useState(
    privateNotesData?.[campaignLink.campaign_id] || ''
  )
  const [savingNotes, setSavingNotes] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showUnlinkModal, setShowUnlinkModal] = useState(false)
  const [showSession0Modal, setShowSession0Modal] = useState(false)
  const [copying, setCopying] = useState(false)

  useEffect(() => {
    loadCampaignData()
  }, [campaignLink.campaign_id])

  const loadCampaignData = async () => {
    const supabase = createClient()

    // Load campaign details
    const { data: campaignData } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignLink.campaign_id)
      .single()

    if (campaignData) {
      setCampaign(campaignData)

      // Load sessions for this campaign (the character's journey)
      const { data: sessionsData } = await supabase
        .from('sessions')
        .select('*')
        .eq('campaign_id', campaignLink.campaign_id)
        .order('session_number', { ascending: false })
        .limit(10)

      if (sessionsData) {
        setSessions(sessionsData)
      }
    }

    setLoading(false)
  }

  const handleSavePrivateNotes = async () => {
    setSavingNotes(true)
    const supabase = createClient()

    // Update private_campaign_notes for this specific campaign
    const updatedNotes = {
      ...(privateNotesData || {}),
      [campaignLink.campaign_id]: privateNotes,
    }

    const { error } = await supabase
      .from('vault_characters')
      .update({ private_campaign_notes: updatedNotes })
      .eq('id', character.id)

    if (error) {
      toast.error('Failed to save notes')
    } else {
      toast.success('Notes saved')
    }
    setSavingNotes(false)
  }

  const handleCopyToVault = async (source: 'in_play' | 'session_0') => {
    setCopying(true)
    try {
      const response = await fetch('/api/vault/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          vaultCharacterId: character.id,
          campaignId: campaignLink.campaign_id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to copy character')
      }

      toast.success(data.message || 'Character copied to your vault')
    } catch (error) {
      console.error('Copy error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to copy character')
    } finally {
      setCopying(false)
    }
  }

  const joinedDate = campaignLink.joined_at
    ? new Date(campaignLink.joined_at)
    : null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Back Link */}
      <Link
        href="/vault"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Vault
      </Link>

      {/* Linked Character Banner */}
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center flex-shrink-0">
            <Link2 className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-white">
                Linked to "{campaign?.name || 'Campaign'}"
              </h3>
              <span className="flex items-center gap-1 text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                <Lock className="w-3 h-3" />
                Read-only
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              This character is actively being used in a campaign. The DM manages the character data in the game.
              You can view your character details here, add private notes, and access session history.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Link
                href={`/campaigns/${campaignLink.campaign_id}/dashboard`}
                className="btn btn-sm btn-primary"
              >
                <ExternalLink className="w-4 h-4 mr-1.5" />
                Go to Campaign
              </Link>
              <button
                onClick={() => setShowUnlinkModal(true)}
                className="btn btn-sm btn-ghost text-gray-400"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Character Header */}
      <div className="flex gap-6">
        {/* Portrait */}
        <div className="flex-shrink-0">
          {character.image_url || character.detail_image_url ? (
            <Image
              src={character.detail_image_url || character.image_url!}
              alt={character.name}
              width={120}
              height={120}
              className="rounded-xl object-cover"
            />
          ) : (
            <div className="w-[120px] h-[120px] rounded-xl bg-purple-600/20 flex items-center justify-center text-purple-400 font-bold text-4xl">
              {getInitials(character.name)}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{character.name}</h1>
          {(character.race || character.class) && (
            <p className="text-gray-400 mt-1">
              {[character.race, character.class].filter(Boolean).join(' ')}
            </p>
          )}
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <Link2 className="w-4 h-4" />
              {campaign?.name}
            </span>
            {joinedDate && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                Joined {formatDate(joinedDate)}
              </span>
            )}
          </div>
          {character.status && (
            <span
              className="inline-block mt-3 px-2.5 py-1 text-xs font-medium rounded-full"
              style={{
                backgroundColor: `${character.status_color || '#6B7280'}20`,
                color: character.status_color || '#9CA3AF',
              }}
            >
              {character.status}
            </span>
          )}
        </div>
      </div>

      {/* Backstory Section (Read-only) */}
      {character.backstory && (
        <div className="bg-white/[0.02] border border-[--border] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-400" />
              Backstory
            </h3>
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Lock className="w-3 h-3" />
              Managed in campaign
            </span>
          </div>
          <p className="text-gray-300 whitespace-pre-wrap">
            {character.backstory}
          </p>
        </div>
      )}

      {/* Campaign Journey */}
      {sessions.length > 0 && (
        <div className="bg-white/[0.02] border border-[--border] rounded-xl p-5">
          <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-purple-400" />
            Campaign Journey
          </h3>
          <div className="space-y-3">
            {sessions.map((session) => (
              <Link
                key={session.id}
                href={`/campaigns/${campaignLink.campaign_id}/sessions/${session.id}`}
                className="block p-3 bg-white/[0.02] hover:bg-white/[0.05] rounded-lg transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white group-hover:text-purple-400 transition-colors">
                      Session {session.session_number}: {session.title || 'Untitled'}
                    </p>
                    {session.date && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDate(new Date(session.date))}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-purple-400 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
          {sessions.length >= 10 && (
            <Link
              href={`/campaigns/${campaignLink.campaign_id}/sessions`}
              className="flex items-center justify-center gap-1 text-sm text-purple-400 hover:text-purple-300 mt-4"
            >
              View all sessions
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      )}

      {/* Private Notes (Always Editable) */}
      <div className="bg-white/[0.02] border border-[--border] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Pencil className="w-4 h-4 text-green-400" />
            Your Private Notes
          </h3>
          <span className="text-xs text-green-400">Always editable</span>
        </div>
        <p className="text-sm text-gray-500 mb-3">
          Notes you keep here are private and not shared with the campaign.
        </p>
        <textarea
          value={privateNotes}
          onChange={(e) => setPrivateNotes(e.target.value)}
          placeholder="Write private notes about your character..."
          className="form-input min-h-[150px] resize-y"
        />
        <div className="flex justify-end mt-3">
          <button
            onClick={handleSavePrivateNotes}
            disabled={savingNotes}
            className="btn btn-sm btn-primary"
          >
            {savingNotes ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Save Notes'
            )}
          </button>
        </div>
      </div>

      {/* Session 0 Snapshot */}
      <div className="bg-white/[0.02] border border-[--border] rounded-xl p-5">
        <h3 className="font-semibold text-white flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-amber-400" />
          Session 0 Snapshot
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          A copy of this character from before the campaign began.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSession0Modal(true)}
            className="btn btn-sm btn-secondary"
          >
            View Session 0 State
          </button>
          <button
            onClick={() => handleCopyToVault('session_0')}
            disabled={copying}
            className="btn btn-sm btn-ghost text-gray-400"
          >
            {copying ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
            ) : (
              <Copy className="w-4 h-4 mr-1.5" />
            )}
            Copy to My Characters
          </button>
        </div>
      </div>

      {/* Session 0 Modal */}
      <Session0SnapshotModal
        isOpen={showSession0Modal}
        onClose={() => setShowSession0Modal(false)}
        vaultCharacterId={character.id}
        campaignId={campaignLink.campaign_id}
        characterName={character.name}
      />

      {/* Unlink Modal */}
      <UnlinkOptionsModal
        isOpen={showUnlinkModal}
        onClose={() => setShowUnlinkModal(false)}
        character={character}
        campaign={campaign}
        campaignLink={campaignLink}
      />
    </div>
  )
}

// Unlink Options Modal
interface UnlinkOptionsModalProps {
  isOpen: boolean
  onClose: () => void
  character: VaultCharacter
  campaign: Campaign | null
  campaignLink: CampaignLink
}

function UnlinkOptionsModal({
  isOpen,
  onClose,
  character,
  campaign,
  campaignLink,
}: UnlinkOptionsModalProps) {
  const router = useRouter()
  const [selectedOption, setSelectedOption] = useState<'leave' | 'memory' | 'merge' | null>(null)
  const [processing, setProcessing] = useState(false)

  const handleConfirm = async () => {
    if (!selectedOption) return

    setProcessing(true)
    try {
      const response = await fetch('/api/vault/unlink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vaultCharacterId: character.id,
          campaignId: campaignLink.campaign_id,
          action: selectedOption,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unlink character')
      }

      // Show success message based on action
      switch (selectedOption) {
        case 'leave':
          toast.success('Left the campaign. Character link removed.')
          break
        case 'memory':
          toast.success('Character saved as a campaign memory.')
          break
        case 'merge':
          toast.success('Campaign updates merged to your vault character.')
          break
      }

      onClose()
      // Navigate back to vault
      router.push('/vault')
    } catch (error) {
      console.error('Unlink error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to unlink character')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Unlink Options"
      size="md"
    >
      <div className="space-y-6">
        <p className="text-gray-400">
          What would you like to do with this in-play character?
        </p>

        <div className="space-y-3">
          {/* Leave Campaign */}
          <label
            className={cn(
              "block p-4 rounded-lg border cursor-pointer transition-colors",
              selectedOption === 'leave'
                ? "bg-red-500/10 border-red-500/30"
                : "bg-white/[0.02] border-[--border] hover:border-red-500/30"
            )}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="unlink-option"
                checked={selectedOption === 'leave'}
                onChange={() => setSelectedOption('leave')}
                className="mt-1 accent-red-500"
              />
              <div>
                <p className="font-medium text-white">Leave Campaign</p>
                <p className="text-sm text-gray-400 mt-0.5">
                  Remove yourself from this campaign entirely.
                  The in-play character will be removed from your vault.
                  The DM keeps their copy in the campaign.
                </p>
              </div>
            </div>
          </label>

          {/* Keep as Memory */}
          <label
            className={cn(
              "block p-4 rounded-lg border cursor-pointer transition-colors",
              selectedOption === 'memory'
                ? "bg-blue-500/10 border-blue-500/30"
                : "bg-white/[0.02] border-[--border] hover:border-blue-500/30"
            )}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="unlink-option"
                checked={selectedOption === 'memory'}
                onChange={() => setSelectedOption('memory')}
                className="mt-1 accent-blue-500"
              />
              <div>
                <p className="font-medium text-white">Keep as Memory</p>
                <p className="text-sm text-gray-400 mt-0.5">
                  Stop syncing but keep a read-only copy of your journey.
                  Perfect for completed campaigns you want to remember.
                </p>
              </div>
            </div>
          </label>

          {/* Merge to Original */}
          <label
            className={cn(
              "block p-4 rounded-lg border cursor-pointer transition-colors",
              selectedOption === 'merge'
                ? "bg-green-500/10 border-green-500/30"
                : "bg-white/[0.02] border-[--border] hover:border-green-500/30"
            )}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="unlink-option"
                checked={selectedOption === 'merge'}
                onChange={() => setSelectedOption('merge')}
                className="mt-1 accent-green-500"
              />
              <div>
                <p className="font-medium text-white">Merge to Original</p>
                <p className="text-sm text-gray-400 mt-0.5">
                  Copy all updates back to your original vault character.
                  Use this when the campaign ends and you want to keep playing them.
                </p>
              </div>
            </div>
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={processing}
            className="btn btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedOption || processing}
            className="btn btn-primary flex-1"
          >
            {processing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Confirm'
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}
