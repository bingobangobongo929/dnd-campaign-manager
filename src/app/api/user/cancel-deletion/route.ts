import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, email } = body

    if (!token || !email) {
      return NextResponse.json({ error: 'Token and email are required' }, { status: 400 })
    }

    // Use service role to find and update user by email
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase configuration')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Find user by email
    const { data: authData, error: authError } = await adminClient.auth.admin.listUsers()

    if (authError) {
      console.error('Failed to list users:', authError)
      return NextResponse.json({ error: 'Failed to verify request' }, { status: 500 })
    }

    const authUser = authData.users.find(u => u.email?.toLowerCase() === email.toLowerCase())

    if (!authUser) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Verify token matches and deletion is scheduled
    const { data: userSettings, error: settingsError } = await adminClient
      .from('user_settings')
      .select('deletion_scheduled_at, deletion_cancellation_token, username')
      .eq('user_id', authUser.id)
      .single()

    if (settingsError || !userSettings) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Verify cancellation token
    if (userSettings.deletion_cancellation_token !== token) {
      return NextResponse.json({ error: 'Invalid or expired cancellation link' }, { status: 400 })
    }

    // Check if deletion is still scheduled
    if (!userSettings.deletion_scheduled_at) {
      return NextResponse.json({ error: 'No deletion scheduled for this account' }, { status: 400 })
    }

    // Check if deletion date has passed
    const deletionDate = new Date(userSettings.deletion_scheduled_at)
    if (deletionDate < new Date()) {
      return NextResponse.json({
        error: 'The grace period has expired and your account may have been deleted'
      }, { status: 400 })
    }

    // Cancel the deletion
    const { error: updateError } = await adminClient
      .from('user_settings')
      .update({
        deletion_requested_at: null,
        deletion_scheduled_at: null,
        deletion_cancellation_token: null,
        deletion_cancelled_at: new Date().toISOString(),
      })
      .eq('user_id', authUser.id)

    if (updateError) {
      console.error('Failed to cancel deletion:', updateError)
      return NextResponse.json({ error: 'Failed to cancel deletion' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Account deletion cancelled successfully',
      username: userSettings.username,
    })
  } catch (error) {
    console.error('Cancel deletion error:', error)
    return NextResponse.json({ error: 'Failed to cancel deletion' }, { status: 500 })
  }
}
