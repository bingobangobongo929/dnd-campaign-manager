'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Settings,
  Users,
  Calendar,
  Share2,
  Plug,
  Download,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
  X,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Save,
  ImageIcon,
  Shield,
  FileText,
  Clock,
  Eye,
  EyeOff,
  Edit3,
  RotateCcw,
  MessageSquare,
  Layout,
  CheckSquare,
  BookOpen,
  Target,
  UserCheck,
  Play,
  Dices,
  Music,
  ScrollText,
  Lightbulb,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { useSupabase, useUser, usePermissions } from '@/hooks'
import { cn, getInitials } from '@/lib/utils'
import type {
  Campaign,
  CampaignShare,
  SessionSection,
  DefaultPrepChecklistItem,
  SessionSettings,
  PrepModule,
  CompletedSection,
} from '@/types/database'
import { CUSTOMIZABLE_PREP_MODULES, CUSTOMIZABLE_COMPLETED_SECTIONS } from '@/hooks'
import { PartyModal } from '@/components/campaign'
import { Modal, AccessDeniedPage } from '@/components/ui'
import { v4 as uuidv4 } from 'uuid'

// Section collapse state type
type SectionId = 'general' | 'party' | 'session-defaults' | 'session-notes' | 'optional-sections' | 'sharing' | 'integrations' | 'data' | 'danger'

// Settings Section wrapper
function SettingsSection({
  id,
  title,
  icon: Icon,
  description,
  children,
  defaultCollapsed = false,
  variant = 'default',
}: {
  id: SectionId
  title: string
  icon: React.ElementType
  description?: string
  children: React.ReactNode
  defaultCollapsed?: boolean
  variant?: 'default' | 'danger'
}) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  return (
    <div className={cn(
      "rounded-xl overflow-hidden",
      variant === 'danger'
        ? "border border-red-500/30 bg-red-500/5"
        : "border border-white/[0.08] bg-[#0a0a0f]"
    )}>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "w-full flex items-center justify-between px-6 py-4 text-left transition-colors",
          variant === 'danger'
            ? "hover:bg-red-500/10"
            : "hover:bg-white/[0.02]"
        )}
      >
        <div className="flex items-center gap-3">
          <Icon className={cn(
            "w-5 h-5",
            variant === 'danger' ? "text-red-400" : "text-[--arcane-purple]"
          )} />
          <div>
            <h3 className={cn(
              "font-semibold",
              variant === 'danger' ? "text-red-400" : "text-white"
            )}>
              {title}
            </h3>
            {description && (
              <p className="text-xs text-gray-500 mt-0.5">{description}</p>
            )}
          </div>
        </div>
        {isCollapsed ? (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        )}
      </button>
      {!isCollapsed && (
        <div className="px-6 pb-6 border-t border-white/[0.08]">
          {children}
        </div>
      )}
    </div>
  )
}

// Form field components
function FormField({
  label,
  description,
  required,
  children,
}: {
  label: string
  description?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <label className="block">
        <span className="text-sm font-medium text-white">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </span>
        {description && (
          <span className="block text-xs text-gray-500 mt-0.5">{description}</span>
        )}
      </label>
      {children}
    </div>
  )
}

