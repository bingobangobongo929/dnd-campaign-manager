/**
 * Content Badge Utilities
 *
 * Functions to compute which badge(s) should be displayed
 * for campaigns, adventures, oneshots, and characters.
 */

import type { BadgeVariant } from '@/components/ui/ContentBadge'
import type { Campaign, Oneshot, VaultCharacter } from '@/types/database'

/**
 * Result of computing badges for a piece of content
 */
export interface ContentBadgeResult {
  primary: BadgeVariant // Main badge (most important state)
  secondary?: BadgeVariant // Optional second badge
  progress?: number // Draft completion percentage (0-100)
}

/**
 * Membership info for determining role badges
 */
export interface MembershipInfo {
  role: 'owner' | 'co_dm' | 'player' | 'contributor' | 'guest'
  status?: string
}

/**
 * Template snapshot info for determining published state
 */
export interface TemplateInfo {
  is_public?: boolean
  published_at?: string
}

// ============================================================
// CAMPAIGNS & ADVENTURES
// ============================================================

/**
 * Check if a campaign is considered a "draft" (incomplete)
 * A campaign is a draft if it's missing essential fields
 */
function isCampaignDraft(campaign: Campaign): boolean {
  const hasName = !!campaign.name && campaign.name !== 'Untitled Campaign'
  const hasDescription = !!campaign.description
  const hasImage = !!campaign.image_url

  // If missing 2+ of these key fields, consider it a draft
  const filledCount = [hasName, hasDescription, hasImage].filter(Boolean).length
  return filledCount < 2
}

/**
 * Compute the badge for a campaign or adventure
 *
 * Priority order:
 * 1. If you don't own it: PLAYING or CO-DM or SAVED
 * 2. If published (is_published = true): PUBLISHED
 * 3. If inactive mode: TEMPLATE
 * 4. If draft (incomplete): DRAFT (with progress)
 * 5. Default for owner: OWNER
 */
export function getCampaignBadge(
  campaign: Campaign,
  userId: string,
  membership?: MembershipInfo | null,
  templateSnapshot?: TemplateInfo | null
): ContentBadgeResult {
  const isOwner = campaign.user_id === userId

  // Non-owner badges take precedence
  if (!isOwner) {
    if (membership?.role === 'co_dm') {
      return { primary: 'co-dm' }
    }
    if (membership?.role === 'player' || membership?.role === 'contributor') {
      return { primary: 'playing' }
    }
    // Saved from community
    return { primary: 'saved' }
  }

  // Owner - check content state

  // Published takes highest priority for owner
  if (campaign.is_published || templateSnapshot?.is_public) {
    return { primary: 'published' }
  }

  // Inactive content mode = template (ready but not in active use)
  if (campaign.content_mode === 'inactive') {
    return { primary: 'template' }
  }

  // Check if it's a draft (incomplete)
  if (isCampaignDraft(campaign)) {
    return {
      primary: 'draft',
      progress: calculateCampaignProgress(campaign),
    }
  }

  // Active campaign owned by user
  return { primary: 'owner' }
}

/**
 * Calculate draft completion percentage for a campaign
 */
export function calculateCampaignProgress(campaign: Campaign): number {
  const checks = [
    { filled: !!campaign.name && campaign.name !== 'Untitled Campaign', weight: 25 },
    { filled: !!campaign.description, weight: 25 },
    { filled: !!campaign.image_url, weight: 30 },
    { filled: !!campaign.game_system && campaign.game_system !== 'D&D 5e', weight: 20 },
  ]

  const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0)
  const filledWeight = checks.reduce((sum, c) => (c.filled ? sum + c.weight : sum), 0)

  return Math.round((filledWeight / totalWeight) * 100)
}

// ============================================================
// ONESHOTS
// ============================================================

/**
 * Check if a oneshot is considered a "draft" (incomplete)
 */
function isOneshotDraft(oneshot: Oneshot): boolean {
  const hasTitle = !!oneshot.title && oneshot.title !== 'Untitled One-Shot'
  const hasTagline = !!oneshot.tagline
  const hasImage = !!oneshot.image_url
  const hasIntro = !!oneshot.introduction

  // If missing 2+ of these key fields, consider it a draft
  const filledCount = [hasTitle, hasTagline, hasImage, hasIntro].filter(Boolean).length
  return filledCount < 2
}

/**
 * Compute the badge for a oneshot
 *
 * Oneshots don't have "playing" state since they're single-session.
 * Priority order:
 * 1. If not owner: SAVED
 * 2. If published: PUBLISHED
 * 3. If inactive: TEMPLATE
 * 4. If draft: DRAFT (with progress)
 * 5. Default for owner: OWNER
 */
