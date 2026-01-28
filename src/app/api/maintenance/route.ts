import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('app_settings')
      .select('maintenance_mode, maintenance_message')
      .eq('id', 'global')
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching maintenance status:', error)
    }

    return NextResponse.json({
      maintenance_mode: data?.maintenance_mode || false,
      maintenance_message: data?.maintenance_message || null,
    })
  } catch (error) {
    console.error('Maintenance API error:', error)
    return NextResponse.json({
      maintenance_mode: false,
      maintenance_message: null,
    })
  }
}
