'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  Shield, Clock, Users, AlertTriangle, 
  CheckCircle, XCircle, Activity, Hash,
  Calendar, User, FileText, TrendingUp,
  Phone, Mail, Building, Filter,
  Download, RefreshCw, Search, ChevronRight, X
} from 'lucide-react'
import { 
  manualActivationService, 
  ActivationRequest, 
  ActivationStatus,
  ActivationType,
  ActivationLevel,
  UrgencyLevel
} from '@/services/manual-activation-service'
import { PanicButton } from './PanicButton'
import { SMSActivation } from './SMSActivation'
import { ActivationNotifications } from './ActivationNotifications'
import { ActivationAuditLog } from './ActivationAuditLog'
import { useAuth } from '@/hooks/useAuth'

interface ActivationStats {
  total: number
  active: number
  pending: number
  expired: number
  cancelled: number
  byType: Record<ActivationType, number>
  byLevel: Record<ActivationLevel, number>
  avgResponseTime: number
}

export function ActivationStatusDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [activations, setActivations] = useState<ActivationRequest[]>([])
  const [stats, setStats] = useState<ActivationStats>({
    total: 0,
    active: 0,
    pending: 0,
    expired: 0,
    cancelled: 0,
    byType: {} as Record<ActivationType, number>,
    byLevel: {} as Record<ActivationLevel, number>,
    avgResponseTime: 0
  })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'completed'>('all')
  const [selectedActivation, setSelectedActivation] = useState<ActivationRequest | null>(null)

  useEffect(() => {
    loadActivations()
    const interval = setInterval(loadActivations, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const loadActivations = async () => {
    try {
      // Mock data - in production would fetch from service
      const mockActivations: ActivationRequest[] = [
        {
          id: '1',
          type: ActivationType.PANIC_BUTTON,
          initiatorType: 'user' as any,
          initiatorId: user?.id || 'user1',
          initiatorName: 'User',
          userId: user?.id || 'user1',
          reason: 'Medical emergency',
          urgencyLevel: UrgencyLevel.CRITICAL,
          activationLevel: ActivationLevel.FULL,
          status: ActivationStatus.ACTIVE,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          activatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() + 22 * 60 * 60 * 1000)
        },
        {
          id: '2',
          type: ActivationType.TRUSTED_CONTACT,
          initiatorType: 'trusted_contact' as any,
          initiatorId: 'contact1',
          initiatorName: 'Sarah Johnson',
          userId: user?.id || 'user1',
          reason: 'Unable to reach, concerned for safety',
          urgencyLevel: UrgencyLevel.HIGH,
          activationLevel: ActivationLevel.PARTIAL,
          status: ActivationStatus.PENDING_VERIFICATION,
          createdAt: new Date(Date.now() - 15 * 60 * 1000)
        }
      ]

      // Get active activations from service
      const activeActivations = manualActivationService.getActiveActivations(user?.id || 'default-user')
      const allActivations = [...mockActivations, ...activeActivations]

      setActivations(allActivations)
      calculateStats(allActivations)
    } catch (error) {
      console.error('Failed to load activations:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (activations: ActivationRequest[]) => {
    const stats: ActivationStats = {
      total: activations.length,
      active: 0,
      pending: 0,
      expired: 0,
      cancelled: 0,
      byType: {} as Record<ActivationType, number>,
      byLevel: {} as Record<ActivationLevel, number>,
      avgResponseTime: 0
    }

    let totalResponseTime = 0
    let responseCount = 0

    activations.forEach(activation => {
      // Status counts
      switch (activation.status) {
        case ActivationStatus.ACTIVE:
          stats.active++
          break
        case ActivationStatus.PENDING_VERIFICATION:
        case ActivationStatus.VERIFIED:
          stats.pending++
          break
        case ActivationStatus.EXPIRED:
          stats.expired++
          break
        case ActivationStatus.CANCELLED:
        case ActivationStatus.REJECTED:
          stats.cancelled++
          break
      }

      // Type counts
      stats.byType[activation.type] = (stats.byType[activation.type] || 0) + 1

      // Level counts
      stats.byLevel[activation.activationLevel] = (stats.byLevel[activation.activationLevel] || 0) + 1

      // Response time
      if (activation.activatedAt) {
        const responseTime = activation.activatedAt.getTime() - activation.createdAt.getTime()
        totalResponseTime += responseTime
        responseCount++
      }
    })

    if (responseCount > 0) {
      stats.avgResponseTime = totalResponseTime / responseCount / 1000 / 60 // Convert to minutes
    }

    setStats(stats)
  }

  const getStatusColor = (status: ActivationStatus) => {
    switch (status) {
      case ActivationStatus.ACTIVE:
        return 'bg-green-100 text-green-800'
      case ActivationStatus.PENDING_VERIFICATION:
      case ActivationStatus.VERIFIED:
        return 'bg-yellow-100 text-yellow-800'
      case ActivationStatus.EXPIRED:
        return 'bg-gray-100 text-gray-800'
      case ActivationStatus.CANCELLED:
      case ActivationStatus.REJECTED:
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: ActivationType) => {
    switch (type) {
      case ActivationType.PANIC_BUTTON:
        return <AlertTriangle className="h-4 w-4" />
      case ActivationType.SMS_CODE:
        return <Phone className="h-4 w-4" />
      case ActivationType.TRUSTED_CONTACT:
        return <Users className="h-4 w-4" />
      case ActivationType.MEDICAL_PROFESSIONAL:
      case ActivationType.LEGAL_REPRESENTATIVE:
        return <Building className="h-4 w-4" />
      default:
        return <Shield className="h-4 w-4" />
    }
  }

  const filteredActivations = activations.filter(activation => {
    switch (filter) {
      case 'active':
        return activation.status === ActivationStatus.ACTIVE
      case 'pending':
        return activation.status === ActivationStatus.PENDING_VERIFICATION || 
               activation.status === ActivationStatus.VERIFIED
      case 'completed':
        return activation.status === ActivationStatus.EXPIRED || 
               activation.status === ActivationStatus.CANCELLED ||
               activation.status === ActivationStatus.REJECTED
      default:
        return true
    }
  })

  const formatDuration = (start: Date, end?: Date) => {
    const endTime = end || new Date()
    const duration = endTime.getTime() - start.getTime()
    const hours = Math.floor(duration / (1000 * 60 * 60))
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Emergency Activation Status</h2>
          <p className="text-gray-600">Monitor and manage emergency access activations</p>
        </div>
        <div className="flex items-center space-x-2">
          <PanicButton variant="minimal" />
          <Button
            variant="outline"
            size="sm"
            onClick={loadActivations}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Activations</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <Activity className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Now</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Response</p>
              <p className="text-2xl font-bold">{stats.avgResponseTime.toFixed(1)}m</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="active">Active Requests</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="methods">Activation Methods</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Current Active Activations */}
          {stats.active > 0 && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <strong>{stats.active} active emergency activation(s)</strong> currently in effect.
                Emergency contacts have been notified and have access to your information.
              </AlertDescription>
            </Alert>
          )}

          {/* Pending Verifications */}
          {stats.pending > 0 && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <Clock className="h-4 w-4 text-yellow-600" />
              <AlertDescription>
                <strong>{stats.pending} pending verification(s)</strong> require your attention.
                Please review and approve or deny access requests.
              </AlertDescription>
            </Alert>
          )}

          {/* Activation Type Distribution */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Activation Methods Used</h3>
            <div className="space-y-3">
              {Object.entries(stats.byType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center">
                    {getTypeIcon(type as ActivationType)}
                    <span className="ml-2 text-sm">{type.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm font-medium mr-2">{count}</span>
                    <Progress 
                      value={(count / stats.total) * 100} 
                      className="w-24 h-2"
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Access Level Distribution */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Access Levels Granted</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats.byLevel).map(([level, count]) => (
                <div key={level} className="text-center">
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm text-gray-600">
                    {level.replace(/_/g, ' ')}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {/* Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <div className="flex space-x-1">
              {(['all', 'active', 'pending', 'completed'] as const).map(f => (
                <Button
                  key={f}
                  variant={filter === f ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* Activation List */}
          <div className="space-y-3">
            {filteredActivations.map(activation => (
              <Card 
                key={activation.id} 
                className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedActivation(activation)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getTypeIcon(activation.type)}
                    <div>
                      <p className="font-medium">{activation.initiatorName}</p>
                      <p className="text-sm text-gray-600">{activation.reason}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(activation.status)}>
                      {activation.status.replace(/_/g, ' ')}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    <Calendar className="h-3 w-3 inline mr-1" />
                    {new Date(activation.createdAt).toLocaleString()}
                  </span>
                  <span>
                    Duration: {formatDuration(activation.createdAt, activation.activatedAt)}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Activation History</h3>
            <div className="space-y-3">
              {activations
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                .map(activation => (
                  <div key={activation.id} className="border-l-2 pl-4 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{activation.type.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-gray-600">
                          by {activation.initiatorName} • {activation.reason}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {activation.activationLevel.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(activation.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="methods" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Panic Button */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
                Panic Button
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Instant emergency activation for critical situations
              </p>
              <PanicButton variant="default" />
            </Card>

            {/* SMS Activation */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Phone className="h-5 w-5 mr-2 text-blue-600" />
                SMS Activation
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Activate emergency access via SMS code
              </p>
              <Button variant="outline" onClick={() => setActiveTab('sms')}>
                Setup SMS Activation
              </Button>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <ActivationNotifications />
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <ActivationAuditLog activationRequestId={selectedActivation?.id} />
        </TabsContent>
      </Tabs>

      {/* Selected Activation Details Modal */}
      {selectedActivation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-lg w-full mx-4">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">Activation Details</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedActivation(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Request ID</p>
                <p className="font-mono text-sm">{selectedActivation.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Type</p>
                <p className="font-medium">{selectedActivation.type.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Initiator</p>
                <p className="font-medium">{selectedActivation.initiatorName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Reason</p>
                <p className="font-medium">{selectedActivation.reason}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <Badge className={getStatusColor(selectedActivation.status)}>
                  {selectedActivation.status.replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => setSelectedActivation(null)}
            >
              Close
            </Button>
          </Card>
        </div>
      )}
    </div>
  )
}