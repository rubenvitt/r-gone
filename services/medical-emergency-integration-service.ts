import { triggerConditionsService, MedicalEmergencyData, TriggerType, TriggerPriority } from './trigger-conditions-service'
import { auditLoggingService } from './audit-logging-service'

// Medical device integration interfaces
export interface MedicalDeviceConfig {
  id: string
  userId: string
  deviceType: 'heart_monitor' | 'fall_detector' | 'panic_button' | 'gps_tracker' | 'smart_watch' | 'glucose_monitor'
  deviceModel: string
  serialNumber: string
  apiEndpoint?: string
  apiKey?: string
  isActive: boolean
  lastSyncAt?: Date
  batteryLevel?: number
  signalStrength?: number
  emergencyContacts: string[]
  alertThresholds: MedicalAlertThresholds
}

export interface MedicalAlertThresholds {
  heartRate?: { min: number; max: number }
  bloodPressure?: { 
    systolic: { min: number; max: number }
    diastolic: { min: number; max: number }
  }
  temperature?: { min: number; max: number }
  oxygenSaturation?: { min: number; max: number }
  glucoseLevel?: { min: number; max: number }
  fallSensitivity?: 'low' | 'medium' | 'high'
  panicButtonEnabled?: boolean
  inactivityTimeout?: number // minutes
}

// Medical service providers
export interface MedicalServiceProvider {
  id: string
  name: string
  type: 'device_manufacturer' | 'health_platform' | 'emergency_service' | 'telemedicine'
  apiBaseUrl: string
  authType: 'api_key' | 'oauth' | 'webhook'
  isActive: boolean
  supportedDevices: string[]
  emergencyEndpoint?: string
  webhookSecret?: string
}

// Emergency alert levels
export enum EmergencyAlertLevel {
  INFO = 'info',           // Informational, no immediate action needed
  WARNING = 'warning',     // Concerning reading, monitor closely
  ALERT = 'alert',        // Immediate attention recommended
  EMERGENCY = 'emergency', // Critical emergency, activate all protocols
  PANIC = 'panic'         // Panic button pressed, immediate response
}

// Medical emergency types
export enum MedicalEmergencyType {
  CARDIAC_EVENT = 'cardiac_event',
  FALL_DETECTED = 'fall_detected',
  PANIC_ACTIVATED = 'panic_activated',
  VITAL_SIGNS_CRITICAL = 'vital_signs_critical',
  MEDICATION_ALERT = 'medication_alert',
  DIABETIC_EMERGENCY = 'diabetic_emergency',
  RESPIRATORY_DISTRESS = 'respiratory_distress',
  SEIZURE_DETECTED = 'seizure_detected',
  INACTIVITY_ALARM = 'inactivity_alarm',
  DEVICE_MALFUNCTION = 'device_malfunction'
}

// Enhanced medical emergency data
export interface EnhancedMedicalEmergencyData extends MedicalEmergencyData {
  emergencyType: MedicalEmergencyType
  alertLevel: EmergencyAlertLevel
  deviceConfig: MedicalDeviceConfig
  previousReadings?: any[]
  trend?: 'improving' | 'stable' | 'worsening'
  timeToRespond?: number // estimated minutes
  autoEscalated?: boolean
  responderNotified?: string[]
  medicalHistory?: string[]
  currentMedications?: string[]
  allergies?: string[]
  emergencyInstructions?: string
}

class MedicalEmergencyIntegrationService {
  private devices: Map<string, MedicalDeviceConfig> = new Map()
  private providers: Map<string, MedicalServiceProvider> = new Map()
  private emergencyHistory: Map<string, EnhancedMedicalEmergencyData[]> = new Map()
  
  // Monitoring intervals
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map()
  private readonly DEFAULT_MONITORING_INTERVAL = 30000 // 30 seconds

  constructor() {
    this.initializeDefaultProviders()
  }

