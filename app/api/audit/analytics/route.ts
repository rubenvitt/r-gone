import { NextRequest, NextResponse } from 'next/server'
import { auditLoggingService } from '@/services/audit-logging-service'
import { AuditLogFilter } from '@/types/data'
import { logSystemAccess } from '@/utils/audit-utils'

export async function GET(request: NextRequest) {
  try {
    await logSystemAccess('view_audit_analytics', 'success', request)
    
    const { searchParams } = new URL(request.url)
    
    const filter: AuditLogFilter = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      eventType: searchParams.get('eventType') as any || undefined,
      result: searchParams.get('result') as any || undefined,
      riskLevel: searchParams.get('riskLevel') as any || undefined,
      userId: searchParams.get('userId') || undefined,
      ipAddress: searchParams.get('ipAddress') || undefined,
      resource: searchParams.get('resource') || undefined
    }
    
    const analytics = await auditLoggingService.getAnalytics(filter)
    
    return NextResponse.json({
      success: true,
      analytics,
      filter
    })
  } catch (error) {
    await logSystemAccess('view_audit_analytics', 'error', request, {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    console.error('Failed to retrieve audit analytics:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve audit analytics' 
      },
      { status: 500 }
    )
  }
}