'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { 
  Shield, Search, Download, RefreshCw, AlertTriangle,
  CheckCircle, XCircle, Info, Calendar, Filter,
  FileText, Activity, Users, Clock, TrendingUp,
  AlertCircle, BarChart, PieChart, Hash, Link,
  ShieldCheck, ShieldAlert, FileDown, Eye
} from 'lucide-react'
import { format, subDays } from 'date-fns'

interface TriggerAuditEntry {
  id: string
  timestamp: string
  triggerId: string
  triggerType: string
  userId: string
  event: string
  action: string
  result: 'success' | 'failure' | 'warning'
  details: Record<string, any>
  metadata: {
    triggerName?: string
    confidence?: number
    evaluationDuration?: number
    notificationCount?: number
  }
  correlationId?: string
  ipAddress?: string
  hash: string
}

interface AuditStats {
  total: number
  success: number
  failure: number
  warning: number
  uniqueTriggers: number
  uniqueUsers: number
}

interface AuditReport {
  reportId: string
  generatedAt: string
  period: {
    start: string
    end: string
  }
  summary: {
    totalEvents: number
    totalTriggers: number
    activeTriggersCount: number
    evaluationsCount: number
    triggeredCount: number
    notificationsSent: number
    accessGranted: number
    failureRate: number
  }
  triggerStats: Record<string, any>
  anomalies: Array<{
    id: string
    detectedAt: string
    type: string
    severity: string
    description: string
    recommendedAction: string
  }>
  compliance: {
    dataRetention: boolean
    accessLogging: boolean
    notificationTracking: boolean
    encryptionCompliance: boolean
    regulatoryRequirements: Array<{
      requirement: string
      status: string
      details: string
    }>
  }
}

const eventTypes = [
  { value: 'trigger_created', label: 'Trigger Created' },
  { value: 'trigger_activated', label: 'Trigger Activated' },
  { value: 'evaluation_completed', label: 'Evaluation Completed' },
  { value: 'evaluation_triggered', label: 'Evaluation Triggered' },
  { value: 'access_granted', label: 'Access Granted' },
  { value: 'notification_sent', label: 'Notification Sent' },
  { value: 'verification_requested', label: 'Verification Requested' },
  { value: 'medical_emergency_detected', label: 'Medical Emergency' },
  { value: 'legal_document_verified', label: 'Legal Document' },
  { value: 'beneficiary_petition_submitted', label: 'Beneficiary Petition' },
  { value: 'manual_override_initiated', label: 'Manual Override' }
]