  /**
   * Register a medical device for monitoring
   */
  async registerMedicalDevice(config: MedicalDeviceConfig): Promise<void> {
    this.devices.set(config.id, config)
    
    // Start monitoring if device is active
    if (config.isActive) {
      await this.startDeviceMonitoring(config.id)
    }

    // Create default trigger condition for this device
    await this.createDefaultTriggerForDevice(config)

    await auditLoggingService.logEvent({
      eventType: 'medical_device',
      action: 'device_registered',
      resource: 'medical_device',
      resourceId: config.id,
      result: 'success',
      userId: config.userId,
      details: {
        deviceType: config.deviceType,
        deviceModel: config.deviceModel,
        serialNumber: config.serialNumber
      },
      riskLevel: 'medium'
    })
  }

  /**
   * Update medical device configuration
   */
  async updateMedicalDevice(deviceId: string, updates: Partial<MedicalDeviceConfig>): Promise<void> {
    const device = this.devices.get(deviceId)
    if (!device) throw new Error('Device not found')

    const updatedDevice = { ...device, ...updates }
    this.devices.set(deviceId, updatedDevice)

    // Restart monitoring if activity status changed
    if (updates.isActive !== undefined) {
      if (updates.isActive) {
        await this.startDeviceMonitoring(deviceId)
      } else {
        await this.stopDeviceMonitoring(deviceId)
      }
    }
  }

  /**
   * Remove medical device
   */
  async removeMedicalDevice(deviceId: string): Promise<void> {
    const device = this.devices.get(deviceId)
    if (!device) return

    await this.stopDeviceMonitoring(deviceId)
    this.devices.delete(deviceId)

    await auditLoggingService.logEvent({
      eventType: 'medical_device',
      action: 'device_removed',
      resource: 'medical_device',
      resourceId: deviceId,
      result: 'success',
      userId: device.userId,
      details: { deviceType: device.deviceType },
      riskLevel: 'low'
    })
  }

  /**
   * Process incoming medical emergency data
   */
  async processEmergencyData(data: MedicalEmergencyData): Promise<void> {
    const device = this.devices.get(data.deviceId)
    if (!device) {
      console.warn(`Received data from unregistered device: ${data.deviceId}`)
      return
    }

    // Enhance the emergency data
    const enhancedData = await this.enhanceEmergencyData(data, device)
    
    // Store in history
    const history = this.emergencyHistory.get(data.patientId) || []
    history.push(enhancedData)
    this.emergencyHistory.set(data.patientId, history)

    // Evaluate if this constitutes an emergency
    const isEmergency = await this.evaluateEmergencyLevel(enhancedData)
    
    if (isEmergency) {
      // Process through trigger conditions service
      await triggerConditionsService.processMedicalEmergency(enhancedData)
      
      // Send immediate notifications if critical
      if (enhancedData.alertLevel === EmergencyAlertLevel.EMERGENCY || 
          enhancedData.alertLevel === EmergencyAlertLevel.PANIC) {
        await this.sendImmediateEmergencyNotifications(enhancedData)
      }
    }

    // Log the emergency data processing
    await auditLoggingService.logEvent({
      eventType: 'medical_emergency',
      action: 'emergency_data_processed',
      resource: 'medical_emergency',
      resourceId: enhancedData.deviceId,
      result: 'success',
      userId: enhancedData.patientId,
      details: {
        emergencyType: enhancedData.emergencyType,
        alertLevel: enhancedData.alertLevel,
        isEmergency,
        vitals: enhancedData.vitals
      },
      riskLevel: isEmergency ? 'critical' : 'low'
    })
  }

  /**
   * Simulate medical emergency for testing
   */
  async simulateEmergency(
    deviceId: string, 
    emergencyType: MedicalEmergencyType,
    customData?: Partial<MedicalEmergencyData>
  ): Promise<void> {
    const device = this.devices.get(deviceId)
    if (!device) throw new Error('Device not found')

    const simulatedData: MedicalEmergencyData = {
      deviceId,
      deviceType: device.deviceType,
      alertType: this.mapEmergencyTypeToAlertType(emergencyType),
      severity: this.getEmergencySeverity(emergencyType),
      patientId: device.userId,
      timestamp: new Date(),
      location: customData?.location || {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 10
      },
      vitals: customData?.vitals || this.generateTestVitals(emergencyType),
      emergencyContacts: device.emergencyContacts,
      ...customData
    }

    await this.processEmergencyData(simulatedData)
  }

