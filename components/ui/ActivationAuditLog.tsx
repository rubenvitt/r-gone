'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  FileText, Clock, User, Shield, 
  AlertTriangle, CheckCircle, XCircle,
  Download, Filter, TrendingUp,
  Activity, Eye, Fingerprint
} from 'lucide-react'
import { ActivationAuditEntry, ActivationAuditAction } from '@/services/activation-audit-service'

interface ActivationAuditLogProps {
  activationRequestId?: string
}

interface AuditReport {
  summary: {
    totalActions: number
    verificationAttempts: number
    notificationsSent: number
    highRiskActions: number
    uniquePerformers: number
  }
  timeline: ActivationAuditEntry[]
  riskAnalysis: {
    averageRiskScore: number
    maxRiskScore: number
    riskEvents: ActivationAuditEntry[]
  }
}

export function ActivationAuditLog({ activationRequestId }: ActivationAuditLogProps) {
  const [auditEntries, setAuditEntries] = useState<ActivationAuditEntry[]>([])
  const [report, setReport] = useState<AuditReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'timeline' | 'report'>('timeline')
  const [filter, setFilter] = useState<'all' | 'high-risk' | 'verifications' | 'notifications'>('all')

  useEffect(() => {
    if (activationRequestId) {
      loadAuditData()
    }
  }, [activationRequestId])

  const loadAuditData = async () => {
    try {
      // Load audit trail
      const trailResponse = await fetch(`/api/activation/audit?requestId=${activationRequestId}`)
      if (trailResponse.ok) {
        const data = await trailResponse.json()
        setAuditEntries(data.auditTrail || [])
      }

      // Load report
      const reportResponse = await fetch(`/api/activation/audit?requestId=${activationRequestId}&generateReport=true`)
      if (reportResponse.ok) {
        const reportData = await reportResponse.json()
        setReport(reportData)
      }
    } catch (error) {
      console.error('Failed to load audit data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (action: ActivationAuditAction) => {
    switch (action) {
      case ActivationAuditAction.REQUEST_CREATED:
        return <Activity className="h-4 w-4 text-blue-600" />
      case ActivationAuditAction.REQUEST_VERIFIED:
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case ActivationAuditAction.REQUEST_REJECTED:
        return <XCircle className="h-4 w-4 text-red-600" />
      case ActivationAuditAction.REQUEST_ACTIVATED:
        return <Shield className="h-4 w-4 text-purple-600" />
      case ActivationAuditAction.VERIFICATION_ATTEMPTED:
        return <Fingerprint className="h-4 w-4 text-orange-600" />
      case ActivationAuditAction.NOTIFICATION_SENT:
        return <FileText className="h-4 w-4 text-blue-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const getRiskBadge = (score: number) => {
    if (score >= 8) {
      return <Badge variant="destructive">Critical Risk</Badge>
    } else if (score >= 6) {
      return <Badge variant="default">High Risk</Badge>
    } else if (score >= 4) {
      return <Badge>Medium Risk</Badge>
    } else {
      return <Badge variant="secondary">Low Risk</Badge>
    }
  }

  const filteredEntries = auditEntries.filter(entry => {
    switch (filter) {
      case 'high-risk':
        return entry.riskScore >= 7
      case 'verifications':
        return entry.action.includes('verification') || entry.action.includes('verified')
      case 'notifications':
        return entry.action.includes('notification')
      default:
        return true
    }
  })

  const exportAuditLog = () => {
    const data = {
      requestId: activationRequestId,
      exportedAt: new Date().toISOString(),
      entries: auditEntries,
      report
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `activation-audit-${activationRequestId}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-6 w-6 border-b-2 border-gray-900" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Activation Audit Log</h3>
        <div className="flex items-center space-x-2">
          <Button
            variant={view === 'timeline' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('timeline')}
          >
            <Clock className="h-4 w-4 mr-2" />
            Timeline
          </Button>
          <Button
            variant={view === 'report' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('report')}
          >
            <FileText className="h-4 w-4 mr-2" />
            Report
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportAuditLog}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {view === 'timeline' && (
        <>
          {/* Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <div className="flex space-x-1">
              {(['all', 'high-risk', 'verifications', 'notifications'] as const).map(f => (
                <Button
                  key={f}
                  variant={filter === f ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1).replace('-', ' ')}
                </Button>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-3">
            {filteredEntries.map((entry, index) => (
              <Card key={entry.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getActionIcon(entry.action)}
                    <div className="space-y-1">
                      <p className="font-medium">
                        {entry.action.replace(/_/g, ' ').toLowerCase()}
                        <span className="capitalize"> {entry.action.replace(/_/g, ' ')}</span>
                      </p>
                      <p className="text-sm text-gray-600">
                        By {entry.performedBy.name} ({entry.performedBy.type})
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(entry.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {getRiskBadge(entry.riskScore)}
                </div>

                {/* Details */}
                {Object.keys(entry.details).length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-gray-600 mb-2">Details:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(entry.details).map(([key, value]) => (
                        <div key={key}>
                          <span className="text-gray-500">{key}: </span>
                          <span className="font-medium">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Context */}
                {(entry.ipAddress || entry.userAgent) && (
                  <div className="mt-2 text-xs text-gray-500">
                    {entry.ipAddress && <span>IP: {entry.ipAddress} </span>}
                    {entry.userAgent && <span>• Browser: {entry.userAgent.split(' ')[0]}</span>}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      {view === 'report' && report && (
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold">{report.summary.totalActions}</p>
              <p className="text-sm text-gray-600">Total Actions</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold">{report.summary.verificationAttempts}</p>
              <p className="text-sm text-gray-600">Verifications</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold">{report.summary.notificationsSent}</p>
              <p className="text-sm text-gray-600">Notifications</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{report.summary.highRiskActions}</p>
              <p className="text-sm text-gray-600">High Risk</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold">{report.summary.uniquePerformers}</p>
              <p className="text-sm text-gray-600">Performers</p>
            </Card>
          </div>

          {/* Risk Analysis */}
          <Card className="p-6">
            <h4 className="font-semibold mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Risk Analysis
            </h4>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Average Risk Score</span>
                  <span className="font-medium">{report.riskAnalysis.averageRiskScore.toFixed(1)}/10</span>
                </div>
                <Progress value={report.riskAnalysis.averageRiskScore * 10} />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Maximum Risk Score</span>
                  <span className="font-medium">{report.riskAnalysis.maxRiskScore}/10</span>
                </div>
                <Progress 
                  value={report.riskAnalysis.maxRiskScore * 10} 
                  className={report.riskAnalysis.maxRiskScore >= 8 ? 'bg-red-100' : ''}
                />
              </div>

              {report.riskAnalysis.riskEvents.length > 0 && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription>
                    <strong>{report.riskAnalysis.riskEvents.length} high-risk events</strong> detected
                    during this activation request.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </Card>

          {/* High Risk Events */}
          {report.riskAnalysis.riskEvents.length > 0 && (
            <Card className="p-6">
              <h4 className="font-semibold mb-4 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
                High Risk Events
              </h4>
              <div className="space-y-3">
                {report.riskAnalysis.riskEvents.map(event => (
                  <div key={event.id} className="border-l-4 border-red-500 pl-4">
                    <p className="font-medium">{event.action.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(event.timestamp).toLocaleString()} • Risk Score: {event.riskScore}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}