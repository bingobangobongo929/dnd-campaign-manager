/**
 * Analytics tracking utilities for Umami
 *
 * Umami is a privacy-focused analytics platform.
 * Events are tracked anonymously without personal data.
 */

declare global {
  interface Window {
    umami?: {
      track: (eventName: string, eventData?: Record<string, unknown>) => void
    }
  }
}

/**
 * Track a custom event with Umami
 * @param eventName - The name of the event (e.g., 'signup', 'create_campaign')
 * @param eventData - Optional data to include with the event
 */
export function trackEvent(eventName: string, eventData?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.umami) {
    window.umami.track(eventName, eventData)
  }
}

// Pre-defined event tracking functions for consistency

// Authentication events
export const analytics = {
  // Auth events
  signup: (method: 'email' | 'discord') => trackEvent('signup', { method }),
  login: (method: 'email' | 'discord') => trackEvent('login', { method }),
  logout: () => trackEvent('logout'),
  forgotPassword: () => trackEvent('forgot_password'),
  resetPassword: () => trackEvent('reset_password'),

  // 2FA events
  enable2FA: () => trackEvent('enable_2fa'),
  disable2FA: () => trackEvent('disable_2fa'),
  verify2FA: () => trackEvent('verify_2fa'),

  // Campaign events
  createCampaign: () => trackEvent('create_campaign'),
  deleteCampaign: () => trackEvent('delete_campaign'),
  shareCampaign: () => trackEvent('share_campaign'),

  // Character events
  createCharacter: (type: 'pc' | 'npc' | 'companion') => trackEvent('create_character', { type }),
  importCharacter: (source: 'dndbeyond' | 'manual') => trackEvent('import_character', { source }),

  // Session events
  createSession: () => trackEvent('create_session'),
  generateSummary: () => trackEvent('generate_summary'),

  // Vault events
  createVaultCharacter: () => trackEvent('create_vault_character'),
  parseVaultFile: () => trackEvent('parse_vault_file'),

  // AI events
  useAI: (feature: string) => trackEvent('use_ai', { feature }),

  // Feature usage
  useTimeline: () => trackEvent('use_timeline'),
  useCanvas: () => trackEvent('use_canvas'),
  useLore: () => trackEvent('use_lore'),

  // Errors (for debugging, no personal data)
  error: (type: string, page?: string) => trackEvent('error', { type, page }),

  // User actions
  exportData: () => trackEvent('export_data'),
  deleteAccount: () => trackEvent('delete_account'),
  updateSettings: () => trackEvent('update_settings'),

  // Subscription events
  viewPricing: () => trackEvent('view_pricing'),
  startTrial: () => trackEvent('start_trial'),
  subscribe: (tier: string) => trackEvent('subscribe', { tier }),

  // Engagement
  viewChangelog: () => trackEvent('view_changelog'),
  contactSupport: () => trackEvent('contact_support'),

  // Invite events
  createInvite: () => trackEvent('create_invite'),
  useInvite: () => trackEvent('use_invite'),

  // Page views are tracked automatically by Umami
  // These are for specific actions within pages
}

export default analytics
