'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertCircle, Trash2, Archive } from 'lucide-react'
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            {info.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-muted-foreground">{info.description}</p>

          <div className="flex items-center justify-center p-4 bg-muted rounded-lg">
            <div className="text-center">
              <div className="text-3xl font-bold">
                {current} / {limit}
              </div>
              <div className="text-sm text-muted-foreground">Currently used</div>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <Trash2 className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-200">{info.tip}</p>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onClose()
              if (onManage) {
                onManage()
              } else {
                window.location.href = info.managePath
              }
            }}
          >
            {info.manageLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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
        <p className="text-muted-foreground">
          {current} of {limit} used. {atLimit ? info.tip : ''}
        </p>
      </div>
    </div>
  )
}
