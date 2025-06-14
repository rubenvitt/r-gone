import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { legalIntegrationService, CollaborationPermission } from '@/services/legal-integration-service'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    const {
      documentId,
      attorneyInfo,
      role,
      permissions
    } = body

    if (!documentId || !attorneyInfo || !role) {
      return NextResponse.json(
        { error: 'Document ID, attorney info, and role are required' },
        { status: 400 }
      )
    }

    // Default permissions if not provided
    const defaultPermissions: CollaborationPermission[] = [
      { action: 'view', granted: true },
      { action: 'comment', granted: true },
      { action: 'edit', granted: role === 'drafter' },
      { action: 'approve', granted: role === 'reviewer' },
      { action: 'download', granted: true },
      { action: 'share', granted: false }
    ]

    const collaboration = await legalIntegrationService.inviteAttorney(
      documentId,
      attorneyInfo,
      role,
      permissions || defaultPermissions
    )

    return NextResponse.json({
      success: true,
      collaboration
    })
  } catch (error) {
    console.error('Error inviting attorney:', error)
    return NextResponse.json(
      { error: 'Failed to invite attorney' },
      { status: 500 }
    )
  }
}