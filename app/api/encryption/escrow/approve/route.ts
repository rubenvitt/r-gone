import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { keyEscrowService } from '@/services/key-escrow-service'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { requestId, approved, reason, share } = body

    if (!requestId || approved === undefined) {
      return NextResponse.json(
        { error: 'Request ID and approval decision are required' },
        { status: 400 }
      )
    }

    // Process trustee decision
    await keyEscrowService.processTrusteeDecision(
      requestId,
      session.user?.id || '',
      approved,
      reason
    )

    // If approved and share provided, submit it
    if (approved && share) {
      await keyEscrowService.provideTrusteeShare(
        requestId,
        session.user?.id || '',
        share.keyId,
        share.encryptedShare
      )
    }
    
    return NextResponse.json({ 
      message: approved ? 'Request approved' : 'Request rejected'
    })
  } catch (error) {
    console.error('Error processing escrow approval:', error)
    return NextResponse.json(
      { error: 'Failed to process approval' },
      { status: 500 }
    )
  }
}