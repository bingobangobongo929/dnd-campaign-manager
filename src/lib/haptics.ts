/**
 * Haptic feedback utility for iOS native feel
 * Works with Capacitor Haptics plugin on iOS, graceful no-op on web
 */

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

// Check if we're running in a Capacitor native context
const isNative = typeof window !== 'undefined' &&
  (window as any).Capacitor?.isNativePlatform?.() === true

/**
 * Trigger light impact feedback (for small UI interactions)
 * Use for: button taps, toggles, selections
 */
export async function hapticLight() {
  if (!isNative) return
  try {
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch (e) {
    // Silently fail on web/unsupported
  }
}

/**
 * Trigger medium impact feedback (for moderate interactions)
 * Use for: card presses, modal opens, significant actions
 */
export async function hapticMedium() {
  if (!isNative) return
  try {
    await Haptics.impact({ style: ImpactStyle.Medium })
  } catch (e) {
    // Silently fail on web/unsupported
  }
}

/**
 * Trigger heavy impact feedback (for significant events)
 * Use for: drag end, drop, major state changes
 */
export async function hapticHeavy() {
  if (!isNative) return
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy })
  } catch (e) {
    // Silently fail on web/unsupported
  }
}

/**
 * Trigger success notification feedback
 * Use for: successful operations, completed tasks
 */
export async function hapticSuccess() {
  if (!isNative) return
  try {
    await Haptics.notification({ type: NotificationType.Success })
  } catch (e) {
    // Silently fail on web/unsupported
  }
}

/**
 * Trigger warning notification feedback
 * Use for: warnings, destructive action confirmations
 */
export async function hapticWarning() {
  if (!isNative) return
  try {
    await Haptics.notification({ type: NotificationType.Warning })
  } catch (e) {
    // Silently fail on web/unsupported
  }
}

/**
 * Trigger error notification feedback
 * Use for: errors, failed operations
 */
export async function hapticError() {
  if (!isNative) return
  try {
    await Haptics.notification({ type: NotificationType.Error })
  } catch (e) {
    // Silently fail on web/unsupported
  }
}

/**
 * Trigger selection change feedback (subtle)
 * Use for: scrolling through options, tab changes
 */
export async function hapticSelection() {
  if (!isNative) return
  try {
    await Haptics.selectionChanged()
  } catch (e) {
    // Silently fail on web/unsupported
  }
}
