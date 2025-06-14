'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Clock,
  Send,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Calendar,
  Play,
  Pause,
  BarChart3,
  Mail,
  MessageSquare,
  Smartphone,
  Bell,
  Filter,
  Search
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { 
  scheduledDeliveryService,
  DeliveryTask,
  DeliveryQueueStats
} from '@/services/scheduled-delivery-service'
import { MessagesLibrary, DeliveryMethod } from '@/types/data'
import { cn } from '@/lib/utils'

interface DeliveryDashboardProps {
  library: MessagesLibrary
  onLibraryChange: (library: MessagesLibrary) => void
  className?: string
}

type FilterStatus = 'all' | 'pending' | 'processing' | 'completed' | 'failed'

export default function DeliveryDashboard({
  library,
  onLibraryChange,
  className = ''
}: DeliveryDashboardProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [queueStats, setQueueStats] = useState<DeliveryQueueStats>({
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0
  })
  const [tasks, setTasks] = useState<DeliveryTask[]>([])
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)

  // Load initial data
  useEffect(() => {
    refreshData()
  }, [])

  // Set up auto-refresh when service is running
  useEffect(() => {
    if (isRunning && !refreshInterval) {
      const interval = setInterval(refreshData, 5000) // Refresh every 5 seconds
      setRefreshInterval(interval)
    } else if (!isRunning && refreshInterval) {
      clearInterval(refreshInterval)
      setRefreshInterval(null)
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
    }
  }, [isRunning])

  // Refresh data
  const refreshData = useCallback(async () => {
    const stats = scheduledDeliveryService.getQueueStats()
    setQueueStats(stats)
    
    // Check for scheduled messages
    await scheduledDeliveryService.checkScheduledMessages(library)
    
    // Check conditional rules
    await scheduledDeliveryService.checkConditionalRules(library)
  }, [library])

  // Start/stop service
  const toggleService = useCallback(() => {
    if (isRunning) {
      scheduledDeliveryService.stop()
      setIsRunning(false)
    } else {
      scheduledDeliveryService.start()
      setIsRunning(true)
    }
  }, [isRunning])

  // Get delivery method icon
  const getDeliveryMethodIcon = (method: DeliveryMethod) => {
    switch (method) {
      case 'email': return Mail
      case 'sms': return MessageSquare
      case 'push': return Bell
      case 'inApp': return Smartphone
      default: return Send
    }
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50'
      case 'processing': return 'text-blue-600 bg-blue-50'
      case 'completed': return 'text-green-600 bg-green-50'
      case 'failed': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  // Filter delivery logs
  const filteredLogs = library.deliveryLogs.filter(log => {
    if (filterStatus !== 'all' && log.status !== filterStatus) return false
    
    if (searchTerm) {
      const message = library.messages.find(m => m.id === log.messageId)
      const searchLower = searchTerm.toLowerCase()
      
      return (
        message?.title.toLowerCase().includes(searchLower) ||
        log.recipientId.toLowerCase().includes(searchLower) ||
        log.metadata?.recipientName?.toLowerCase().includes(searchLower)
      )
    }
    
    return true
  })

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Send className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Delivery Dashboard</h2>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant={isRunning ? 'destructive' : 'default'}
              size="sm"
              onClick={toggleService}
            >
              {isRunning ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Stop Service
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Service
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Service Status */}
        <div className={cn(
          "p-4 rounded-lg flex items-center justify-between",
          isRunning ? "bg-green-50" : "bg-gray-50"
        )}>
          <div className="flex items-center space-x-3">
            {isRunning ? (
              <div className="relative">
                <div className="h-3 w-3 bg-green-600 rounded-full animate-pulse" />
                <div className="absolute inset-0 h-3 w-3 bg-green-600 rounded-full animate-ping" />
              </div>
            ) : (
              <div className="h-3 w-3 bg-gray-400 rounded-full" />
            )}
            <span className={cn(
              "font-medium",
              isRunning ? "text-green-800" : "text-gray-600"
            )}>
              Service {isRunning ? 'Running' : 'Stopped'}
            </span>
          </div>
          {queueStats.nextDelivery && isRunning && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Next delivery: {new Date(queueStats.nextDelivery).toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Queue Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{queueStats.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600 opacity-20" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Processing</p>
              <p className="text-2xl font-bold text-blue-600">{queueStats.processing}</p>
            </div>
            <RefreshCw className="h-8 w-8 text-blue-600 opacity-20 animate-spin" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Delivered</p>
              <p className="text-2xl font-bold text-green-600">{queueStats.completed}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600 opacity-20" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-red-600">{queueStats.failed}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-600 opacity-20" />
          </div>
        </Card>
      </div>

      {/* Delivery Statistics Chart */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <BarChart3 className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold">Delivery Statistics</h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {library.statistics.totalMessages}
            </div>
            <div className="text-sm text-gray-600">Total Messages</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {library.statistics.deliveredMessages}
            </div>
            <div className="text-sm text-gray-600">Delivered</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">
              {library.statistics.messagesByStatus.scheduled || 0}
            </div>
            <div className="text-sm text-gray-600">Scheduled</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {library.statistics.viewedMessages}
            </div>
            <div className="text-sm text-gray-600">Viewed</div>
          </div>
        </div>
      </Card>

      {/* Delivery Logs */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Delivery Logs</h3>
          <div className="flex items-center space-x-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search messages or recipients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="delivered">Delivered</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">Message</th>
                <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">Recipient</th>
                <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">Method</th>
                <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">Status</th>
                <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">Time</th>
                <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    No delivery logs found
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const message = library.messages.find(m => m.id === log.messageId)
                  const MethodIcon = getDeliveryMethodIcon(log.deliveryMethod)
                  
                  return (
                    <tr key={log.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-sm">{message?.title || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">ID: {log.messageId.slice(0, 8)}...</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">{log.metadata?.recipientName || log.recipientId}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <MethodIcon className="h-4 w-4 text-gray-500" />
                          <span className="text-sm capitalize">{log.deliveryMethod}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn(
                          "inline-flex items-center px-2 py-1 rounded-full text-xs",
                          getStatusColor(log.status)
                        )}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(log.attemptedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        {log.status === 'failed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // Find associated task and retry
                              const taskId = log.metadata?.taskId
                              if (taskId) {
                                scheduledDeliveryService.retryFailedDelivery(taskId as string)
                                refreshData()
                              }
                            }}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}