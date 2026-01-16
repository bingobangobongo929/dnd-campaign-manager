'use client'

import { ReactNode } from 'react'
import { VaultSidebar } from '@/components/vault/VaultSidebar'
import { TopBar } from './top-bar'
import { FloatingDock } from './floating-dock'
import { AIAssistant } from '@/components/ai/ai-assistant'
import { useAppStore } from '@/store'

interface VaultLayoutProps {
  children: ReactNode
  characterId?: string
  topBarActions?: ReactNode
  hideTopBar?: boolean
}

export function VaultLayout({
  children,
  characterId,
  topBarActions,
  hideTopBar = false,
}: VaultLayoutProps) {
  const { aiEnabled, isAIAssistantOpen, setIsAIAssistantOpen } = useAppStore()

  return (
    <div className="flex h-screen bg-[--bg-base]">
      {/* Sidebar */}
      <VaultSidebar characterId={characterId} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        {!hideTopBar && (
          <TopBar actions={topBarActions} />
        )}

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* Floating dock */}
      <FloatingDock />

      {/* AI Assistant */}
      {aiEnabled && isAIAssistantOpen && (
        <AIAssistant />
      )}
    </div>
  )
}