export function TriggerAuditViewer() {
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<TriggerAuditEntry[]>([])
  const [stats, setStats] = useState<AuditStats>({
    total: 0, success: 0, failure: 0, warning: 0, uniqueTriggers: 0, uniqueUsers: 0
  })
  const [selectedTab, setSelectedTab] = useState('logs')
  const [selectedLog, setSelectedLog] = useState<TriggerAuditEntry | null>(null)
  const [report, setReport] = useState<AuditReport | null>(null)
  const [integrityCheck, setIntegrityCheck] = useState<{
    valid: boolean
    errors: string[]
    tamperedEntries: string[]
  } | null>(null)
  
  // Filters
  const [filters, setFilters] = useState({
    triggerId: '',
    userId: '',
    event: '',
    result: '',
    startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  })

  useEffect(() => {
    loadAuditLogs()
  }, [filters])

  const loadAuditLogs = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams()
      if (filters.triggerId) params.append('triggerId', filters.triggerId)
      if (filters.userId) params.append('userId', filters.userId)
      if (filters.event) params.append('event', filters.event)
      if (filters.result) params.append('result', filters.result)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      params.append('limit', '200')
      
      const response = await fetch(`/api/triggers/audit?${params}`)
      
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
        setStats(data.stats || {})
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateReport = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/triggers/audit/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: filters.startDate,
          endDate: filters.endDate,
          userId: filters.userId || undefined,
          triggerType: filters.event ? filters.event.split('_')[0] : undefined
        })
      })

      if (response.ok) {
        const data = await response.json()
        setReport(data.report)
        setSelectedTab('report')
      }
    } catch (error) {
      console.error('Failed to generate report:', error)
    } finally {
      setLoading(false)
    }
  }

  const verifyIntegrity = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/triggers/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_integrity' })
      })

      if (response.ok) {
        const data = await response.json()
        setIntegrityCheck(data)
      }
    } catch (error) {
      console.error('Failed to verify integrity:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportAudit = async (format: 'json' | 'csv' | 'pdf') => {
    try {
      const response = await fetch('/api/triggers/audit/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          ...filters
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || `audit-export.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Failed to export audit:', error)
    }
  }

  const getEventIcon = (event: string) => {
    if (event.includes('medical')) return <Activity className="h-4 w-4" />
    if (event.includes('legal')) return <FileText className="h-4 w-4" />
    if (event.includes('beneficiary')) return <Users className="h-4 w-4" />
    if (event.includes('notification')) return <AlertCircle className="h-4 w-4" />
    if (event.includes('access')) return <Shield className="h-4 w-4" />
    if (event.includes('evaluation')) return <TrendingUp className="h-4 w-4" />
    return <Info className="h-4 w-4" />
  }

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failure':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return null
    }
  }

  const renderLogEntry = (log: TriggerAuditEntry) => {
    return (
      <Card
        key={log.id}
        className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
          selectedLog?.id === log.id ? 'ring-2 ring-blue-500' : ''
        }`}
        onClick={() => setSelectedLog(log)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {getEventIcon(log.event)}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-sm">{log.event.replace(/_/g, ' ')}</h4>
                <Badge variant="outline" className="text-xs">{log.triggerType}</Badge>
              </div>
              <p className="text-sm text-gray-600">{log.action}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span>{format(new Date(log.timestamp), 'MMM d, HH:mm:ss')}</span>
                {log.metadata.confidence && (
                  <span>Confidence: {(log.metadata.confidence * 100).toFixed(0)}%</span>
                )}
                {log.metadata.evaluationDuration && (
                  <span>{log.metadata.evaluationDuration}ms</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getResultIcon(log.result)}
            {log.correlationId && (
              <Link className="h-4 w-4 text-gray-400" title="Has correlated events" />
            )}
          </div>
        </div>
      </Card>
    )
  }

  const renderIntegrityCheck = () => {
    if (!integrityCheck) return null

    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Integrity Verification
          </h3>
          <Badge variant={integrityCheck.valid ? 'default' : 'destructive'}>
            {integrityCheck.valid ? 'Valid' : 'Invalid'}
          </Badge>
        </div>

        {integrityCheck.valid ? (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              All audit log entries have been verified and are intact. No tampering detected.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>
                Integrity check failed. Potential tampering detected in {integrityCheck.tamperedEntries.length} entries.
              </AlertDescription>
            </Alert>

            <div>
              <h4 className="font-medium mb-2">Errors Detected:</h4>
              <ul className="space-y-1">
                {integrityCheck.errors.map((error, index) => (
                  <li key={index} className="text-sm text-red-600 flex items-start gap-2">
                    <span className="text-red-400">•</span>
                    {error}
                  </li>
                ))}
              </ul>
            </div>

            {integrityCheck.tamperedEntries.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Tampered Entries:</h4>
                <div className="flex flex-wrap gap-2">
                  {integrityCheck.tamperedEntries.map(id => (
                    <Badge key={id} variant="destructive" className="font-mono text-xs">
                      {id.slice(0, 8)}...
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    )
  }

  const renderReport = () => {
    if (!report) return null

    return (
      <div className="space-y-6">
        {/* Report Header */}
        <Card className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold">Audit Report</h3>
              <p className="text-sm text-gray-600">
                Generated: {format(new Date(report.generatedAt), 'PPpp')}
              </p>
              <p className="text-sm text-gray-600">
                Period: {format(new Date(report.period.start), 'PP')} - {format(new Date(report.period.end), 'PP')}
              </p>
            </div>
            <Badge>Report ID: {report.reportId.slice(0, 8)}</Badge>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{report.summary.totalEvents}</p>
              <p className="text-sm text-gray-500">Total Events</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{report.summary.evaluationsCount}</p>
              <p className="text-sm text-gray-500">Evaluations</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{report.summary.triggeredCount}</p>
              <p className="text-sm text-gray-500">Triggered</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {report.summary.failureRate.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-500">Failure Rate</p>
            </div>
          </div>
        </Card>

        {/* Anomalies */}
        {report.anomalies.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Anomalies Detected
            </h3>
            <div className="space-y-3">
              {report.anomalies.map(anomaly => (
                <Alert key={anomaly.id} className={`
                  ${anomaly.severity === 'critical' ? 'border-red-500' : ''}
                  ${anomaly.severity === 'high' ? 'border-orange-500' : ''}
                  ${anomaly.severity === 'medium' ? 'border-yellow-500' : ''}
                `}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{anomaly.type.replace(/_/g, ' ')}</p>
                        <p className="text-sm mt-1">{anomaly.description}</p>
                        <p className="text-sm mt-2 text-blue-600">
                          Recommended: {anomaly.recommendedAction}
                        </p>
                      </div>
                      <Badge variant={
                        anomaly.severity === 'critical' ? 'destructive' : 
                        anomaly.severity === 'high' ? 'secondary' : 
                        'outline'
                      }>
                        {anomaly.severity}
                      </Badge>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </Card>
        )}

        {/* Compliance Report */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Compliance Status
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="flex items-center gap-2">
              {report.compliance.dataRetention ? 
                <CheckCircle className="h-5 w-5 text-green-500" /> :
                <XCircle className="h-5 w-5 text-red-500" />
              }
              <span className="text-sm">Data Retention</span>
            </div>
            <div className="flex items-center gap-2">
              {report.compliance.accessLogging ? 
                <CheckCircle className="h-5 w-5 text-green-500" /> :
                <XCircle className="h-5 w-5 text-red-500" />
              }
              <span className="text-sm">Access Logging</span>
            </div>
            <div className="flex items-center gap-2">
              {report.compliance.notificationTracking ? 
                <CheckCircle className="h-5 w-5 text-green-500" /> :
                <XCircle className="h-5 w-5 text-red-500" />
              }
              <span className="text-sm">Notification Tracking</span>
            </div>
            <div className="flex items-center gap-2">
              {report.compliance.encryptionCompliance ? 
                <CheckCircle className="h-5 w-5 text-green-500" /> :
                <XCircle className="h-5 w-5 text-red-500" />
              }
              <span className="text-sm">Encryption</span>
            </div>
          </div>

          <div className="space-y-3">
            {report.compliance.regulatoryRequirements.map((req, index) => (
              <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-sm">{req.requirement}</p>
                  <p className="text-sm text-gray-600 mt-1">{req.details}</p>
                </div>
                <Badge variant={
                  req.status === 'compliant' ? 'default' :
                  req.status === 'partial' ? 'secondary' :
                  'destructive'
                }>
                  {req.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Trigger Audit System
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={verifyIntegrity}>
            <ShieldCheck className="h-4 w-4 mr-2" />
            Verify Integrity
          </Button>
          <Button variant="outline" size="sm" onClick={generateReport}>
            <BarChart className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
          <Button variant="outline" size="sm" onClick={loadAuditLogs}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="p-4 text-center">
          <p className="text-sm text-gray-500">Total Events</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-gray-500">Success</p>
          <p className="text-2xl font-bold text-green-600">{stats.success}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-gray-500">Failures</p>
          <p className="text-2xl font-bold text-red-600">{stats.failure}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-gray-500">Warnings</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.warning}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-gray-500">Triggers</p>
          <p className="text-2xl font-bold">{stats.uniqueTriggers}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-gray-500">Users</p>
          <p className="text-2xl font-bold">{stats.uniqueUsers}</p>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs">Audit Logs</TabsTrigger>
          <TabsTrigger value="report">Report</TabsTrigger>
          <TabsTrigger value="integrity">Integrity</TabsTrigger>
          <TabsTrigger value="search">Advanced Search</TabsTrigger>
        </TabsList>

        <TabsContent value="logs">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Logs List */}
            <div className="lg:col-span-2">
              <Card className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Audit Logs</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportAudit('json')}
                    >
                      <FileDown className="h-4 w-4 mr-1" />
                      JSON
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportAudit('csv')}
                    >
                      <FileDown className="h-4 w-4 mr-1" />
                      CSV
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-[600px]">
                  <div className="space-y-3">
                    {logs.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No audit logs found</p>
                      </div>
                    ) : (
                      logs.map(log => renderLogEntry(log))
                    )}
                  </div>
                </ScrollArea>
              </Card>
            </div>

            {/* Log Details */}
            <div>
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Details</h3>
                
                {selectedLog ? (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm text-gray-500">Event ID</Label>
                      <p className="font-mono text-sm">{selectedLog.id}</p>
                    </div>

                    <div>
                      <Label className="text-sm text-gray-500">Timestamp</Label>
                      <p className="text-sm">{format(new Date(selectedLog.timestamp), 'PPpp')}</p>
                    </div>

                    <div>
                      <Label className="text-sm text-gray-500">Trigger</Label>
                      <p className="text-sm">{selectedLog.metadata.triggerName || selectedLog.triggerId}</p>
                    </div>

                    <div>
                      <Label className="text-sm text-gray-500">User</Label>
                      <p className="text-sm font-mono">{selectedLog.userId}</p>
                    </div>

                    {selectedLog.ipAddress && (
                      <div>
                        <Label className="text-sm text-gray-500">IP Address</Label>
                        <p className="text-sm">{selectedLog.ipAddress}</p>
                      </div>
                    )}

                    <div>
                      <Label className="text-sm text-gray-500">Details</Label>
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-48">
                        {JSON.stringify(selectedLog.details, null, 2)}
                      </pre>
                    </div>

                    <div>
                      <Label className="text-sm text-gray-500">Hash</Label>
                      <p className="font-mono text-xs break-all">{selectedLog.hash}</p>
                    </div>

                    {selectedLog.correlationId && (
                      <Alert>
                        <Link className="h-4 w-4" />
                        <AlertDescription>
                          This event is correlated with other events.
                          <Button
                            variant="link"
                            size="sm"
                            className="ml-2"
                            onClick={() => {
                              setFilters({ ...filters, triggerId: '', userId: '', event: '' })
                              // Would implement correlation viewing
                            }}
                          >
                            View Related
                          </Button>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a log entry to view details</p>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="report">
          {report ? renderReport() : (
            <Card className="p-12 text-center">
              <BarChart className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 mb-4">No report generated yet</p>
              <Button onClick={generateReport}>
                Generate Report
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="integrity">
          {integrityCheck ? renderIntegrityCheck() : (
            <Card className="p-12 text-center">
              <ShieldCheck className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 mb-4">Integrity not verified yet</p>
              <Button onClick={verifyIntegrity}>
                Verify Integrity
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="search">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Advanced Search</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Trigger ID</Label>
                <Input
                  value={filters.triggerId}
                  onChange={(e) => setFilters({ ...filters, triggerId: e.target.value })}
                  placeholder="Enter trigger ID"
                />
              </div>

              <div>
                <Label>User ID</Label>
                <Input
                  value={filters.userId}
                  onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                  placeholder="Enter user ID"
                />
              </div>

              <div>
                <Label>Event Type</Label>
                <Select
                  value={filters.event}
                  onValueChange={(value) => setFilters({ ...filters, event: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All events" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All events</SelectItem>
                    {eventTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Result</Label>
                <Select
                  value={filters.result}
                  onValueChange={(value) => setFilters({ ...filters, result: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All results" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All results</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failure">Failure</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>

              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setFilters({
                  triggerId: '',
                  userId: '',
                  event: '',
                  result: '',
                  startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
                  endDate: format(new Date(), 'yyyy-MM-dd')
                })}
              >
                Clear Filters
              </Button>
              <Button onClick={loadAuditLogs}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}