import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { keyManagementService, ContentType } from '@/services/key-management-service'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { contentType } = body

    if (!contentType) {
      return NextResponse.json(
        { error: 'Content type is required' },
        { status: 400 }
      )
    }

    // Rotate key for content type
    const newKey = await keyManagementService.rotateKey(contentType as ContentType)

    // Remove sensitive data before sending
    const { encryptedPrivateKey, ...safeKey } = newKey
    
    return NextResponse.json({ 
      key: safeKey,
      message: 'Key rotated successfully. Old key will expire in 24 hours.' 
    })
  } catch (error) {
    console.error('Error rotating key:', error)
    return NextResponse.json(
      { error: 'Failed to rotate key' },
      { status: 500 }
    )
  }
}