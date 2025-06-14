import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { medicalEmergencyIntegrationService, MedicalDeviceConfig } from '@/services/medical-emergency-integration-service'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user ID from session (simplified for demo)
    const userId = 'current-user' // In production, extract from session

    const devices = medicalEmergencyIntegrationService.getUserDevices(userId)

    return NextResponse.json({
      devices,
      count: devices.length
    })
  } catch (error) {
    console.error('Error fetching medical devices:', error)
    return NextResponse.json(
      { error: 'Failed to fetch medical devices' },
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

    const data = await request.json()
    const userId = 'current-user' // In production, extract from session

    const deviceConfig: MedicalDeviceConfig = {
      id: `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      deviceType: data.deviceType,
      deviceModel: data.deviceModel,
      serialNumber: data.serialNumber,
      isActive: data.isActive ?? true,
      emergencyContacts: data.emergencyContacts || [],
      alertThresholds: data.alertThresholds || {},
      ...data
    }

    await medicalEmergencyIntegrationService.registerMedicalDevice(deviceConfig)

    return NextResponse.json({
      success: true,
      device: deviceConfig
    })
  } catch (error) {
    console.error('Error registering medical device:', error)
    return NextResponse.json(
      { error: 'Failed to register medical device' },
      { status: 500 }
    )
  }
}