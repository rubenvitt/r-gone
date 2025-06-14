import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { medicalEmergencyIntegrationService } from '@/services/medical-emergency-integration-service'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    // Process incoming medical emergency data
    await medicalEmergencyIntegrationService.processEmergencyData(data)

    return NextResponse.json({
      success: true,
      message: 'Emergency data processed successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error processing emergency data:', error)
    return NextResponse.json(
      { error: 'Failed to process emergency data' },
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
    const userId = 'current-user' // In production, extract from session
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined

    const emergencyHistory = medicalEmergencyIntegrationService.getEmergencyHistory(userId, limit)

    return NextResponse.json({
      emergencies: emergencyHistory,
      count: emergencyHistory.length
    })
  } catch (error) {
    console.error('Error fetching emergency history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch emergency history' },
      { status: 500 }
    )
  }
}