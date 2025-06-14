import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { triggerAuditLoggingService, TriggerAuditEvent } from '@/services/trigger-audit-logging-service'
import { TriggerType } from '@/services/trigger-conditions-service'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const triggerId = searchParams.get('triggerId')
    const userId = searchParams.get('userId')
    const event = searchParams.get('event') as TriggerAuditEvent | undefined
    const correlationId = searchParams.get('correlationId')
    const result = searchParams.get('result') as 'success' | 'failure' | 'warning' | undefined
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '100')

    // Search logs
    const logs = await triggerAuditLoggingService.searchLogs({
      triggerId,
      userId,
      event,
      correlationId,
      result,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    })

    // Apply limit
    const limitedLogs = logs.slice(0, limit)

    // Calculate summary stats
    const stats = {
      total: logs.length,
      success: logs.filter(l => l.result === 'success').length,
      failure: logs.filter(l => l.result === 'failure').length,
      warning: logs.filter(l => l.result === 'warning').length,
      uniqueTriggers: new Set(logs.map(l => l.triggerId)).size,
      uniqueUsers: new Set(logs.map(l => l.userId)).size
    }

    return NextResponse.json({
      success: true,
      logs: limitedLogs,
      stats,
      hasMore: logs.length > limit
    })
  } catch (error) {
    console.error('Error fetching trigger audit logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
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
    const { action } = body

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      )
    }

    let result: any

    switch (action) {
      case 'verify_integrity':
        result = await triggerAuditLoggingService.verifyIntegrity()
        break

      case 'get_correlated':
        if (!body.correlationId) {
          return NextResponse.json(
            { error: 'Correlation ID is required' },
            { status: 400 }
          )
        }
        const correlatedEvents = triggerAuditLoggingService.getCorrelatedEvents(body.correlationId)
        result = { events: correlatedEvents }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      ...result
    })
  } catch (error) {
    console.error('Error processing audit action:', error)
    return NextResponse.json(
      { error: 'Failed to process audit action' },
      { status: 500 }
    )
  }
}