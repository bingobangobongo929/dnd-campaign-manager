'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useDebouncedCallback } from 'use-debounce'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface UseAutoSaveOptions<T> {
  data: T
  onSave: (data: T) => Promise<void>
  delay?: number
  enabled?: boolean
}

export function useAutoSave<T>({ data, onSave, delay = 2000, enabled = true }: UseAutoSaveOptions<T>) {
  const [status, setStatus] = useState<SaveStatus>('idle')
  const previousDataRef = useRef<T>(data)
  const savedTimeoutRef = useRef<NodeJS.Timeout>()

  const save = useCallback(async (dataToSave: T) => {
    if (!enabled) return

    try {
      setStatus('saving')
      await onSave(dataToSave)
      setStatus('saved')

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
    }
  }, [onSave, enabled])

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
