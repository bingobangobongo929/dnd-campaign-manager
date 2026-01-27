import { toast } from 'sonner'

const STORAGE_KEY_PREFIX = 'intelligence-prompt-dismissed-'
const PERMANENT_DISMISS_VALUE = 'permanent'

/**
 * Show a toast prompting the user to run Campaign Intelligence.
 * Includes "Never show again" option for permanent dismissal.
 */
export function showIntelligencePrompt(campaignId: string): void {
  // Check if user has permanently dismissed this prompt
  const dismissKey = `${STORAGE_KEY_PREFIX}${campaignId}`
  const dismissValue = localStorage.getItem(dismissKey)

  // If permanently dismissed, never show
  if (dismissValue === PERMANENT_DISMISS_VALUE) {
    return
  }

  toast(
    'Run Intelligence to detect NPCs, locations, and more from your notes',
    {
      duration: 8000,
      action: {
        label: 'Open Intelligence',
        onClick: () => {
          window.location.href = `/campaigns/${campaignId}/intelligence`
        },
      },
      cancel: {
        label: 'Never show again',
        onClick: () => {
          localStorage.setItem(dismissKey, PERMANENT_DISMISS_VALUE)
        },
      },
    }
  )
}

/**
 * Check if Intelligence prompt should be shown.
 * Returns false if user has permanently dismissed.
 */
export function shouldShowIntelligencePrompt(campaignId: string): boolean {
  const dismissKey = `${STORAGE_KEY_PREFIX}${campaignId}`
  const dismissValue = localStorage.getItem(dismissKey)

  // If permanently dismissed, don't show
  if (dismissValue === PERMANENT_DISMISS_VALUE) {
    return false
  }

  return true
}

/**
 * Reset the Intelligence prompt dismissal for a campaign.
 */
export function resetIntelligencePromptDismissal(campaignId: string): void {
  const dismissKey = `${STORAGE_KEY_PREFIX}${campaignId}`
  localStorage.removeItem(dismissKey)
}
