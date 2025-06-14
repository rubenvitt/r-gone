import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { keyManagementService } from '@/services/key-management-service'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { keyId } = body

    if (!keyId) {
      return NextResponse.json(
        { error: 'Key ID is required' },
        { status: 400 }
      )
    }

    // Backup key
    const encryptedBackup = await keyManagementService.backupKey(keyId)
    
    return NextResponse.json({ 
      backup: encryptedBackup,
      message: 'Key backed up successfully' 
    })
  } catch (error) {
    console.error('Error backing up key:', error)
    return NextResponse.json(
      { error: 'Failed to backup key' },
      { status: 500 }
    )
  }
}