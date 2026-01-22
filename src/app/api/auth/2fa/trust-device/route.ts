import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { cookies } from 'next/headers'

const TRUST_COOKIE_NAME = 'trusted_device'
const TRUST_DURATION_DAYS = 30

// Generate a secure random token
function generateDeviceToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// Get device name from user agent
function getDeviceName(userAgent: string | null): string {
  if (!userAgent) return 'Unknown Device'

  // Simple parsing - extract browser and OS
  let browser = 'Unknown Browser'
  let os = 'Unknown OS'

  if (userAgent.includes('Chrome')) browser = 'Chrome'
  else if (userAgent.includes('Firefox')) browser = 'Firefox'
  else if (userAgent.includes('Safari')) browser = 'Safari'
  else if (userAgent.includes('Edge')) browser = 'Edge'

  if (userAgent.includes('Windows')) os = 'Windows'
  else if (userAgent.includes('Mac')) os = 'macOS'
  else if (userAgent.includes('Linux')) os = 'Linux'
  else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS'
  else if (userAgent.includes('Android')) os = 'Android'

  return `${browser} on ${os}`
}

// POST - Trust this device (after successful 2FA)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userAgent = request.headers.get('user-agent')
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown'

    const deviceToken = generateDeviceToken()
    const deviceName = getDeviceName(userAgent)
    const expiresAt = new Date(Date.now() + TRUST_DURATION_DAYS * 24 * 60 * 60 * 1000)

    // Store trusted device in database
    const { error } = await supabase
      .from('trusted_devices')
      .insert({
        user_id: user.id,
        device_token: deviceToken,
        device_name: deviceName,
        ip_address: ip,
        expires_at: expiresAt.toISOString(),
      })

    if (error) {
      console.error('Failed to create trusted device:', error)
      return NextResponse.json({ error: 'Failed to trust device' }, { status: 500 })
    }

    // Set secure HttpOnly cookie
    const cookieStore = await cookies()
    cookieStore.set(TRUST_COOKIE_NAME, deviceToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    })

    return NextResponse.json({ success: true, expiresAt: expiresAt.toISOString() })
  } catch (error) {
    console.error('Trust device error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - Check if current device is trusted
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ trusted: false })
    }

    const cookieStore = await cookies()
    const deviceToken = cookieStore.get(TRUST_COOKIE_NAME)?.value

    if (!deviceToken) {
      return NextResponse.json({ trusted: false })
    }

    // Check if device token is valid and not expired
    const { data: device } = await supabase
      .from('trusted_devices')
      .select('id, expires_at')
      .eq('user_id', user.id)
      .eq('device_token', deviceToken)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (!device) {
      // Token invalid or expired, clear cookie
      cookieStore.delete(TRUST_COOKIE_NAME)
      return NextResponse.json({ trusted: false })
    }

    // Update last_used_at
    await supabase
      .from('trusted_devices')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', device.id)

    return NextResponse.json({ trusted: true })
  } catch (error) {
    console.error('Check trusted device error:', error)
    return NextResponse.json({ trusted: false })
  }
}

// DELETE - Remove trust from current device
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cookieStore = await cookies()
    const deviceToken = cookieStore.get(TRUST_COOKIE_NAME)?.value

    if (deviceToken) {
      // Remove from database
      await supabase
        .from('trusted_devices')
        .delete()
        .eq('user_id', user.id)
        .eq('device_token', deviceToken)

      // Clear cookie
      cookieStore.delete(TRUST_COOKIE_NAME)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Remove trusted device error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
