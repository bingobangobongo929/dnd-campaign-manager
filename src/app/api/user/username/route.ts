import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Validate username format
function validateUsername(username: string): string | null {
  if (!username) return 'Username is required'
  if (username.length < 3) return 'Username must be at least 3 characters'
  if (username.length > 20) return 'Username must be 20 characters or less'
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Only letters, numbers, and underscores allowed'
  if (/^[0-9]/.test(username)) return 'Username cannot start with a number'
  return null
}

// POST - Set or update username
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { username } = body

    // Validate format
    const validationError = validateUsername(username?.toLowerCase())
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const normalizedUsername = username.toLowerCase()

    // Check if username is taken (case-insensitive)
    const { data: existing } = await supabase
      .from('user_settings')
      .select('user_id, username')
      .ilike('username', normalizedUsername)
      .neq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'This username is already taken' }, { status: 409 })
    }

    // Update user settings with new username
    const { error: updateError } = await supabase
      .from('user_settings')
      .update({
        username: normalizedUsername,
        username_set_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error updating username:', updateError)
      return NextResponse.json({ error: 'Failed to save username' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      username: normalizedUsername,
    })
  } catch (error) {
    console.error('Username API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - Check if username is available
export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')

    if (!username) {
      return NextResponse.json({ error: 'Username parameter required' }, { status: 400 })
    }

    // Validate format
    const validationError = validateUsername(username.toLowerCase())
    if (validationError) {
      return NextResponse.json({
        available: false,
        error: validationError,
      })
    }

    // Check if username is taken
    const { data: existing } = await supabase
      .from('user_settings')
      .select('user_id')
      .ilike('username', username.toLowerCase())
      .neq('user_id', user.id)
      .maybeSingle()

    return NextResponse.json({
      available: !existing,
      username: username.toLowerCase(),
    })
  } catch (error) {
    console.error('Username check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
