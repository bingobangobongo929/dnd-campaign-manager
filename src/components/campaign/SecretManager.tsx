'use client'

import { useState, useEffect } from 'react'
import {
  Eye,
  EyeOff,
  Users,
  Lock,
  Plus,
  Trash2,
  Check,
  X,
  Loader2,
  Sparkles,
  Calendar,
} from 'lucide-react'
import { Modal, Input } from '@/components/ui'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { EntitySecret, Session } from '@/types/database'

type VisibilityLevel = 'public' | 'party' | 'dm_only'

interface SecretManagerProps {
  campaignId: string
  entityType: string
  entityId: string
  isDm: boolean
  sessions?: Session[]
  onSecretsChange?: (secrets: EntitySecret[]) => void
}

export function SecretManager({
  campaignId,
  entityType,
  entityId,
  isDm,
  sessions = [],
  onSecretsChange,
}: SecretManagerProps) {
  const [secrets, setSecrets] = useState<EntitySecret[]>([])
  const [loading, setLoading] = useState(true)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [revealModalOpen, setRevealModalOpen] = useState(false)
  const [selectedSecret, setSelectedSecret] = useState<EntitySecret | null>(null)
  const [newSecretContent, setNewSecretContent] = useState('')
  const [newSecretVisibility, setNewSecretVisibility] = useState<VisibilityLevel>('dm_only')
  const [saving, setSaving] = useState(false)
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')

  // Load secrets for this entity
  useEffect(() => {
    if (isDm) {
      loadSecrets()
    }
  }, [campaignId, entityType, entityId, isDm])

  const loadSecrets = async () => {
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/secrets?entityType=${entityType}&entityId=${entityId}`
      )
      const data = await response.json()

      if (response.ok) {
        setSecrets(data.secrets || [])
        onSecretsChange?.(data.secrets || [])
      }
    } catch (error) {
      console.error('Failed to load secrets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddSecret = async () => {
    if (!newSecretContent.trim()) {
      toast.error('Please enter secret content')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/secrets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          entityId,
          content: newSecretContent,
          visibility: newSecretVisibility,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to add secret')
        return
      }

      toast.success('Secret added')
      setNewSecretContent('')
      setNewSecretVisibility('dm_only')
      setAddModalOpen(false)
      loadSecrets()
    } catch (error) {
      console.error('Failed to add secret:', error)
      toast.error('Failed to add secret')
    } finally {
      setSaving(false)
    }
  }

  const handleRevealSecret = async () => {
    if (!selectedSecret) return

    setSaving(true)
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/secrets`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secretId: selectedSecret.id,
          reveal: true,
          revealInSessionId: selectedSessionId || undefined,
          visibility: 'party',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to reveal secret')
        return
      }

      toast.success('Secret revealed to party!')
      setRevealModalOpen(false)
      setSelectedSecret(null)
      setSelectedSessionId('')
      loadSecrets()
    } catch (error) {
      console.error('Failed to reveal secret:', error)
      toast.error('Failed to reveal secret')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSecret = async (secretId: string) => {
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/secrets?secretId=${secretId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || 'Failed to delete secret')
        return
      }

      toast.success('Secret deleted')
      loadSecrets()
    } catch (error) {
      console.error('Failed to delete secret:', error)
      toast.error('Failed to delete secret')
    }
  }

  const getVisibilityIcon = (visibility: VisibilityLevel) => {
    switch (visibility) {
      case 'public':
        return Eye
      case 'party':
        return Users
      case 'dm_only':
        return Lock
      default:
        return EyeOff
    }
  }

  const getVisibilityColor = (visibility: VisibilityLevel) => {
    switch (visibility) {
      case 'public':
        return 'text-green-400 bg-green-500/10'
      case 'party':
        return 'text-blue-400 bg-blue-500/10'
      case 'dm_only':
        return 'text-red-400 bg-red-500/10'
      default:
        return 'text-gray-400 bg-gray-500/10'
    }
  }

  const getVisibilityLabel = (visibility: VisibilityLevel) => {
    switch (visibility) {
      case 'public':
        return 'Public'
      case 'party':
        return 'Party'
      case 'dm_only':
        return 'DM Only'
      default:
        return visibility
    }
  }

  // Don't show anything if not a DM
  if (!isDm) return null

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading secrets...</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-red-400" />
          <span className="text-sm font-medium text-gray-300">DM Secrets</span>
          {secrets.length > 0 && (
            <span className="text-xs text-gray-500">({secrets.length})</span>
          )}
        </div>
        <button
          onClick={() => setAddModalOpen(true)}
          className="btn btn-sm btn-secondary"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Secret
        </button>
      </div>

      {/* Secrets List */}
      {secrets.length === 0 ? (
        <div className="text-center py-4 text-gray-500 text-sm">
          <EyeOff className="w-5 h-5 mx-auto mb-1 opacity-50" />
          No secrets yet
        </div>
      ) : (
        <div className="space-y-2">
          {secrets.map(secret => {
            const VisIcon = getVisibilityIcon(secret.visibility as VisibilityLevel)
            const isRevealed = !!secret.revealed_at

            return (
              <div
                key={secret.id}
                className={cn(
                  "p-3 rounded-lg border",
                  isRevealed
                    ? "bg-green-500/5 border-green-500/20"
                    : "bg-red-500/5 border-red-500/20"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm text-gray-300">{secret.content}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={cn(
                        "inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded",
                        getVisibilityColor(secret.visibility as VisibilityLevel)
                      )}>
                        <VisIcon className="w-3 h-3" />
                        {getVisibilityLabel(secret.visibility as VisibilityLevel)}
                      </span>
                      {isRevealed && (
                        <span className="text-xs text-green-400">
                          <Sparkles className="w-3 h-3 inline mr-1" />
                          Revealed
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!isRevealed && secret.visibility === 'dm_only' && (
                      <button
                        onClick={() => {
                          setSelectedSecret(secret)
                          setRevealModalOpen(true)
                        }}
                        className="p-1.5 hover:bg-white/[0.05] rounded text-blue-400"
                        title="Reveal to party"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteSecret(secret.id)}
                      className="p-1.5 hover:bg-white/[0.05] rounded text-red-400"
                      title="Delete secret"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Secret Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add DM Secret"
        description="Add a secret note only you can see"
        size="md"
      >
        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label">Secret Content</label>
            <textarea
              value={newSecretContent}
              onChange={(e) => setNewSecretContent(e.target.value)}
              placeholder="The NPC is secretly working for the BBEG..."
              rows={4}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Initial Visibility</label>
            <select
              value={newSecretVisibility}
              onChange={(e) => setNewSecretVisibility(e.target.value as VisibilityLevel)}
              className="form-input"
            >
              <option value="dm_only">DM Only (hidden from players)</option>
              <option value="party">Party (visible to players)</option>
              <option value="public">Public (visible to everyone)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              You can reveal DM-only secrets to the party later when discovered in-game.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setAddModalOpen(false)}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleAddSecret}
              disabled={saving || !newSecretContent.trim()}
              className="btn btn-primary flex-1"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Add Secret
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reveal Secret Modal */}
      <Modal
        isOpen={revealModalOpen}
        onClose={() => {
          setRevealModalOpen(false)
          setSelectedSecret(null)
          setSelectedSessionId('')
        }}
        title="Reveal Secret"
        description="Make this secret visible to the party"
        size="md"
      >
        <div className="space-y-4">
          {selectedSecret && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-gray-300">{selectedSecret.content}</p>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">
              <Calendar className="w-4 h-4 inline mr-1" />
              Revealed in Session
              <span className="text-gray-500 text-xs ml-2">(optional)</span>
            </label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="form-input"
            >
              <option value="">Select session...</option>
              {sessions.map(session => (
                <option key={session.id} value={session.id}>
                  Session {session.session_number}: {session.title || 'Untitled'}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Optionally record which session this was revealed in for your timeline.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setRevealModalOpen(false)
                setSelectedSecret(null)
              }}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleRevealSecret}
              disabled={saving}
              className="btn btn-primary flex-1"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Reveal to Party
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// Compact version for inline use
interface VisibilityBadgeProps {
  visibility: VisibilityLevel
  className?: string
}

export function VisibilityBadge({ visibility, className }: VisibilityBadgeProps) {
  const Icon = visibility === 'public' ? Eye : visibility === 'party' ? Users : Lock
  const colorClass = visibility === 'public'
    ? 'text-green-400 bg-green-500/10'
    : visibility === 'party'
      ? 'text-blue-400 bg-blue-500/10'
      : 'text-red-400 bg-red-500/10'

  const label = visibility === 'public' ? 'Public' : visibility === 'party' ? 'Party' : 'DM Only'

  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded",
      colorClass,
      className
    )}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}

// Quick toggle for visibility on entities
interface VisibilityToggleProps {
  value: VisibilityLevel
  onChange: (visibility: VisibilityLevel) => void
  disabled?: boolean
}

export function VisibilityToggle({ value, onChange, disabled }: VisibilityToggleProps) {
  const options: { value: VisibilityLevel; icon: typeof Eye; label: string }[] = [
    { value: 'public', icon: Eye, label: 'Public' },
    { value: 'party', icon: Users, label: 'Party' },
    { value: 'dm_only', icon: Lock, label: 'DM Only' },
  ]

  return (
    <div className="flex items-center gap-1 p-1 bg-white/[0.02] rounded-lg">
      {options.map(option => {
        const isActive = value === option.value
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors",
              isActive
                ? option.value === 'public'
                  ? 'bg-green-500/20 text-green-400'
                  : option.value === 'party'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-red-500/20 text-red-400'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.05]',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            title={option.label}
          >
            <option.icon className="w-3 h-3" />
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
