'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { 
  Bell, Mail, Phone, MessageSquare, 
  CheckCircle, XCircle, Clock, AlertTriangle,
  ChevronRight, RefreshCw, Filter
} from 'lucide-react'
import { manualActivationService, ActivationRequest } from '@/services/manual-activation-service'
import { ActivationVerification } from './ActivationVerification'

interface ActivationNotification {
  id: string
  activationRequestId: string
  type: 'request' | 'approval' | 'rejection' | 'expiry' | 'cancellation'
  sentAt: Date
  recipients: Array<{
    id: string
    name: string
    email?: string
    phone?: string
    type: 'user' | 'emergency_contact' | 'professional' | 'admin'
  }>
  deliveryStatus: Record<string, 'sent' | 'failed' | 'pending'>
}

export function ActivationNotifications() {
  const [pendingRequests, setPendingRequests] = useState<ActivationRequest[]>([])
  const [notifications, setNotifications] = useState<ActivationNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<ActivationRequest | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'sent' | 'failed'>('all')

  useEffect(() => {
    loadNotifications()
    const interval = setInterval(loadNotifications, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const loadNotifications = async () => {
    try {
      // Get active requests that need verification
      const activeRequests = manualActivationService.getActiveActivations('current-user')
      const pendingVerification = activeRequests.filter(
        req => req.status === 'pending_verification'
      )
      setPendingRequests(pendingVerification)

      // Load notification history
      const response = await fetch('/api/activation/notifications?requestId=all')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
      }
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVerified = async (requestId: string) => {
    setSelectedRequest(null)
    await loadNotifications()
  }

  const handleCancelled = async (requestId: string) => {
    setSelectedRequest(null)
    await loadNotifications()
  }

  const getNotificationIcon = (type: ActivationNotification['type']) => {
    switch (type) {
      case 'request':
        return <Bell className="h-4 w-4 text-blue-600" />
      case 'approval':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'rejection':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'expiry':
        return <Clock className="h-4 w-4 text-orange-600" />
      case 'cancellation':
        return <AlertTriangle className="h-4 w-4 text-gray-600" />
    }
  }

  const getDeliveryIcon = (method: string) => {
    if (method.includes('@')) return <Mail className="h-3 w-3" />
    if (method.match(/^\+?\d+$/)) return <Phone className="h-3 w-3" />
    return <MessageSquare className="h-3 w-3" />
  }

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'all') return true
    if (filter === 'pending') {
      return Object.values(notif.deliveryStatus).includes('pending')
    }
    if (filter === 'sent') {
      return Object.values(notif.deliveryStatus).every(s => s === 'sent')
    }
    if (filter === 'failed') {
      return Object.values(notif.deliveryStatus).includes('failed')
    }
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Pending Verification Requests */}
      {pendingRequests.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
            Pending Verification Requests
          </h3>
          
          {pendingRequests.map(request => (
            <Alert key={request.id} className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <div>
                    <strong>{request.initiatorName}</strong> is requesting emergency access
                    <p className="text-sm text-gray-600 mt-1">{request.reason}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setSelectedRequest(request)}
                  >
                    Review
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Notification History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Notification History</h3>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {filteredNotifications.length === 0 ? (
          <Card className="p-6 text-center text-gray-500">
            No notifications found
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map(notification => (
              <Card key={notification.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getNotificationIcon(notification.type)}
                    <div className="space-y-1">
                      <p className="font-medium capitalize">
                        {notification.type.replace('_', ' ')} Notification
                      </p>
                      <p className="text-sm text-gray-600">
                        Sent to {notification.recipients.length} recipient(s)
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(notification.sentAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(notification.deliveryStatus).map(([recipient, status]) => (
                      <Badge
                        key={recipient}
                        variant={
                          status === 'sent' ? 'default' :
                          status === 'pending' ? 'secondary' : 'destructive'
                        }
                        className="text-xs"
                      >
                        {status}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Recipient Details */}
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-gray-600 mb-2">Recipients:</p>
                  <div className="flex flex-wrap gap-2">
                    {notification.recipients.map(recipient => (
                      <div
                        key={recipient.id}
                        className="flex items-center space-x-1 text-xs bg-gray-50 rounded px-2 py-1"
                      >
                        <span>{recipient.name}</span>
                        {recipient.email && getDeliveryIcon(recipient.email)}
                        {recipient.phone && getDeliveryIcon(recipient.phone)}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Verification Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-lg w-full mx-4">
            <ActivationVerification
              request={selectedRequest}
              onVerified={handleVerified}
              onCancelled={handleCancelled}
            />
          </div>
        </div>
      )}
    </div>
  )
}