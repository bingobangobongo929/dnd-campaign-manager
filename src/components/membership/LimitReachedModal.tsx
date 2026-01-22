'use client'

import { Modal } from '@/components/ui'
import { AlertCircle, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LimitType } from '@/lib/membership'

interface LimitReachedModalProps {
  isOpen: boolean
  onClose: () => void
  limitType: LimitType
  current: number
  limit: number
  onManage?: () => void
}

const limitInfo: Record<
  LimitType,
  {
    title: string
    description: string
    manageLabel: string
    managePath: string
    tip: string
  }
> = {
  campaigns: {
    title: 'Campaign Limit Reached',
    description: "You've reached your campaign limit.",
    manageLabel: 'Manage Campaigns',
    managePath: '/campaigns',
    tip: 'Delete or permanently remove a campaign to create a new one.',
  },
  oneshots: {
    title: 'One-Shot Limit Reached',
    description: "You've reached your one-shot limit.",
    manageLabel: 'Manage One-Shots',
    managePath: '/oneshots',
    tip: 'Delete or permanently remove a one-shot to create a new one.',
  },
  vaultCharacters: {
    title: 'Character Limit Reached',
    description: "You've reached your vault character limit.",
    manageLabel: 'Manage Characters',
    managePath: '/vault',
    tip: 'Delete or permanently remove a character to create a new one.',
  },
  shareLinks: {
    title: 'Share Link Limit Reached',
    description: "You've reached your active share link limit.",
    manageLabel: 'Manage Shares',
    managePath: '/settings',
    tip: 'Revoke an existing share link to create a new one.',
  },
  publicTemplates: {
    title: 'Template Limit Reached',
    description: "You've reached your public template limit.",
    manageLabel: 'Manage Templates',
    managePath: '/templates',
    tip: 'Unpublish a template to publish a new one.',
  },
  storage: {
    title: 'Storage Limit Reached',
    description: "You've reached your storage limit.",
    manageLabel: 'Manage Storage',
    managePath: '/settings/storage',
    tip: 'Delete some images or files to free up space.',
  },
}

/**
 * Modal shown when user tries to exceed a limit
 *
 * Note: This is a friendly modal that encourages managing existing content.
 * There are NO upgrade prompts - this is by design.
 */
export function LimitReachedModal({
  isOpen,
  onClose,
  limitType,
  current,
  limit,
  onManage,
}: LimitReachedModalProps) {
  const info = limitInfo[limitType]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={info.title}
      size="sm"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <AlertCircle className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-gray-400 pt-1">{info.description}</p>
        </div>

        <div className="flex items-center justify-center p-4 bg-white/[0.04] rounded-lg">
          <div className="text-center">
            <div className="text-3xl font-bold text-white">
              {current} / {limit}
            </div>
            <div className="text-sm text-gray-500">Currently used</div>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <Trash2 className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-200">{info.tip}</p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onClose()
              if (onManage) {
                onManage()
              } else {
                window.location.href = info.managePath
              }
            }}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {info.manageLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/**
 * Inline limit warning for forms
 */
export function LimitWarning({
  limitType,
  current,
  limit,
  className,
}: {
  limitType: LimitType
  current: number
  limit: number
  className?: string
}) {
  // Unlimited (-1) means no warning needed
  if (limit === -1) return null

  const atLimit = current >= limit
  const nearLimit = current >= limit * 0.8

  if (!atLimit && !nearLimit) return null

  const info = limitInfo[limitType]

  return (
    <div
      className={cn(
        'flex items-start gap-2 p-3 rounded-lg text-sm',
        atLimit
          ? 'bg-red-500/10 border border-red-500/20 text-red-200'
          : 'bg-amber-500/10 border border-amber-500/20 text-amber-200',
        className
      )}
    >
      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div>
        <p className="font-medium">
          {atLimit ? info.title : `Approaching ${info.title.replace('Reached', 'Limit')}`}
        </p>
        <p className="text-gray-400">
          {current} of {limit} used. {atLimit ? info.tip : ''}
        </p>
      </div>
    </div>
  )
}
