import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { thirdPartyIntegrationService } from '@/services/third-party-integration-service'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = 'current-user' // In production, extract from session
    
    const connections = thirdPartyIntegrationService.getUserConnections(userId)

    return NextResponse.json({
      connections,
      count: connections.length
    })
  } catch (error) {
    console.error('Error fetching user connections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch connections' },
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
    const { 
      providerId, 
      accountIdentifier, 
      connectionType, 
      permissions 
    } = data

    if (!providerId || !accountIdentifier) {
      return NextResponse.json(
        { error: 'Provider ID and account identifier are required' },
        { status: 400 }
      )
    }

    const connectionId = await thirdPartyIntegrationService.connectUserToService(
      userId,
      providerId,
      accountIdentifier,
      connectionType || 'primary',
      permissions || []
    )

    return NextResponse.json({
      success: true,
      connectionId,
      message: 'Service connection created successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error creating service connection:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create connection' },
      { status: 500 }
    )
  }
}