  /**
   * Get emergency history for a user
   */
  getEmergencyHistory(userId: string, limit?: number): EnhancedMedicalEmergencyData[] {
    const history = this.emergencyHistory.get(userId) || []
    return limit ? history.slice(-limit) : history
  }

  /**
   * Get user's medical devices
   */
  getUserDevices(userId: string): MedicalDeviceConfig[] {
    return Array.from(this.devices.values()).filter(device => device.userId === userId)
  }

  /**
   * Private helper methods
   */
  private async startDeviceMonitoring(deviceId: string): Promise<void> {
    const device = this.devices.get(deviceId)
    if (!device || !device.isActive) return

    // Stop existing monitoring
    await this.stopDeviceMonitoring(deviceId)

    // Start new monitoring interval
    const interval = setInterval(async () => {
      await this.checkDeviceStatus(deviceId)
    }, this.DEFAULT_MONITORING_INTERVAL)

    this.monitoringIntervals.set(deviceId, interval)
  }

  private async stopDeviceMonitoring(deviceId: string): Promise<void> {
    const interval = this.monitoringIntervals.get(deviceId)
    if (interval) {
      clearInterval(interval)
      this.monitoringIntervals.delete(deviceId)
    }
  }

  private async checkDeviceStatus(deviceId: string): Promise<void> {
    const device = this.devices.get(deviceId)
    if (!device) return

    try {
      // In a real implementation, this would check device connectivity,
      // battery level, and pull latest readings from the device API
      
      // Update last sync time
      device.lastSyncAt = new Date()
      
      // Check for device-specific conditions
      switch (device.deviceType) {
        case 'heart_monitor':
          await this.checkHeartMonitorStatus(device)
          break
        case 'fall_detector':
          await this.checkFallDetectorStatus(device)
          break
        case 'panic_button':
          await this.checkPanicButtonStatus(device)
          break
        case 'smart_watch':
          await this.checkSmartWatchStatus(device)
          break
        case 'glucose_monitor':
          await this.checkGlucoseMonitorStatus(device)
          break
      }
    } catch (error) {
      console.error(`Error checking device ${deviceId}:`, error)
      
      // Create device malfunction emergency
      await this.processEmergencyData({
        deviceId,
        deviceType: device.deviceType,
        alertType: 'no_movement', // Using as generic error indicator
        severity: 'medium',
        patientId: device.userId,
        timestamp: new Date(),
        emergencyContacts: device.emergencyContacts
      })
    }
  }

  private async enhanceEmergencyData(
    data: MedicalEmergencyData, 
    device: MedicalDeviceConfig
  ): Promise<EnhancedMedicalEmergencyData> {
    const previousReadings = this.getPreviousReadings(data.patientId, 5)
    const trend = this.analyzeTrend(previousReadings, data)
    
    return {
      ...data,
      emergencyType: this.determineEmergencyType(data, device),
      alertLevel: this.determineAlertLevel(data, device),
      deviceConfig: device,
      previousReadings,
      trend,
      timeToRespond: this.estimateResponseTime(data, device),
      autoEscalated: false,
      responderNotified: [],
      // In production, these would come from user's medical profile
      medicalHistory: [],
      currentMedications: [],
      allergies: [],
      emergencyInstructions: this.generateEmergencyInstructions(data, device)
    }
  }

  private async evaluateEmergencyLevel(data: EnhancedMedicalEmergencyData): Promise<boolean> {
    // Always treat panic button and critical alerts as emergencies
    if (data.alertLevel === EmergencyAlertLevel.PANIC || 
        data.alertLevel === EmergencyAlertLevel.EMERGENCY) {
      return true
    }

    // Check if vitals are outside normal ranges
    if (data.vitals) {
      const thresholds = data.deviceConfig.alertThresholds
      
      if (data.vitals.heartRate && thresholds.heartRate) {
        if (data.vitals.heartRate < thresholds.heartRate.min || 
            data.vitals.heartRate > thresholds.heartRate.max) {
          return true
        }
      }

      if (data.vitals.oxygenSaturation && thresholds.oxygenSaturation) {
        if (data.vitals.oxygenSaturation < thresholds.oxygenSaturation.min) {
          return true
        }
      }

      // Add more vital sign checks as needed
    }

    // Check trend analysis
    if (data.trend === 'worsening' && data.alertLevel === EmergencyAlertLevel.ALERT) {
      return true
    }

    return false
  }

