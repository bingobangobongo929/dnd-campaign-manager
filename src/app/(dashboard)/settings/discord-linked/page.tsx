'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { CheckCircle2, Loader2, X, User } from 'lucide-react'
import { useSupabase, useUser, useUserSettings } from '@/hooks'
import { toast } from 'sonner'

// Discord icon component
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  )
}

function DiscordLinkedContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useSupabase()
  const { user } = useUser()
  const { settings, refreshSettings } = useUserSettings()

  const [useDiscordAvatar, setUseDiscordAvatar] = useState(true)
  const [saving, setSaving] = useState(false)
  const [unlinking, setUnlinking] = useState(false)

  const discordAvatar = searchParams.get('avatar') || ''
  const discordUsername = searchParams.get('username') || 'Discord User'

  // If user already has an avatar, default to not replacing it
  useEffect(() => {
    if (settings?.avatar_url) {
      setUseDiscordAvatar(false)
    }
  }, [settings?.avatar_url])

  const handleContinue = async () => {
    if (!user) return

    setSaving(true)
    try {
      // Apply Discord avatar if user opted in
      if (useDiscordAvatar && discordAvatar) {
        // If there's an existing uploaded avatar, delete it from storage
        if (settings?.avatar_url && settings.avatar_url.includes('/avatars/')) {
          const path = settings.avatar_url.split('/avatars/')[1]
          if (path) {
            await supabase.storage.from('avatars').remove([path])
          }
        }

        await supabase
          .from('user_settings')
          .update({ avatar_url: discordAvatar })
          .eq('user_id', user.id)
      }

      toast.success('Discord linked successfully!')
      router.push('/home')
    } catch (error) {
      console.error('Failed to save preferences:', error)
      toast.error('Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  const handleUnlink = async () => {
    if (!user) return

    if (!confirm('Are you sure you want to unlink Discord? You can link it again later from Settings.')) {
      return
    }

    setUnlinking(true)
    try {
      // Clear Discord info from user_settings
      await supabase
        .from('user_settings')
        .update({
          discord_id: null,
          discord_username: null,
          discord_avatar: null,
          discord_linked_at: null,
        })
        .eq('user_id', user.id)

      toast.success('Discord unlinked')
      router.push('/home')
    } catch (error) {
      console.error('Failed to unlink Discord:', error)
      toast.error('Failed to unlink Discord')
    } finally {
      setUnlinking(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-[#12121a] border border-white/[0.08] rounded-2xl p-8">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-[#5865F2]/20 flex items-center justify-center">
                <DiscordIcon className="w-10 h-10 text-[#5865F2]" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center border-4 border-[#12121a]">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-white text-center mb-2">
            Discord Connected
          </h1>
          <p className="text-gray-400 text-center mb-6">
            Your Discord account <span className="text-white font-medium">{discordUsername}</span> has been linked to your Multiloop account.
          </p>

          {/* Avatar Option */}
          {discordAvatar && (
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] mb-6">
              <div className="flex items-center gap-4">
                {/* Discord Avatar Preview */}
                <div className="relative w-14 h-14 rounded-full overflow-hidden bg-[#5865F2]/20 flex-shrink-0">
                  <Image
                    src={discordAvatar}
                    alt="Discord avatar"
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="flex-1">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useDiscordAvatar}
                      onChange={(e) => setUseDiscordAvatar(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      useDiscordAvatar
                        ? 'bg-[#5865F2] border-[#5865F2]'
                        : 'border-gray-600'
                    }`}>
                      {useDiscordAvatar && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">Use Discord avatar</p>
                      <p className="text-gray-500 text-xs">
                        {settings?.avatar_url ? 'Replace your current profile picture' : 'Set as your profile picture'}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Current avatar comparison */}
              {settings?.avatar_url && !useDiscordAvatar && (
                <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center gap-2 text-xs text-gray-500">
                  <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-800">
                    <Image
                      src={settings.avatar_url}
                      alt="Current avatar"
                      width={24}
                      height={24}
                      className="object-cover"
                    />
                  </div>
                  <span>Keeping your current avatar</span>
                </div>
              )}
            </div>
          )}

          {/* Info */}
          <div className="text-xs text-gray-500 mb-6 space-y-1">
            <p>You can change your avatar or unlink Discord anytime in Settings.</p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleContinue}
              disabled={saving || unlinking}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Continue to Multiloop'
              )}
            </button>

            <button
              onClick={handleUnlink}
              disabled={saving || unlinking}
              className="w-full py-2.5 px-4 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {unlinking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Unlinking...
                </>
              ) : (
                <>
                  <X className="w-4 h-4" />
                  Unlink Discord Instead
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-600 mt-6">
          Your data is protected under our{' '}
          <Link href="/privacy" className="text-purple-400 hover:text-purple-300">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function DiscordLinkedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    }>
      <DiscordLinkedContent />
    </Suspense>
  )
}
