'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from './useSupabase'

interface AppSettings {
  billing_enabled: boolean
  founder_signups_enabled: boolean
  maintenance_mode: boolean
  show_upgrade_prompts: boolean
}

const defaultSettings: AppSettings = {
  billing_enabled: false,
  founder_signups_enabled: true,
  maintenance_mode: false,
  show_upgrade_prompts: false,
}

export function useAppSettings() {
  const supabase = useSupabase()
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('*')
          .eq('id', 'global')
          .single()

        if (error && error.code !== 'PGRST116') {
          console.error('Failed to load app settings:', error)
          return
        }

        if (data) {
          setSettings({
            billing_enabled: data.billing_enabled || false,
            founder_signups_enabled: data.founder_signups_enabled ?? true,
            maintenance_mode: data.maintenance_mode || false,
            show_upgrade_prompts: data.show_upgrade_prompts || false,
          })
        }
      } catch (error) {
        console.error('Failed to load app settings:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [supabase])

  return { settings, loading }
}