  private async sendImmediateEmergencyNotifications(data: EnhancedMedicalEmergencyData): Promise<void> {
    // Send to emergency contacts
    for (const contactId of data.emergencyContacts || []) {
      // Implementation would send SMS/call emergency contacts
      console.log(`Sending emergency notification to contact ${contactId}`)
    }

    // Potentially contact emergency services based on severity
    if (data.alertLevel === EmergencyAlertLevel.EMERGENCY && data.severity === 'critical') {
      console.log(`Considering emergency services notification for ${data.patientId}`)
    }
  }

  private async createDefaultTriggerForDevice(device: MedicalDeviceConfig): Promise<void> {
    await triggerConditionsService.createTrigger({
      userId: device.userId,
      type: TriggerType.MEDICAL_EMERGENCY,
      name: `Medical Emergency - ${device.deviceType}`,
      description: `Automatically created trigger for ${device.deviceModel}`,
      status: 'active' as any,
      priority: TriggerPriority.HIGH,
      isEnabled: true,
      parameters: {
        medicalDevices: [device.deviceType],
        emergencyContacts: device.emergencyContacts,
        vitalThresholds: {
          heartRate: device.alertThresholds.heartRate,
          oxygenSaturation: device.alertThresholds.oxygenSaturation,
          temperature: device.alertThresholds.temperature
        }
      },
      actions: [
        {
          id: 'emergency_activation',
          action: 'activate_emergency_access' as any,
          parameters: { activationLevel: 'partial' }
        },
        {
          id: 'notify_contacts',
          action: 'notify_beneficiaries' as any,
          parameters: {}
        }
      ],
      conditions: [
        {
          field: 'severity',
          operator: 'equals',
          value: 'critical'
        }
      ]
    })
  }

  private initializeDefaultProviders(): void {
    // Sample medical service providers
    const providers: MedicalServiceProvider[] = [
      {
        id: 'apple_health',
        name: 'Apple Health',
        type: 'health_platform',
        apiBaseUrl: 'https://developer.apple.com/health-records/',
        authType: 'oauth',
        isActive: true,
        supportedDevices: ['smart_watch', 'heart_monitor']
      },
      {
        id: 'life_alert',
        name: 'Life Alert',
        type: 'emergency_service',
        apiBaseUrl: 'https://api.lifealert.com',
        authType: 'api_key',
        isActive: true,
        supportedDevices: ['panic_button', 'fall_detector']
      },
      {
        id: 'philips_healthcare',
        name: 'Philips Healthcare',
        type: 'device_manufacturer',
        apiBaseUrl: 'https://api.philips.com/healthcare',
        authType: 'oauth',
        isActive: true,
        supportedDevices: ['heart_monitor', 'glucose_monitor']
      }
    ]

    providers.forEach(provider => {
      this.providers.set(provider.id, provider)
    })
  }

  // Device-specific monitoring methods
  private async checkHeartMonitorStatus(device: MedicalDeviceConfig): Promise<void> {
    // Simulate heart rate monitoring
    const heartRate = 60 + Math.random() * 40 // 60-100 BPM
    
    if (device.alertThresholds.heartRate) {
      const { min, max } = device.alertThresholds.heartRate
      if (heartRate < min || heartRate > max) {
        await this.processEmergencyData({
          deviceId: device.id,
          deviceType: device.deviceType,
          alertType: 'heart_rate_abnormal',
          severity: heartRate < 40 || heartRate > 120 ? 'critical' : 'medium',
          patientId: device.userId,
          timestamp: new Date(),
          vitals: { heartRate },
          emergencyContacts: device.emergencyContacts
        })
      }
    }
  }

  private async checkFallDetectorStatus(device: MedicalDeviceConfig): Promise<void> {
    // Fall detection logic would go here
    // For demo purposes, randomly simulate falls
    if (Math.random() < 0.001) { // 0.1% chance
      await this.processEmergencyData({
        deviceId: device.id,
        deviceType: device.deviceType,
        alertType: 'fall_detected',
        severity: 'high',
        patientId: device.userId,
        timestamp: new Date(),
        location: {
          latitude: 37.7749 + (Math.random() - 0.5) * 0.01,
          longitude: -122.4194 + (Math.random() - 0.5) * 0.01,
          accuracy: 5
        },
        emergencyContacts: device.emergencyContacts
      })
    }
  }

