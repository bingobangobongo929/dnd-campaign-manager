'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { toast } from 'sonner'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'conflict'

interface UseAutoSaveOptions<T> {
  data: T
  onSave: (data: T) => Promise<void>
  delay?: number
  enabled?: boolean
  showToast?: boolean
  toastMessage?: string
}

export function useAutoSave<T>({ data, onSave, delay = 2000, enabled = true, showToast = false, toastMessage = 'Changes saved' }: UseAutoSaveOptions<T>) {
  const [status, setStatus] = useState<SaveStatus>('idle')
  const previousDataRef = useRef<T>(data)
  const savedTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const save = useCallback(async (dataToSave: T) => {
    if (!enabled) return

    try {
      setStatus('saving')
      await onSave(dataToSave)
      setStatus('saved')

      if (showToast) {
        toast.success(toastMessage, { duration: 2000 })
      }

      // Clear any existing timeout
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current)
      }

      // Reset to idle after 2 seconds
      savedTimeoutRef.current = setTimeout(() => {
        setStatus('idle')
      }, 2000)
    } catch (error) {
      console.error('Auto-save error:', error)
      setStatus('error')
      if (showToast) {
        toast.error('Failed to save changes')
      }
    }
  }, [onSave, enabled, showToast, toastMessage])

  const debouncedSave = useDebouncedCallback(save, delay)

  useEffect(() => {
    // Check if data has changed
    if (enabled && JSON.stringify(data) !== JSON.stringify(previousDataRef.current)) {
      previousDataRef.current = data
      debouncedSave(data)
    }
  }, [data, debouncedSave, enabled])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current)
      }
    }
  }, [])

  // Force save immediately (e.g., on blur or before navigation)
  const forceSave = useCallback(async () => {
    debouncedSave.cancel()
    await save(data)
  }, [data, save, debouncedSave])

  return { status, forceSave }
}

// =====================================================
// VERSION-AWARE AUTO-SAVE WITH CONFLICT DETECTION
// =====================================================

export interface ConflictInfo {
  hasConflict: boolean
  serverVersion?: number
  serverUpdatedAt?: string
  message?: string
}

interface UseVersionedAutoSaveOptions<T> {
  data: T
  version: number
  onSave: (data: T, expectedVersion: number) => Promise<{ success: boolean; conflict?: boolean; newVersion?: number; error?: string }>
  onConflict?: (info: ConflictInfo) => void
  delay?: number
  enabled?: boolean
  showToast?: boolean
  toastMessage?: string
}

/**
 * Auto-save hook with optimistic locking / conflict detection
 * Tracks version numbers and detects when data has been modified elsewhere
 */
export function useVersionedAutoSave<T>({
  data,
  version,
  onSave,
  onConflict,
  delay = 2000,
  enabled = true,
  showToast = false,
  toastMessage = 'Changes saved'
}: UseVersionedAutoSaveOptions<T>) {
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [currentVersion, setCurrentVersion] = useState(version)
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null)
  const previousDataRef = useRef<T>(data)
  const savedTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Update version when it changes from props (e.g., after reload)
  useEffect(() => {
    setCurrentVersion(version)
  }, [version])

  const save = useCallback(async (dataToSave: T) => {
    if (!enabled) return

    try {
      setStatus('saving')
      const result = await onSave(dataToSave, currentVersion)

      if (result.conflict) {
        setStatus('conflict')
        const info: ConflictInfo = {
          hasConflict: true,
          serverVersion: result.newVersion,
          message: result.error || 'This record was modified elsewhere. Your changes may overwrite other edits.',
        }
        setConflictInfo(info)
        onConflict?.(info)

        toast.error('Conflict detected! This page was edited elsewhere.', {
          duration: 5000,
          action: {
            label: 'Reload',
            onClick: () => window.location.reload(),
          },
        })
        return
      }

      if (!result.success) {
        throw new Error(result.error || 'Save failed')
      }

      // Update our tracked version
      if (result.newVersion) {
        setCurrentVersion(result.newVersion)
      }

      setStatus('saved')
      setConflictInfo(null)

      if (showToast) {
        toast.success(toastMessage, { duration: 2000 })
      }

      // Clear any existing timeout
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current)
      }

      // Reset to idle after 2 seconds
      savedTimeoutRef.current = setTimeout(() => {
        setStatus('idle')
      }, 2000)
    } catch (error) {
      console.error('Auto-save error:', error)
      setStatus('error')
      if (showToast) {
        toast.error('Failed to save changes')
      }
    }
  }, [onSave, currentVersion, enabled, showToast, toastMessage, onConflict])

  const debouncedSave = useDebouncedCallback(save, delay)

  useEffect(() => {
    // Check if data has changed
    if (enabled && JSON.stringify(data) !== JSON.stringify(previousDataRef.current)) {
      previousDataRef.current = data
      debouncedSave(data)
    }
  }, [data, debouncedSave, enabled])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current)
      }
    }
  }, [])

  // Force save immediately
  const forceSave = useCallback(async () => {
    debouncedSave.cancel()
    await save(data)
  }, [data, save, debouncedSave])

  // Dismiss conflict and update to server version (user chooses to reload)
  const dismissConflict = useCallback(() => {
    setConflictInfo(null)
    setStatus('idle')
  }, [])

  return {
    status,
    forceSave,
    currentVersion,
    conflictInfo,
    dismissConflict,
    hasConflict: status === 'conflict',
  }
}
