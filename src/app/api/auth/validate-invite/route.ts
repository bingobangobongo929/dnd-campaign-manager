import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// POST - Validate an invite code (public - no auth required)
export async function POST(request: NextRequest) {
  try {
    // Use admin client since this is a public endpoint
    const supabase = createAdminClient()
    const { code } = await request.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ valid: false, error: 'Invalid code' }, { status: 400 })
    }

    // Use the database function to validate
    const { data, error } = await supabase.rpc('validate_invite_code', {
      code_to_validate: code.toUpperCase().trim()
    })

    if (error) {
      console.error('Validate invite error:', error)
      return NextResponse.json({ valid: false, error: 'Failed to validate code' }, { status: 500 })
    }

    const result = data?.[0]
    if (!result) {
      return NextResponse.json({ valid: false, error: 'Invalid invite code' })
    }

    return NextResponse.json({
      valid: result.valid,
      error: result.error_message || null
    })
  } catch (err) {
    console.error('Validate invite error:', err)
    return NextResponse.json({ valid: false, error: 'Failed to validate code' }, { status: 500 })
  }
}
