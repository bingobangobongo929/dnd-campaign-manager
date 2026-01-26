'use client'

import { useEffect, useState, useCallback } from 'react'
import { useContent, useContentQuery } from '@/hooks'
import { useContentPermissions } from '@/hooks/useContentPermissions'
import { useSupabase } from '@/hooks'

interface Character {
  id: string
  name: string
  type: 'pc' | 'npc'
  description?: string | null
  image_url?: string | null
}

/**
 * Example unified component that works for both campaigns and oneshots.
 *
 * This demonstrates the pattern for building unified components:
 * 1. Use useContent() to get contentId, contentType, campaignId, oneshotId
 * 2. Use useContentQuery() to build unified database queries
 * 3. Use useContentPermissions() for permission checks
 *
 * Usage (inside a ContentProvider):
 * ```tsx
 * <ContentProvider contentId={id} contentType="campaign">
 *   <UnifiedCharacterList />
 * </ContentProvider>
 * ```
 */
export function UnifiedCharacterList() {
  const supabase = useSupabase()
  const { contentId, contentType, campaignId, oneshotId, loading: contentLoading } = useContent()
  const { getContentFields } = useContentQuery()
  const { can, loading: permissionsLoading } = useContentPermissions()

  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCharacters = useCallback(async () => {
    if (!contentId || !contentType) return

    try {
      setError(null)

      // Build query based on content type
      let query = supabase
        .from('characters')
        .select('id, name, type, description, image_url')
        .order('name')

      // Filter by the correct parent
      if (contentType === 'campaign' && campaignId) {
        query = query.eq('campaign_id', campaignId)
      } else if (contentType === 'oneshot' && oneshotId) {
        query = query.eq('oneshot_id', oneshotId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      setCharacters(data || [])
    } catch (err) {
      console.error('Failed to load characters:', err)
      setError(err instanceof Error ? err.message : 'Failed to load characters')
    } finally {
      setLoading(false)
    }
  }, [contentId, contentType, campaignId, oneshotId, supabase])

  useEffect(() => {
    if (!contentLoading) {
      loadCharacters()
    }
  }, [contentLoading, loadCharacters])

  // Handle adding a new character (demonstrates using getContentFields)
  const addCharacter = useCallback(async (name: string, type: 'pc' | 'npc') => {
    if (!can.addNpc) {
      setError('You do not have permission to add characters')
      return null
    }

    try {
      const contentFields = getContentFields()

      const { data, error: insertError } = await supabase
        .from('characters')
        .insert({
          ...contentFields,
          name,
          type,
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Refresh the list
      await loadCharacters()

      return data
    } catch (err) {
      console.error('Failed to add character:', err)
      setError(err instanceof Error ? err.message : 'Failed to add character')
      return null
    }
  }, [can.addNpc, getContentFields, supabase, loadCharacters])

  // Loading state
  if (contentLoading || permissionsLoading || loading) {
    return <div className="p-4">Loading characters...</div>
  }

  // Error state
  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>
  }

  // Permission check
  if (!can.viewNpcs) {
    return <div className="p-4 text-yellow-500">You do not have permission to view characters.</div>
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">
          Characters ({characters.length})
        </h2>
        {can.addNpc && (
          <button
            onClick={() => addCharacter('New Character', 'npc')}
            className="px-3 py-1 bg-primary text-primary-foreground rounded"
          >
            Add Character
          </button>
        )}
      </div>

      {characters.length === 0 ? (
        <p className="text-muted-foreground">No characters yet.</p>
      ) : (
        <ul className="space-y-2">
          {characters.map((char) => (
            <li key={char.id} className="p-3 border rounded">
              <div className="font-medium">{char.name}</div>
              <div className="text-sm text-muted-foreground">
                {char.type === 'pc' ? 'Player Character' : 'NPC'}
              </div>
              {char.description && (
                <div className="text-sm mt-1">{char.description}</div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 text-xs text-muted-foreground">
        Content Type: {contentType} | ID: {contentId}
      </div>
    </div>
  )
}

export default UnifiedCharacterList
