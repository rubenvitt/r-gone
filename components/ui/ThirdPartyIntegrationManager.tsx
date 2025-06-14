'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Link, Zap, AlertTriangle, Clock,
  Plus, Settings, CheckCircle, XCircle,
  PlayCircle, Eye, Shield, Globe,
  Facebook, Twitter, Linkedin, Instagram,
  Building, Heart, Scale, Smartphone
} from 'lucide-react'
import { 
  ThirdPartySignal, 
  UserServiceConnection, 
  ThirdPartySignalType,
  ServiceType 
} from '@/services/third-party-integration-service'

export function ThirdPartyIntegrationManager() {
  const [connections, setConnections] = useState<UserServiceConnection[]>([])
  const [signals, setSignals] = useState<ThirdPartySignal[]>([])
  const [pendingSignals, setPendingSignals] = useState<ThirdPartySignal[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('connections')
  const [showAddConnection, setShowAddConnection] = useState(false)
  const [showSimulateModal, setShowSimulateModal] = useState(false)

  // New connection form
  const [newConnection, setNewConnection] = useState({
    providerId: 'facebook_meta',
    accountIdentifier: '',
    connectionType: 'primary',
    permissions: []
  })

  // Simulation form
  const [simulation, setSimulation] = useState({
    providerId: 'facebook_meta',
    signalType: ThirdPartySignalType.MEMORIAL_ACCOUNT_CREATION,
    customData: {}
  })

  // Available providers (in real app, this would come from API)
  const availableProviders = [
    { id: 'facebook_meta', name: 'Facebook/Meta', type: ServiceType.SOCIAL_MEDIA, icon: Facebook },
    { id: 'legacy_com', name: 'Legacy.com', type: ServiceType.LEGAL_SERVICE, icon: Scale },
    { id: 'bank_of_america', name: 'Bank of America', type: ServiceType.FINANCIAL_INSTITUTION, icon: Building },
    { id: 'kaiser_permanente', name: 'Kaiser Permanente', type: ServiceType.HEALTHCARE_PROVIDER, icon: Heart },
    { id: 'ssa_gov', name: 'Social Security Administration', type: ServiceType.GOVERNMENT_AGENCY, icon: Shield }
  ]

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      // Load user connections
      const connectionsResponse = await fetch('/api/third-party/connections')
      if (connectionsResponse.ok) {
        const connectionsData = await connectionsResponse.json()
        setConnections(connectionsData.connections || [])
      }

      // Load user signals
      const signalsResponse = await fetch('/api/third-party/signals?limit=20')
      if (signalsResponse.ok) {
        const signalsData = await signalsResponse.json()
        setSignals(signalsData.signals || [])
      }

      // Load pending signals
      const pendingResponse = await fetch('/api/third-party/signals?pending=true')
      if (pendingResponse.ok) {
        const pendingData = await pendingResponse.json()
        setPendingSignals(pendingData.signals || [])
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddConnection = async () => {
    try {
      const response = await fetch('/api/third-party/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConnection)
      })

      if (response.ok) {
        setShowAddConnection(false)
        setNewConnection({
          providerId: 'facebook_meta',
          accountIdentifier: '',
          connectionType: 'primary',
          permissions: []
        })
        await loadData()
      }
    } catch (error) {
      console.error('Failed to add connection:', error)
    }
  }

  const handleSimulateSignal = async () => {
    try {
      const response = await fetch('/api/third-party/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simulation)
      })

      if (response.ok) {
        setShowSimulateModal(false)
        await loadData()
      }
    } catch (error) {
      console.error('Failed to simulate signal:', error)
    }
  }

  const handleVerifySignal = async (signalId: string, isValid: boolean) => {
    try {
      const response = await fetch('/api/third-party/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signalId,
          verificationMethod: 'manual_review',
          isValid
        })
      })

      if (response.ok) {
        await loadData()
      }
    } catch (error) {
      console.error('Failed to verify signal:', error)
    }
  }

  const getProviderIcon = (providerId: string) => {
    const provider = availableProviders.find(p => p.id === providerId)
    if (provider) {
      const IconComponent = provider.icon
      return <IconComponent className="h-5 w-5" />
    }
    return <Globe className="h-5 w-5" />
  }

  const getProviderName = (providerId: string) => {
    const provider = availableProviders.find(p => p.id === providerId)
    return provider?.name || providerId
  }

  const getConnectionStatusBadge = (connection: UserServiceConnection) => {
    if (!connection.isActive) {
      return <Badge variant="outline">Inactive</Badge>
    }
    
    const hoursAgo = (Date.now() - new Date(connection.lastVerified).getTime()) / (1000 * 60 * 60)
    if (hoursAgo < 24) {
      return <Badge variant="default">Active</Badge>
    } else if (hoursAgo < 168) { // 1 week
      return <Badge variant="secondary">Needs Verification</Badge>
    } else {
      return <Badge variant="destructive">Stale</Badge>
    }
  }

  const getSignalPriorityBadge = (priority: string) => {
    const colors = {
      critical: 'destructive',
      high: 'destructive',
      medium: 'default',
      low: 'secondary'
    }
    
    return (
      <Badge variant={colors[priority as keyof typeof colors] as any}>
        {priority.toUpperCase()}
      </Badge>
    )
  }

  const getVerificationStatusBadge = (status: string) => {
    const configs = {
      pending: { variant: 'secondary', icon: Clock, text: 'Pending' },
      verified: { variant: 'default', icon: CheckCircle, text: 'Verified' },
      rejected: { variant: 'destructive', icon: XCircle, text: 'Rejected' },
      expired: { variant: 'outline', icon: AlertTriangle, text: 'Expired' }
    }
    
    const config = configs[status as keyof typeof configs]
    if (!config) return <Badge variant="outline">{status}</Badge>
    
    const IconComponent = config.icon
    return (
      <Badge variant={config.variant as any} className="flex items-center">
        <IconComponent className="h-3 w-3 mr-1" />
        {config.text}
      </Badge>
    )
  }

  const formatSignalType = (type: ThirdPartySignalType) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const formatServiceType = (type: ServiceType) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
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
        <div>
          <h2 className="text-2xl font-bold">Third-Party Integrations</h2>
          <p className="text-gray-600">Monitor external services for trigger signals</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowSimulateModal(true)}
            disabled={connections.length === 0}
          >
            <PlayCircle className="h-4 w-4 mr-2" />
            Simulate Signal
          </Button>
          <Button onClick={() => setShowAddConnection(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Connection
          </Button>
        </div>
      </div>

      {/* Pending Signals Alert */}
      {pendingSignals.length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription>
            <strong>{pendingSignals.length} signals</strong> pending verification
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="connections">Service Connections</TabsTrigger>
          <TabsTrigger value="signals">Signal History</TabsTrigger>
          <TabsTrigger value="pending">Pending Verification</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="space-y-4">
          {connections.length === 0 ? (
            <Card className="p-8 text-center">
              <Link className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Service Connections</h3>
              <p className="text-gray-600 mb-4">
                Connect external services to monitor for relevant signals
              </p>
              <Button onClick={() => setShowAddConnection(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Service Connection
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {connections.map(connection => (
                <Card key={connection.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {getProviderIcon(connection.providerId)}
                      <div>
                        <h3 className="font-semibold">{getProviderName(connection.providerId)}</h3>
                        <p className="text-sm text-gray-600">{connection.accountIdentifier}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getConnectionStatusBadge(connection)}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Connection Type:</span>
                      <span className="font-medium capitalize">{connection.connectionType}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Connected:</span>
                      <span>{new Date(connection.connectedAt).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Last Verified:</span>
                      <span>{new Date(connection.lastVerified).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Monitoring:</span>
                      <span className={connection.monitoringEnabled ? 'text-green-600' : 'text-red-600'}>
                        {connection.monitoringEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>

                  {connection.permissions.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs text-gray-600 mb-2">Permissions:</p>
                      <div className="flex flex-wrap gap-1">
                        {connection.permissions.map((permission, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex space-x-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Settings className="h-3 w-3 mr-1" />
                      Configure
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        setSimulation({ ...simulation, providerId: connection.providerId })
                        setShowSimulateModal(true)
                      }}
                    >
                      <PlayCircle className="h-3 w-3 mr-1" />
                      Test
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="signals" className="space-y-4">
          {signals.length === 0 ? (
            <Card className="p-8 text-center">
              <Zap className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Signals Received</h3>
              <p className="text-gray-600">
                Signals from connected services will appear here when received
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {signals.map(signal => (
                <Card key={signal.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getProviderIcon(signal.providerId)}
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium">{formatSignalType(signal.signalType)}</h3>
                          {getSignalPriorityBadge(signal.processedData.priority)}
                          {getVerificationStatusBadge(signal.verificationStatus)}
                        </div>
                        <p className="text-sm text-gray-600">
                          {getProviderName(signal.providerId)} • Confidence: {signal.confidence}%
                        </p>
                        <p className="text-xs text-gray-500 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(signal.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 p-3 bg-gray-50 rounded">
                    <p className="text-sm text-gray-800">{signal.processedData.summary}</p>
                    {signal.processedData.recommendedActions && signal.processedData.recommendedActions.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-600 mb-1">Recommended Actions:</p>
                        <div className="flex flex-wrap gap-1">
                          {signal.processedData.recommendedActions.map((action, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {action}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {signal.verificationStatus === 'pending' && (
                    <div className="mt-4 flex space-x-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleVerifySignal(signal.id, true)}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verify
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleVerifySignal(signal.id, false)}
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                      <Button variant="outline" size="sm">
                        <Eye className="h-3 w-3 mr-1" />
                        Details
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {pendingSignals.length === 0 ? (
            <Card className="p-8 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Pending Verifications</h3>
              <p className="text-gray-600">All signals have been verified</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingSignals.map(signal => (
                <Card key={signal.id} className="p-4 border-orange-200">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getProviderIcon(signal.providerId)}
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium">{formatSignalType(signal.signalType)}</h3>
                          {getSignalPriorityBadge(signal.processedData.priority)}
                        </div>
                        <p className="text-sm text-gray-600">
                          {getProviderName(signal.providerId)} • Confidence: {signal.confidence}%
                        </p>
                        <p className="text-xs text-gray-500">
                          Received {new Date(signal.timestamp).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-800 mt-2">{signal.processedData.summary}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleVerifySignal(signal.id, true)}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verify
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleVerifySignal(signal.id, false)}
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Integration Settings</h3>
            <div className="space-y-4">
              <div>
                <Label>Auto-verification Threshold</Label>
                <p className="text-sm text-gray-600">Minimum confidence level for automatic verification</p>
                <select className="mt-1 block w-full border rounded-md px-3 py-2">
                  <option>90% (High confidence only)</option>
                  <option>80% (Medium-high confidence)</option>
                  <option>70% (Medium confidence)</option>
                  <option>Never auto-verify</option>
                </select>
              </div>
              
              <div>
                <Label>Signal Processing Delay</Label>
                <p className="text-sm text-gray-600">Time to wait before processing signals</p>
                <select className="mt-1 block w-full border rounded-md px-3 py-2">
                  <option>Immediate</option>
                  <option>5 minutes</option>
                  <option>15 minutes</option>
                  <option>1 hour</option>
                </select>
              </div>

              <div>
                <Label>Notification Preferences</Label>
                <div className="mt-2 space-y-2">
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" defaultChecked />
                    <span className="text-sm">Email notifications for high-priority signals</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" defaultChecked />
                    <span className="text-sm">SMS notifications for critical signals</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm">Daily digest of all signals</span>
                  </label>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Connection Modal */}
      {showAddConnection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Add Service Connection</h3>
            
            <div className="space-y-4">
              <div>
                <Label>Service Provider</Label>
                <select 
                  className="mt-1 block w-full border rounded-md px-3 py-2"
                  value={newConnection.providerId}
                  onChange={(e) => setNewConnection({ ...newConnection, providerId: e.target.value })}
                >
                  {availableProviders.map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name} ({formatServiceType(provider.type)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Account Identifier</Label>
                <Input
                  placeholder="e.g., username, email, account ID"
                  value={newConnection.accountIdentifier}
                  onChange={(e) => setNewConnection({ ...newConnection, accountIdentifier: e.target.value })}
                />
              </div>

              <div>
                <Label>Connection Type</Label>
                <select 
                  className="mt-1 block w-full border rounded-md px-3 py-2"
                  value={newConnection.connectionType}
                  onChange={(e) => setNewConnection({ ...newConnection, connectionType: e.target.value })}
                >
                  <option value="primary">Primary Account</option>
                  <option value="secondary">Secondary Account</option>
                  <option value="monitoring_only">Monitoring Only</option>
                </select>
              </div>

              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setShowAddConnection(false)} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddConnection} 
                  className="flex-1"
                  disabled={!newConnection.accountIdentifier}
                >
                  Add Connection
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Simulate Signal Modal */}
      {showSimulateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Simulate Third-Party Signal</h3>
            
            <div className="space-y-4">
              <div>
                <Label>Service Provider</Label>
                <select 
                  className="mt-1 block w-full border rounded-md px-3 py-2"
                  value={simulation.providerId}
                  onChange={(e) => setSimulation({ ...simulation, providerId: e.target.value })}
                >
                  {connections.map(connection => (
                    <option key={connection.id} value={connection.providerId}>
                      {getProviderName(connection.providerId)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Signal Type</Label>
                <select 
                  className="mt-1 block w-full border rounded-md px-3 py-2"
                  value={simulation.signalType}
                  onChange={(e) => setSimulation({ ...simulation, signalType: e.target.value as ThirdPartySignalType })}
                >
                  {Object.values(ThirdPartySignalType).map(type => (
                    <option key={type} value={type}>
                      {formatSignalType(type)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setShowSimulateModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handleSimulateSignal} 
                  className="flex-1"
                >
                  Simulate Signal
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}