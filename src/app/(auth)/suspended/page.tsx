'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, LogOut, Loader2 } from 'lucide-react'
import { useSupabase } from '@/hooks'

export default function SuspendedPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const [reason, setReason] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkSuspension = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: settings } = await supabase
        .from('user_settings')
        .select('suspended_at, suspended_reason')
        .eq('user_id', user.id)
        .single()

      if (!settings?.suspended_at) {
        // Not suspended, redirect to home
        router.push('/home')
        return
      }

      setReason(settings.suspended_reason)
      setLoading(false)
    }

    checkSuspension()
  }, [supabase, router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#12121a]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8 shadow-2xl text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-red-500/10 mb-6">
            <Ban className="w-10 h-10 text-red-400" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">Account Suspended</h1>
          <p className="text-gray-400 mb-6">
            Your account has been temporarily suspended.
          </p>

          {reason && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
              <p className="text-sm text-gray-400 mb-1">Reason:</p>
              <p className="text-red-400">{reason}</p>
            </div>
          )}

          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              If you believe this was a mistake, please contact us to appeal this decision.
            </p>

            <a
              href="mailto:privacy@multiloop.app?subject=Account%20Suspension%20Appeal"
              className="block w-full py-3 px-4 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-500 transition-colors"
            >
              Contact Support
            </a>

            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-white/[0.04] text-gray-300 hover:bg-white/[0.08] transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
