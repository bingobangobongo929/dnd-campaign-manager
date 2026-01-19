'use client'

import { cn } from '@/lib/utils'

/**
 * Base skeleton component with shimmer animation
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-white/[0.06]',
        className
      )}
    />
  )
}

/**
 * Skeleton for character cards in lists
 */
export function SkeletonCharacterCard() {
  return (
    <div className="flex w-full gap-4 p-4 bg-[--bg-surface] rounded-xl border border-white/[0.06]">
      {/* Portrait */}
      <Skeleton className="w-16 h-16 rounded-xl flex-shrink-0" />

      {/* Info */}
      <div className="flex-1 flex flex-col justify-center gap-2">
        {/* Badge */}
        <Skeleton className="w-12 h-5 rounded" />
        {/* Name */}
        <Skeleton className="w-3/4 h-5 rounded" />
        {/* Meta */}
        <Skeleton className="w-1/2 h-4 rounded" />
      </div>

      {/* Chevron */}
      <Skeleton className="w-5 h-5 rounded self-center" />
    </div>
  )
}

/**
 * Skeleton for featured hero cards
 */
export function SkeletonHeroCard() {
  return (
    <div className="w-full mx-4 max-w-[calc(100%-32px)] rounded-2xl overflow-hidden bg-gray-900 border border-white/[0.06]">
      <div className="relative h-56">
        <Skeleton className="absolute inset-0 rounded-none" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          {/* Badges */}
          <div className="flex gap-2 mb-2">
            <Skeleton className="w-20 h-6 rounded" />
            <Skeleton className="w-16 h-6 rounded" />
          </div>
          {/* Title */}
          <Skeleton className="w-3/4 h-7 rounded mb-2" />
          {/* Description */}
          <Skeleton className="w-full h-4 rounded mb-1" />
          <Skeleton className="w-2/3 h-4 rounded" />
        </div>
      </div>
    </div>
  )
}

/**
 * Skeleton for campaign cards
 */
export function SkeletonCampaignCard() {
  return (
    <div className="w-full flex items-center gap-4 p-3 bg-[--bg-surface] rounded-xl border border-white/[0.06]">
      {/* Thumbnail */}
      <Skeleton className="w-16 h-16 rounded-lg flex-shrink-0" />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <Skeleton className="w-3/4 h-5 rounded mb-2" />
        <div className="flex gap-2">
          <Skeleton className="w-16 h-5 rounded" />
          <Skeleton className="w-24 h-5 rounded" />
        </div>
      </div>

      {/* Chevron */}
      <Skeleton className="w-5 h-5 rounded" />
    </div>
  )
}

/**
 * Skeleton for oneshot grid cards
 */
export function SkeletonOneshotCard() {
  return (
    <div className="relative rounded-xl overflow-hidden bg-gray-900 border border-white/[0.06] aspect-[2/3]">
      <Skeleton className="absolute inset-0 rounded-none" />
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <Skeleton className="w-16 h-4 rounded mb-2" />
        <Skeleton className="w-full h-5 rounded mb-1" />
        <Skeleton className="w-2/3 h-4 rounded" />
      </div>
    </div>
  )
}

/**
 * Skeleton list for character vault
 */
export function SkeletonCharacterList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3 px-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCharacterCard key={i} />
      ))}
    </div>
  )
}

/**
 * Skeleton list for campaigns
 */
export function SkeletonCampaignList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3 px-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCampaignCard key={i} />
      ))}
    </div>
  )
}

/**
 * Skeleton grid for oneshots
 */
export function SkeletonOneshotGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="px-4 grid grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonOneshotCard key={i} />
      ))}
    </div>
  )
}

/**
 * Full page skeleton for vault
 */
export function SkeletonVaultPage() {
  return (
    <div className="space-y-4 pb-20">
      <SkeletonHeroCard />
      <div className="px-4 py-2">
        <Skeleton className="w-32 h-5 rounded" />
      </div>
      <SkeletonCharacterList count={4} />
    </div>
  )
}

/**
 * Full page skeleton for campaigns
 */
export function SkeletonCampaignsPage() {
  return (
    <div className="space-y-4 pb-20">
      <SkeletonHeroCard />
      <div className="px-4 py-2">
        <Skeleton className="w-32 h-5 rounded" />
      </div>
      <SkeletonCampaignList count={3} />
    </div>
  )
}

/**
 * Full page skeleton for oneshots
 */
export function SkeletonOneshotsPage() {
  return (
    <div className="space-y-4 pb-20">
      <SkeletonHeroCard />
      <div className="px-4 py-2">
        <Skeleton className="w-32 h-5 rounded" />
      </div>
      <SkeletonOneshotGrid count={4} />
    </div>
  )
}
