'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon, Sparkles, LogOut, User, Palette, Bot } from 'lucide-react'
import { Button, Card, CardContent, Input } from '@/components/ui'
import { DashboardLayout } from '@/components/layout'
import { useSupabase, useUser } from '@/hooks'
import { useAppStore } from '@/store'
import { AI_PROVIDERS, AIProvider } from '@/lib/ai/config'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()
  const { aiProvider, setAIProvider } = useAppStore()
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  // Load theme from document
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
    // Persist in localStorage
    localStorage.setItem('theme', newTheme)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[--text-primary]">Settings</h1>
          <p className="text-[--text-secondary]">Customize your experience</p>
        </div>

        <div className="space-y-6">
          {/* Account Section */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <User className="h-5 w-5 text-[--accent-primary]" />
                <h2 className="text-lg font-semibold text-[--text-primary]">Account</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-[--text-tertiary]">Email</label>
                  <p className="text-[--text-primary]">{user?.email || 'Not signed in'}</p>
                </div>
                <Button variant="danger" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Theme Section */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Palette className="h-5 w-5 text-[--accent-secondary]" />
                <h2 className="text-lg font-semibold text-[--text-primary]">Appearance</h2>
              </div>
              <p className="text-sm text-[--text-secondary] mb-4">
                Choose your preferred color theme
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleThemeChange('dark')}
                  className={cn(
                    'flex items-center gap-3 p-4 rounded-xl border-2 transition-all',
                    theme === 'dark'
                      ? 'border-[--accent-primary] bg-[--accent-primary]/10'
                      : 'border-[--border] hover:border-[--accent-primary]/50'
                  )}
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-900 flex items-center justify-center">
                    <Moon className="h-5 w-5 text-purple-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-[--text-primary]">Dark</p>
                    <p className="text-xs text-[--text-tertiary]">Easy on the eyes</p>
                  </div>
                </button>
                <button
                  onClick={() => handleThemeChange('light')}
                  className={cn(
                    'flex items-center gap-3 p-4 rounded-xl border-2 transition-all',
                    theme === 'light'
                      ? 'border-[--accent-primary] bg-[--accent-primary]/10'
                      : 'border-[--border] hover:border-[--accent-primary]/50'
                  )}
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Sun className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-[--text-primary]">Light</p>
                    <p className="text-xs text-[--text-tertiary]">Classic look</p>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* AI Provider Section */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Bot className="h-5 w-5 text-[--accent-primary]" />
                <h2 className="text-lg font-semibold text-[--text-primary]">AI Assistant</h2>
              </div>
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
                      className={cn(
                        'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
                        aiProvider === provider
                          ? 'border-[--accent-primary] bg-[--accent-primary]/10'
                          : 'border-[--border] hover:border-[--accent-primary]/50'
                      )}
                    >
                      <div
                        className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center',
                          provider === 'anthropic'
                            ? 'bg-orange-500/20'
                            : 'bg-blue-500/20'
                        )}
                      >
                        <Sparkles
                          className={cn(
                            'h-5 w-5',
                            provider === 'anthropic' ? 'text-orange-500' : 'text-blue-500'
                          )}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-[--text-primary]">{info.name}</p>
                        <p className="text-xs text-[--text-tertiary]">{info.description}</p>
                      </div>
                      {aiProvider === provider && (
                        <div className="w-5 h-5 rounded-full bg-[--accent-primary] flex items-center justify-center">
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
            </CardContent>
          </Card>

          {/* About Section */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-[--text-primary] mb-4">About</h2>
              <div className="space-y-2 text-sm text-[--text-secondary]">
                <p>D&D Campaign Manager v1.0.0</p>
                <p>Built with Next.js, Supabase, and AI</p>
                <p className="text-[--text-tertiary]">
                  Made with love for dungeon masters everywhere
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