export function getOneshotBadge(
  oneshot: Oneshot,
  userId: string,
  templateSnapshot?: TemplateInfo | null
): ContentBadgeResult {
  const isOwner = oneshot.user_id === userId

  // Non-owner = saved from community
  if (!isOwner) {
    return { primary: 'saved' }
  }

  // Owner - check content state

  // Published takes highest priority
  if (oneshot.is_published || templateSnapshot?.is_public) {
    return { primary: 'published' }
  }

  // Inactive content mode = template
  if (oneshot.content_mode === 'inactive') {
    return { primary: 'template' }
  }

  // Check if it's a draft (incomplete)
  if (isOneshotDraft(oneshot)) {
    return {
      primary: 'draft',
      progress: calculateOneshotProgress(oneshot),
    }
  }

  // Active oneshot owned by user
  return { primary: 'owner' }
}

/**
 * Calculate draft completion percentage for a oneshot
 */
export function calculateOneshotProgress(oneshot: Oneshot): number {
  const checks = [
    { filled: !!oneshot.title && oneshot.title !== 'Untitled One-Shot', weight: 20 },
    { filled: !!oneshot.tagline, weight: 15 },
    { filled: !!oneshot.image_url, weight: 25 },
    { filled: !!oneshot.game_system, weight: 10 },
    { filled: !!oneshot.introduction, weight: 15 },
    { filled: !!oneshot.setting_notes, weight: 10 },
    { filled: !!oneshot.session_plan, weight: 5 },
  ]

  const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0)
  const filledWeight = checks.reduce((sum, c) => (c.filled ? sum + c.weight : sum), 0)

  return Math.round((filledWeight / totalWeight) * 100)
}

// ============================================================
// CHARACTERS (VAULT)
// ============================================================

/**
 * Compute the badge for a vault character
 *
 * Characters use source_type for their primary badge.
 * The source_type field was added in migration 073.
 */
export function getCharacterBadge(character: VaultCharacter): ContentBadgeResult {
  const sourceType = character.source_type || 'original'

  // Map source_type to badge variant
  const badgeMap: Record<string, BadgeVariant> = {
    original: 'original',
    linked: 'in-play',
    session_0: 'session-0',
    export: 'export',
  }

  return { primary: badgeMap[sourceType] || 'original' }
}

/**
 * Calculate draft completion percentage for a character
 */
export function calculateCharacterProgress(character: VaultCharacter): number {
  const checks = [
    { filled: !!character.name, weight: 15 },
    { filled: !!character.image_url || !!character.detail_image_url, weight: 20 },
    { filled: !!character.summary || !!character.description, weight: 15 },
    { filled: !!character.race, weight: 10 },
    { filled: !!character.class, weight: 10 },
    { filled: !!character.backstory, weight: 15 },
    { filled: !!character.personality, weight: 10 },
    { filled: !!character.goals, weight: 5 },
  ]

  const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0)
  const filledWeight = checks.reduce((sum, c) => (c.filled ? sum + c.weight : sum), 0)

  return Math.round((filledWeight / totalWeight) * 100)
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get badge variant for a generic content item
 * Useful when you have mixed content types
 */
export function getContentBadge(
  item: Campaign | Oneshot | VaultCharacter,
  contentType: 'campaign' | 'adventure' | 'oneshot' | 'character',
  userId: string,
  options?: {
    membership?: MembershipInfo | null
    templateSnapshot?: TemplateInfo | null
  }
): ContentBadgeResult {
  switch (contentType) {
    case 'campaign':
    case 'adventure':
      return getCampaignBadge(
        item as Campaign,
        userId,
        options?.membership,
        options?.templateSnapshot
      )
    case 'oneshot':
      return getOneshotBadge(item as Oneshot, userId, options?.templateSnapshot)
    case 'character':
      return getCharacterBadge(item as VaultCharacter)
    default:
      return { primary: 'owner' }
  }
}

/**
 * Determine content type from an item (if it has type indicators)
 */
export function inferContentType(
  item: Campaign | Oneshot | VaultCharacter
): 'campaign' | 'adventure' | 'oneshot' | 'character' {
  // Check for oneshot (has 'title' instead of 'name')
  if ('title' in item && !('name' in item)) {
    return 'oneshot'
  }

  // Check for vault character (has 'source_type')
  if ('source_type' in item) {
    return 'character'
  }

  // Check for campaign vs adventure (duration_type)
  if ('duration_type' in item) {
    return (item as Campaign).duration_type === 'adventure' ? 'adventure' : 'campaign'
  }

  // Default to campaign
  return 'campaign'
}

/**
 * Check if a badge indicates ownership/active use
 */
export function isActiveBadge(variant: BadgeVariant): boolean {
  return ['owner', 'playing', 'co-dm', 'in-play'].includes(variant)
}

/**
 * Check if a badge indicates work-in-progress
 */
export function isWipBadge(variant: BadgeVariant): boolean {
  return variant === 'draft'
}

/**
 * Check if a badge indicates shared/community content
 */
export function isSharedBadge(variant: BadgeVariant): boolean {
  return ['published', 'template', 'saved'].includes(variant)
}
