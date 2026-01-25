'use client'

import { useState, useEffect, useCallback } from 'react'
import type { EntitySecret, SecretEntityType, VisibilityLevel } from '@/types/database'

interface UseEntitySecretsOptions {
  campaignId: string
  entityType?: SecretEntityType
  entityId?: string
}

interface UseEntitySecretsReturn {
  secrets: EntitySecret[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  createSecret: (data: CreateSecretData) => Promise<EntitySecret | null>
  updateSecret: (secretId: string, data: UpdateSecretData) => Promise<EntitySecret | null>
  deleteSecret: (secretId: string) => Promise<boolean>
  revealSecret: (secretId: string, sessionId?: string) => Promise<EntitySecret | null>
}

interface CreateSecretData {
  entityType: SecretEntityType
  entityId: string
  fieldName?: string
  content: string
  visibility?: VisibilityLevel
}

interface UpdateSecretData {
  content?: string
  visibility?: VisibilityLevel
}

export function useEntitySecrets({
  campaignId,
  entityType,
  entityId,
}: UseEntitySecretsOptions): UseEntitySecretsReturn {
  const [secrets, setSecrets] = useState<EntitySecret[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSecrets = useCallback(async () => {
    if (!campaignId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (entityType) params.set('entityType', entityType)
      if (entityId) params.set('entityId', entityId)

      const url = `/api/campaigns/${campaignId}/secrets${params.toString() ? `?${params}` : ''}`
      const response = await fetch(url)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch secrets')
      }

      const data = await response.json()
      setSecrets(data.secrets || [])
    } catch (err) {
      console.error('Error fetching secrets:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch secrets')
    } finally {
      setLoading(false)
    }
  }, [campaignId, entityType, entityId])

  useEffect(() => {
    fetchSecrets()
  }, [fetchSecrets])

  const createSecret = useCallback(async (data: CreateSecretData): Promise<EntitySecret | null> => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/secrets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create secret')
      }

      const result = await response.json()
      setSecrets(prev => [result.secret, ...prev])
      return result.secret
    } catch (err) {
      console.error('Error creating secret:', err)
      setError(err instanceof Error ? err.message : 'Failed to create secret')
      return null
    }
  }, [campaignId])

  const updateSecret = useCallback(async (
    secretId: string,
    data: UpdateSecretData
  ): Promise<EntitySecret | null> => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/secrets`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretId, ...data }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update secret')
      }

      const result = await response.json()
      setSecrets(prev => prev.map(s => s.id === secretId ? result.secret : s))
      return result.secret
    } catch (err) {
      console.error('Error updating secret:', err)
      setError(err instanceof Error ? err.message : 'Failed to update secret')
      return null
    }
  }, [campaignId])

  const deleteSecret = useCallback(async (secretId: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/secrets?secretId=${secretId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete secret')
      }

      setSecrets(prev => prev.filter(s => s.id !== secretId))
      return true
    } catch (err) {
      console.error('Error deleting secret:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete secret')
      return false
    }
  }, [campaignId])

  const revealSecret = useCallback(async (
    secretId: string,
    sessionId?: string
  ): Promise<EntitySecret | null> => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/secrets`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secretId,
          reveal: true,
          revealInSessionId: sessionId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to reveal secret')
      }

      const result = await response.json()
      setSecrets(prev => prev.map(s => s.id === secretId ? result.secret : s))
      return result.secret
    } catch (err) {
      console.error('Error revealing secret:', err)
      setError(err instanceof Error ? err.message : 'Failed to reveal secret')
      return null
    }
  }, [campaignId])

  return {
    secrets,
    loading,
    error,
    refetch: fetchSecrets,
    createSecret,
    updateSecret,
    deleteSecret,
    revealSecret,
  }
}
