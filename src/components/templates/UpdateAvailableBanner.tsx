'use client'

import { useState } from 'react'
import { AlertCircle, ArrowRight, X, Loader2 } from 'lucide-react'

interface UpdateAvailableBannerProps {
  templateName: string
  currentVersion: number
  latestVersion: number
  onUpdate: () => Promise<void>
  onDismiss: () => void
}

export function UpdateAvailableBanner({
  templateName,
  currentVersion,
  latestVersion,
  onUpdate,
  onDismiss,
}: UpdateAvailableBannerProps) {
  const [loading, setLoading] = useState(false)

  const handleUpdate = async () => {
    setLoading(true)
    try {
      await onUpdate()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-500/20 rounded-lg shrink-0">
          <AlertCircle className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">
            Update Available for "{templateName}"
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Version {latestVersion} is available. You have v{currentVersion}.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleUpdate}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-400 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              Update
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
        <button
          onClick={onDismiss}
          className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
