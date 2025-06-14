import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { medicalEmergencyIntegrationService, MedicalEmergencyType } from '@/services/medical-emergency-integration-service'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const { deviceId, emergencyType, customData } = data

    if (!deviceId || !emergencyType) {
      return NextResponse.json(
        { error: 'Device ID and emergency type are required' },
        { status: 400 }
      )
    }

    // Simulate the medical emergency
    await medicalEmergencyIntegrationService.simulateEmergency(
      deviceId,
      emergencyType as MedicalEmergencyType,
      customData
    )

    return NextResponse.json({
      success: true,
      message: `Simulated ${emergencyType} emergency for device ${deviceId}`,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error simulating emergency:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to simulate emergency' },
      { status: 500 }
    )
  }
}