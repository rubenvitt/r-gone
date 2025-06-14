import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { activationAuditService, ActivationAuditAction } from '@/services/activation-audit-service'

export async function GET(request: NextRequest) {
  try {
    // Check for session cookie
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const requestId = searchParams.get('requestId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const action = searchParams.get('action') as ActivationAuditAction | null
    const generateReport = searchParams.get('generateReport') === 'true'

    // Get audit trail for specific request
    if (requestId && generateReport) {
      const report = activationAuditService.generateAuditReport(requestId)
      return NextResponse.json(report)
    }

    if (requestId) {
      const auditTrail = activationAuditService.getAuditTrail(requestId)
      return NextResponse.json({
        auditTrail,
        count: auditTrail.length
      })
    }

    // Get audit entries by time range
    if (startDate && endDate) {
      const entries = activationAuditService.getAuditEntriesByTimeRange(
        new Date(startDate),
        new Date(endDate),
        { action: action || undefined }
      )
      
      return NextResponse.json({
        entries,
        count: entries.length
      })
    }

    return NextResponse.json(
      { error: 'Either requestId or date range required' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}