// Share link row component
function ShareLinkRow({
  share,
  onEdit,
  onDelete,
  onCopy,
}: {
  share: CampaignShare
  onEdit: () => void
  onDelete: () => void
  onCopy: () => void
}) {
  const isExpired = share.expires_at && new Date(share.expires_at) < new Date()

  return (
    <div className={cn(
      "flex items-center justify-between p-4 rounded-lg border",
      isExpired
        ? "bg-gray-800/30 border-gray-700 opacity-60"
        : "bg-white/[0.02] border-white/[0.08]"
    )}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white font-medium text-sm truncate">
            {share.note || `Share Link (${share.share_type})`}
          </span>
          {isExpired && (
            <span className="px-2 py-0.5 text-xs bg-gray-700 text-gray-400 rounded">
              Expired
            </span>
          )}
          {share.status === 'deleted' && (
            <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">
              Revoked
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
          <span>{share.view_count} views</span>
          {share.last_viewed_at && (
            <span>Last viewed: {new Date(share.last_viewed_at).toLocaleDateString()}</span>
          )}
          {share.expires_at && (
            <span>Expires: {new Date(share.expires_at).toLocaleDateString()}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 ml-4">
        <button
          onClick={onCopy}
          className="p-2 text-gray-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
          title="Copy link"
        >
          <Copy className="w-4 h-4" />
        </button>
        <button
          onClick={onEdit}
          className="p-2 text-gray-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
          title="Edit"
        >
          <Edit3 className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          title="Revoke"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// Checklist item editor
function ChecklistItemEditor({
  item,
  onChange,
  onDelete,
}: {
  item: DefaultPrepChecklistItem
  onChange: (item: DefaultPrepChecklistItem) => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/[0.08]">
      <input
        type="checkbox"
        checked={item.default_checked}
        onChange={(e) => onChange({ ...item, default_checked: e.target.checked })}
        className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500"
      />
      <input
        type="text"
        value={item.text}
        onChange={(e) => onChange({ ...item, text: e.target.value })}
        placeholder="Checklist item..."
        className="flex-1 bg-transparent border-none text-white text-sm focus:outline-none placeholder:text-gray-600"
      />
      <button
        onClick={onDelete}
        className="p-1 text-gray-500 hover:text-red-400 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export default function CampaignSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()

  const campaignId = params.id as string
  const { can, loading: permissionsLoading, isDm } = usePermissions(campaignId)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [sessionCount, setSessionCount] = useState(0)
  const [shares, setShares] = useState<CampaignShare[]>([])

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [gameSystem, setGameSystem] = useState('')
  const [status, setStatus] = useState<Campaign['status']>('active')
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  // Session defaults
  const [defaultSections, setDefaultSections] = useState<SessionSection[]>(['prep_checklist'])
  const [defaultChecklist, setDefaultChecklist] = useState<DefaultPrepChecklistItem[]>([])

  // Session notes settings
  const [sessionSettings, setSessionSettings] = useState<SessionSettings>({
    players_can_view_session_notes: false,
    players_can_add_session_notes: true,
    disabled_prep_modules: [],
    disabled_completed_sections: [],
    all_optional_sections_hidden: false,
  })

  // Party modal
  const [showPartyModal, setShowPartyModal] = useState(false)
  const [characters, setCharacters] = useState<any[]>([])

  // Danger zone
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const isOwner = campaign?.user_id === user?.id
  const hasUnsavedChanges = campaign && (
    name !== campaign.name ||
    description !== (campaign.description || '') ||
    gameSystem !== campaign.game_system ||
    status !== campaign.status
  )

  // Load campaign data
  useEffect(() => {
    if (user && campaignId) {
      loadCampaignData()
    }
  }, [user, campaignId])

  const loadCampaignData = async () => {
    setLoading(true)

    // Load campaign
    const { data: campaignData } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (!campaignData) {
      router.push('/campaigns')
      return
    }

    setCampaign(campaignData)
    setName(campaignData.name)
    setDescription(campaignData.description || '')
    setGameSystem(campaignData.game_system || 'D&D 5e')
    setStatus(campaignData.status)
    setImageUrl(campaignData.image_url)

    // Load session defaults from campaign
    const sections = campaignData.default_session_sections as SessionSection[] || ['prep_checklist']
    setDefaultSections(sections)
    const checklist = campaignData.default_prep_checklist as DefaultPrepChecklistItem[] || []
    setDefaultChecklist(checklist)

    // Load session notes settings
    const settings = (campaignData.session_settings as SessionSettings) || {
      players_can_view_session_notes: false,
      players_can_add_session_notes: true,
      disabled_prep_modules: [],
      disabled_completed_sections: [],
      all_optional_sections_hidden: false,
    }
    setSessionSettings({
      players_can_view_session_notes: settings.players_can_view_session_notes ?? false,
      players_can_add_session_notes: settings.players_can_add_session_notes ?? true,
      disabled_prep_modules: settings.disabled_prep_modules ?? [],
      disabled_completed_sections: settings.disabled_completed_sections ?? [],
      all_optional_sections_hidden: settings.all_optional_sections_hidden ?? false,
    })

    // Load sessions count
    const { count } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)

    setSessionCount(count || 0)

    // Load characters for party modal
    const { data: charactersData } = await supabase
      .from('characters')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('type')
      .order('name')

    setCharacters(charactersData || [])

    // Load shares
    const { data: sharesData } = await supabase
      .from('campaign_shares')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })

    setShares(sharesData || [])

    setLoading(false)
  }

  // Save general settings
  const saveGeneralSettings = async () => {
    if (!campaign) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({
          name,
          description: description || null,
          game_system: gameSystem,
          status,
        })
        .eq('id', campaignId)

      if (error) throw error

      setCampaign({ ...campaign, name, description, game_system: gameSystem, status })
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setSaving(false)
    }
  }

  // Save session defaults
  const saveSessionDefaults = async () => {
    if (!campaign) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({
          default_session_sections: defaultSections,
          default_prep_checklist: defaultChecklist,
        })
        .eq('id', campaignId)

      if (error) throw error

      setCampaign({
        ...campaign,
        default_session_sections: defaultSections as any,
        default_prep_checklist: defaultChecklist as any
      })
    } catch (error) {
      console.error('Failed to save session defaults:', error)
    } finally {
      setSaving(false)
    }
  }

  // Add checklist item
  const addChecklistItem = () => {
    setDefaultChecklist([
      ...defaultChecklist,
      { id: uuidv4(), text: '', default_checked: false }
    ])
  }

  // Update checklist item
  const updateChecklistItem = (index: number, item: DefaultPrepChecklistItem) => {
    const updated = [...defaultChecklist]
    updated[index] = item
    setDefaultChecklist(updated)
  }

  // Delete checklist item
  const deleteChecklistItem = (index: number) => {
    setDefaultChecklist(defaultChecklist.filter((_, i) => i !== index))
  }

  // Toggle section default
  const toggleSectionDefault = (section: SessionSection) => {
    if (defaultSections.includes(section)) {
      setDefaultSections(defaultSections.filter(s => s !== section))
    } else {
      setDefaultSections([...defaultSections, section])
    }
  }

  // Save session notes settings
  const saveSessionNotesSettings = async () => {
    if (!campaign) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({
          session_settings: sessionSettings,
        })
        .eq('id', campaignId)

      if (error) throw error

      setCampaign({
        ...campaign,
        session_settings: sessionSettings as any
      })
    } catch (error) {
      console.error('Failed to save session notes settings:', error)
    } finally {
      setSaving(false)
    }
  }

  // Copy share link
  const copyShareLink = (share: CampaignShare) => {
    const url = `${window.location.origin}/share/campaign/${share.share_code}`
    navigator.clipboard.writeText(url)
  }

  // Delete campaign
  const deleteCampaign = async () => {
    if (deleteConfirmation !== campaign?.name) return

    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId)

      if (error) throw error

      router.push('/campaigns')
    } catch (error) {
      console.error('Failed to delete campaign:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  // Create template
  const createTemplate = async () => {
    // Navigate to template creation flow
    router.push(`/campaigns/${campaignId}/publish`)
  }

  if (loading || permissionsLoading) {
    return (
      <AppLayout campaignId={campaignId}>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      </AppLayout>
    )
  }

  // Only owners can access settings
  if (!isOwner) {
    return (
      <AppLayout campaignId={campaignId}>
        <AccessDeniedPage
          campaignId={campaignId}
          message="Only the campaign owner can access settings."
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout campaignId={campaignId}>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Campaign Settings</h1>
            <p className="text-gray-400 text-sm mt-1">
              Configure your campaign preferences and defaults
            </p>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="space-y-4">
          {/* General Settings */}
          <SettingsSection
            id="general"
            title="General"
            icon={Settings}
            description="Basic campaign information"
          >
            <div className="pt-6 space-y-6">
              {/* Campaign Image */}
              <FormField label="Campaign Image">
                <div className="flex items-center gap-4">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={name}
                      width={80}
                      height={80}
                      className="rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-purple-600/20 flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-purple-400" />
                    </div>
                  )}
                  <button className="btn btn-secondary btn-sm">
                    Change Image
                  </button>
                </div>
              </FormField>

              {/* Name */}
              <FormField label="Campaign Name" required>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 bg-[#0a0a0f] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-purple-500"
                  placeholder="Enter campaign name..."
                />
              </FormField>

              {/* Description */}
              <FormField label="Description" description="A brief overview of your campaign">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-[#0a0a0f] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-purple-500 resize-none"
                  placeholder="Describe your campaign..."
                />
              </FormField>

              {/* Game System */}
              <FormField label="Game System">
                <input
                  type="text"
                  value={gameSystem}
                  onChange={(e) => setGameSystem(e.target.value)}
                  className="w-full px-4 py-2 bg-[#0a0a0f] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-purple-500"
                  placeholder="e.g., D&D 5e, Pathfinder 2e..."
                />
              </FormField>

              {/* Status */}
              <FormField label="Campaign Status">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Campaign['status'])}
                  className="w-full px-4 py-2 bg-[#0a0a0f] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="active">Active</option>
                  <option value="hiatus">On Hiatus</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </FormField>

              {/* Save Button */}
              {hasUnsavedChanges && (
                <div className="flex justify-end pt-4 border-t border-white/[0.08]">
                  <button
                    onClick={saveGeneralSettings}
                    disabled={saving}
                    className="btn btn-primary"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          </SettingsSection>

          {/* Party & Members */}
          <SettingsSection
            id="party"
            title="Party & Members"
            icon={Users}
            description="Manage campaign members and permissions"
          >
            <div className="pt-6">
              <p className="text-gray-400 text-sm mb-4">
                Invite players, assign characters, and manage member permissions.
              </p>
              <button
                onClick={() => setShowPartyModal(true)}
                className="btn btn-secondary"
              >
                <Users className="w-4 h-4 mr-2" />
                Manage Members
              </button>
            </div>
          </SettingsSection>

          {/* Session Defaults */}
          <SettingsSection
            id="session-defaults"
            title="Session Defaults"
            icon={Calendar}
            description="Default settings for new sessions"
          >
            <div className="pt-6 space-y-6">
              {/* Prep Phase Modules */}
              <FormField
                label="Prep Phase Modules"
                description="Modules that auto-expand when creating new sessions. All modules are always available but these will be open by default."
              >
                <div className="space-y-2 mt-2">
                  {[
                    { id: 'prep_checklist' as SessionSection, icon: CheckSquare, label: 'Checklist', description: 'A checklist to prepare before the session', color: 'yellow' },
                    { id: 'quick_reference' as SessionSection, icon: BookOpen, label: 'Quick References', description: 'Pin NPCs, locations, and notes to keep handy', color: 'cyan' },
                    { id: 'session_goals' as SessionSection, icon: Target, label: 'Session Goals', description: 'What you hope to accomplish this session', color: 'purple' },
                    { id: 'key_npcs' as SessionSection, icon: UserCheck, label: 'Key NPCs', description: 'NPCs likely to appear and their motivations', color: 'green' },
                    { id: 'session_opener' as SessionSection, icon: Play, label: 'Session Opener', description: "How you'll start the session", color: 'orange' },
                    { id: 'random_tables' as SessionSection, icon: Dices, label: 'Random Tables', description: 'Names, encounters, or things to roll for', color: 'pink' },
                    { id: 'music_ambiance' as SessionSection, icon: Music, label: 'Music & Ambiance', description: 'Playlists, sound effects, atmosphere notes', color: 'teal' },
                  ].map(section => {
                    const IconComponent = section.icon
                    return (
                      <label
                        key={section.id}
                        className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/[0.08] cursor-pointer hover:bg-white/[0.04] transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={defaultSections.includes(section.id)}
                          onChange={() => toggleSectionDefault(section.id)}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500"
                        />
                        <IconComponent className={cn(
                          "w-4 h-4",
                          section.color === 'yellow' && 'text-yellow-400',
                          section.color === 'cyan' && 'text-cyan-400',
                          section.color === 'purple' && 'text-purple-400',
                          section.color === 'green' && 'text-green-400',
                          section.color === 'orange' && 'text-orange-400',
                          section.color === 'pink' && 'text-pink-400',
                          section.color === 'teal' && 'text-teal-400',
                        )} />
                        <div className="flex-1">
                          <span className="text-white text-sm font-medium">{section.label}</span>
                          <p className="text-gray-500 text-xs">{section.description}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </FormField>

              {/* Default Prep Checklist */}
              <FormField
                label="Default Prep Checklist Items"
                description="These items will be added to every new session's prep checklist"
              >
                <div className="space-y-2 mt-2">
                  {defaultChecklist.map((item, index) => (
                    <ChecklistItemEditor
                      key={item.id}
                      item={item}
                      onChange={(updated) => updateChecklistItem(index, updated)}
                      onDelete={() => deleteChecklistItem(index)}
                    />
                  ))}
                  <button
                    onClick={addChecklistItem}
                    className="flex items-center gap-2 w-full p-3 text-gray-400 hover:text-white border border-dashed border-white/[0.08] rounded-lg hover:bg-white/[0.02] transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">Add checklist item</span>
                  </button>
                </div>
              </FormField>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-white/[0.08]">
                <button
                  onClick={saveSessionDefaults}
                  disabled={saving}
                  className="btn btn-primary"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Session Defaults
                </button>
              </div>
            </div>
          </SettingsSection>

          {/* Optional Sections */}
          <SettingsSection
            id="optional-sections"
            title="Optional Sections"
            icon={Layout}
            description="Enable or disable optional sections for this campaign"
          >
            <div className="pt-6 space-y-6">
              {/* Master Toggle */}
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sessionSettings.all_optional_sections_hidden ?? false}
                    onChange={(e) => setSessionSettings({
                      ...sessionSettings,
                      all_optional_sections_hidden: e.target.checked
                    })}
                    className="w-4 h-4 mt-0.5 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-white font-medium block">Minimal Mode</span>
                    <p className="text-purple-300/70 text-xs mt-1">
                      Hide all optional prep modules and completed sections. Only the core session notes
                      will be shown. Great for DMs who prefer a simpler workflow.
                    </p>
                  </div>
                </label>
              </div>

              {!sessionSettings.all_optional_sections_hidden && (
                <>
                  {/* Prep Modules to Disable */}
                  <FormField
                    label="Prep Modules"
                    description="Disable prep modules you don't need. Disabled modules won't appear for any session in this campaign."
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {[
                        { id: 'checklist' as PrepModule, icon: CheckSquare, label: 'Checklist', color: 'yellow' },
                        { id: 'references' as PrepModule, icon: BookOpen, label: 'Quick References', color: 'cyan' },
                        { id: 'session_goals' as PrepModule, icon: Target, label: 'Session Goals', color: 'purple' },
                        { id: 'key_npcs' as PrepModule, icon: UserCheck, label: 'Key NPCs', color: 'green' },
                        { id: 'session_opener' as PrepModule, icon: Play, label: 'Session Opener', color: 'orange' },
                        { id: 'random_tables' as PrepModule, icon: Dices, label: 'Random Tables', color: 'pink' },
                        { id: 'music_ambiance' as PrepModule, icon: Music, label: 'Music & Ambiance', color: 'teal' },
                      ].map(module => {
                        const IconComponent = module.icon
                        const isDisabled = sessionSettings.disabled_prep_modules?.includes(module.id)
                        return (
                          <label
                            key={module.id}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                              isDisabled
                                ? "bg-gray-800/50 border-gray-700 opacity-60"
                                : "bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.04]"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={!isDisabled}
                              onChange={() => {
                                const current = sessionSettings.disabled_prep_modules ?? []
                                const updated = isDisabled
                                  ? current.filter(m => m !== module.id)
                                  : [...current, module.id]
                                setSessionSettings({
                                  ...sessionSettings,
                                  disabled_prep_modules: updated
                                })
                              }}
                              className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500"
                            />
                            <IconComponent className={cn(
                              "w-4 h-4",
                              module.color === 'yellow' && 'text-yellow-400',
                              module.color === 'cyan' && 'text-cyan-400',
                              module.color === 'purple' && 'text-purple-400',
                              module.color === 'green' && 'text-green-400',
                              module.color === 'orange' && 'text-orange-400',
                              module.color === 'pink' && 'text-pink-400',
                              module.color === 'teal' && 'text-teal-400',
                            )} />
                            <span className={cn(
                              "text-sm font-medium",
                              isDisabled ? "text-gray-500" : "text-white"
                            )}>{module.label}</span>
                          </label>
                        )
                      })}
                    </div>
                  </FormField>

                  {/* Completed Phase Sections to Disable */}
                  <FormField
                    label="Completed Phase Sections"
                    description="Disable completed phase sections you don't use. Disabled sections won't appear after sessions are completed."
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {[
                        { id: 'dm_notes' as CompletedSection, icon: EyeOff, label: 'DM Notes', color: 'red' },
                        { id: 'session_content' as CompletedSection, icon: ScrollText, label: 'Session Content', color: 'blue' },
                        { id: 'player_notes' as CompletedSection, icon: MessageSquare, label: 'Player Notes', color: 'green' },
                        { id: 'thoughts_for_next' as CompletedSection, icon: Lightbulb, label: 'Thoughts for Next', color: 'gold' },
                      ].map(section => {
                        const IconComponent = section.icon
                        const isDisabled = sessionSettings.disabled_completed_sections?.includes(section.id)
                        return (
                          <label
                            key={section.id}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                              isDisabled
                                ? "bg-gray-800/50 border-gray-700 opacity-60"
                                : "bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.04]"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={!isDisabled}
                              onChange={() => {
                                const current = sessionSettings.disabled_completed_sections ?? []
                                const updated = isDisabled
                                  ? current.filter(s => s !== section.id)
                                  : [...current, section.id]
                                setSessionSettings({
                                  ...sessionSettings,
                                  disabled_completed_sections: updated
                                })
                              }}
                              className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500"
                            />
                            <IconComponent className={cn(
                              "w-4 h-4",
                              section.color === 'red' && 'text-red-400',
                              section.color === 'blue' && 'text-blue-400',
                              section.color === 'green' && 'text-green-400',
                              section.color === 'gold' && 'text-yellow-400',
                            )} />
                            <span className={cn(
                              "text-sm font-medium",
                              isDisabled ? "text-gray-500" : "text-white"
                            )}>{section.label}</span>
                          </label>
                        )
                      })}
                    </div>
                  </FormField>
                </>
              )}

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-white/[0.08]">
                <button
                  onClick={saveSessionNotesSettings}
                  disabled={saving}
                  className="btn btn-primary"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Section Settings
                </button>
              </div>
            </div>
          </SettingsSection>

          {/* Session Notes Settings */}
          <SettingsSection
            id="session-notes"
            title="Session Notes"
            icon={MessageSquare}
            description="Control player access to session notes"
          >
            <div className="pt-6 space-y-6">
              <FormField
                label="Player Access"
                description="Configure whether players can view and add session notes"
              >
                <div className="space-y-3 mt-3">
                  {/* View DM Notes */}
                  <label
                    className="flex items-start gap-3 p-4 bg-white/[0.02] rounded-lg border border-white/[0.08] cursor-pointer hover:bg-white/[0.04] transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={sessionSettings.players_can_view_session_notes}
                      onChange={(e) => setSessionSettings({
                        ...sessionSettings,
                        players_can_view_session_notes: e.target.checked
                      })}
                      className="w-4 h-4 mt-0.5 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500"
                    />
                    <div className="flex-1">
                      <span className="text-white text-sm font-medium block">Players can view DM session notes</span>
                      <p className="text-gray-500 text-xs mt-1">
                        When enabled and you share a session, players can read your session recap notes.
                        You can still override this per-session.
                      </p>
                    </div>
                  </label>

                  {/* Add Notes */}
                  <label
                    className="flex items-start gap-3 p-4 bg-white/[0.02] rounded-lg border border-white/[0.08] cursor-pointer hover:bg-white/[0.04] transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={sessionSettings.players_can_add_session_notes}
                      onChange={(e) => setSessionSettings({
                        ...sessionSettings,
                        players_can_add_session_notes: e.target.checked
                      })}
                      className="w-4 h-4 mt-0.5 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500"
                    />
                    <div className="flex-1">
                      <span className="text-white text-sm font-medium block">Players can add their own session notes</span>
                      <p className="text-gray-500 text-xs mt-1">
                        When you open a session for player notes, players can contribute their character&apos;s
                        perspective on what happened.
                      </p>
                    </div>
                  </label>
                </div>
              </FormField>

              <div className="p-4 bg-white/[0.02] rounded-lg border border-white/[0.08]">
                <div className="flex items-start gap-3">
                  <Eye className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-300">
                      <strong className="text-white">How visibility works:</strong>
                    </p>
                    <ul className="text-xs text-gray-500 mt-2 space-y-1 list-disc list-inside">
                      <li><strong className="text-gray-400">Private</strong> sessions are only visible to you</li>
                      <li><strong className="text-gray-400">Open</strong> sessions allow players to add notes</li>
                      <li><strong className="text-gray-400">Locked</strong> sessions are finalized and read-only</li>
                      <li>Use the &quot;Share with players&quot; checkbox on each session to control note visibility</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-white/[0.08]">
                <button
                  onClick={saveSessionNotesSettings}
                  disabled={saving}
                  className="btn btn-primary"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Session Notes Settings
                </button>
              </div>
            </div>
          </SettingsSection>

          {/* Sharing & Visibility */}
          <SettingsSection
            id="sharing"
            title="Sharing & Visibility"
            icon={Share2}
            description="Manage share links and access"
          >
            <div className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-gray-400 text-sm">
                  {shares.length === 0
                    ? 'No share links created yet.'
                    : `${shares.filter(s => s.status === 'active').length} active share links`}
                </p>
                <button className="btn btn-secondary btn-sm">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Create Share Link
                </button>
              </div>

              {shares.length > 0 && (
                <div className="space-y-2">
                  {shares.map(share => (
                    <ShareLinkRow
                      key={share.id}
                      share={share}
                      onEdit={() => {/* TODO: implement edit */}}
                      onDelete={() => {/* TODO: implement delete */}}
                      onCopy={() => copyShareLink(share)}
                    />
                  ))}
                </div>
              )}
            </div>
          </SettingsSection>

          {/* Integrations */}
          <SettingsSection
            id="integrations"
            title="Integrations"
            icon={Plug}
            description="Connect external services"
          >
            <div className="pt-6">
              <div className="flex items-center justify-between p-4 bg-white/[0.02] rounded-lg border border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#5865F2]/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                  </div>
                  <div>
                    <span className="text-white font-medium">Discord</span>
                    <p className="text-gray-500 text-xs">Import notes from Discord channels</p>
                  </div>
                </div>
                <span className="px-3 py-1 text-xs bg-gray-700 text-gray-400 rounded-full">
                  Coming Soon
                </span>
              </div>
            </div>
          </SettingsSection>

          {/* Data & Export */}
          <SettingsSection
            id="data"
            title="Data & Export"
            icon={Download}
            description="Export and template options"
          >
            <div className="pt-6 space-y-4">
              {/* Template Creation */}
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <div className="flex flex-col gap-4">
                  <div>
                    <h4 className="text-white font-medium mb-2">
                      Publish as Template
                    </h4>
                    <p className="text-purple-300/70 text-sm">
                      Templates let other DMs use your campaign as a starting point for their own games.
                      They get your world, characters, locations, and lore - but start fresh with their own sessions and story.
                    </p>
                  </div>

                  {sessionCount > 0 ? (
                    <div className="p-3 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                      <p className="text-sm text-gray-300 mb-2">
                        <strong className="text-white">This is an active campaign</strong> with {sessionCount} session{sessionCount !== 1 ? 's' : ''}.
                      </p>
                      <p className="text-xs text-gray-500">
                        The template will capture your world setup (characters, locations, factions, lore) as a "Session 0" snapshot.
                        Your session notes and story progress stay private - others start from scratch with your world.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                      <p className="text-sm text-gray-300">
                        <strong className="text-white">Ready to publish</strong> - your campaign has no sessions yet,
                        so it's already in the perfect state to share as a template.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={createTemplate}
                      className="btn btn-primary btn-sm"
                    >
                      <FileText className="w-4 h-4 mr-1.5" />
                      Create Template
                    </button>
                  </div>
                </div>
              </div>

              {/* Export Options */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button className="btn btn-secondary flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Export Campaign Data (JSON)
                </button>
              </div>
            </div>
          </SettingsSection>

          {/* Danger Zone */}
          <SettingsSection
            id="danger"
            title="Danger Zone"
            icon={AlertTriangle}
            description="Irreversible actions"
            defaultCollapsed={true}
            variant="danger"
          >
            <div className="pt-6 space-y-4">
              {/* Delete Campaign */}
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-red-400 font-medium">Delete Campaign</h4>
                    <p className="text-red-300/60 text-sm mt-1">
                      Permanently delete this campaign and all its data. This action cannot be undone.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="btn bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30 btn-sm whitespace-nowrap"
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    Delete Campaign
                  </button>
                </div>
              </div>
            </div>
          </SettingsSection>
        </div>
      </div>

      {/* Party Modal */}
      <PartyModal
        campaignId={campaignId}
        characters={characters}
        isOpen={showPartyModal}
        onClose={() => setShowPartyModal(false)}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false)
            setDeleteConfirmation('')
          }}
          title="Delete Campaign"
        >
          <div className="space-y-4">
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">
                This will permanently delete <strong>{campaign?.name}</strong> and all associated data including:
              </p>
              <ul className="text-red-300/70 text-sm mt-2 list-disc list-inside space-y-1">
                <li>All sessions and notes</li>
                <li>All characters (PCs and NPCs)</li>
                <li>Timeline events and lore</li>
                <li>Maps and gallery items</li>
                <li>All share links</li>
              </ul>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Type <strong className="text-white">{campaign?.name}</strong> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                className="w-full px-4 py-2 bg-[#0a0a0f] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-red-500"
                placeholder="Campaign name..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteConfirmation('')
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={deleteCampaign}
                disabled={deleteConfirmation !== campaign?.name || isDeleting}
                className="btn bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Delete Forever
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AppLayout>
  )
}
