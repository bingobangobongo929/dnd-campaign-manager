'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface RunPageProps {
  params: Promise<{ id: string }>
}

/**
 * Run Mode is deprecated in favor of Present Mode.
 * This page redirects to Present Mode which provides a cleaner reading experience
 * without VTT-like features (use a dedicated VTT for combat).
 */
export default function OneshotRunPage({ params }: RunPageProps) {
  const { id: oneshotId } = use(params)
  const router = useRouter()

  useEffect(() => {
    // Redirect to Present Mode
    router.replace(`/oneshots/${oneshotId}/present`)
  }, [oneshotId, router])

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      <p className="text-gray-400">Redirecting to Present Mode...</p>
    </div>
  )
}