  private async checkPanicButtonStatus(device: MedicalDeviceConfig): Promise<void> {
    // Panic button status check - would normally check for button presses
    // This is handled by the device's hardware/firmware
  }

  private async checkSmartWatchStatus(device: MedicalDeviceConfig): Promise<void> {
    // Comprehensive health monitoring from smart watch
    const vitals = {
      heartRate: 60 + Math.random() * 40,
      oxygenSaturation: 95 + Math.random() * 5,
      temperature: 97 + Math.random() * 3
    }

    // Check all vital signs
    let alertNeeded = false
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low'

    if (device.alertThresholds.heartRate && vitals.heartRate) {
      const { min, max } = device.alertThresholds.heartRate
      if (vitals.heartRate < min || vitals.heartRate > max) {
        alertNeeded = true
        severity = vitals.heartRate < 40 || vitals.heartRate > 120 ? 'critical' : 'medium'
      }
    }

    if (alertNeeded) {
      await this.processEmergencyData({
        deviceId: device.id,
        deviceType: device.deviceType,
        alertType: 'vitals_critical',
        severity,
        patientId: device.userId,
        timestamp: new Date(),
        vitals,
        emergencyContacts: device.emergencyContacts
      })
    }
  }

  private async checkGlucoseMonitorStatus(device: MedicalDeviceConfig): Promise<void> {
    // Glucose monitoring logic
    const glucoseLevel = 80 + Math.random() * 100 // 80-180 mg/dL
    
    if (glucoseLevel < 70 || glucoseLevel > 180) {
      await this.processEmergencyData({
        deviceId: device.id,
        deviceType: device.deviceType,
        alertType: 'vitals_critical',
        severity: glucoseLevel < 50 || glucoseLevel > 250 ? 'critical' : 'medium',
        patientId: device.userId,
        timestamp: new Date(),
        vitals: { glucoseLevel } as any,
        emergencyContacts: device.emergencyContacts
      })
    }
  }

  // Helper methods for data analysis
  private getPreviousReadings(patientId: string, count: number): any[] {
    const history = this.emergencyHistory.get(patientId) || []
    return history.slice(-count)
  }

  private analyzeTrend(previousReadings: any[], currentData: MedicalEmergencyData): 'improving' | 'stable' | 'worsening' {
    if (previousReadings.length < 2) return 'stable'
    
    // Simple trend analysis based on severity
    const recentSeverities = previousReadings.map(r => r.severity)
    const currentSeverity = currentData.severity
    
    const severityScore = { low: 1, medium: 2, high: 3, critical: 4 }
    const currentScore = severityScore[currentSeverity]
    const avgPreviousScore = recentSeverities.reduce((sum, sev) => sum + severityScore[sev], 0) / recentSeverities.length
    
    if (currentScore > avgPreviousScore + 0.5) return 'worsening'
    if (currentScore < avgPreviousScore - 0.5) return 'improving'
    return 'stable'
  }

  private determineEmergencyType(data: MedicalEmergencyData, device: MedicalDeviceConfig): MedicalEmergencyType {
    switch (data.alertType) {
      case 'heart_rate_abnormal':
        return MedicalEmergencyType.CARDIAC_EVENT
      case 'fall_detected':
        return MedicalEmergencyType.FALL_DETECTED
      case 'panic_pressed':
        return MedicalEmergencyType.PANIC_ACTIVATED
      case 'vitals_critical':
        return MedicalEmergencyType.VITAL_SIGNS_CRITICAL
      case 'no_movement':
        return MedicalEmergencyType.INACTIVITY_ALARM
      default:
        return MedicalEmergencyType.VITAL_SIGNS_CRITICAL
    }
  }

