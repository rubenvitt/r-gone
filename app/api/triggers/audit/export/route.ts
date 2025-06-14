import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { triggerAuditLoggingService } from '@/services/trigger-audit-logging-service'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      format = 'json',
      triggerId,
      userId,
      event,
      startDate,
      endDate,
      correlationId,
      result
    } = body

    // Validate format
    if (!['json', 'csv', 'pdf'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Must be json, csv, or pdf' },
        { status: 400 }
      )
    }

    // Export audit trail
    const { data, filename } = await triggerAuditLoggingService.exportAuditTrail(
      format as 'json' | 'csv' | 'pdf',
      {
        triggerId,
        userId,
        event,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        correlationId,
        result
      }
    )

    // Set appropriate headers based on format
    const headers: Record<string, string> = {
      'Content-Disposition': `attachment; filename="${filename}"`
    }

    switch (format) {
      case 'json':
        headers['Content-Type'] = 'application/json'
        break
      case 'csv':
        headers['Content-Type'] = 'text/csv'
        break
      case 'pdf':
        headers['Content-Type'] = 'application/pdf'
        break
    }

    return new Response(data, { headers })
  } catch (error) {
    console.error('Error exporting audit trail:', error)
    return NextResponse.json(
      { error: 'Failed to export audit trail' },
      { status: 500 }
    )
  }
}