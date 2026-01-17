'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { X, Eye, ChevronUp } from 'lucide-react'

interface SharePageClientProps {
  children: React.ReactNode
  portraitUrl?: string | null
  characterName: string
}

export function SharePageClient({ children, portraitUrl, characterName }: SharePageClientProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)

  // Track scroll position for back to top button
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 500)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      {children}

      {/* Image Lightbox */}
      {lightboxOpen && portraitUrl && (
        <div
          className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-8"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img
            src={portraitUrl}
            alt={characterName}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 w-12 h-12 rounded-full bg-purple-600/90 hover:bg-purple-500 text-white shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110"
          aria-label="Back to top"
        >
          <ChevronUp className="w-6 h-6" />
        </button>
      )}
    </>
  )
}

// Clickable portrait wrapper
interface ClickablePortraitProps {
  src: string
  alt: string
  onOpen: () => void
}

export function ClickablePortrait({ src, alt, onOpen }: ClickablePortraitProps) {
  return (
    <button
      onClick={onOpen}
      className="relative w-48 sm:w-56 lg:w-full mx-auto aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/[0.08] group cursor-pointer"
    >
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover group-hover:scale-105 transition-transform duration-300"
        sizes="(max-width: 1024px) 224px, 360px"
        priority
      />
      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Eye className="w-8 h-8 text-white" />
      </div>
    </button>
  )
}

// Interactive portrait with built-in lightbox
interface InteractivePortraitProps {
  src: string
  alt: string
}

export function InteractivePortrait({ src, alt }: InteractivePortraitProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setLightboxOpen(true)}
        className="relative w-48 sm:w-56 lg:w-full mx-auto aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/[0.08] group cursor-pointer"
      >
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 1024px) 224px, 360px"
          priority
        />
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Eye className="w-8 h-8 text-white" />
        </div>
      </button>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-8"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img
            src={src}
            alt={alt}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}

// Back to top button component
export function BackToTopButton() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setShow(window.scrollY > 500)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!show) return null

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-8 right-8 z-50 w-12 h-12 rounded-full bg-purple-600/90 hover:bg-purple-500 text-white shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110"
      aria-label="Back to top"
    >
      <ChevronUp className="w-6 h-6" />
    </button>
  )
}

// NPC hover card component
interface NPCHoverCardProps {
  npc: {
    id: string
    related_name?: string | null
    related_image_url?: string | null
    nickname?: string | null
    relationship_type: string
    relationship_label?: string | null
    relationship_status?: string | null
    occupation?: string | null
    location?: string | null
    faction_affiliations?: string[] | null
    needs?: string | null
    can_provide?: string | null
    goals?: string | null
    secrets?: string | null
    personality_traits?: string[] | null
    full_notes?: string | null
  }
  relationshipColor: string
  children: React.ReactNode
}

export function NPCHoverCard({ npc, relationshipColor, children }: NPCHoverCardProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}

      {/* Hover tooltip */}
      {showTooltip && npc.related_image_url && (
        <div className="absolute bottom-full left-0 mb-2 z-50 pointer-events-none">
          <div className="bg-[#1a1a1f] border border-white/10 rounded-xl p-4 shadow-xl min-w-[280px] max-w-[360px]">
            <div className="flex gap-3">
              <Image
                src={npc.related_image_url}
                alt={npc.related_name || ''}
                width={80}
                height={80}
                className="rounded-lg object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-white truncate">{npc.related_name}</h4>
                {npc.nickname && (
                  <p className="text-sm text-gray-400 italic">"{npc.nickname}"</p>
                )}
                <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded capitalize border ${relationshipColor}`}>
                  {npc.relationship_label || npc.relationship_type.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
            {(npc.occupation || npc.location) && (
              <div className="mt-3 pt-3 border-t border-white/10 space-y-1 text-sm">
                {npc.occupation && (
                  <p className="text-gray-400">💼 {npc.occupation}</p>
                )}
                {npc.location && (
                  <p className="text-gray-400">📍 {npc.location}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
