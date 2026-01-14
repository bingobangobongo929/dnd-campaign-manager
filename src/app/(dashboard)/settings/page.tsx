'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon, Sparkles, LogOut, User, Palette, Bot } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { useSupabase, useUser } from '@/hooks'
import { useAppStore } from '@/store'
import { AI_PROVIDERS, AIProvider } from '@/lib/ai/config'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()
  const { aiEnabled, setAIEnabled, aiProvider, setAIProvider } = useAppStore()
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark')
    setTheme(isDark ? 'dark' : 'light')
  }, [])

  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme)
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('light')
    } else {
      document.documentElement.classList.add('light')
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('theme', newTheme)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        {/* Page Header */}
        <div className="page-header">
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Customize your experience</p>
        </div>

        <div className="space-y-6">
          {/* Account Section */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[--arcane-purple]/20 flex items-center justify-center">
                <User className="w-5 h-5 text-[--arcane-purple]" />
              </div>
              <h2 className="text-lg font-semibold text-[--text-primary]">Account</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-[--text-tertiary]">Email</label>
                <p className="text-[--text-primary]">{user?.email || 'Not signed in'}</p>
              </div>
              <button className="btn btn-secondary text-[--arcane-ember]" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>

          {/* Theme Section */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[--arcane-gold]/20 flex items-center justify-center">
                <Palette className="w-5 h-5 text-[--arcane-gold]" />
              </div>
              <h2 className="text-lg font-semibold text-[--text-primary]">Appearance</h2>
            </div>
            <p className="text-sm text-[--text-secondary] mb-4">
              Choose your preferred color theme
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleThemeChange('dark')}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  theme === 'dark'
                    ? 'border-[--arcane-purple] bg-[--arcane-purple]/10'
                    : 'border-[--border] hover:border-[--arcane-purple]/50'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-gray-900 flex items-center justify-center">
                  <Moon className="w-5 h-5 text-[--arcane-purple]" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-[--text-primary]">Dark</p>
                  <p className="text-xs text-[--text-tertiary]">Easy on the eyes</p>
                </div>
              </button>
              <button
                onClick={() => handleThemeChange('light')}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  theme === 'light'
                    ? 'border-[--arcane-purple] bg-[--arcane-purple]/10'
                    : 'border-[--border] hover:border-[--arcane-purple]/50'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Sun className="w-5 h-5 text-amber-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-[--text-primary]">Light</p>
                  <p className="text-xs text-[--text-tertiary]">Classic look</p>
                </div>
              </button>
            </div>
          </div>

          {/* AI Assistant Section */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[--arcane-purple]/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-[--arcane-purple]" />
              </div>
              <h2 className="text-lg font-semibold text-[--text-primary]">AI Assistant</h2>
            </div>

            {/* Master AI Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-[--bg-elevated] border border-[--border] mb-4">
              <div>
                <p className="font-medium text-[--text-primary]">Enable AI Features</p>
                <p className="text-xs text-[--text-tertiary]">
                  {aiEnabled ? 'AI features are visible throughout the app' : 'All AI features are hidden'}
                </p>
              </div>
              <button
                onClick={() => setAIEnabled(!aiEnabled)}
                className={`relative w-14 h-8 rounded-full transition-colors ${
                  aiEnabled ? 'bg-[--arcane-purple]' : 'bg-[--bg-surface] border border-[--border]'
                }`}
              >
                <div
                  className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${
                    aiEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Provider Selection - only shown when AI is enabled */}
            {aiEnabled && (
              <>
                <p className="text-sm text-[--text-secondary] mb-4">
                  Choose which AI model powers your campaign assistant
                </p>
                <div className="space-y-3">
                  {(Object.keys(AI_PROVIDERS) as AIProvider[]).map((provider) => {
                    const info = AI_PROVIDERS[provider]
                    return (
                      <button
                        key={provider}
                        onClick={() => setAIProvider(provider)}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                          aiProvider === provider
                            ? 'border-[--arcane-purple] bg-[--arcane-purple]/10'
                            : 'border-[--border] hover:border-[--arcane-purple]/50'
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            provider === 'anthropic'
                              ? 'bg-orange-500/20'
                              : 'bg-blue-500/20'
                          }`}
                        >
                          <Sparkles
                            className={`w-5 h-5 ${
                              provider === 'anthropic' ? 'text-orange-500' : 'text-blue-500'
                            }`}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-[--text-primary]">{info.name}</p>
                          <p className="text-xs text-[--text-tertiary]">{info.description}</p>
                        </div>
                        {aiProvider === provider && (
                          <div className="w-5 h-5 rounded-full bg-[--arcane-purple] flex items-center justify-center">
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs text-[--text-tertiary] mt-4">
                  Note: AI features require API keys to be configured. Contact your administrator
                  if features aren't working.
                </p>
              </>
            )}
          </div>

          {/* About Section */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-[--text-primary] mb-4">About</h2>
            <div className="space-y-2 text-sm text-[--text-secondary]">
              <p className="font-display text-[--arcane-gold]">D&D Campaign Manager v1.0.0</p>
              <p>Built with Next.js, Supabase, and AI</p>
              <p className="text-[--text-tertiary]">
                Made with love for dungeon masters everywhere
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
