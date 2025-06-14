import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { thirdPartyIntegrationService, ThirdPartySignalType } from '@/services/third-party-integration-service'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const userId = 'current-user' // In production, extract from session
    const { providerId, signalType, customData } = data

    if (!providerId || !signalType) {
      return NextResponse.json(
        { error: 'Provider ID and signal type are required' },
        { status: 400 }
      )
    }

    // Validate signal type
    if (!Object.values(ThirdPartySignalType).includes(signalType)) {
      return NextResponse.json(
        { error: 'Invalid signal type' },
        { status: 400 }
      )
    }

    // Simulate the third-party signal
    const signalId = await thirdPartyIntegrationService.simulateSignal(
      userId,
      providerId,
      signalType as ThirdPartySignalType,
      customData
    )

    return NextResponse.json({
      success: true,
      signalId,
      message: `Simulated ${signalType} signal from provider ${providerId}`,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error simulating third-party signal:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to simulate signal' },
      { status: 500 }
    )
  }
}