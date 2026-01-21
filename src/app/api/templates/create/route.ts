import { NextResponse } from 'next/server'

/**
 * POST /api/templates/create
 *
 * Creates a template by calling the publish API with is_public = false.
 * This is a convenience endpoint for the new share modal flow where
 * "Create Template" is a distinct action from "Publish to Community".
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { contentType, contentId } = body

    if (!contentType || !contentId) {
      return NextResponse.json({ error: 'Content type and ID required' }, { status: 400 })
    }

    // Get the host from the request
    const url = new URL(request.url)
    const baseUrl = `${url.protocol}//${url.host}`

    // Forward to publish API with is_public = false
    const res = await fetch(`${baseUrl}/api/templates/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
      body: JSON.stringify({
        contentType,
        contentId,
        isPublic: false,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Template create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
