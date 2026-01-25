'use client'

import { useState } from 'react'
import {
  Eye,
  EyeOff,
  Lock,
  Users,
  Globe,
  Plus,
  Trash2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Shield,
  Sparkles,
  Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Textarea } from '@/components/ui'
import { useEntitySecrets } from '@/hooks/useEntitySecrets'
import type { EntitySecret, SecretEntityType, VisibilityLevel } from '@/types/database'

interface EntitySecretsManagerProps {
  campaignId: string
  entityType: SecretEntityType
  entityId: string
  sessions?: { id: string; session_number: number; title: string | null }[]
  className?: string
  collapsed?: boolean
}

const visibilityOptions: { value: VisibilityLevel; label: string; icon: typeof Globe; color: string }[] = [
  { value: 'dm_only', label: 'DM Only', icon: Lock, color: 'text-purple-400' },
  { value: 'party', label: 'Party Only', icon: Users, color: 'text-blue-400' },
  { value: 'public', label: 'Public', icon: Globe, color: 'text-green-400' },
]

export function EntitySecretsManager({
  campaignId,
  entityType,
  entityId,
  sessions = [],
  className,
  collapsed: initialCollapsed = false,
}: EntitySecretsManagerProps) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newSecretContent, setNewSecretContent] = useState('')
  const [newSecretVisibility, setNewSecretVisibility] = useState<VisibilityLevel>('dm_only')
  const [revealingSecretId, setRevealingSecretId] = useState<string | null>(null)
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  const {
    secrets,
    loading,
    createSecret,
    updateSecret,
    deleteSecret,
    revealSecret,
  } = useEntitySecrets({ campaignId, entityType, entityId })

  const handleAddSecret = async () => {
    if (!newSecretContent.trim()) return

    const result = await createSecret({
      entityType,
      entityId,
      content: newSecretContent.trim(),
      visibility: newSecretVisibility,
    })

    if (result) {
      setNewSecretContent('')
      setNewSecretVisibility('dm_only')
      setShowAddForm(false)
    }
  }

  const handleReveal = async (secretId: string) => {
    await revealSecret(secretId, selectedSessionId || undefined)
    setRevealingSecretId(null)
    setSelectedSessionId('')
  }

  const handleSaveEdit = async (secretId: string) => {
    if (!editContent.trim()) return
    await updateSecret(secretId, { content: editContent.trim() })
    setEditingId(null)
    setEditContent('')
  }

  const startEdit = (secret: EntitySecret) => {
    setEditingId(secret.id)
    setEditContent(secret.content)
  }

  const getVisibilityIcon = (visibility: VisibilityLevel) => {
    const option = visibilityOptions.find(v => v.value === visibility)
    if (!option) return <Lock className="w-3.5 h-3.5" />
    const Icon = option.icon
    return <Icon className={cn('w-3.5 h-3.5', option.color)} />
  }

  const unrevealedCount = secrets.filter(s => !s.revealed_at).length
  const revealedCount = secrets.filter(s => s.revealed_at).length

  return (
    <div className={cn("border border-purple-500/20 rounded-lg overflow-hidden", className)}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between px-4 py-3 bg-purple-500/5 hover:bg-purple-500/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-purple-400" />
          <span className="font-medium text-white text-sm">Secrets & Visibility</span>
          {secrets.length > 0 && (
            <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
              {unrevealedCount} hidden{revealedCount > 0 && `, ${revealedCount} revealed`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <EyeOff className="w-3 h-3" />
            DM view
          </span>
          {isCollapsed ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Content */}
      {!isCollapsed && (
        <div className="p-4 space-y-4 bg-purple-500/5">
          {/* Loading state */}
          {loading && (
            <div className="text-center py-4 text-gray-400 text-sm">
              Loading secrets...
            </div>
          )}

          {/* Secrets list */}
          {!loading && secrets.length > 0 && (
            <div className="space-y-3">
              {secrets.map(secret => (
                <div
                  key={secret.id}
                  className={cn(
                    "p-3 rounded-lg border transition-colors",
                    secret.revealed_at
                      ? "bg-green-500/5 border-green-500/20"
                      : "bg-white/[0.02] border-white/[0.08]"
                  )}
                >
                  {/* Secret header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {getVisibilityIcon(secret.visibility)}
                      <span className="text-xs text-gray-400">
                        {visibilityOptions.find(v => v.value === secret.visibility)?.label}
                      </span>
                      {secret.revealed_at && (
                        <span className="flex items-center gap-1 text-xs text-green-400">
                          <Sparkles className="w-3 h-3" />
                          Revealed
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {!secret.revealed_at && revealingSecretId !== secret.id && (
                        <button
                          onClick={() => setRevealingSecretId(secret.id)}
                          className="p-1 text-gray-400 hover:text-green-400 transition-colors"
                          title="Reveal to players"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      {editingId !== secret.id && (
                        <button
                          onClick={() => startEdit(secret)}
                          className="p-1 text-gray-400 hover:text-white transition-colors"
                          title="Edit"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteSecret(secret.id)}
                        className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Reveal flow */}
                  {revealingSecretId === secret.id && (
                    <div className="mb-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                      <p className="text-sm text-green-300 mb-2">
                        Mark this secret as revealed to players
                      </p>
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <select
                          value={selectedSessionId}
                          onChange={(e) => setSelectedSessionId(e.target.value)}
                          className="flex-1 bg-white/[0.05] border border-white/[0.1] rounded px-2 py-1 text-sm text-white"
                        >
                          <option value="">No specific session</option>
                          {sessions.map(s => (
                            <option key={s.id} value={s.id}>
                              Session {s.session_number}{s.title ? `: ${s.title}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setRevealingSecretId(null)
                            setSelectedSessionId('')
                          }}
                          className="px-2 py-1 text-xs text-gray-400 hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleReveal(secret.id)}
                          className="px-3 py-1 text-xs bg-green-500/20 text-green-300 hover:bg-green-500/30 rounded transition-colors"
                        >
                          Reveal
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Secret content */}
                  {editingId === secret.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        className="form-textarea text-sm"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 text-gray-400 hover:text-white transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleSaveEdit(secret.id)}
                          className="p-1 text-green-400 hover:text-green-300 transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">
                      {secret.content}
                    </p>
                  )}

                  {/* Revealed info */}
                  {secret.revealed_at && (
                    <p className="text-xs text-gray-500 mt-2">
                      Revealed {new Date(secret.revealed_at).toLocaleDateString()}
                      {secret.revealed_in_session_id && sessions.length > 0 && (
                        <span>
                          {' in '}
                          {sessions.find(s => s.id === secret.revealed_in_session_id)
                            ? `Session ${sessions.find(s => s.id === secret.revealed_in_session_id)?.session_number}`
                            : 'a session'}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && secrets.length === 0 && !showAddForm && (
            <div className="text-center py-4">
              <p className="text-gray-400 text-sm mb-2">
                No secrets yet. Add DM-only information that can be revealed later.
              </p>
            </div>
          )}

          {/* Add secret form */}
          {showAddForm ? (
            <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.08]">
              <Textarea
                value={newSecretContent}
                onChange={(e) => setNewSecretContent(e.target.value)}
                placeholder="Hidden information, true motivations, plot secrets..."
                rows={3}
                className="form-textarea text-sm mb-3"
                autoFocus
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Visibility:</span>
                  <div className="flex gap-1">
                    {visibilityOptions.map(option => {
                      const Icon = option.icon
                      return (
                        <button
                          key={option.value}
                          onClick={() => setNewSecretVisibility(option.value)}
                          className={cn(
                            "p-1.5 rounded transition-colors",
                            newSecretVisibility === option.value
                              ? "bg-purple-500/20 text-purple-300"
                              : "text-gray-400 hover:text-white"
                          )}
                          title={option.label}
                        >
                          <Icon className="w-4 h-4" />
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowAddForm(false)
                      setNewSecretContent('')
                    }}
                    className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddSecret}
                    disabled={!newSecretContent.trim()}
                    className="px-3 py-1.5 text-xs bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Secret
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-purple-400 hover:text-purple-300 border border-dashed border-purple-500/30 hover:border-purple-500/50 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Secret
            </button>
          )}

          {/* Help text */}
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Secrets are tracked separately and can be revealed with session attribution.
          </p>
        </div>
      )}
    </div>
  )
}

// Compact indicator for lists showing if entity has secrets
interface SecretsIndicatorProps {
  hasSecrets: boolean
  hasRevealedSecrets?: boolean
  className?: string
}

export function SecretsIndicator({ hasSecrets, hasRevealedSecrets, className }: SecretsIndicatorProps) {
  if (!hasSecrets) return null

  return (
    <div className={cn("flex items-center gap-1", className)} title="Has DM secrets">
      <Shield className={cn(
        "w-3.5 h-3.5",
        hasRevealedSecrets ? "text-green-400" : "text-purple-400"
      )} />
    </div>
  )
}
