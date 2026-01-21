'use client'

import { useRouter } from 'next/navigation'
import { Plus, BookMarked, Swords, User, Scroll } from 'lucide-react'
import { Modal } from '@/components/ui'
import { cn } from '@/lib/utils'

interface NewContentModalProps {
  isOpen: boolean
  onClose: () => void
  contentType: 'campaign' | 'character' | 'oneshot'
  hasSavedTemplates: boolean
}

export function NewContentModal({
  isOpen,
  onClose,
  contentType,
  hasSavedTemplates,
}: NewContentModalProps) {
  const router = useRouter()

  const getTypeConfig = () => {
    switch (contentType) {
      case 'campaign':
        return {
          label: 'Campaign',
          icon: Swords,
          newPath: '/campaigns/new',
          savedPath: '/campaigns?tab=saved',
        }
      case 'character':
        return {
          label: 'Character',
          icon: User,
          newPath: '/vault/new',
          savedPath: '/vault?tab=saved',
        }
      case 'oneshot':
        return {
          label: 'One-Shot',
          icon: Scroll,
          newPath: '/oneshots/new',
          savedPath: '/oneshots?tab=saved',
        }
    }
  }

  const config = getTypeConfig()
  const TypeIcon = config.icon

  const handleStartFresh = () => {
    router.push(config.newPath)
    onClose()
  }

  const handleFromTemplate = () => {
    router.push(config.savedPath)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`New ${config.label}`}
      size="md"
    >
      <div className="py-4 space-y-3">
        {/* Start Fresh Option */}
        <button
          onClick={handleStartFresh}
          className={cn(
            "w-full flex items-start gap-4 p-4 rounded-xl border transition-all text-left",
            "bg-white/[0.02] border-white/[0.08] hover:border-purple-500/40 hover:bg-purple-500/5"
          )}
        >
          <div className="p-3 bg-purple-500/10 rounded-xl shrink-0">
            <Plus className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Start from Scratch</h3>
            <p className="text-sm text-gray-400 mt-0.5">
              Create a blank {config.label.toLowerCase()} and build it yourself
            </p>
          </div>
        </button>

        {/* From Template Option */}
        {hasSavedTemplates && (
          <button
            onClick={handleFromTemplate}
            className={cn(
              "w-full flex items-start gap-4 p-4 rounded-xl border transition-all text-left",
              "bg-white/[0.02] border-white/[0.08] hover:border-purple-500/40 hover:bg-purple-500/5"
            )}
          >
            <div className="p-3 bg-amber-500/10 rounded-xl shrink-0">
              <BookMarked className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Use a Saved Template</h3>
              <p className="text-sm text-gray-400 mt-0.5">
                Start from a template you've saved from the community
              </p>
            </div>
          </button>
        )}

        {/* No Saved Templates Message */}
        {!hasSavedTemplates && (
          <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
            <div className="flex items-start gap-3">
              <BookMarked className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-gray-400">
                  No saved templates yet
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Browse shared {config.label.toLowerCase()}s and save them to your collection to use as starting points.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
