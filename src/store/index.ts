import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Campaign, Character, Tag, Session, UserSettings, CanvasGroup, UserTier } from '@/types/database'
import { TIER_HAS_AI } from '@/types/database'
import type { AIProvider } from '@/lib/ai/config'
import { DEFAULT_AI_PROVIDER } from '@/lib/ai/config'

// Currency options
export type Currency = 'GBP' | 'USD' | 'EUR'

export const CURRENCY_CONFIG: Record<Currency, { symbol: string; name: string; rate: number }> = {
  GBP: { symbol: '£', name: 'British Pound', rate: 0.80 },
  USD: { symbol: '$', name: 'US Dollar', rate: 1.00 },
  EUR: { symbol: '€', name: 'Euro', rate: 0.92 },
}

// Recent item for quick navigation
export interface RecentItem {
  id: string
  type: 'campaign' | 'character' | 'oneshot' | 'session'
  name: string
  href: string
  imageUrl?: string | null
  parentName?: string // Campaign name for sessions
  visitedAt: number
}

// Persisted settings (saved to localStorage)
interface PersistedSettings {
  aiEnabled: boolean
  aiProvider: AIProvider
  currency: Currency
  recentItems: RecentItem[]
}

interface AppState extends PersistedSettings {
  // Current user
  userId: string | null
  setUserId: (id: string | null) => void

  // User settings
  settings: UserSettings | null
  setSettings: (settings: UserSettings | null) => void

  // Admin impersonation (session-only, not persisted)
  impersonatedTier: UserTier | null
  setImpersonatedTier: (tier: UserTier | null) => void

  // Current campaign
  currentCampaign: Campaign | null
  setCurrentCampaign: (campaign: Campaign | null) => void

  // Characters in current campaign
  characters: Character[]
  setCharacters: (characters: Character[]) => void
  addCharacter: (character: Character) => void
  updateCharacter: (id: string, updates: Partial<Character>) => void
  removeCharacter: (id: string) => void

  // Tags in current campaign
  tags: Tag[]
  setTags: (tags: Tag[]) => void
  addTag: (tag: Tag) => void
  updateTag: (id: string, updates: Partial<Tag>) => void
  removeTag: (id: string) => void

  // Canvas groups
  canvasGroups: CanvasGroup[]
  setCanvasGroups: (groups: CanvasGroup[]) => void
  addCanvasGroup: (group: CanvasGroup) => void
  updateCanvasGroup: (id: string, updates: Partial<CanvasGroup>) => void
  removeCanvasGroup: (id: string) => void

  // Sessions
  sessions: Session[]
  setSessions: (sessions: Session[]) => void
  addSession: (session: Session) => void
  updateSession: (id: string, updates: Partial<Session>) => void
  removeSession: (id: string) => void

  // UI State
  selectedCharacterId: string | null
  setSelectedCharacterId: (id: string | null) => void
  isCharacterPanelOpen: boolean
  setIsCharacterPanelOpen: (open: boolean) => void
  isAIAssistantOpen: boolean
  setIsAIAssistantOpen: (open: boolean) => void

  // Canvas state
  canvasViewport: { x: number; y: number; zoom: number }
  setCanvasViewport: (viewport: { x: number; y: number; zoom: number }) => void

  // AI Settings
  aiEnabled: boolean
  setAIEnabled: (enabled: boolean) => void
  aiProvider: AIProvider
  setAIProvider: (provider: AIProvider) => void

  // Currency
  currency: Currency
  setCurrency: (currency: Currency) => void

  // Recent Items
  recentItems: RecentItem[]
  trackRecentItem: (item: Omit<RecentItem, 'visitedAt'>) => void
  clearRecentItems: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // User
      userId: null,
      setUserId: (id) => set({ userId: id }),

      // Settings
      settings: null,
      setSettings: (settings) => set({ settings }),

      // Admin impersonation (not persisted - clears on page refresh)
      impersonatedTier: null,
      setImpersonatedTier: (tier) => set({ impersonatedTier: tier }),

      // Campaign
      currentCampaign: null,
      setCurrentCampaign: (campaign) => set({ currentCampaign: campaign }),

