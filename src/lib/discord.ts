import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any>

export interface DiscordUserMetadata {
  provider_id: string      // Discord user ID (immutable)
  full_name?: string       // Display name
  name?: string            // Username
  avatar_url?: string      // Full avatar URL
  email?: string           // Email from Discord
  custom_claims?: {
    global_name?: string   // Discord global display name
  }
}

/**
 * Extract Discord metadata from Supabase OAuth user
 */
export function extractDiscordMetadata(user: { user_metadata?: Record<string, unknown> }): DiscordUserMetadata | null {
  const metadata = user.user_metadata
  if (!metadata) return null

  // Check if this is a Discord OAuth user
  if (!metadata.provider_id && !metadata.sub) return null

  return {
    provider_id: (metadata.provider_id || metadata.sub) as string,
    full_name: metadata.full_name as string | undefined,
    name: metadata.name as string | undefined,
    avatar_url: metadata.avatar_url as string | undefined,
    email: metadata.email as string | undefined,
    custom_claims: metadata.custom_claims as { global_name?: string } | undefined,
  }
}

/**
 * Get Discord display name from metadata
 */
export function getDiscordDisplayName(metadata: DiscordUserMetadata): string {
  return metadata.custom_claims?.global_name || metadata.full_name || metadata.name || 'Discord User'
}

/**
 * Save Discord info to user_settings after OAuth
 */
export async function saveDiscordToUserSettings(
  supabase: AnySupabaseClient,
  userId: string,
  discordMetadata: DiscordUserMetadata
): Promise<{ success: boolean; error?: string }> {
  const discordUsername = getDiscordDisplayName(discordMetadata)
  // Always use PNG format for avatars (no GIF support)
  const avatarUrl = ensurePngAvatarUrl(discordMetadata.avatar_url)

  const { error } = await supabase
    .from('user_settings')
    .update({
      discord_id: discordMetadata.provider_id,
      discord_username: discordUsername,
      discord_avatar: avatarUrl,
      discord_linked_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) {
    console.error('Failed to save Discord to user_settings:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Check if Discord ID is already linked to another account
 */
export async function isDiscordLinkedToOther(
  supabase: AnySupabaseClient,
  discordId: string,
  currentUserId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('user_settings')
    .select('user_id')
    .eq('discord_id', discordId)
    .neq('user_id', currentUserId)
    .single()

  return !!data
}

/**
 * Find pending campaign memberships that match this Discord
 */
export async function findPendingDiscordMemberships(
  supabase: AnySupabaseClient,
  discordId: string,
  discordUsername: string
): Promise<{ id: string; campaign_id: string }[]> {
  // Match by discord_id OR discord_username (case-insensitive)
  const { data } = await supabase
    .from('campaign_members')
    .select('id, campaign_id')
    .eq('status', 'pending')
    .or(`discord_id.eq.${discordId},discord_username.ilike.${discordUsername}`)

  return data || []
}

/**
 * Activate pending memberships for a user who just linked Discord
 */
export async function activatePendingDiscordMemberships(
  supabase: AnySupabaseClient,
  userId: string,
  discordId: string,
  discordUsername: string
): Promise<number> {
  const pendingMemberships = await findPendingDiscordMemberships(supabase, discordId, discordUsername)

  if (pendingMemberships.length === 0) return 0

  const membershipIds = pendingMemberships.map(m => m.id)

  const { error } = await supabase
    .from('campaign_members')
    .update({
      user_id: userId,
      discord_id: discordId,
      status: 'active',
      joined_at: new Date().toISOString(),
    })
    .in('id', membershipIds)

  if (error) {
    console.error('Failed to activate memberships:', error)
    return 0
  }

  return pendingMemberships.length
}

/**
 * Construct Discord avatar URL from hash (always PNG, no GIF support)
 */
export function getDiscordAvatarUrl(discordId: string, avatarHash: string | null): string {
  if (!avatarHash) {
    // Default Discord avatar based on user ID
    const defaultIndex = parseInt(discordId) % 5
    return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`
  }

  // Always use PNG format - Discord CDN will convert animated avatars to static PNG
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.png`
}

/**
 * Ensure Discord avatar URL uses PNG format (converts GIF URLs to PNG)
 * Discord CDN serves static PNG even for animated avatars when .png is requested
 */
export function ensurePngAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null

  // If it's a Discord CDN URL ending in .gif, replace with .png
  if (url.includes('cdn.discordapp.com') && url.endsWith('.gif')) {
    return url.replace(/\.gif$/, '.png')
  }

  return url
}
