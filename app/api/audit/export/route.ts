import { NextRequest, NextResponse } from 'next/server'
import { auditLoggingService } from '@/services/audit-logging-service'
import { AuditLogFilter } from '@/types/data'
import { logSystemAccess } from '@/utils/audit-utils'

export async function GET(request: NextRequest) {
  try {
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
    
    const format = searchParams.get('format') as 'json' | 'csv' | 'xml' || 'json'
    
    const exportData = await auditLoggingService.exportLogs(filter, format)
    
    await logSystemAccess('export_audit_logs', 'success', request, {
      format,
      filter
    })
    
    const contentTypes = {
      json: 'application/json',
      csv: 'text/csv',
      xml: 'application/xml'
    }
    
    const fileExtensions = {
      json: 'json',
      csv: 'csv', 
      xml: 'xml'
    }
    
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `audit-logs-${timestamp}.${fileExtensions[format]}`
    
    return new NextResponse(exportData, {
      headers: {
        'Content-Type': contentTypes[format],
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (error) {
    await logSystemAccess('export_audit_logs', 'error', request, {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    console.error('Failed to export audit logs:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to export audit logs' 
      },
      { status: 500 }
    )
  }
}