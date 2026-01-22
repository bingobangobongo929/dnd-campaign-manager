'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X, Search, Plus, Users, Heart, Swords, Briefcase,
  Crown, ArrowRight, ArrowLeftRight, Info, ChevronDown
} from 'lucide-react'
import { Modal, Input, getGroupIcon } from '@/components/ui'
import { useSupabase } from '@/hooks'
import { cn } from '@/lib/utils'
import type {
  Character, RelationshipTemplate, CanvasRelationship,
  RelationshipMode, RelationshipCategory
} from '@/types/database'

interface AddRelationshipModalProps {
  campaignId: string
  character: Character
  allCharacters: Character[]
  existingRelationships: CanvasRelationship[]
  isOpen: boolean
  onClose: () => void
  onRelationshipCreated: () => void
}

const CATEGORY_ICONS: Record<RelationshipCategory, React.ReactNode> = {
  family: <Crown className="w-4 h-4" />,
  professional: <Briefcase className="w-4 h-4" />,
  romantic: <Heart className="w-4 h-4" />,
  conflict: <Swords className="w-4 h-4" />,
  social: <Users className="w-4 h-4" />,
  other: <Users className="w-4 h-4" />,
}

const CATEGORY_COLORS: Record<RelationshipCategory, string> = {
  family: '#3B82F6',
  professional: '#10B981',
  romantic: '#EC4899',
  conflict: '#EF4444',
  social: '#8B5CF6',
  other: '#6B7280',
}

const MODE_LABELS: Record<RelationshipMode, string> = {
  symmetric: 'Both ways (same)',
  asymmetric: 'Both ways (different)',
  one_way: 'One way only',
}

