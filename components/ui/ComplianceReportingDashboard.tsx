'use client'

import React, { useState, useEffect } from 'react'
import { gdprComplianceService } from '@/services/gdpr-compliance-service'
import { ccpaComplianceService } from '@/services/ccpa-compliance-service'
import { hipaaComplianceService } from '@/services/hipaa-compliance-service'
import { consentManagementService } from '@/services/consent-management-service'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  FileText, Shield, Users, AlertTriangle, CheckCircle, 
  Clock, Download, TrendingUp, Activity, Database,
  Lock, Eye, UserCheck, FileSearch
} from 'lucide-react'

interface ComplianceMetrics {
  gdpr: {
    totalRequests: number
    pendingRequests: number
    completedRequests: number
    avgCompletionTime: number
    consentRate: number
  }
  ccpa: {
    totalRequests: number
    optOutRate: number
    californiaResidents: number
    verifiedRequests: number
  }
  hipaa: {
    totalPHIRecords: number
    accessLogs: number
    securityIncidents: number
    integrityChecks: {
      passed: number
      failed: number
    }
  }
  consent: {
    totalCategories: number
    avgConsentRate: number
    withdrawalRate: number
    activeConsents: number
  }
}

interface ComplianceReport {
  period: string
  metrics: ComplianceMetrics
  trends: any[]
  recommendations: string[]
  alerts: ComplianceAlert[]
}

interface ComplianceAlert {
  id: string
  type: 'warning' | 'error' | 'info'
  category: 'gdpr' | 'ccpa' | 'hipaa' | 'consent'
  message: string
  timestamp: Date
  resolved: boolean
}