  private determineAlertLevel(data: MedicalEmergencyData, device: MedicalDeviceConfig): EmergencyAlertLevel {
    if (data.alertType === 'panic_pressed') return EmergencyAlertLevel.PANIC
    if (data.severity === 'critical') return EmergencyAlertLevel.EMERGENCY
    if (data.severity === 'high') return EmergencyAlertLevel.ALERT
    if (data.severity === 'medium') return EmergencyAlertLevel.WARNING
    return EmergencyAlertLevel.INFO
  }

  private estimateResponseTime(data: MedicalEmergencyData, device: MedicalDeviceConfig): number {
    // Estimate response time based on emergency type and severity
    const baseTime = {
      'panic_pressed': 2,
      'heart_rate_abnormal': 5,
      'fall_detected': 3,
      'vitals_critical': 10,
      'no_movement': 15
    }
    
    const severityMultiplier = {
      'critical': 0.5,
      'high': 0.7,
      'medium': 1.0,
      'low': 1.5
    }
    
    return (baseTime[data.alertType] || 10) * severityMultiplier[data.severity]
  }

  private generateEmergencyInstructions(data: MedicalEmergencyData, device: MedicalDeviceConfig): string {
    switch (data.alertType) {
      case 'panic_pressed':
        return 'Panic button activated. Check on person immediately. Call emergency services if no response.'
      case 'heart_rate_abnormal':
        return 'Abnormal heart rate detected. Check if person is conscious and responsive. Call 911 if severe symptoms.'
      case 'fall_detected':
        return 'Fall detected. Check for injuries. Do not move person if neck/back injury suspected. Call 911 if unconscious.'
      case 'vitals_critical':
        return 'Critical vital signs detected. Check responsiveness and breathing. Call 911 immediately.'
      default:
        return 'Medical alert received. Check on person and assess situation.'
    }
  }

  private mapEmergencyTypeToAlertType(emergencyType: MedicalEmergencyType): MedicalEmergencyData['alertType'] {
    const mapping = {
      [MedicalEmergencyType.CARDIAC_EVENT]: 'heart_rate_abnormal',
      [MedicalEmergencyType.FALL_DETECTED]: 'fall_detected',
      [MedicalEmergencyType.PANIC_ACTIVATED]: 'panic_pressed',
      [MedicalEmergencyType.VITAL_SIGNS_CRITICAL]: 'vitals_critical',
      [MedicalEmergencyType.INACTIVITY_ALARM]: 'no_movement'
    } as const
    
    return mapping[emergencyType] || 'vitals_critical'
  }

  private getEmergencySeverity(emergencyType: MedicalEmergencyType): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap = {
      [MedicalEmergencyType.PANIC_ACTIVATED]: 'critical',
      [MedicalEmergencyType.CARDIAC_EVENT]: 'critical',
      [MedicalEmergencyType.RESPIRATORY_DISTRESS]: 'critical',
      [MedicalEmergencyType.SEIZURE_DETECTED]: 'high',
      [MedicalEmergencyType.FALL_DETECTED]: 'high',
      [MedicalEmergencyType.DIABETIC_EMERGENCY]: 'high',
      [MedicalEmergencyType.VITAL_SIGNS_CRITICAL]: 'medium',
      [MedicalEmergencyType.MEDICATION_ALERT]: 'medium',
      [MedicalEmergencyType.INACTIVITY_ALARM]: 'medium',
      [MedicalEmergencyType.DEVICE_MALFUNCTION]: 'low'
    } as const
    
    return severityMap[emergencyType] || 'medium'
  }

  private generateTestVitals(emergencyType: MedicalEmergencyType): any {
    switch (emergencyType) {
      case MedicalEmergencyType.CARDIAC_EVENT:
        return {
          heartRate: Math.random() > 0.5 ? 150 : 35, // Abnormal heart rate
          bloodPressure: { systolic: 180, diastolic: 110 },
          oxygenSaturation: 88
        }
      case MedicalEmergencyType.DIABETIC_EMERGENCY:
        return {
          glucoseLevel: Math.random() > 0.5 ? 300 : 40, // Very high or very low
          heartRate: 95
        }
      default:
        return {
          heartRate: 75,
          oxygenSaturation: 98,
          temperature: 98.6
        }
    }
  }
}

// Singleton instance
export const medicalEmergencyIntegrationService = new MedicalEmergencyIntegrationService()