      // Characters
      characters: [],
      setCharacters: (characters) => set({ characters }),
      addCharacter: (character) => set((state) => ({ characters: [...state.characters, character] })),
      updateCharacter: (id, updates) =>
        set((state) => ({
          characters: state.characters.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),
      removeCharacter: (id) =>
        set((state) => ({ characters: state.characters.filter((c) => c.id !== id) })),

      // Tags
      tags: [],
      setTags: (tags) => set({ tags }),
      addTag: (tag) => set((state) => ({ tags: [...state.tags, tag] })),
      updateTag: (id, updates) =>
        set((state) => ({
          tags: state.tags.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),
      removeTag: (id) => set((state) => ({ tags: state.tags.filter((t) => t.id !== id) })),

      // Canvas groups
      canvasGroups: [],
      setCanvasGroups: (groups) => set({ canvasGroups: groups }),
      addCanvasGroup: (group) => set((state) => ({ canvasGroups: [...state.canvasGroups, group] })),
      updateCanvasGroup: (id, updates) =>
        set((state) => ({
          canvasGroups: state.canvasGroups.map((g) => (g.id === id ? { ...g, ...updates } : g)),
        })),
      removeCanvasGroup: (id) =>
        set((state) => ({ canvasGroups: state.canvasGroups.filter((g) => g.id !== id) })),

      // Sessions
      sessions: [],
      setSessions: (sessions) => set({ sessions }),
      addSession: (session) => set((state) => ({ sessions: [...state.sessions, session] })),
      updateSession: (id, updates) =>
        set((state) => ({
          sessions: state.sessions.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        })),
      removeSession: (id) =>
        set((state) => ({ sessions: state.sessions.filter((s) => s.id !== id) })),

      // UI State
      selectedCharacterId: null,
      setSelectedCharacterId: (id) => set({ selectedCharacterId: id }),
      isCharacterPanelOpen: false,
      setIsCharacterPanelOpen: (open) => set({ isCharacterPanelOpen: open }),
      isAIAssistantOpen: false,
      setIsAIAssistantOpen: (open) => set({ isAIAssistantOpen: open }),

      // Canvas state
      canvasViewport: { x: 0, y: 0, zoom: 1 },
      setCanvasViewport: (viewport) => set({ canvasViewport: viewport }),

      // AI Settings (persisted)
      aiEnabled: true, // Default to enabled
      setAIEnabled: (enabled) => set({ aiEnabled: enabled }),
      aiProvider: DEFAULT_AI_PROVIDER,
      setAIProvider: (provider) => set({ aiProvider: provider }),

      // Currency (persisted)
      currency: 'GBP' as Currency,
      setCurrency: (currency) => set({ currency }),

      // Recent Items (persisted)
      recentItems: [],
      trackRecentItem: (item) =>
        set((state) => {
          const MAX_RECENT_ITEMS = 10
          const now = Date.now()
          // Remove existing entry for same item if present
          const filtered = state.recentItems.filter((r) => r.id !== item.id || r.type !== item.type)
          // Add new item at the front
          const newItems = [{ ...item, visitedAt: now }, ...filtered].slice(0, MAX_RECENT_ITEMS)
          return { recentItems: newItems }
        }),
      clearRecentItems: () => set({ recentItems: [] }),
    }),
    {
      name: 'dnd-campaign-manager-settings',
      storage: createJSONStorage(() => localStorage),
      // Persist AI settings, currency, and recent items
      partialize: (state) => ({
        aiEnabled: state.aiEnabled,
        aiProvider: state.aiProvider,
        currency: state.currency,
        recentItems: state.recentItems,
      }),
    }
  )
)

/**
 * Hook to check if the current user can use AI features.
 * Returns true only if:
 * 1. User has a tier that supports AI (standard or premium)
 * 2. User has AI enabled in their preferences
 *
 * For free tier users, this always returns false regardless of aiEnabled preference.
 * This ensures AI features are completely hidden from free users.
 *
 * Note: Respects admin impersonation for testing purposes.
 */
export function useCanUseAI(): boolean {
  const settings = useAppStore((state) => state.settings)
  const aiEnabled = useAppStore((state) => state.aiEnabled)
  const impersonatedTier = useAppStore((state) => state.impersonatedTier)

  // Use impersonated tier if set, otherwise use actual tier
  const tier: UserTier = impersonatedTier || settings?.tier || 'free'

  // Check if tier allows AI AND user has AI enabled
  return TIER_HAS_AI[tier] && aiEnabled
}

/**
 * Hook to get the user's current tier.
 * Defaults to 'free' if settings not loaded yet.
 * Respects admin impersonation for testing purposes.
 */
export function useUserTier(): UserTier {
  const settings = useAppStore((state) => state.settings)
  const impersonatedTier = useAppStore((state) => state.impersonatedTier)
  return impersonatedTier || settings?.tier || 'free'
}

/**
 * Hook to check if the user's tier supports AI features.
 * This does NOT check if AI is enabled - use for showing the AI toggle in settings.
 * Respects admin impersonation for testing purposes.
 */
export function useTierHasAI(): boolean {
  const settings = useAppStore((state) => state.settings)
  const impersonatedTier = useAppStore((state) => state.impersonatedTier)
  const tier: UserTier = impersonatedTier || settings?.tier || 'free'
  return TIER_HAS_AI[tier]
}

/**
 * Hook to get the impersonated tier for admin testing.
 * Returns null if not impersonating.
 */
export function useImpersonatedTier(): UserTier | null {
  return useAppStore((state) => state.impersonatedTier)
}

/**
 * Hook to check if admin is currently impersonating a tier.
 */
export function useIsImpersonating(): boolean {
  return useAppStore((state) => state.impersonatedTier !== null)
}

/**
 * Check if a tier has AI access (for use in server components/API routes)
 */
export function tierHasAI(tier: UserTier | undefined | null): boolean {
  if (!tier) return false
  return TIER_HAS_AI[tier]
}
