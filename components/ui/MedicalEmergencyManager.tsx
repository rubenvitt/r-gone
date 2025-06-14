'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select } from '@/components/ui/select'
import { 
  Heart, Activity, AlertTriangle, Smartphone,
  Plus, Settings, PlayCircle, History,
  Battery, Wifi, MapPin, Clock,
  Stethoscope, Thermometer, Droplets
} from 'lucide-react'
import { MedicalDeviceConfig, MedicalEmergencyType, EnhancedMedicalEmergencyData } from '@/services/medical-emergency-integration-service'

export function MedicalEmergencyManager() {
  const [devices, setDevices] = useState<MedicalDeviceConfig[]>([])
  const [emergencyHistory, setEmergencyHistory] = useState<EnhancedMedicalEmergencyData[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('devices')
  const [showAddDevice, setShowAddDevice] = useState(false)
  const [showSimulate, setShowSimulate] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<string>('')

  // New device form
  const [newDevice, setNewDevice] = useState({
    deviceType: 'smart_watch',
    deviceModel: '',
    serialNumber: '',
    emergencyContacts: [''],
    alertThresholds: {
      heartRate: { min: 60, max: 100 },
      oxygenSaturation: { min: 95, max: 100 },
      temperature: { min: 97, max: 99.5 }
    }
  })

  // Simulation form
  const [simulation, setSimulation] = useState({
    deviceId: '',
    emergencyType: MedicalEmergencyType.CARDIAC_EVENT,
    customData: {}
  })

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      // Load devices
      const devicesResponse = await fetch('/api/medical-emergency/devices')
      if (devicesResponse.ok) {
        const devicesData = await devicesResponse.json()
        setDevices(devicesData.devices || [])
      }

      // Load emergency history
      const emergencyResponse = await fetch('/api/medical-emergency/emergency?limit=10')
      if (emergencyResponse.ok) {
        const emergencyData = await emergencyResponse.json()
        setEmergencyHistory(emergencyData.emergencies || [])
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddDevice = async () => {
    try {
      const response = await fetch('/api/medical-emergency/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDevice)
      })

      if (response.ok) {
        setShowAddDevice(false)
        setNewDevice({
          deviceType: 'smart_watch',
          deviceModel: '',
          serialNumber: '',
          emergencyContacts: [''],
          alertThresholds: {
            heartRate: { min: 60, max: 100 },
            oxygenSaturation: { min: 95, max: 100 },
            temperature: { min: 97, max: 99.5 }
          }
        })
        await loadData()
      }
    } catch (error) {
      console.error('Failed to add device:', error)
    }
  }

  const handleSimulateEmergency = async () => {
    try {
      const response = await fetch('/api/medical-emergency/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simulation)
      })

      if (response.ok) {
        setShowSimulate(false)
        await loadData()
      }
    } catch (error) {
      console.error('Failed to simulate emergency:', error)
    }
  }

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'heart_monitor':
        return <Heart className="h-5 w-5 text-red-600" />
      case 'smart_watch':
        return <Smartphone className="h-5 w-5 text-blue-600" />
      case 'fall_detector':
        return <Activity className="h-5 w-5 text-orange-600" />
      case 'panic_button':
        return <AlertTriangle className="h-5 w-5 text-red-600" />
      case 'glucose_monitor':
        return <Droplets className="h-5 w-5 text-purple-600" />
      default:
        return <Stethoscope className="h-5 w-5 text-gray-600" />
    }
  }

  const getDeviceStatus = (device: MedicalDeviceConfig) => {
    if (!device.isActive) return { color: 'bg-gray-500', text: 'Inactive' }
    if (!device.lastSyncAt) return { color: 'bg-yellow-500', text: 'Not Synced' }
    
    const lastSync = new Date(device.lastSyncAt)
    const minutesAgo = (Date.now() - lastSync.getTime()) / (1000 * 60)
    
    if (minutesAgo < 5) return { color: 'bg-green-500', text: 'Online' }
    if (minutesAgo < 30) return { color: 'bg-yellow-500', text: 'Warning' }
    return { color: 'bg-red-500', text: 'Offline' }
  }

  const getEmergencyIcon = (emergencyType: MedicalEmergencyType) => {
    switch (emergencyType) {
      case MedicalEmergencyType.CARDIAC_EVENT:
        return <Heart className="h-4 w-4 text-red-600" />
      case MedicalEmergencyType.FALL_DETECTED:
        return <Activity className="h-4 w-4 text-orange-600" />
      case MedicalEmergencyType.PANIC_ACTIVATED:
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return <Stethoscope className="h-4 w-4 text-gray-600" />
    }
  }

  const getAlertLevelBadge = (alertLevel: string) => {
    const colors = {
      panic: 'destructive',
      emergency: 'destructive',
      alert: 'default',
      warning: 'secondary',
      info: 'outline'
    }
    return (
      <Badge variant={colors[alertLevel as keyof typeof colors] as any}>
        {alertLevel.toUpperCase()}
      </Badge>
    )
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
          <h2 className="text-2xl font-bold">Medical Emergency Management</h2>
          <p className="text-gray-600">Monitor health devices and manage emergency protocols</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowSimulate(true)}
            disabled={devices.length === 0}
          >
            <PlayCircle className="h-4 w-4 mr-2" />
            Simulate Emergency
          </Button>
          <Button onClick={() => setShowAddDevice(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Device
          </Button>
        </div>
      </div>

      {/* Emergency Status Alert */}
      {emergencyHistory.length > 0 && emergencyHistory[0].alertLevel === 'emergency' && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription>
            <strong>Active Emergency:</strong> {emergencyHistory[0].emergencyType.replace('_', ' ')} 
            detected on {emergencyHistory[0].deviceConfig?.deviceModel}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="devices">Medical Devices</TabsTrigger>
          <TabsTrigger value="history">Emergency History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="space-y-4">
          {devices.length === 0 ? (
            <Card className="p-8 text-center">
              <Stethoscope className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Medical Devices</h3>
              <p className="text-gray-600 mb-4">
                Add your first medical device to start monitoring your health
              </p>
              <Button onClick={() => setShowAddDevice(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Medical Device
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {devices.map(device => {
                const status = getDeviceStatus(device)
                return (
                  <Card key={device.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        {getDeviceIcon(device.deviceType)}
                        <div>
                          <h3 className="font-semibold">{device.deviceModel}</h3>
                          <p className="text-sm text-gray-600">{device.deviceType.replace('_', ' ')}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${status.color}`} />
                        <span className="text-sm">{status.text}</span>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Serial Number:</span>
                        <span className="font-mono">{device.serialNumber}</span>
                      </div>
                      
                      {device.lastSyncAt && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Last Sync:</span>
                          <span>{new Date(device.lastSyncAt).toLocaleTimeString()}</span>
                        </div>
                      )}

                      {device.batteryLevel && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 flex items-center">
                            <Battery className="h-3 w-3 mr-1" />
                            Battery:
                          </span>
                          <span>{device.batteryLevel}%</span>
                        </div>
                      )}

                      {device.signalStrength && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 flex items-center">
                            <Wifi className="h-3 w-3 mr-1" />
                            Signal:
                          </span>
                          <span>{device.signalStrength}%</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs text-gray-600 mb-2">Emergency Contacts:</p>
                      <div className="flex flex-wrap gap-1">
                        {device.emergencyContacts.map((contact, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            Contact {index + 1}
                          </Badge>
                        ))}
                      </div>
                    </div>

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
                          setSimulation({ ...simulation, deviceId: device.id })
                          setShowSimulate(true)
                        }}
                      >
                        <PlayCircle className="h-3 w-3 mr-1" />
                        Test
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {emergencyHistory.length === 0 ? (
            <Card className="p-8 text-center">
              <History className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Emergency History</h3>
              <p className="text-gray-600">
                Emergency events will appear here when they occur
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {emergencyHistory.map(emergency => (
                <Card key={`${emergency.deviceId}-${emergency.timestamp}`} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getEmergencyIcon(emergency.emergencyType)}
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium">{emergency.emergencyType.replace('_', ' ')}</p>
                          {getAlertLevelBadge(emergency.alertLevel)}
                        </div>
                        <p className="text-sm text-gray-600">
                          {emergency.deviceConfig?.deviceModel} • {emergency.severity} severity
                        </p>
                        <p className="text-xs text-gray-500 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(emergency.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {emergency.location && (
                        <p className="text-xs text-gray-500 flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          Location Available
                        </p>
                      )}
                      {emergency.responderNotified && emergency.responderNotified.length > 0 && (
                        <p className="text-xs text-green-600">
                          {emergency.responderNotified.length} contacts notified
                        </p>
                      )}
                    </div>
                  </div>

                  {emergency.vitals && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-gray-600 mb-2">Vitals at time of alert:</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        {emergency.vitals.heartRate && (
                          <div>
                            <span className="text-gray-500">Heart Rate:</span>
                            <span className="ml-1 font-medium">{emergency.vitals.heartRate} BPM</span>
                          </div>
                        )}
                        {emergency.vitals.oxygenSaturation && (
                          <div>
                            <span className="text-gray-500">O2 Sat:</span>
                            <span className="ml-1 font-medium">{emergency.vitals.oxygenSaturation}%</span>
                          </div>
                        )}
                        {emergency.vitals.temperature && (
                          <div>
                            <span className="text-gray-500">Temp:</span>
                            <span className="ml-1 font-medium">{emergency.vitals.temperature}°F</span>
                          </div>
                        )}
                        {emergency.vitals.bloodPressure && (
                          <div>
                            <span className="text-gray-500">BP:</span>
                            <span className="ml-1 font-medium">
                              {emergency.vitals.bloodPressure.systolic}/{emergency.vitals.bloodPressure.diastolic}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {emergency.emergencyInstructions && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-gray-600 mb-1">Instructions:</p>
                      <p className="text-xs text-gray-800">{emergency.emergencyInstructions}</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Emergency Settings</h3>
            <div className="space-y-4">
              <div>
                <Label>Emergency Response Time</Label>
                <p className="text-sm text-gray-600">How quickly emergency contacts should be notified</p>
                <select className="mt-1 block w-full border rounded-md px-3 py-2">
                  <option>Immediate (0 minutes)</option>
                  <option>5 minutes</option>
                  <option>15 minutes</option>
                  <option>30 minutes</option>
                </select>
              </div>
              
              <div>
                <Label>Auto-escalation</Label>
                <p className="text-sm text-gray-600">Automatically escalate to emergency services for critical alerts</p>
                <input type="checkbox" className="mt-2" />
                <span className="ml-2 text-sm">Enable auto-escalation for panic alerts</span>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Device Modal */}
      {showAddDevice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Add Medical Device</h3>
            
            <div className="space-y-4">
              <div>
                <Label>Device Type</Label>
                <select 
                  className="mt-1 block w-full border rounded-md px-3 py-2"
                  value={newDevice.deviceType}
                  onChange={(e) => setNewDevice({ ...newDevice, deviceType: e.target.value as any })}
                >
                  <option value="smart_watch">Smart Watch</option>
                  <option value="heart_monitor">Heart Monitor</option>
                  <option value="fall_detector">Fall Detector</option>
                  <option value="panic_button">Panic Button</option>
                  <option value="glucose_monitor">Glucose Monitor</option>
                  <option value="gps_tracker">GPS Tracker</option>
                </select>
              </div>

              <div>
                <Label>Device Model</Label>
                <Input
                  placeholder="e.g., Apple Watch Series 9"
                  value={newDevice.deviceModel}
                  onChange={(e) => setNewDevice({ ...newDevice, deviceModel: e.target.value })}
                />
              </div>

              <div>
                <Label>Serial Number</Label>
                <Input
                  placeholder="Device serial number"
                  value={newDevice.serialNumber}
                  onChange={(e) => setNewDevice({ ...newDevice, serialNumber: e.target.value })}
                />
              </div>

              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setShowAddDevice(false)} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddDevice} 
                  className="flex-1"
                  disabled={!newDevice.deviceModel || !newDevice.serialNumber}
                >
                  Add Device
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Simulate Emergency Modal */}
      {showSimulate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Simulate Emergency</h3>
            
            <div className="space-y-4">
              <div>
                <Label>Device</Label>
                <select 
                  className="mt-1 block w-full border rounded-md px-3 py-2"
                  value={simulation.deviceId}
                  onChange={(e) => setSimulation({ ...simulation, deviceId: e.target.value })}
                >
                  <option value="">Select a device</option>
                  {devices.map(device => (
                    <option key={device.id} value={device.id}>
                      {device.deviceModel} ({device.deviceType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Emergency Type</Label>
                <select 
                  className="mt-1 block w-full border rounded-md px-3 py-2"
                  value={simulation.emergencyType}
                  onChange={(e) => setSimulation({ ...simulation, emergencyType: e.target.value as MedicalEmergencyType })}
                >
                  <option value={MedicalEmergencyType.CARDIAC_EVENT}>Cardiac Event</option>
                  <option value={MedicalEmergencyType.FALL_DETECTED}>Fall Detected</option>
                  <option value={MedicalEmergencyType.PANIC_ACTIVATED}>Panic Button</option>
                  <option value={MedicalEmergencyType.VITAL_SIGNS_CRITICAL}>Critical Vitals</option>
                  <option value={MedicalEmergencyType.DIABETIC_EMERGENCY}>Diabetic Emergency</option>
                </select>
              </div>

              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setShowSimulate(false)} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handleSimulateEmergency} 
                  className="flex-1"
                  disabled={!simulation.deviceId}
                >
                  Simulate Emergency
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}