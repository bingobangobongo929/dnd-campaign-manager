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

        {/* What to do next */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            What happens next?
          </h4>

          <div className="space-y-3">
            {/* Step 1: Edit */}
            <div className="flex gap-3 p-3 bg-white/[0.02] rounded-lg">
              <div className="p-1.5 bg-amber-500/10 rounded-lg h-fit">
                <FileEdit className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">Edit for Session 0</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Remove spoilers, add setup instructions, polish the content for sharing
                </p>
              </div>
            </div>

            {/* Step 2: Publish */}
            <div className="flex gap-3 p-3 bg-white/[0.02] rounded-lg">
              <div className="p-1.5 bg-purple-500/10 rounded-lg h-fit">
                <Package className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">Publish a Version</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  When ready, publish to lock in your edits and enable sharing
                </p>
              </div>
            </div>

            {/* Step 3: Share */}
            <div className="flex gap-3 p-3 bg-white/[0.02] rounded-lg">
              <div className="p-1.5 bg-blue-500/10 rounded-lg h-fit">
                <Share2 className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">Share with Others</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Create share links so others can save your template to their collection
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg border border-white/[0.08] transition-colors"
          >
            Continue Editing
          </button>
          <button
            onClick={handleOpenShare}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Ready to Share
          </button>
        </div>
      </div>
    </Modal>
  )
}
