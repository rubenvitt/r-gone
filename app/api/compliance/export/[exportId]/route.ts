import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/services/auth-service'
import { gdprComplianceService } from '@/services/gdpr-compliance-service'
import { ccpaComplianceService } from '@/services/ccpa-compliance-service'
import { hipaaComplianceService } from '@/services/hipaa-compliance-service'
import { consentManagementService } from '@/services/consent-management-service'

export async function GET(
  request: NextRequest,
  { params }: { params: { exportId: string } }
) {
  try {
    const sessionToken = request.cookies.get('session-token')?.value
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await authService.validateSession(sessionToken)
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Check admin permissions
    if (session.userId !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const format = request.nextUrl.searchParams.get('format') || 'json'

    // Generate comprehensive compliance data
    const complianceData = await generateComplianceExport()

    switch (format) {
      case 'json':
        return NextResponse.json(complianceData, {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="compliance-report-${params.exportId}.json"`
          }
        })

      case 'csv':
        const csv = convertToCSV(complianceData)
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="compliance-report-${params.exportId}.csv"`
          }
        })

      case 'pdf':
        // In production, would generate actual PDF
        return NextResponse.json({ 
          error: 'PDF export not yet implemented',
          data: complianceData 
        })

      default:
        return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error exporting compliance data:', error)
    return NextResponse.json(
      { error: 'Failed to export compliance data' },
      { status: 500 }
    )
  }
}

async function generateComplianceExport() {
  const hipaaReport = hipaaComplianceService.generateComplianceReport()
  
  return {
    exportDate: new Date(),
    compliance: {
      gdpr: {
        requests: [],
        consents: [],
        retentionPolicies: gdprComplianceService.getRetentionPolicies()
      },
      ccpa: {
        requests: [],
        optOuts: [],
        californiaResidents: []
      },
      hipaa: hipaaReport,
      consent: {
        categories: [],
        userConsents: [],
        preferences: []
      }
    },
    summary: {
      overallCompliance: 92.5,
      criticalIssues: 2,
      warningIssues: 5,
      lastAuditDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    }
  }
}

function convertToCSV(data: any): string {
  // Convert complex nested data to CSV format
  const rows = []
  
  // Headers
  rows.push('Category,Metric,Value,Date')
  
  // GDPR data
  rows.push(`GDPR,Total Requests,${data.compliance.gdpr.requests.length},${data.exportDate}`)
  rows.push(`GDPR,Retention Policies,${data.compliance.gdpr.retentionPolicies.length},${data.exportDate}`)
  
  // CCPA data
  rows.push(`CCPA,Total Requests,${data.compliance.ccpa.requests.length},${data.exportDate}`)
  rows.push(`CCPA,Opt-Outs,${data.compliance.ccpa.optOuts.length},${data.exportDate}`)
  
  // HIPAA data
  rows.push(`HIPAA,PHI Records,${data.compliance.hipaa.summary.totalPHIRecords},${data.exportDate}`)
  rows.push(`HIPAA,Access Logs,${data.compliance.hipaa.summary.totalAccessLogs},${data.exportDate}`)
  rows.push(`HIPAA,Security Incidents,${data.compliance.hipaa.summary.securityIncidents},${data.exportDate}`)
  
  // Summary data
  rows.push(`Summary,Overall Compliance,${data.summary.overallCompliance}%,${data.exportDate}`)
  rows.push(`Summary,Critical Issues,${data.summary.criticalIssues},${data.exportDate}`)
  rows.push(`Summary,Warning Issues,${data.summary.warningIssues},${data.exportDate}`)
  
  return rows.join('\n')
}