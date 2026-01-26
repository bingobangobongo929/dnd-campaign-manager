'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, X, Loader2 } from 'lucide-react'
import { useSupabase } from '@/hooks'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface PendingDeletionBannerProps {
  className?: string
}

export function PendingDeletionBanner({ className }: PendingDeletionBannerProps) {
  const supabase = useSupabase()
  const [deletionInfo, setDeletionInfo] = useState<{
    scheduledAt: string
    daysRemaining: number
  } | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    checkPendingDeletion()
  }, [])

  const checkPendingDeletion = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: settings } = await supabase
        .from('user_settings')
        .select('deletion_scheduled_at')
        .eq('user_id', user.id)
        .single()

      if (settings?.deletion_scheduled_at) {
        const scheduledDate = new Date(settings.deletion_scheduled_at)
        const now = new Date()
        const daysRemaining = Math.ceil((scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        if (daysRemaining > 0) {
          setDeletionInfo({
            scheduledAt: settings.deletion_scheduled_at,
            daysRemaining,
          })
        }
      }
    } catch (error) {
      console.error('Error checking pending deletion:', error)
    }
  }

  const handleCancelDeletion = async () => {
    setCancelling(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get the cancellation token
      const { data: settings } = await supabase
        .from('user_settings')
        .select('deletion_cancellation_token')
        .eq('user_id', user.id)
        .single()

      if (!settings?.deletion_cancellation_token) {
        throw new Error('No cancellation token found')
      }

      // Cancel the deletion
      const response = await fetch('/api/user/cancel-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: settings.deletion_cancellation_token,
          email: user.email,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel deletion')
      }

      toast.success('Account deletion cancelled! Your account is fully active again.')
      setDeletionInfo(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel deletion')
    } finally {
      setCancelling(false)
    }
  }

  if (!deletionInfo || dismissed) return null

  const formattedDate = new Date(deletionInfo.scheduledAt).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className={cn(
      "bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6",
      className
    )}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="text-red-300 font-medium">
            Account Deletion Scheduled
          </h3>
          <p className="text-sm text-red-200/80 mt-1">
            Your account will be permanently deleted on <strong>{formattedDate}</strong>{' '}
            ({deletionInfo.daysRemaining} day{deletionInfo.daysRemaining !== 1 ? 's' : ''} remaining).
          </p>
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={handleCancelDeletion}
              disabled={cancelling}
              className="px-4 py-2 bg-white text-red-600 font-medium rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 text-sm"
            >
              {cancelling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                  Cancelling...
                </>
              ) : (
                'Cancel Deletion & Keep My Account'
              )}
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="text-sm text-red-300 hover:text-red-200"
            >
              Dismiss
            </button>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-red-400 hover:text-red-300 p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
