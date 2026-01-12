'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import Image from 'next/image'
import { cn, getInitials } from '@/lib/utils'
import type { VaultCharacter } from '@/types/database'

interface CharacterCardProps {
  character: VaultCharacter
  onClick: () => void
  className?: string
}

export function CharacterCard({ character, onClick, className }: CharacterCardProps) {
  const [imageError, setImageError] = useState(false)

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative w-full text-left rounded-xl overflow-hidden transition-all duration-200',
        'bg-[--bg-surface] border border-[--border]',
        'hover:border-[--arcane-purple]/50 hover:shadow-lg hover:shadow-[--arcane-purple]/10',
        'focus:outline-none focus:ring-2 focus:ring-[--arcane-purple] focus:ring-offset-2 focus:ring-offset-[--bg-base]',
        className
      )}
    >
      {/* Portrait - edge to edge */}
      <div className="relative w-full aspect-[16/9] bg-[--bg-hover]">
        {character.image_url && !imageError ? (
          <Image
            src={character.image_url}
            alt={character.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
            onError={() => setImageError(true)}
            unoptimized={character.image_url.includes('.svg') || character.image_url.includes('dicebear')}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1a1a24] to-[#0a0a0f]">
            <span className="text-4xl font-bold text-[--text-tertiary] select-none">
              {getInitials(character.name)}
            </span>
          </div>
        )}

        {/* Type badge */}
        <div
          className={cn(
            'absolute top-3 right-3 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md',
            character.type === 'pc'
              ? 'bg-[--arcane-purple] text-white'
              : 'bg-[--arcane-gold] text-[#12121a]'
          )}
        >
          {character.type}
        </div>
      </div>

      {/* Content - WITH EXPLICIT 24px PADDING */}
      <div
        className="px-6 py-5"
        style={{ paddingLeft: '24px', paddingRight: '24px', paddingTop: '20px', paddingBottom: '20px' }}
      >
        {/* DEBUG TEST - REMOVE AFTER VERIFICATION */}
        <div style={{ background: '#ff0000', color: '#ffffff', padding: '8px', marginBottom: '12px', fontWeight: 'bold', textAlign: 'center' }}>
          DEPLOYMENT TEST - If you see this red box, the code is deployed correctly
        </div>
        {/* Name */}
        <h3 className="text-base font-semibold text-[--text-primary] mb-2 group-hover:text-[--arcane-purple] transition-colors">
          {character.name}
        </h3>

        {/* Summary */}
        <p className="text-sm text-[--text-secondary] line-clamp-2 leading-relaxed mb-3">
          {character.summary || 'No summary yet'}
        </p>

        {/* Date */}
        <p className="text-xs text-[--text-tertiary]">
          Updated {formatDistanceToNow(new Date(character.updated_at), { addSuffix: true })}
        </p>
      </div>
    </button>
  )
}
