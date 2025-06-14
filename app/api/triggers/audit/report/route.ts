import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { triggerAuditLoggingService, TriggerAuditEvent } from '@/services/trigger-audit-logging-service'
import { TriggerType } from '@/services/trigger-conditions-service'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      startDate, 
      endDate, 
      userId, 
      triggerType, 
      eventTypes 
    } = body

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      )
    }

    // Generate report
    const report = await triggerAuditLoggingService.generateReport(
      new Date(startDate),
      new Date(endDate),
      {
        userId,
        triggerType: triggerType as TriggerType,
        eventTypes: eventTypes as TriggerAuditEvent[]
      }
    )

    return NextResponse.json({
      success: true,
      report
    })
  } catch (error) {
    console.error('Error generating audit report:', error)
    return NextResponse.json(
      { error: 'Failed to generate audit report' },
      { status: 500 }
    )
  }
}