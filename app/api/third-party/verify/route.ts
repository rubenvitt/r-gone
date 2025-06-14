import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { thirdPartyIntegrationService } from '@/services/third-party-integration-service'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const { signalId, verificationMethod, isValid, notes } = data
    const verifiedBy = 'current-user' // In production, extract from session

    if (!signalId || verificationMethod === undefined || isValid === undefined) {
      return NextResponse.json(
        { error: 'Signal ID, verification method, and validity are required' },
        { status: 400 }
      )
    }

    await thirdPartyIntegrationService.verifySignal(
      signalId,
      verificationMethod,
      isValid,
      verifiedBy
    )

    return NextResponse.json({
      success: true,
      message: 'Signal verification updated',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error verifying signal:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to verify signal' },
      { status: 500 }
    )
  }
}