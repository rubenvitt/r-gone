import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { keyManagementService, ContentType } from '@/services/key-management-service'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const contentType = searchParams.get('type') as ContentType | null
    
    if (contentType) {
      // Get key for specific content type
      const key = await keyManagementService.getKeyForType(contentType)
      if (!key) {
        return NextResponse.json({ error: 'Key not found' }, { status: 404 })
      }
      
      // Remove sensitive data before sending
      const { encryptedPrivateKey, ...safeKey } = key
      return NextResponse.json({ key: safeKey })
    }

    // Get all keys (metadata only)
    const logs = keyManagementService.getKeyUsageLogs(undefined, 1000)
    const keyIds = [...new Set(logs.map(log => log.keyId))]
    
    return NextResponse.json({ 
      keys: keyIds,
      count: keyIds.length 
    })
  } catch (error) {
    console.error('Error fetching keys:', error)
    return NextResponse.json(
      { error: 'Failed to fetch keys' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { contentType, algorithm } = body

    if (!contentType) {
      return NextResponse.json(
        { error: 'Content type is required' },
        { status: 400 }
      )
    }

    // Generate new key
    const key = await keyManagementService.generateKeyForType(
      contentType as ContentType,
      algorithm
    )

    // Remove sensitive data before sending
    const { encryptedPrivateKey, ...safeKey } = key
    
    return NextResponse.json({ 
      key: safeKey,
      message: 'Key generated successfully' 
    })
  } catch (error) {
    console.error('Error generating key:', error)
    return NextResponse.json(
      { error: 'Failed to generate key' },
      { status: 500 }
    )
  }
}