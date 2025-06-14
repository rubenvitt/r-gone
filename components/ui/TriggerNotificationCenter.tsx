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
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { 
  Bell, BellOff, Mail, MessageSquare, Phone, 
  Webhook, AlertTriangle, CheckCircle, Clock,
  Send, Filter, RefreshCw, Trash2, Eye,
  AlertCircle, User, Users, Settings, TestTube,
  Activity, FileText, Smartphone, Shield, Zap
} from 'lucide-react'
import { format } from 'date-fns'

interface TriggerNotification {
  id: string
  triggerId: string
  triggerType: string
  type: string
  channel: string
  recipient: {
    id: string
    type: string
    name: string
  }
  priority: string
  subject: string
  message: string
  status: string
  sentAt?: string
  deliveredAt?: string
  readAt?: string
  requiresAction: boolean
  actionUrl?: string
  expiresAt?: string
}

interface NotificationStats {
  total: number
  sent: number
  delivered: number
  read: number
  failed: number
  pending: number
}

interface NotificationFilter {
  type?: string
  status?: string
  channel?: string
  unreadOnly?: boolean
}

const notificationTypes = [
  { value: 'trigger_activated', label: 'Trigger Activated' },
  { value: 'trigger_warning', label: 'Trigger Warning' },
  { value: 'trigger_escalation', label: 'Escalation' },
  { value: 'access_granted', label: 'Access Granted' },
  { value: 'verification_required', label: 'Verification Required' },
  { value: 'emergency_alert', label: 'Emergency Alert' },
  { value: 'test_notification', label: 'Test' }
]

const notificationChannels = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'sms', label: 'SMS', icon: MessageSquare },
  { value: 'push', label: 'Push', icon: Bell },
  { value: 'in_app', label: 'In-App', icon: BellOff },
  { value: 'webhook', label: 'Webhook', icon: Webhook },
  { value: 'phone_call', label: 'Phone', icon: Phone }
]

const notificationPriorities = [
  { value: 'critical', label: 'Critical', color: 'destructive' },
  { value: 'urgent', label: 'Urgent', color: 'secondary' },
  { value: 'high', label: 'High', color: 'default' },
  { value: 'medium', label: 'Medium', color: 'outline' },
  { value: 'low', label: 'Low', color: 'outline' }
]

