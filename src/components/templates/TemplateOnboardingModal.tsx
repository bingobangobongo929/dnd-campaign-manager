'use client'

import { Modal } from '@/components/ui'
import { Package, FileEdit, Share2, CheckCircle2 } from 'lucide-react'

interface TemplateOnboardingModalProps {
  isOpen: boolean
  onClose: () => void
  onOpenShareModal: () => void
  contentName: string
}

/**
 * Onboarding modal shown when a user first creates a template.
 * Explains the template workflow and their next steps.
 */
export function TemplateOnboardingModal({
  isOpen,
  onClose,
  onOpenShareModal,
  contentName,
}: TemplateOnboardingModalProps) {
  const handleOpenShare = () => {
    onClose()
    onOpenShareModal()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Template Created!"
      size="md"
    >
      <div className="space-y-6">
        {/* Success message */}
        <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <p className="text-green-200 font-medium">
              "{contentName}" saved to your Templates
            </p>
            <p className="text-sm text-green-200/70">
              Your original content is unchanged
            </p>
          </div>
        </div>

        {/* Step-by-step workflow */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            Your next steps
          </h4>

          <div className="relative">
            {/* Vertical connector line */}
            <div className="absolute left-[19px] top-[40px] bottom-[40px] w-[2px] bg-gradient-to-b from-amber-500/40 via-purple-500/40 to-blue-500/40" />

            <div className="space-y-0">
              {/* Step 1: Edit */}
              <div className="flex gap-4 p-3 relative">
                <div className="flex flex-col items-center z-10">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 border-2 border-amber-500/50 flex items-center justify-center">
                    <span className="text-amber-400 font-bold text-sm">1</span>
                  </div>
                </div>
                <div className="flex-1 pt-1">
                  <div className="flex items-center gap-2">
                    <FileEdit className="w-4 h-4 text-amber-400" />
                    <p className="text-white font-medium text-sm">Edit for Session 0</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 ml-6">
                    Remove spoilers, add setup instructions, polish for sharing
                  </p>
                </div>
              </div>

              {/* Step 2: Publish */}
              <div className="flex gap-4 p-3 relative">
                <div className="flex flex-col items-center z-10">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 border-2 border-purple-500/50 flex items-center justify-center">
                    <span className="text-purple-400 font-bold text-sm">2</span>
                  </div>
                </div>
                <div className="flex-1 pt-1">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-purple-400" />
                    <p className="text-white font-medium text-sm">Publish a Version</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 ml-6">
                    Lock in your edits and enable sharing
                  </p>
                </div>
              </div>

              {/* Step 3: Share */}
              <div className="flex gap-4 p-3 relative">
                <div className="flex flex-col items-center z-10">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 border-2 border-blue-500/50 flex items-center justify-center">
                    <span className="text-blue-400 font-bold text-sm">3</span>
                  </div>
                </div>
                <div className="flex-1 pt-1">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-blue-400" />
                    <p className="text-white font-medium text-sm">Share with Others</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 ml-6">
                    Create links so others can save your template
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleOpenShare}
            className="px-4 py-2.5 text-gray-400 hover:text-white text-sm transition-colors"
          >
            Already ready? Skip to publish →
          </button>
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors"
          >
            <FileEdit className="w-4 h-4" />
            Start Editing
          </button>
        </div>
      </div>
    </Modal>
  )
}
