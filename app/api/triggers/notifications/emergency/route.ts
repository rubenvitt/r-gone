import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { triggerNotificationService, NotificationRecipient, NotificationChannel } from '@/services/trigger-notification-service'
import { emergencyAccessService } from '@/services/emergency-access-service'
import { auditLoggingService } from '@/services/audit-logging-service'

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
      emergency,
      contactIds
    } = body

    if (!emergency || !emergency.type || !emergency.severity) {
      return NextResponse.json(
        { error: 'Emergency type and severity are required' },
        { status: 400 }
      )
    }

    // Get emergency contacts
    let contacts: NotificationRecipient[] = []
    
    if (contactIds && contactIds.length > 0) {
      // Use specified contacts
      contacts = contactIds.map((id: string) => ({
        id,
        type: 'contact',
        name: `Contact ${id}`,
        email: `contact${id}@example.com`, // Would be fetched from contact service
        preferences: {
          channels: [NotificationChannel.EMAIL, NotificationChannel.SMS],
          language: 'en',
          timezone: 'UTC',
          urgentOnly: false,
          groupNotifications: false
        }
      }))
    } else {
      // Get user's emergency contacts
      const emergencyContacts = await emergencyAccessService.getEmergencyContacts(
        userId || 'default-user'
      )
      
      contacts = emergencyContacts.map(ec => ({
        id: ec.id,
        type: 'contact',
        name: ec.name,
        email: ec.email,
        phone: ec.phone,
        preferences: {
          channels: ec.preferredContact === 'phone' 
            ? [NotificationChannel.PHONE_CALL, NotificationChannel.SMS]
            : [NotificationChannel.EMAIL, NotificationChannel.SMS],
          language: 'en',
          timezone: ec.timezone || 'UTC',
          urgentOnly: false,
          groupNotifications: false
        }
      }))
    }

    if (contacts.length === 0) {
      return NextResponse.json(
        { error: 'No emergency contacts found' },
        { status: 400 }
      )
    }

    // Send emergency alerts
    await triggerNotificationService.sendEmergencyAlert(
      userId || 'default-user',
      emergency,
      contacts
    )

    // Log emergency alert
    await auditLoggingService.logEmergencyEvent(
      userId || 'default-user',
      'emergency_alert_sent',
      'success',
      {
        emergencyType: emergency.type,
        severity: emergency.severity,
        contactCount: contacts.length,
        contacts: contacts.map(c => ({ id: c.id, type: c.type }))
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Emergency alerts sent',
      contactsNotified: contacts.length
    })
  } catch (error) {
    console.error('Error sending emergency alerts:', error)
    
    await auditLoggingService.logError(
      'emergency_alert_failed',
      'Failed to send emergency alerts',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    )
    
    return NextResponse.json(
      { error: 'Failed to send emergency alerts' },
      { status: 500 }
    )
  }
}