import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { triggerNotificationService } from '@/services/trigger-notification-service'
import { auditLoggingService } from '@/services/audit-logging-service'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const notification = triggerNotificationService.getNotification(params.id)
    
    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      notification
    })
  } catch (error) {
    console.error('Error fetching notification:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      )
    }

    let success = false
    let message = ''

    switch (action) {
      case 'markAsRead':
        triggerNotificationService.markAsRead(params.id)
        success = true
        message = 'Notification marked as read'
        break
        
      case 'cancel':
        success = triggerNotificationService.cancelNotification(params.id)
        message = success ? 'Notification cancelled' : 'Cannot cancel notification'
        break
        
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    if (success) {
      await auditLoggingService.logSystemEvent(
        'notification_updated',
        'success',
        {
          notificationId: params.id,
          action
        }
      )
    }

    return NextResponse.json({
      success,
      message
    })
  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const success = triggerNotificationService.cancelNotification(params.id)

    if (success) {
      await auditLoggingService.logSystemEvent(
        'notification_deleted',
        'success',
        { notificationId: params.id }
      )

      return NextResponse.json({
        success: true,
        message: 'Notification deleted'
      })
    } else {
      return NextResponse.json(
        { error: 'Cannot delete notification' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error deleting notification:', error)
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    )
  }
}