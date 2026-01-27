'use client'

import { useState, useCallback, useMemo } from 'react'
import { List, Share2, Search, Filter, ArrowRight } from 'lucide-react'
import { RelationshipDiagram } from '@/components/campaign'
import { EmptyWorldState } from './EmptyWorldState'
import { cn, getInitials } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import type { Character, CharacterRelationship } from '@/types/database'

interface CharacterWithTags extends Character {
  tags: any[]
}

interface RelationshipsTabProps {
  campaignId: string
  characters: CharacterWithTags[]
  relationships: CharacterRelationship[]
}

export function RelationshipsTab({ campaignId, characters, relationships }: RelationshipsTabProps) {
  const [viewMode, setViewMode] = useState<'list' | 'diagram'>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [characterFilter, setCharacterFilter] = useState<string>('all')

  // Build family tree data from relationships
  const familyTree = useMemo(() => {
    const characterIds = new Set(relationships.flatMap(r => [r.character_id, r.related_character_id]))
    const nodes = characters
      .filter(c => characterIds.has(c.id))
      .map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        image_url: c.image_url,
        status: c.status,
      }))

    const edges = relationships.map(r => ({
      source: r.character_id,
      target: r.related_character_id,
      relationship: r.relationship_type,
      label: r.relationship_label || undefined,
    }))

    return { nodes, edges }
  }, [characters, relationships])

  // Filter relationships
  const filteredEdges = useMemo(() => {
    let filtered = familyTree.edges

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(edge => {
        const source = familyTree.nodes.find(n => n.id === edge.source)
        const target = familyTree.nodes.find(n => n.id === edge.target)
        return (
          source?.name.toLowerCase().includes(query) ||
          target?.name.toLowerCase().includes(query) ||
          edge.relationship.toLowerCase().includes(query) ||
          edge.label?.toLowerCase().includes(query)
        )
      })
    }

    // Filter by character
    if (characterFilter !== 'all') {
      filtered = filtered.filter(edge =>
        edge.source === characterFilter || edge.target === characterFilter
      )
    }

    return filtered
  }, [familyTree, searchQuery, characterFilter])

  // Get characters involved in relationships for filter dropdown
  const charactersWithRelationships = useMemo(() => {
    const ids = new Set(relationships.flatMap(r => [r.character_id, r.related_character_id]))
    return characters.filter(c => ids.has(c.id)).sort((a, b) => a.name.localeCompare(b.name))
  }, [characters, relationships])

  if (familyTree.nodes.length === 0) {
    return <EmptyWorldState type="relationships" campaignId={campaignId} />
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none z-10" />
          <input
            type="text"
            placeholder="Search relationships..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input w-full"
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>

        {/* Character filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none z-10" />
          <select
            value={characterFilter}
            onChange={(e) => setCharacterFilter(e.target.value)}
            className="form-input pl-10 w-full sm:w-48"
          >
            <option value="all">All Characters</option>
            {charactersWithRelationships.map(char => (
              <option key={char.id} value={char.id}>
                {char.name}
              </option>
            ))}
          </select>
        </div>

        {/* View mode toggle */}
        <div className="flex rounded-lg border border-[--border] overflow-hidden flex-shrink-0">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 text-sm transition-colors whitespace-nowrap",
              viewMode === 'list'
                ? "bg-purple-500/20 text-purple-400 border-r border-purple-500/30"
                : "bg-white/[0.02] text-gray-400 hover:bg-white/[0.05] border-r border-[--border]"
            )}
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">List</span>
          </button>
          <button
            onClick={() => setViewMode('diagram')}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 text-sm transition-colors whitespace-nowrap",
              viewMode === 'diagram'
                ? "bg-purple-500/20 text-purple-400"
                : "bg-white/[0.02] text-gray-400 hover:bg-white/[0.05]"
            )}
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Diagram</span>
          </button>
        </div>

        {/* Go to Canvas button */}
        <Link
          href={`/campaigns/${campaignId}`}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg font-medium text-sm transition-colors"
        >
          <span className="hidden sm:inline">Edit on Canvas</span>
          <span className="sm:hidden">Canvas</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Diagram View */}
      {viewMode === 'diagram' && (
        <RelationshipDiagram
          characters={characters}
          relationships={relationships}
          className="min-h-[500px]"
        />
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="grid gap-4">
          {filteredEdges.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No relationships match your filters</p>
              <p className="text-sm text-gray-600 mt-1">Try adjusting your search or character filter</p>
            </div>
          ) : (
            filteredEdges.map((edge, idx) => {
              const source = familyTree.nodes.find(n => n.id === edge.source)
              const target = familyTree.nodes.find(n => n.id === edge.target)
              if (!source || !target) return null

              return (
                <div
                  key={idx}
                  className="flex items-center gap-4 p-4 bg-white/[0.03] rounded-lg hover:bg-white/[0.05] transition-colors"
                >
                  {/* Source character */}
                  <div className="flex items-center gap-3 flex-1">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-[--bg-surface] flex-shrink-0">
                      {source.image_url ? (
                        <Image
                          src={source.image_url}
                          alt={source.name}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                          {getInitials(source.name)}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-white">{source.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{source.type}</p>
                    </div>
                  </div>

                  {/* Relationship */}
                  <div className="flex flex-col items-center px-4">
                    <div className="px-3 py-1 bg-purple-500/20 rounded-full text-xs font-medium text-purple-400">
                      {edge.label || edge.relationship}
                    </div>
                    <div className="w-px h-4 bg-purple-500/30 my-1" />
                  </div>

                  {/* Target character */}
                  <div className="flex items-center gap-3 flex-1 justify-end">
                    <div className="text-right">
                      <p className="font-medium text-white">{target.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{target.type}</p>
                    </div>
                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-[--bg-surface] flex-shrink-0">
                      {target.image_url ? (
                        <Image
                          src={target.image_url}
                          alt={target.name}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                          {getInitials(target.name)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