export function AddRelationshipModal({
  campaignId,
  character,
  allCharacters,
  existingRelationships,
  isOpen,
  onClose,
  onRelationshipCreated,
}: AddRelationshipModalProps) {
  const supabase = useSupabase()
  const [templates, setTemplates] = useState<RelationshipTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState<RelationshipTemplate | null>(null)
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('')
  const [customLabel, setCustomLabel] = useState('')
  const [description, setDescription] = useState('')
  const [createBidirectional, setCreateBidirectional] = useState(true)

  // UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<RelationshipCategory>>(
    new Set(['family', 'social', 'conflict'])
  )
  const [isCustomMode, setIsCustomMode] = useState(false)

  // Load templates
  const loadTemplates = useCallback(async () => {
    setLoading(true)

    // Get system templates and campaign-specific templates
    const { data: systemTemplates } = await supabase
      .from('relationship_templates')
      .select('*')
      .eq('is_system', true)
      .order('display_order', { ascending: true })

    const { data: campaignTemplates } = await supabase
      .from('relationship_templates')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('name', { ascending: true })

    setTemplates([...(systemTemplates || []), ...(campaignTemplates || [])])
    setLoading(false)
  }, [campaignId, supabase])

  useEffect(() => {
    if (isOpen) {
      loadTemplates()
      // Reset form
      setSelectedTemplate(null)
      setSelectedCharacterId('')
      setCustomLabel('')
      setDescription('')
      setCreateBidirectional(true)
      setSearchQuery('')
      setIsCustomMode(false)
    }
  }, [isOpen, loadTemplates])

  // Get available characters (not the current character, and optionally filter out existing relationships)
  const availableCharacters = allCharacters.filter(c => {
    if (c.id === character.id) return false
    // Check if there's already a relationship with this template
    if (selectedTemplate) {
      const hasExisting = existingRelationships.some(
        r => r.from_character_id === character.id &&
             r.to_character_id === c.id &&
             r.template_id === selectedTemplate.id
      )
      if (hasExisting) return false
    }
    return true
  })

  const filteredCharacters = availableCharacters.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group templates by category
  const templatesByCategory = templates.reduce((acc, template) => {
    const category = template.category
    if (!acc[category]) acc[category] = []
    acc[category].push(template)
    return acc
  }, {} as Record<RelationshipCategory, RelationshipTemplate[]>)

  const toggleCategory = (category: RelationshipCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  const handleCreateRelationship = async () => {
    if (!selectedCharacterId) return
    if (!selectedTemplate && !customLabel.trim()) return

    setSaving(true)

    const pairId = crypto.randomUUID()
    const targetCharacter = allCharacters.find(c => c.id === selectedCharacterId)

    // Create the primary relationship
    const primaryData = {
      campaign_id: campaignId,
      from_character_id: character.id,
      to_character_id: selectedCharacterId,
      template_id: selectedTemplate?.id || null,
      custom_label: customLabel.trim() || selectedTemplate?.name || null,
      pair_id: pairId,
      is_primary: true,
      description: description.trim() || null,
      status: 'active' as const,
      is_known_to_party: true,
    }

    const { error: primaryError } = await supabase
      .from('canvas_relationships')
      .insert(primaryData)

    if (primaryError) {
      console.error('Error creating relationship:', primaryError)
      setSaving(false)
      return
    }

    // Create inverse relationship if bidirectional is enabled and template supports it
    if (createBidirectional && selectedTemplate) {
      const mode = selectedTemplate.relationship_mode

      if (mode !== 'one_way') {
        // For symmetric: use same label
        // For asymmetric: use inverse_name
        const inverseLabel = mode === 'symmetric'
          ? selectedTemplate.name
          : selectedTemplate.inverse_name || selectedTemplate.name

        const inverseData = {
          campaign_id: campaignId,
          from_character_id: selectedCharacterId,
          to_character_id: character.id,
          template_id: selectedTemplate.id,
          custom_label: inverseLabel,
          pair_id: pairId,
          is_primary: false,
          description: description.trim() || null,
          status: 'active' as const,
          is_known_to_party: true,
        }

        await supabase
          .from('canvas_relationships')
          .insert(inverseData)
      }
    }

    setSaving(false)
    onRelationshipCreated()
    onClose()
  }

  const selectedCharacter = allCharacters.find(c => c.id === selectedCharacterId)

  const renderTemplateButton = (template: RelationshipTemplate) => {
    const isSelected = selectedTemplate?.id === template.id
    const TemplateIcon = getGroupIcon(template.icon)

    return (
      <button
        key={template.id}
        onClick={() => {
          setSelectedTemplate(template)
          setIsCustomMode(false)
          setCustomLabel('')
        }}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left w-full",
          isSelected
            ? "bg-purple-500/20 border border-purple-500/40"
            : "bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1]"
        )}
        style={isSelected ? { borderColor: template.color + '60' } : undefined}
      >
        <span
          className="w-6 h-6 rounded flex items-center justify-center shrink-0"
          style={{ backgroundColor: template.color + '20', color: template.color }}
        >
          <TemplateIcon className="w-3.5 h-3.5" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white truncate">{template.name}</span>
            {template.inverse_name && template.relationship_mode === 'asymmetric' && (
              <span className="text-xs text-gray-500">→ {template.inverse_name}</span>
            )}
          </div>
        </div>
      </button>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Add Relationship for ${character.name}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Step 1: Select Template */}
        <div className="space-y-3">
          <label className="form-label">Relationship Type</label>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {(Object.entries(templatesByCategory) as [RelationshipCategory, RelationshipTemplate[]][])
                .filter(([_, temps]) => temps.length > 0)
                .map(([category, categoryTemplates]) => (
                  <div key={category}>
                    <button
                      onClick={() => toggleCategory(category)}
                      className="flex items-center gap-2 text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2 hover:text-white transition-colors w-full"
                    >
                      <span style={{ color: CATEGORY_COLORS[category] }}>
                        {CATEGORY_ICONS[category]}
                      </span>
                      <span className="capitalize">{category}</span>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 ml-auto transition-transform",
                          expandedCategories.has(category) ? "" : "-rotate-90"
                        )}
                      />
                    </button>
                    {expandedCategories.has(category) && (
                      <div className="grid grid-cols-2 gap-2">
                        {categoryTemplates.map(renderTemplateButton)}
                      </div>
                    )}
                  </div>
                ))}

              {/* Custom option */}
              <div>
                <button
                  onClick={() => toggleCategory('other')}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2 hover:text-white transition-colors w-full"
                >
                  <Plus className="w-4 h-4 text-gray-500" />
                  <span>Custom Relationship</span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 ml-auto transition-transform",
                      isCustomMode ? "" : "-rotate-90"
                    )}
                  />
                </button>
                {(expandedCategories.has('other') || isCustomMode) && (
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setIsCustomMode(true)
                        setSelectedTemplate(null)
                      }}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all w-full text-left",
                        isCustomMode && !selectedTemplate
                          ? "bg-purple-500/20 border border-purple-500/40"
                          : "bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1]"
                      )}
                    >
                      <span className="w-6 h-6 rounded flex items-center justify-center shrink-0 bg-gray-500/20 text-gray-400">
                        <Plus className="w-3 h-3" />
                      </span>
                      <span className="text-white">Create Custom</span>
                    </button>
                    {isCustomMode && !selectedTemplate && (
                      <Input
                        value={customLabel}
                        onChange={(e) => setCustomLabel(e.target.value)}
                        placeholder="Enter relationship label..."
                        className="form-input"
                        autoFocus
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Select Character */}
        <div className="space-y-3">
          <label className="form-label">Related Character</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              className="pl-10"
              placeholder="Search characters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[200px] overflow-y-auto pr-2">
            {filteredCharacters.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCharacterId(c.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all text-left",
                  selectedCharacterId === c.id
                    ? "bg-purple-500/20 border border-purple-500/40"
                    : "bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1]"
                )}
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600/30 to-purple-800/30 flex items-center justify-center text-xs font-semibold text-purple-300 shrink-0">
                  {c.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white truncate">{c.name}</p>
                  <p className="text-xs text-gray-500 uppercase">{c.type}</p>
                </div>
              </button>
            ))}
            {filteredCharacters.length === 0 && (
              <p className="text-sm text-gray-400 col-span-full text-center py-4">
                No characters available
              </p>
            )}
          </div>
        </div>

        {/* Preview */}
        {(selectedTemplate || customLabel) && selectedCharacter && (
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-300">This will create:</span>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-white">
                <span className="text-gray-400">{character.name}</span>
                {' '}is{' '}
                <span className="font-medium" style={{ color: selectedTemplate?.color || '#8B5CF6' }}>
                  {customLabel || selectedTemplate?.name}
                </span>
                {' '}of{' '}
                <span className="text-gray-400">{selectedCharacter.name}</span>
              </p>

              {createBidirectional && selectedTemplate && selectedTemplate.relationship_mode !== 'one_way' && (
                <p className="text-white">
                  <span className="text-gray-400">{selectedCharacter.name}</span>
                  {' '}is{' '}
                  <span className="font-medium" style={{ color: selectedTemplate.color }}>
                    {selectedTemplate.relationship_mode === 'symmetric'
                      ? selectedTemplate.name
                      : selectedTemplate.inverse_name || selectedTemplate.name}
                  </span>
                  {' '}of{' '}
                  <span className="text-gray-400">{character.name}</span>
                </p>
              )}
            </div>

            {/* Bidirectional toggle */}
            {selectedTemplate && selectedTemplate.relationship_mode !== 'one_way' && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-purple-500/20">
                <input
                  type="checkbox"
                  id="createBidirectional"
                  checked={createBidirectional}
                  onChange={(e) => setCreateBidirectional(e.target.checked)}
                  className="rounded border-gray-600 bg-white/[0.05] text-purple-500 focus:ring-purple-500"
                />
                <label htmlFor="createBidirectional" className="text-xs text-gray-300">
                  Create both directions (recommended)
                </label>
              </div>
            )}
          </div>
        )}

        {/* Description */}
        <div className="form-group">
          <label className="form-label">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add context about this relationship..."
            rows={2}
            className="form-textarea"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleCreateRelationship}
            disabled={
              saving ||
              !selectedCharacterId ||
              (!selectedTemplate && !customLabel.trim())
            }
          >
            {saving ? 'Creating...' : 'Create Relationship'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
