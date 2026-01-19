'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { UserSettings } from '@/types/database'

export function useSupabase() {
  const [supabase] = useState(() => createClient())
  return supabase
}

export function useUser() {
  const supabase = useSupabase()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  return { user, loading }
}

export function useUserSettings() {
  const supabase = useSupabase()
  const { user, loading: userLoading } = useUser()
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSettings = useCallback(async () => {
    if (!user) {
      setSettings(null)
      setLoading(false)
      return
    }

    try {
      const { data } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      setSettings(data)
    } catch (error) {
      console.error('Failed to fetch user settings:', error)
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    if (!userLoading) {
      fetchSettings()
    }
  }, [user, userLoading, fetchSettings])

  const refreshSettings = useCallback(async () => {
    setLoading(true)
    await fetchSettings()
  }, [fetchSettings])

  return { settings, loading: userLoading || loading, refreshSettings }
}
