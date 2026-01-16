'use client'

import { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'fullscreen'
  showCloseButton?: boolean
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
}: ModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, handleEscape])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    full: 'max-w-4xl',
    fullscreen: '', // Use inline styles for fullscreen
  }

  const fullscreenStyles = size === 'fullscreen' ? {
    width: '90vw',
    maxWidth: '90vw',
    height: '90vh',
    maxHeight: '90vh',
  } : {}

  const modalContent = (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={cn('modal', sizeClasses[size])}
        style={fullscreenStyles}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="modal-header">
            <div className="flex items-start justify-between">
              <div>
                {title && <h2 className="modal-title">{title}</h2>}
                {description && (
                  <p className="modal-description">{description}</p>
                )}
              </div>
              {showCloseButton && (
                <button
                  className="btn-ghost btn-icon w-9 h-9 -mr-2 -mt-1"
                  onClick={onClose}
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
