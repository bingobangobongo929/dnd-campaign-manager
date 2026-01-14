import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Campaign, Character, Tag, Session, UserSettings, CanvasGroup } from '@/types/database'
import type { AIProvider } from '@/lib/ai/config'

// Persisted settings (saved to localStorage)
interface PersistedSettings {
  aiEnabled: boolean
  aiProvider: AIProvider
}

interface AppState extends PersistedSettings {
  // Current user
  userId: string | null
  setUserId: (id: string | null) => void

  // User settings
  settings: UserSettings | null
  setSettings: (settings: UserSettings | null) => void

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
      aiProvider: 'anthropic',
      setAIProvider: (provider) => set({ aiProvider: provider }),
    }),
    {
      name: 'dnd-campaign-manager-settings',
      storage: createJSONStorage(() => localStorage),
      // Only persist AI settings
      partialize: (state) => ({
        aiEnabled: state.aiEnabled,
        aiProvider: state.aiProvider,
      }),
    }
  )
)