export function ComplianceReportingDashboard() {
  const [report, setReport] = useState<ComplianceReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('30d')
  const [activeTab, setActiveTab] = useState('overview')
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([])

  useEffect(() => {
    loadComplianceData()
  }, [selectedPeriod])

  const loadComplianceData = async () => {
    setLoading(true)
    try {
      // Generate comprehensive compliance report
      const report = await generateComplianceReport()
      setReport(report)
      setAlerts(report.alerts)
    } catch (error) {
      console.error('Failed to load compliance data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateComplianceReport = async (): Promise<ComplianceReport> => {
    // Collect data from all compliance services
    const hipaaReport = hipaaComplianceService.generateComplianceReport()
    
    // Mock data for demonstration - in production, would aggregate real data
    const metrics: ComplianceMetrics = {
      gdpr: {
        totalRequests: 145,
        pendingRequests: 12,
        completedRequests: 133,
        avgCompletionTime: 48, // hours
        consentRate: 87.5
      },
      ccpa: {
        totalRequests: 89,
        optOutRate: 23.4,
        californiaResidents: 1250,
        verifiedRequests: 76
      },
      hipaa: {
        totalPHIRecords: hipaaReport.summary.totalPHIRecords,
        accessLogs: hipaaReport.summary.totalAccessLogs,
        securityIncidents: hipaaReport.summary.securityIncidents,
        integrityChecks: {
          passed: 2450,
          failed: 3
        }
      },
      consent: {
        totalCategories: 4,
        avgConsentRate: 73.2,
        withdrawalRate: 8.5,
        activeConsents: 3421
      }
    }

    const alerts: ComplianceAlert[] = [
      {
        id: '1',
        type: 'warning',
        category: 'gdpr',
        message: '12 GDPR requests pending for over 20 days',
        timestamp: new Date(),
        resolved: false
      },
      {
        id: '2',
        type: 'error',
        category: 'hipaa',
        message: '3 PHI integrity check failures detected',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        resolved: false
      },
      {
        id: '3',
        type: 'info',
        category: 'ccpa',
        message: 'Quarterly CCPA compliance report due in 5 days',
        timestamp: new Date(),
        resolved: false
      }
    ]

    return {
      period: selectedPeriod,
      metrics,
      trends: generateTrends(),
      recommendations: [
        'Review and process pending GDPR requests within 30-day deadline',
        'Investigate PHI integrity check failures immediately',
        'Update consent banner for new cookie categories',
        'Schedule HIPAA security assessment for next quarter',
        'Review CCPA opt-out mechanism effectiveness'
      ],
      alerts
    }
  }

  const generateTrends = () => {
    // Generate mock trend data
    const days = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90
    return Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000),
      gdprRequests: Math.floor(Math.random() * 10) + 1,
      ccpaOptOuts: Math.floor(Math.random() * 5),
      hipaaAccess: Math.floor(Math.random() * 50) + 20,
      consentChanges: Math.floor(Math.random() * 20) + 5
    }))
  }

  const exportReport = async (format: 'pdf' | 'csv' | 'json') => {
    if (!report) return

    const exportData = {
      generatedAt: new Date(),
      period: report.period,
      metrics: report.metrics,
      alerts: report.alerts,
      recommendations: report.recommendations
    }

    // In production, would generate actual file
    console.log(`Exporting compliance report as ${format}:`, exportData)
  }

  const resolveAlert = (alertId: string) => {
    setAlerts(alerts.map(alert => 
      alert.id === alertId ? { ...alert, resolved: true } : alert
    ))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  if (!report) {
    return <div>No compliance data available</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Compliance Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Monitor GDPR, CCPA, HIPAA compliance and consent management
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <Button onClick={() => exportReport('pdf')}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.filter(a => !a.resolved).length > 0 && (
        <Card className="p-4 border-orange-200 bg-orange-50">
          <h3 className="font-semibold mb-3 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
            Active Compliance Alerts
          </h3>
          <div className="space-y-2">
            {alerts.filter(a => !a.resolved).map(alert => (
              <div key={alert.id} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Badge variant={alert.type === 'error' ? 'destructive' : 'secondary'}>
                    {alert.category.toUpperCase()}
                  </Badge>
                  <span className="text-sm">{alert.message}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => resolveAlert(alert.id)}
                >
                  Resolve
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">GDPR Requests</p>
              <p className="text-2xl font-bold">{report.metrics.gdpr.totalRequests}</p>
              <p className="text-xs text-gray-500 mt-1">
                {report.metrics.gdpr.pendingRequests} pending
              </p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
          <Progress 
            value={(report.metrics.gdpr.completedRequests / report.metrics.gdpr.totalRequests) * 100} 
            className="mt-3"
          />
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">CCPA Opt-Out Rate</p>
              <p className="text-2xl font-bold">{report.metrics.ccpa.optOutRate}%</p>
              <p className="text-xs text-gray-500 mt-1">
                {report.metrics.ccpa.californiaResidents} CA residents
              </p>
            </div>
            <Shield className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">PHI Records</p>
              <p className="text-2xl font-bold">{report.metrics.hipaa.totalPHIRecords}</p>
              <p className="text-xs text-gray-500 mt-1">
                {report.metrics.hipaa.accessLogs} access logs
              </p>
            </div>
            <Lock className="h-8 w-8 text-purple-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Consent Rate</p>
              <p className="text-2xl font-bold">{report.metrics.consent.avgConsentRate}%</p>
              <p className="text-xs text-gray-500 mt-1">
                {report.metrics.consent.activeConsents} active
              </p>
            </div>
            <UserCheck className="h-8 w-8 text-indigo-500" />
          </div>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="gdpr">GDPR</TabsTrigger>
          <TabsTrigger value="ccpa">CCPA</TabsTrigger>
          <TabsTrigger value="hipaa">HIPAA</TabsTrigger>
          <TabsTrigger value="consent">Consent</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Trends Chart */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Compliance Trends</h3>
            <div className="h-64 flex items-center justify-center text-gray-500">
              {/* In production, would render actual chart */}
              <Activity className="h-8 w-8 mr-2" />
              Trend visualization would go here
            </div>
          </Card>

          {/* Recommendations */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Recommendations</h3>
            <ul className="space-y-2">
              {report.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{rec}</span>
                </li>
              ))}
            </ul>
          </Card>
        </TabsContent>

        <TabsContent value="gdpr" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Request Status</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Completed</span>
                  <span className="font-medium">{report.metrics.gdpr.completedRequests}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pending</span>
                  <span className="font-medium text-orange-600">
                    {report.metrics.gdpr.pendingRequests}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Avg. Completion Time</span>
                  <span className="font-medium">{report.metrics.gdpr.avgCompletionTime}h</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-4">Data Subject Rights</h3>
              <div className="space-y-2">
                <Badge>Access Requests: 45</Badge>
                <Badge>Deletion Requests: 23</Badge>
                <Badge>Portability Requests: 12</Badge>
                <Badge>Rectification Requests: 8</Badge>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ccpa" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">California Residents</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Total Residents</span>
                  <span className="font-medium">{report.metrics.ccpa.californiaResidents}</span>
                </div>
                <div className="flex justify-between">
                  <span>Verified Requests</span>
                  <span className="font-medium">{report.metrics.ccpa.verifiedRequests}</span>
                </div>
                <div className="flex justify-between">
                  <span>Opt-Out Rate</span>
                  <span className="font-medium">{report.metrics.ccpa.optOutRate}%</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-4">Request Types</h3>
              <div className="space-y-2">
                <Badge>Right to Know: 34</Badge>
                <Badge>Right to Delete: 21</Badge>
                <Badge>Right to Opt-Out: 28</Badge>
                <Badge>Non-Discrimination: 6</Badge>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="hipaa" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">PHI Security</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Total Records</span>
                  <span className="font-medium">{report.metrics.hipaa.totalPHIRecords}</span>
                </div>
                <div className="flex justify-between">
                  <span>Encrypted</span>
                  <span className="font-medium text-green-600">100%</span>
                </div>
                <div className="flex justify-between">
                  <span>Access Logs</span>
                  <span className="font-medium">{report.metrics.hipaa.accessLogs}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-4">Integrity Checks</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Passed</span>
                  <span className="font-medium text-green-600">
                    {report.metrics.hipaa.integrityChecks.passed}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Failed</span>
                  <span className="font-medium text-red-600">
                    {report.metrics.hipaa.integrityChecks.failed}
                  </span>
                </div>
                <Progress 
                  value={(report.metrics.hipaa.integrityChecks.passed / 
                    (report.metrics.hipaa.integrityChecks.passed + 
                     report.metrics.hipaa.integrityChecks.failed)) * 100}
                  className="mt-3"
                />
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-4">Security Incidents</h3>
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">
                  {report.metrics.hipaa.securityIncidents}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Requires immediate attention
                </p>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="consent" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Consent Overview</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Active Consents</span>
                  <span className="font-medium">{report.metrics.consent.activeConsents}</span>
                </div>
                <div className="flex justify-between">
                  <span>Average Consent Rate</span>
                  <span className="font-medium">{report.metrics.consent.avgConsentRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Withdrawal Rate</span>
                  <span className="font-medium">{report.metrics.consent.withdrawalRate}%</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-4">Consent Categories</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>Necessary</span>
                  <Badge variant="outline">100%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Functional</span>
                  <Badge variant="outline">82%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Analytics</span>
                  <Badge variant="outline">67%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Marketing</span>
                  <Badge variant="outline">45%</Badge>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}