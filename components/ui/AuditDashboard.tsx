'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  Download, 
  RefreshCw,
  Search,
  Filter,
  Calendar,
  BarChart3,
  Activity,
  Users,
  Globe,
  Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  AuditLogEntry, 
  AuditLogFilter, 
  AuditLogAnalytics,
  AuditEventType,
  AuditResult,
  RiskLevel 
} from '@/types/data'

interface AuditDashboardProps {
  className?: string
}

export default function AuditDashboard({ className = '' }: AuditDashboardProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [analytics, setAnalytics] = useState<AuditLogAnalytics | null>(null)
  const [filter, setFilter] = useState<AuditLogFilter>({
    limit: 50,
    offset: 0
  })
  const [isLoading, setIsLoading] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const loadAuditLogs = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString())
        }
      })

      const response = await fetch(`/api/audit/logs?${params}`)
      const data = await response.json()

      if (data.success) {
        setLogs(data.logs)
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error)
    } finally {
      setIsLoading(false)
    }
  }, [filter])

  const loadAnalytics = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filter.startDate) params.append('startDate', filter.startDate)
      if (filter.endDate) params.append('endDate', filter.endDate)

      const response = await fetch(`/api/audit/analytics?${params}`)
      const data = await response.json()

      if (data.success) {
        setAnalytics(data.analytics)
      }
    } catch (error) {
      console.error('Failed to load analytics:', error)
    }
  }, [filter.startDate, filter.endDate])

  useEffect(() => {
    loadAuditLogs()
    loadAnalytics()
  }, [loadAuditLogs, loadAnalytics])

  const handleExport = async (format: 'json' | 'csv' | 'xml') => {
    try {
      const params = new URLSearchParams()
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key !== 'limit' && key !== 'offset') {
          params.append(key, value.toString())
        }
      })
      params.append('format', format)

      const response = await fetch(`/api/audit/export?${params}`)
      const blob = await response.blob()
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-logs.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to export logs:', error)
    }
  }

  const getRiskLevelColor = (riskLevel: RiskLevel) => {
    switch (riskLevel) {
      case 'low': return 'text-green-600 bg-green-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'high': return 'text-orange-600 bg-orange-50'
      case 'critical': return 'text-red-600 bg-red-50'
    }
  }

  const getResultColor = (result: AuditResult) => {
    switch (result) {
      case 'success': return 'text-green-600'
      case 'failure': return 'text-red-600'
      case 'blocked': return 'text-orange-600'
      case 'suspicious': return 'text-purple-600'
      case 'error': return 'text-red-600'
    }
  }

  const getEventTypeIcon = (eventType: AuditEventType) => {
    switch (eventType) {
      case 'authentication': return <Users className="h-4 w-4" />
      case 'emergency_access': return <AlertTriangle className="h-4 w-4" />
      case 'file_operation': return <Eye className="h-4 w-4" />
      case 'system_access': return <Activity className="h-4 w-4" />
      case 'security_event': return <Shield className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Shield className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold">Audit Dashboard</h2>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadAuditLogs}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('csv')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Events</p>
                <p className="text-2xl font-bold">{analytics.totalEvents}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unique Users</p>
                <p className="text-2xl font-bold">{analytics.uniqueUsers}</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unique IPs</p>
                <p className="text-2xl font-bold">{analytics.uniqueIPs}</p>
              </div>
              <Globe className="h-8 w-8 text-purple-600" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Suspicious Events</p>
                <p className="text-2xl font-bold text-red-600">{analytics.suspiciousActivities}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white p-4 rounded-lg border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="datetime-local"
                value={filter.startDate || ''}
                onChange={(e) => setFilter(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="datetime-local"
                value={filter.endDate || ''}
                onChange={(e) => setFilter(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
              <select
                value={filter.eventType || 'all'}
                onChange={(e) => setFilter(prev => ({ 
                  ...prev, 
                  eventType: e.target.value === 'all' ? undefined : e.target.value as AuditEventType 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="authentication">Authentication</option>
                <option value="emergency_access">Emergency Access</option>
                <option value="file_operation">File Operation</option>
                <option value="system_access">System Access</option>
                <option value="security_event">Security Event</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Risk Level</label>
              <select
                value={filter.riskLevel || 'all'}
                onChange={(e) => setFilter(prev => ({ 
                  ...prev, 
                  riskLevel: e.target.value === 'all' ? undefined : e.target.value as RiskLevel 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Levels</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Audit Logs Table */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h3 className="text-lg font-medium">Recent Audit Events</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-gray-400" />
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center">
                      {getEventTypeIcon(log.eventType)}
                      <span className="ml-2 capitalize">{log.eventType.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{log.action}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`capitalize ${getResultColor(log.result)}`}>
                      {log.result}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${getRiskLevelColor(log.riskLevel)}`}>
                      {log.riskLevel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{log.ipAddress || 'Unknown'}</td>
                  <td className="px-4 py-3 text-sm">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedLog(log)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {logs.length === 0 && !isLoading && (
          <div className="p-8 text-center text-gray-500">
            <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No audit events found</p>
            <p>No events match your current filters.</p>
          </div>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Audit Event Details</h3>
              <Button variant="ghost" onClick={() => setSelectedLog(null)}>
                ×
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Event ID</label>
                  <p className="text-sm text-gray-900 font-mono">{selectedLog.id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                  <p className="text-sm text-gray-900">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Event Type</label>
                  <p className="text-sm text-gray-900 capitalize">{selectedLog.eventType.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Action</label>
                  <p className="text-sm text-gray-900">{selectedLog.action}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Result</label>
                  <p className={`text-sm capitalize ${getResultColor(selectedLog.result)}`}>{selectedLog.result}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Risk Level</label>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${getRiskLevelColor(selectedLog.riskLevel)}`}>
                    {selectedLog.riskLevel}
                  </span>
                </div>
              </div>
              
              {selectedLog.details && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Details</label>
                  <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}