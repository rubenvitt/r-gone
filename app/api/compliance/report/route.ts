import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/services/auth-service'
import { gdprComplianceService } from '@/services/gdpr-compliance-service'
import { ccpaComplianceService } from '@/services/ccpa-compliance-service'
import { hipaaComplianceService } from '@/services/hipaa-compliance-service'
import { consentManagementService } from '@/services/consent-management-service'
import { auditLoggingService } from '@/services/audit-logging-service'

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || '30d'
    const reportType = searchParams.get('type') || 'overview'

    // Generate comprehensive compliance report
    const report = await generateComplianceReport(period, reportType)

    // Log report generation
    await auditLoggingService.logEvent({
      eventType: 'system_event',
      action: 'compliance_report_generated',
      resource: 'compliance_report',
      resourceId: `report_${Date.now()}`,
      result: 'success',
      details: { period, reportType },
      riskLevel: 'low',
      userId: session.userId
    })

    return NextResponse.json({ report })
  } catch (error) {
    console.error('Error generating compliance report:', error)
    return NextResponse.json(
      { error: 'Failed to generate compliance report' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    const { action, data } = await request.json()

    switch (action) {
      case 'export':
        const exportResult = await exportComplianceReport(data)
        return NextResponse.json({ success: true, exportId: exportResult.id })

      case 'schedule':
        const scheduleResult = await scheduleComplianceReport(data)
        return NextResponse.json({ success: true, scheduleId: scheduleResult.id })

      case 'alert':
        const alertResult = await handleComplianceAlert(data)
        return NextResponse.json({ success: true, alert: alertResult })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error handling compliance action:', error)
    return NextResponse.json(
      { error: 'Failed to process compliance action' },
      { status: 500 }
    )
  }
}

async function generateComplianceReport(period: string, reportType: string) {
  // Collect metrics from all compliance services
  const hipaaReport = hipaaComplianceService.generateComplianceReport()
  
  // Calculate date range
  const endDate = new Date()
  const startDate = new Date()
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
  startDate.setDate(startDate.getDate() - days)

  // Aggregate metrics
  const metrics = {
    gdpr: await getGDPRMetrics(startDate, endDate),
    ccpa: await getCCPAMetrics(startDate, endDate),
    hipaa: {
      totalPHIRecords: hipaaReport.summary.totalPHIRecords,
      totalAccessLogs: hipaaReport.summary.totalAccessLogs,
      securityIncidents: hipaaReport.summary.securityIncidents,
      accessStatistics: hipaaReport.accessStatistics,
      incidentSummary: hipaaReport.incidentSummary
    },
    consent: await getConsentMetrics(startDate, endDate),
    audit: await getAuditMetrics(startDate, endDate)
  }

  // Generate alerts
  const alerts = await generateComplianceAlerts(metrics)

  // Generate recommendations
  const recommendations = [
    ...hipaaReport.recommendations,
    ...generateGDPRRecommendations(metrics.gdpr),
    ...generateCCPARecommendations(metrics.ccpa),
    ...generateConsentRecommendations(metrics.consent)
  ]

  return {
    generatedAt: new Date(),
    period,
    reportType,
    metrics,
    alerts,
    recommendations,
    summary: generateExecutiveSummary(metrics)
  }
}

async function getGDPRMetrics(startDate: Date, endDate: Date) {
  // Mock implementation - would aggregate real data
  return {
    totalRequests: 145,
    requestsByType: {
      dataAccess: 45,
      dataDeletion: 23,
      dataPortability: 12,
      dataRectification: 8,
      processingRestriction: 15,
      objection: 42
    },
    pendingRequests: 12,
    completedRequests: 133,
    averageCompletionTime: 48, // hours
    complianceRate: 91.7,
    consentRate: 87.5
  }
}

async function getCCPAMetrics(startDate: Date, endDate: Date) {
  // Mock implementation - would aggregate real data
  return {
    totalRequests: 89,
    requestsByType: {
      rightToKnow: 34,
      rightToDelete: 21,
      rightToOptOut: 28,
      nonDiscrimination: 6
    },
    californiaResidents: 1250,
    verifiedRequests: 76,
    optOutRate: 23.4,
    complianceRate: 94.2
  }
}

async function getConsentMetrics(startDate: Date, endDate: Date) {
  // Mock implementation - would aggregate real data
  return {
    totalCategories: 4,
    consentByCategory: {
      necessary: 100,
      functional: 82,
      analytics: 67,
      marketing: 45
    },
    averageConsentRate: 73.5,
    withdrawalRate: 8.5,
    activeConsents: 3421,
    consentChanges: 156
  }
}

async function getAuditMetrics(startDate: Date, endDate: Date) {
  const logs = await auditLoggingService.getLogs({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  })

  return {
    totalLogs: logs.length,
    logsBySeverity: {
      info: logs.filter(l => l.severity === 'info').length,
      warning: logs.filter(l => l.severity === 'warning').length,
      error: logs.filter(l => l.severity === 'error').length,
      critical: logs.filter(l => l.severity === 'critical').length
    },
    complianceActions: logs.filter(l => 
      l.action.includes('gdpr') || 
      l.action.includes('ccpa') || 
      l.action.includes('hipaa')
    ).length
  }
}

async function generateComplianceAlerts(metrics: any) {
  const alerts = []

  // GDPR alerts
  if (metrics.gdpr.pendingRequests > 10) {
    alerts.push({
      id: `gdpr_pending_${Date.now()}`,
      type: 'warning',
      category: 'gdpr',
      message: `${metrics.gdpr.pendingRequests} GDPR requests pending for over 20 days`,
      timestamp: new Date(),
      severity: 'high'
    })
  }

  // HIPAA alerts
  if (metrics.hipaa.incidentSummary.critical > 0) {
    alerts.push({
      id: `hipaa_critical_${Date.now()}`,
      type: 'error',
      category: 'hipaa',
      message: `${metrics.hipaa.incidentSummary.critical} critical HIPAA security incidents detected`,
      timestamp: new Date(),
      severity: 'critical'
    })
  }

  // Consent alerts
  if (metrics.consent.withdrawalRate > 10) {
    alerts.push({
      id: `consent_withdrawal_${Date.now()}`,
      type: 'warning',
      category: 'consent',
      message: `High consent withdrawal rate detected: ${metrics.consent.withdrawalRate}%`,
      timestamp: new Date(),
      severity: 'medium'
    })
  }

  return alerts
}

function generateGDPRRecommendations(metrics: any): string[] {
  const recommendations = []
  
  if (metrics.pendingRequests > 0) {
    recommendations.push(`Process ${metrics.pendingRequests} pending GDPR requests within legal timeframe`)
  }
  
  if (metrics.consentRate < 80) {
    recommendations.push('Improve consent collection rate through better UX design')
  }
  
  return recommendations
}

function generateCCPARecommendations(metrics: any): string[] {
  const recommendations = []
  
  if (metrics.optOutRate > 25) {
    recommendations.push('High opt-out rate detected - review data collection practices')
  }
  
  if (metrics.verifiedRequests < metrics.totalRequests * 0.8) {
    recommendations.push('Improve CCPA request verification process')
  }
  
  return recommendations
}

function generateConsentRecommendations(metrics: any): string[] {
  const recommendations = []
  
  if (metrics.consentByCategory.marketing < 50) {
    recommendations.push('Low marketing consent rate - consider improving value proposition')
  }
  
  if (metrics.withdrawalRate > 10) {
    recommendations.push('Investigate reasons for high consent withdrawal rate')
  }
  
  return recommendations
}

function generateExecutiveSummary(metrics: any): string {
  const overallCompliance = calculateOverallCompliance(metrics)
  
  return `Overall compliance score: ${overallCompliance}%. ` +
    `GDPR: ${metrics.gdpr.complianceRate}% compliant with ${metrics.gdpr.pendingRequests} pending requests. ` +
    `CCPA: ${metrics.ccpa.complianceRate}% compliant with ${metrics.ccpa.optOutRate}% opt-out rate. ` +
    `HIPAA: ${metrics.hipaa.securityIncidents} security incidents requiring attention. ` +
    `Consent: ${metrics.consent.averageConsentRate}% average consent rate across all categories.`
}

function calculateOverallCompliance(metrics: any): number {
  // Weighted average of compliance scores
  const gdprWeight = 0.35
  const ccpaWeight = 0.25
  const hipaaWeight = 0.3
  const consentWeight = 0.1
  
  const gdprScore = metrics.gdpr.complianceRate || 0
  const ccpaScore = metrics.ccpa.complianceRate || 0
  const hipaaScore = metrics.hipaa.securityIncidents === 0 ? 100 : 80 - (metrics.hipaa.securityIncidents * 5)
  const consentScore = metrics.consent.averageConsentRate || 0
  
  return Math.round(
    gdprScore * gdprWeight +
    ccpaScore * ccpaWeight +
    hipaaScore * hipaaWeight +
    consentScore * consentWeight
  )
}

async function exportComplianceReport(data: any) {
  // Generate export based on format
  return {
    id: `export_${Date.now()}`,
    format: data.format,
    url: `/api/compliance/export/${Date.now()}`
  }
}

async function scheduleComplianceReport(data: any) {
  // Schedule recurring report generation
  return {
    id: `schedule_${Date.now()}`,
    frequency: data.frequency,
    recipients: data.recipients
  }
}

async function handleComplianceAlert(data: any) {
  // Process compliance alert actions
  return {
    id: data.alertId,
    action: data.action,
    processedAt: new Date()
  }
}