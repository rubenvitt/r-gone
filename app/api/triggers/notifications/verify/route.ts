import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { triggerNotificationService } from '@/services/trigger-notification-service'
import { auditLoggingService } from '@/services/audit-logging-service'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      userId,
      type,
      requester,
      reason,
      expiresIn = 5 // Default 5 minutes
    } = body

    if (!type || !requester || !reason) {
      return NextResponse.json(
        { error: 'Type, requester, and reason are required' },
        { status: 400 }
      )
    }

    // Generate verification ID
    const verificationId = uuidv4()

    // Send verification request
    const notification = await triggerNotificationService.sendVerificationRequest(
      userId || 'default-user',
      verificationId,
      {
        type,
        requester,
        reason,
        expiresIn
      }
    )

    if (!notification) {
      throw new Error('Failed to send verification request')
    }

    // Log verification request
    await auditLoggingService.logSystemEvent(
      'verification_request_sent',
      'success',
      {
        verificationId,
        userId: userId || 'default-user',
        type,
        requester,
        expiresIn,
        notificationId: notification.id
      }
    )

    return NextResponse.json({
      success: true,
      verificationId,
      notificationId: notification.id,
      expiresAt: notification.expiresAt,
      message: 'Verification request sent'
    })
  } catch (error) {
    console.error('Error sending verification request:', error)
    
    await auditLoggingService.logError(
      'verification_request_failed',
      'Failed to send verification request',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    )
    
    return NextResponse.json(
      { error: 'Failed to send verification request' },
      { status: 500 }
    )
  }
}