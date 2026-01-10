'use client'

import { useState, useCallback } from 'react'
import { useAppStore } from '@/store'

interface UseAIOptions {
  onSuccess?: (result: string) => void
  onError?: (error: Error) => void
}

export function useAI(options: UseAIOptions = {}) {
  const { aiProvider } = useAppStore()
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const expand = useCallback(
    async (text: string, context?: string) => {
      setIsLoading(true)
      setError(null)
      setResult(null)

      try {
        const response = await fetch('/api/ai/expand', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, context, provider: aiProvider }),
        })

        if (!response.ok) {
          throw new Error('Failed to expand text')
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error('No response body')

        let fullText = ''
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          // Parse SSE format from AI SDK
          const lines = chunk.split('\n')
          for (const line of lines) {
            if (line.startsWith('0:')) {
              try {
                const text = JSON.parse(line.slice(2))
                fullText += text
                setResult(fullText)
              } catch {
                // Ignore parse errors
              }
            }
          }
        }

        options.onSuccess?.(fullText)
        return fullText
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        setError(error)
        options.onError?.(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [aiProvider, options]
  )

  const summarize = useCallback(
    async (text: string, sessionTitle?: string) => {
      setIsLoading(true)
      setError(null)
      setResult(null)

      try {
        const response = await fetch('/api/ai/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, sessionTitle, provider: aiProvider }),
        })

        if (!response.ok) {
          throw new Error('Failed to summarize text')
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error('No response body')

        let fullText = ''
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          // Parse SSE format from AI SDK
          const lines = chunk.split('\n')
          for (const line of lines) {
            if (line.startsWith('0:')) {
              try {
                const text = JSON.parse(line.slice(2))
                fullText += text
                setResult(fullText)
              } catch {
                // Ignore parse errors
              }
            }
          }
        }

        options.onSuccess?.(fullText)
        return fullText
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        setError(error)
        options.onError?.(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [aiProvider, options]
  )

  return {
    expand,
    summarize,
    isLoading,
    result,
    error,
    clearResult: () => setResult(null),
  }
}
