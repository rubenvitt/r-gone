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
    const { 
      providerId, 
      signalType, 
      userId, 
      accountIdentifier, 
      timestamp, 
      signalData, 
      source 
    } = data

    if (!providerId || !signalType || !signalData || !source) {
      return NextResponse.json(
        { error: 'Provider ID, signal type, signal data, and source are required' },
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

    // Process the third-party signal
    await thirdPartyIntegrationService.processThirdPartySignal({
      providerId,
      signalType: signalType as ThirdPartySignalType,
      userId,
      accountIdentifier,
      timestamp: timestamp ? new Date(timestamp) : undefined,
      data: signalData,
      source
    })

    return NextResponse.json({
      success: true,
      message: 'Third-party signal processed successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error processing third-party signal:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process signal' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || 'current-user'
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    const pending = searchParams.get('pending') === 'true'

    if (pending) {
      // Get pending signals for review
      const pendingSignals = thirdPartyIntegrationService.getPendingSignals()
      
      return NextResponse.json({
        signals: pendingSignals,
        count: pendingSignals.length
      })
    } else {
      // Get user's signal history
      const signals = thirdPartyIntegrationService.getUserSignals(userId, limit)
      
      return NextResponse.json({
        signals,
        count: signals.length
      })
    }
  } catch (error) {
    console.error('Error fetching third-party signals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch signals' },
      { status: 500 }
    )
  }
}