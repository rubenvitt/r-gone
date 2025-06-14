import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { activationNotificationService } from '@/services/activation-notification-service'

export async function GET(request: NextRequest) {
  try {
    // Check for session cookie
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const activationRequestId = searchParams.get('requestId')
    
    if (!activationRequestId) {
      return NextResponse.json({ error: 'Request ID required' }, { status: 400 })
    }

    const notifications = activationNotificationService.getNotificationHistory(activationRequestId)

    return NextResponse.json({
      notifications,
      count: notifications.length
    })
  } catch (error) {
    console.error('Error fetching activation notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}