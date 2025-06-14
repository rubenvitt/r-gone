import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { triggerNotificationService, NotificationType, NotificationStatus, NotificationChannel } from '@/services/trigger-notification-service'
import { auditLoggingService } from '@/services/audit-logging-service'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId') || 'default-user'
    const type = searchParams.get('type') as NotificationType | undefined
    const status = searchParams.get('status') as NotificationStatus | undefined
    const channel = searchParams.get('channel') as NotificationChannel | undefined
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    // Get notifications with filters
    const notifications = triggerNotificationService.getUserNotifications(userId, {
      type,
      status,
      channel,
      unreadOnly
    })

    // Get stats
    const stats = triggerNotificationService.getNotificationStats(userId)

    return NextResponse.json({
      success: true,
      notifications: notifications.slice(0, 100), // Limit to 100 most recent
      stats,
      filters: {
        type,
        status,
        channel,
        unreadOnly
      }
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
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

    const body = await request.json()
    const { 
      triggerId,
      triggerType,
      userId,
      recipients,
      type,
      priority,
      customMessage
    } = body

    if (!triggerId || !triggerType || !recipients || !type) {
      return NextResponse.json(
        { error: 'Trigger ID, type, recipients, and notification type are required' },
        { status: 400 }
      )
    }

    // Create mock trigger and result for testing
    const mockTrigger = {
      id: triggerId,
      type: triggerType,
      userId: userId || 'default-user',
      metadata: { isTest: true }
    }

    const mockResult = {
      triggered: true,
      confidence: 1.0,
      reason: customMessage || 'Test notification',
      metadata: {}
    }

    // Send notifications
    const notifications = await triggerNotificationService.sendTriggerNotification(
      mockTrigger as any,
      mockResult as any,
      recipients,
      type,
      priority
    )

    // Log the notification send
    await auditLoggingService.logSystemEvent(
      'test_notification_sent',
      'success',
      {
        notificationCount: notifications.length,
        type,
        priority,
        recipients: recipients.map((r: any) => r.id)
      }
    )

    return NextResponse.json({
      success: true,
      notifications: notifications.map(n => ({
        id: n.id,
        type: n.type,
        channel: n.channel,
        recipient: n.recipient.id,
        status: n.status,
        sentAt: n.sentAt
      })),
      count: notifications.length
    })
  } catch (error) {
    console.error('Error sending notifications:', error)
    
    await auditLoggingService.logError(
      'notification_send_failed',
      'Failed to send notifications',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    )
    
    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    )
  }
}