export function TriggerNotificationCenter() {
  const [loading, setLoading] = useState(false)
  const [notifications, setNotifications] = useState<TriggerNotification[]>([])
  const [stats, setStats] = useState<NotificationStats>({
    total: 0, sent: 0, delivered: 0, read: 0, failed: 0, pending: 0
  })
  const [filter, setFilter] = useState<NotificationFilter>({})
  const [selectedTab, setSelectedTab] = useState('inbox')
  const [selectedNotification, setSelectedNotification] = useState<TriggerNotification | null>(null)
  const [showTestDialog, setShowTestDialog] = useState(false)
  const [testForm, setTestForm] = useState({
    type: 'test_notification',
    channel: 'email',
    priority: 'medium',
    recipient: '',
    message: 'This is a test notification'
  })

  useEffect(() => {
    loadNotifications()
  }, [filter])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams()
      if (filter.type) params.append('type', filter.type)
      if (filter.status) params.append('status', filter.status)
      if (filter.channel) params.append('channel', filter.channel)
      if (filter.unreadOnly) params.append('unreadOnly', 'true')
      
      const response = await fetch(`/api/triggers/notifications?${params}`)
      
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
        setStats(data.stats || {})
      }
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/triggers/notifications/${notificationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markAsRead' })
      })

      if (response.ok) {
        loadNotifications()
        if (selectedNotification?.id === notificationId) {
          setSelectedNotification({ ...selectedNotification, status: 'read' })
        }
      }
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const cancelNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/triggers/notifications/${notificationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' })
      })

      if (response.ok) {
        loadNotifications()
      }
    } catch (error) {
      console.error('Failed to cancel notification:', error)
    }
  }

  const sendTestNotification = async () => {
    try {
      const response = await fetch('/api/triggers/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          triggerId: `test-${Date.now()}`,
          triggerType: 'manual_override',
          recipients: [{
            id: 'test-recipient',
            type: 'user',
            name: 'Test User',
            email: testForm.recipient,
            preferences: {
              channels: [testForm.channel],
              language: 'en',
              timezone: 'UTC',
              urgentOnly: false,
              groupNotifications: false
            }
          }],
          type: testForm.type,
          priority: testForm.priority,
          customMessage: testForm.message
        })
      })

      if (response.ok) {
        setShowTestDialog(false)
        loadNotifications()
        alert('Test notification sent successfully')
      }
    } catch (error) {
      console.error('Failed to send test notification:', error)
    }
  }

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'medical_emergency': return <Activity className="h-4 w-4" />
      case 'legal_document_filed': return <FileText className="h-4 w-4" />
      case 'beneficiary_petition': return <Users className="h-4 w-4" />
      case 'third_party_signal': return <Smartphone className="h-4 w-4" />
      case 'manual_override': return <User className="h-4 w-4" />
      case 'inactivity': return <Clock className="h-4 w-4" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  const getChannelIcon = (channel: string) => {
    const ch = notificationChannels.find(c => c.value === channel)
    return ch ? <ch.icon className="h-4 w-4" /> : null
  }

  const getPriorityBadge = (priority: string) => {
    const p = notificationPriorities.find(pr => pr.value === priority)
    return (
      <Badge variant={p?.color as any || 'outline'}>
        {p?.label || priority}
      </Badge>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <Send className="h-4 w-4 text-green-500" />
      case 'read':
        return <CheckCircle className="h-4 w-4 text-blue-500" />
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return null
    }
  }

  const renderNotificationCard = (notification: TriggerNotification) => {
    const isUnread = notification.status !== 'read'
    
    return (
      <Card
        key={notification.id}
        className={`p-4 cursor-pointer transition-colors ${
          isUnread ? 'border-blue-200 bg-blue-50/50' : ''
        } ${selectedNotification?.id === notification.id ? 'ring-2 ring-blue-500' : ''}`}
        onClick={() => {
          setSelectedNotification(notification)
          if (isUnread) {
            markAsRead(notification.id)
          }
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {getTriggerIcon(notification.triggerType)}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-sm">{notification.subject}</h4>
                {isUnread && <Badge variant="default" className="text-xs">New</Badge>}
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">{notification.message}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  {getChannelIcon(notification.channel)}
                  {notification.recipient.name}
                </span>
                {notification.sentAt && (
                  <span>{format(new Date(notification.sentAt), 'MMM d, HH:mm')}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {getPriorityBadge(notification.priority)}
            {getStatusIcon(notification.status)}
          </div>
        </div>
      </Card>
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
          <Bell className="h-6 w-6" />
          Notification Center
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTestDialog(true)}
          >
            <TestTube className="h-4 w-4 mr-2" />
            Test
          </Button>
          <Button variant="outline" size="sm" onClick={loadNotifications}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="p-4 text-center">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-gray-500">Sent</p>
          <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-gray-500">Delivered</p>
          <p className="text-2xl font-bold text-blue-600">{stats.delivered}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-gray-500">Read</p>
          <p className="text-2xl font-bold text-gray-600">{stats.read}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-gray-500">Failed</p>
          <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Notification List */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Notifications</h3>
              <div className="flex items-center gap-2">
                <Select
                  value={filter.type || ''}
                  onValueChange={(value) => setFilter({ ...filter, type: value || undefined })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All types</SelectItem>
                    {notificationTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select
                  value={filter.channel || ''}
                  onValueChange={(value) => setFilter({ ...filter, channel: value || undefined })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="All channels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All channels</SelectItem>
                    {notificationChannels.map(channel => (
                      <SelectItem key={channel.value} value={channel.value}>
                        {channel.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="flex items-center gap-2">
                  <Switch
                    checked={filter.unreadOnly || false}
                    onCheckedChange={(checked) => setFilter({ ...filter, unreadOnly: checked })}
                    id="unread-only"
                  />
                  <Label htmlFor="unread-only" className="text-sm">Unread only</Label>
                </div>
              </div>
            </div>

            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {notifications.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No notifications found</p>
                  </div>
                ) : (
                  notifications.map(notification => renderNotificationCard(notification))
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>

        {/* Notification Details */}
        <div>
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Details</h3>
            
            {selectedNotification ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-gray-500">Subject</Label>
                  <p className="font-medium">{selectedNotification.subject}</p>
                </div>

                <div>
                  <Label className="text-sm text-gray-500">Message</Label>
                  <p className="text-sm whitespace-pre-wrap">{selectedNotification.message}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-500">Type</Label>
                    <p className="text-sm">{selectedNotification.type}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Channel</Label>
                    <p className="text-sm flex items-center gap-1">
                      {getChannelIcon(selectedNotification.channel)}
                      {selectedNotification.channel}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Priority</Label>
                    {getPriorityBadge(selectedNotification.priority)}
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Status</Label>
                    <p className="text-sm flex items-center gap-1">
                      {getStatusIcon(selectedNotification.status)}
                      {selectedNotification.status}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-gray-500">Recipient</Label>
                  <p className="text-sm">
                    {selectedNotification.recipient.name} ({selectedNotification.recipient.type})
                  </p>
                </div>

                {selectedNotification.sentAt && (
                  <div>
                    <Label className="text-sm text-gray-500">Timeline</Label>
                    <div className="text-sm space-y-1">
                      <p>Sent: {format(new Date(selectedNotification.sentAt), 'PPpp')}</p>
                      {selectedNotification.deliveredAt && (
                        <p>Delivered: {format(new Date(selectedNotification.deliveredAt), 'PPpp')}</p>
                      )}
                      {selectedNotification.readAt && (
                        <p>Read: {format(new Date(selectedNotification.readAt), 'PPpp')}</p>
                      )}
                    </div>
                  </div>
                )}

                {selectedNotification.requiresAction && selectedNotification.actionUrl && (
                  <div>
                    <Label className="text-sm text-gray-500">Action Required</Label>
                    <Button
                      variant="default"
                      size="sm"
                      className="mt-2"
                      onClick={() => window.open(selectedNotification.actionUrl, '_blank')}
                    >
                      Take Action
                    </Button>
                  </div>
                )}

                {selectedNotification.status === 'pending' && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => cancelNotification(selectedNotification.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a notification to view details</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Test Notification Dialog */}
      {showTestDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Send Test Notification</h3>
            
            <div className="space-y-4">
              <div>
                <Label>Type</Label>
                <Select
                  value={testForm.type}
                  onValueChange={(value) => setTestForm({ ...testForm, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {notificationTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Channel</Label>
                <Select
                  value={testForm.channel}
                  onValueChange={(value) => setTestForm({ ...testForm, channel: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {notificationChannels.map(channel => (
                      <SelectItem key={channel.value} value={channel.value}>
                        {channel.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Priority</Label>
                <Select
                  value={testForm.priority}
                  onValueChange={(value) => setTestForm({ ...testForm, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {notificationPriorities.map(priority => (
                      <SelectItem key={priority.value} value={priority.value}>
                        {priority.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Recipient ({testForm.channel === 'email' ? 'Email' : 'Phone'})</Label>
                <Input
                  value={testForm.recipient}
                  onChange={(e) => setTestForm({ ...testForm, recipient: e.target.value })}
                  placeholder={testForm.channel === 'email' ? 'test@example.com' : '+1234567890'}
                />
              </div>

              <div>
                <Label>Message</Label>
                <Textarea
                  value={testForm.message}
                  onChange={(e) => setTestForm({ ...testForm, message: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowTestDialog(false)}>
                Cancel
              </Button>
              <Button onClick={sendTestNotification}>
                <Send className="h-4 w-4 mr-2" />
                Send Test
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}