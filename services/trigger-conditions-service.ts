import { auditLoggingService } from './audit-logging-service'
import { activationAuditService } from './activation-audit-service'
import { manualActivationService } from './manual-activation-service'

// Core trigger condition types
export enum TriggerType {
  INACTIVITY = 'inactivity',
  MEDICAL_EMERGENCY = 'medical_emergency',
  LEGAL_DOCUMENT_FILED = 'legal_document_filed',
  BENEFICIARY_PETITION = 'beneficiary_petition',
  THIRD_PARTY_SIGNAL = 'third_party_signal',
  MANUAL_OVERRIDE = 'manual_override',
  SCHEDULED_EVENT = 'scheduled_event',
  DEVICE_DETECTION = 'device_detection',
  FINANCIAL_INACTIVITY = 'financial_inactivity',
  SOCIAL_MEDIA_MEMORIAL = 'social_media_memorial'
}

export enum TriggerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TRIGGERED = 'triggered',
  PROCESSING = 'processing',
  FAILED = 'failed',
  EXPIRED = 'expired'
}

export enum TriggerPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum TriggerAction {
  ACTIVATE_EMERGENCY_ACCESS = 'activate_emergency_access',
  NOTIFY_BENEFICIARIES = 'notify_beneficiaries',
  SEND_ALERTS = 'send_alerts',
  LOG_EVENT = 'log_event',
  ESCALATE_TO_MANUAL_REVIEW = 'escalate_to_manual_review',
  TRIGGER_DEAD_MAN_SWITCH = 'trigger_dead_man_switch'
}

// Base trigger condition interface
export interface TriggerCondition {
  id: string
  userId: string
  type: TriggerType
  name: string
  description: string
  status: TriggerStatus
  priority: TriggerPriority
  isEnabled: boolean
  createdAt: Date
  updatedAt: Date
  lastCheckedAt?: Date
  lastTriggeredAt?: Date
  expiresAt?: Date
  
  // Configuration
  parameters: TriggerParameters
  actions: TriggerActionConfig[]
  conditions: TriggerLogicCondition[]
  
  // Metadata
  metadata?: Record<string, any>
  tags?: string[]
}

// Flexible parameter system for different trigger types
export interface TriggerParameters {
  // Inactivity parameters
  inactivityDays?: number
  inactivityHours?: number
  checkMethods?: ('login' | 'heartbeat' | 'app_activity' | 'dead_man_switch')[]
  
  // Medical emergency parameters
  medicalDevices?: string[]
  emergencyContacts?: string[]
  medicalConditions?: string[]
  vitalThresholds?: Record<string, { min?: number; max?: number }>
  
  // Legal document parameters
  documentTypes?: ('death_certificate' | 'will' | 'power_of_attorney' | 'court_order')[]
  jurisdictions?: string[]
  legalSources?: string[]
  
  // Beneficiary petition parameters
  requiredBeneficiaries?: string[]
  minimumPetitioners?: number
  petitionWindow?: number // hours
  requiresEvidence?: boolean
  
  // Third-party service parameters
  serviceProviders?: string[]
  apiEndpoints?: string[]
  webhookUrls?: string[]
  pollingInterval?: number // minutes
  
  // Manual override parameters
  overrideCode?: string
  requiresMultiAuth?: boolean
  authorizedUsers?: string[]
  
  // Device detection parameters
  deviceIds?: string[]
  deviceTypes?: string[]
  lastSeenThreshold?: number // hours
  
  // Financial parameters
  accountIds?: string[]
  inactivityThreshold?: number // days
  minimumBalance?: number
  
  // Social media parameters
  platforms?: string[]
  profileIds?: string[]
  memorialKeywords?: string[]
}

// Action configuration for triggered conditions
export interface TriggerActionConfig {
  id: string
  action: TriggerAction
  parameters: Record<string, any>
  delay?: number // seconds
  retries?: number
  conditions?: TriggerLogicCondition[]
}

// Logic conditions for complex triggering rules
export interface TriggerLogicCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'exists' | 'not_exists'
  value: any
  logicOperator?: 'AND' | 'OR'
}

// Trigger execution result
export interface TriggerExecutionResult {
  triggerId: string
  executedAt: Date
  success: boolean
  actionsExecuted: string[]
  errors?: string[]
  data?: Record<string, any>
}

// Medical emergency specific types
export interface MedicalEmergencyData {
  deviceId: string
  deviceType: 'heart_monitor' | 'fall_detector' | 'panic_button' | 'gps_tracker' | 'smart_watch'
  alertType: 'heart_rate_abnormal' | 'fall_detected' | 'panic_pressed' | 'no_movement' | 'vitals_critical'
  vitals?: {
    heartRate?: number
    bloodPressure?: { systolic: number; diastolic: number }
    temperature?: number
    oxygenSaturation?: number
  }
  location?: {
    latitude: number
    longitude: number
    accuracy?: number
  }
  timestamp: Date
  severity: 'low' | 'medium' | 'high' | 'critical'
  patientId: string
  emergencyContacts?: string[]
}

// Legal document detection types
export interface LegalDocumentData {
  documentType: 'death_certificate' | 'will' | 'power_of_attorney' | 'court_order' | 'probate_order'
  documentId: string
  issuingAuthority: string
  jurisdiction: string
  issuedDate: Date
  filedDate: Date
  subjectName: string
  subjectId?: string
  documentUrl?: string
  verificationStatus: 'pending' | 'verified' | 'rejected'
  verifiedBy?: string
  verifiedAt?: Date
}

// Beneficiary petition types
export interface BeneficiaryPetition {
  id: string
  userId: string
  petitionerId: string
  petitionerName: string
  petitionerRelation: string
  reason: string
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical'
  evidenceDocuments?: string[]
  supportingBeneficiaries?: string[]
  createdAt: Date
  expiresAt: Date
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  reviewedBy?: string
  reviewedAt?: Date
  reviewNotes?: string
}

// Third-party service integration types
export interface ThirdPartyTrigger {
  serviceId: string
  serviceName: string
  signalType: string
  signalData: Record<string, any>
  confidence: number // 0-1
  receivedAt: Date
  processedAt?: Date
  isValid: boolean
  metadata?: Record<string, any>
}

// Main trigger conditions service
class TriggerConditionsService {
  private triggers: Map<string, TriggerCondition> = new Map()
  private medicalEmergencyData: Map<string, MedicalEmergencyData[]> = new Map()
  private legalDocuments: Map<string, LegalDocumentData[]> = new Map()
  private beneficiaryPetitions: Map<string, BeneficiaryPetition[]> = new Map()
  private thirdPartySignals: Map<string, ThirdPartyTrigger[]> = new Map()
  
  // Monitor for active triggers
  private monitoringInterval: NodeJS.Timeout | null = null
  private readonly CHECK_INTERVAL = 60000 // 1 minute

  constructor() {
    this.startMonitoring()
  }

  /**
   * Create a new trigger condition
   */
  async createTrigger(trigger: Omit<TriggerCondition, 'id' | 'createdAt' | 'updatedAt'>): Promise<TriggerCondition> {
    const newTrigger: TriggerCondition = {
      ...trigger,
      id: this.generateTriggerId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      status: TriggerStatus.ACTIVE
    }

    this.triggers.set(newTrigger.id, newTrigger)

    // Log trigger creation
    await auditLoggingService.logEvent({
      eventType: 'trigger_management',
      action: 'trigger_created',
      resource: 'trigger_condition',
      resourceId: newTrigger.id,
      result: 'success',
      userId: trigger.userId,
      details: {
        type: trigger.type,
        priority: trigger.priority,
        parameters: trigger.parameters
      },
      riskLevel: 'medium'
    })

    return newTrigger
  }

  /**
   * Update an existing trigger condition
   */
  async updateTrigger(triggerId: string, updates: Partial<TriggerCondition>): Promise<TriggerCondition | null> {
    const trigger = this.triggers.get(triggerId)
    if (!trigger) return null

    const updatedTrigger = {
      ...trigger,
      ...updates,
      updatedAt: new Date()
    }

    this.triggers.set(triggerId, updatedTrigger)
    return updatedTrigger
  }

  /**
   * Delete a trigger condition
   */
  async deleteTrigger(triggerId: string): Promise<boolean> {
    const trigger = this.triggers.get(triggerId)
    if (!trigger) return false

    this.triggers.delete(triggerId)

    await auditLoggingService.logEvent({
      eventType: 'trigger_management',
      action: 'trigger_deleted',
      resource: 'trigger_condition',
      resourceId: triggerId,
      result: 'success',
      userId: trigger.userId,
      details: { type: trigger.type },
      riskLevel: 'low'
    })

    return true
  }

  /**
   * Get trigger condition by ID
   */
  getTrigger(triggerId: string): TriggerCondition | null {
    return this.triggers.get(triggerId) || null
  }

  /**
   * Get all triggers for a user
   */
  getUserTriggers(userId: string): TriggerCondition[] {
    return Array.from(this.triggers.values()).filter(trigger => trigger.userId === userId)
  }

  /**
   * Get active triggers for monitoring
   */
  getActiveTriggers(): TriggerCondition[] {
    return Array.from(this.triggers.values()).filter(
      trigger => trigger.status === TriggerStatus.ACTIVE && trigger.isEnabled
    )
  }

  /**
   * Process medical emergency data
   */
  async processMedicalEmergency(data: MedicalEmergencyData): Promise<void> {
    // Store the medical data
    const userEmergencies = this.medicalEmergencyData.get(data.patientId) || []
    userEmergencies.push(data)
    this.medicalEmergencyData.set(data.patientId, userEmergencies)

    // Find matching triggers
    const triggers = this.getUserTriggers(data.patientId).filter(
      trigger => trigger.type === TriggerType.MEDICAL_EMERGENCY && trigger.isEnabled
    )

    for (const trigger of triggers) {
      if (await this.evaluateMedicalTrigger(trigger, data)) {
        await this.executeTrigger(trigger, { medicalData: data })
      }
    }
  }

  /**
   * Process legal document filing
   */
  async processLegalDocument(data: LegalDocumentData): Promise<void> {
    // Find user by subject name (would need better mapping in production)
    const triggers = Array.from(this.triggers.values()).filter(
      trigger => trigger.type === TriggerType.LEGAL_DOCUMENT_FILED && trigger.isEnabled
    )

    for (const trigger of triggers) {
      if (await this.evaluateLegalDocumentTrigger(trigger, data)) {
        await this.executeTrigger(trigger, { legalDocument: data })
      }
    }
  }

  /**
   * Process beneficiary petition
   */
  async processBeneficiaryPetition(petition: BeneficiaryPetition): Promise<void> {
    const userPetitions = this.beneficiaryPetitions.get(petition.userId) || []
    userPetitions.push(petition)
    this.beneficiaryPetitions.set(petition.userId, userPetitions)

    const triggers = this.getUserTriggers(petition.userId).filter(
      trigger => trigger.type === TriggerType.BENEFICIARY_PETITION && trigger.isEnabled
    )

    for (const trigger of triggers) {
      if (await this.evaluateBeneficiaryPetitionTrigger(trigger, petition)) {
        await this.executeTrigger(trigger, { petition })
      }
    }
  }

  /**
   * Process third-party signal
   */
  async processThirdPartySignal(signal: ThirdPartyTrigger): Promise<void> {
    // Find triggers by service mapping (would need user mapping in production)
    const triggers = Array.from(this.triggers.values()).filter(
      trigger => trigger.type === TriggerType.THIRD_PARTY_SIGNAL && trigger.isEnabled
    )

    for (const trigger of triggers) {
      if (await this.evaluateThirdPartyTrigger(trigger, signal)) {
        await this.executeTrigger(trigger, { thirdPartySignal: signal })
      }
    }
  }

  /**
   * Manual override trigger
   */
  async triggerManualOverride(userId: string, overrideCode: string, triggeredBy: string): Promise<boolean> {
    const triggers = this.getUserTriggers(userId).filter(
      trigger => trigger.type === TriggerType.MANUAL_OVERRIDE && trigger.isEnabled
    )

    for (const trigger of triggers) {
      if (trigger.parameters.overrideCode === overrideCode) {
        await this.executeTrigger(trigger, { 
          manualOverride: { triggeredBy, overrideCode, timestamp: new Date() }
        })
        return true
      }
    }

    return false
  }

  /**
   * Private helper methods
   */
  private async startMonitoring(): Promise<void> {
    if (this.monitoringInterval) return

    this.monitoringInterval = setInterval(async () => {
      await this.checkAllTriggers()
    }, this.CHECK_INTERVAL)
  }

  private async checkAllTriggers(): Promise<void> {
    const activeTriggers = this.getActiveTriggers()
    
    for (const trigger of activeTriggers) {
      try {
        trigger.lastCheckedAt = new Date()
        
        // Check trigger-specific conditions
        switch (trigger.type) {
          case TriggerType.INACTIVITY:
            await this.checkInactivityTrigger(trigger)
            break
          case TriggerType.SCHEDULED_EVENT:
            await this.checkScheduledTrigger(trigger)
            break
          case TriggerType.DEVICE_DETECTION:
            await this.checkDeviceDetectionTrigger(trigger)
            break
          case TriggerType.FINANCIAL_INACTIVITY:
            await this.checkFinancialInactivityTrigger(trigger)
            break
        }
      } catch (error) {
        console.error(`Error checking trigger ${trigger.id}:`, error)
        trigger.status = TriggerStatus.FAILED
      }
    }
  }

  private async executeTrigger(trigger: TriggerCondition, data: any): Promise<void> {
    trigger.status = TriggerStatus.TRIGGERED
    trigger.lastTriggeredAt = new Date()

    const result: TriggerExecutionResult = {
      triggerId: trigger.id,
      executedAt: new Date(),
      success: true,
      actionsExecuted: [],
      data
    }

    try {
      // Execute all configured actions
      for (const actionConfig of trigger.actions) {
        await this.executeAction(actionConfig, trigger, data)
        result.actionsExecuted.push(actionConfig.action)
      }

      // Log successful trigger execution
      await auditLoggingService.logEvent({
        eventType: 'trigger_execution',
        action: 'trigger_activated',
        resource: 'trigger_condition',
        resourceId: trigger.id,
        result: 'success',
        userId: trigger.userId,
        details: {
          type: trigger.type,
          priority: trigger.priority,
          actionsExecuted: result.actionsExecuted,
          triggerData: data
        },
        riskLevel: trigger.priority === TriggerPriority.CRITICAL ? 'critical' : 'high'
      })

    } catch (error) {
      result.success = false
      result.errors = [error instanceof Error ? error.message : String(error)]
      
      console.error(`Error executing trigger ${trigger.id}:`, error)
      trigger.status = TriggerStatus.FAILED
    }
  }

  private async executeAction(actionConfig: TriggerActionConfig, trigger: TriggerCondition, data: any): Promise<void> {
    // Add delay if specified
    if (actionConfig.delay && actionConfig.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, actionConfig.delay! * 1000))
    }

    switch (actionConfig.action) {
      case TriggerAction.ACTIVATE_EMERGENCY_ACCESS:
        await this.activateEmergencyAccess(trigger, data, actionConfig.parameters)
        break
      case TriggerAction.NOTIFY_BENEFICIARIES:
        await this.notifyBeneficiaries(trigger, data, actionConfig.parameters)
        break
      case TriggerAction.SEND_ALERTS:
        await this.sendAlerts(trigger, data, actionConfig.parameters)
        break
      case TriggerAction.LOG_EVENT:
        await this.logTriggerEvent(trigger, data, actionConfig.parameters)
        break
      case TriggerAction.ESCALATE_TO_MANUAL_REVIEW:
        await this.escalateToManualReview(trigger, data, actionConfig.parameters)
        break
      case TriggerAction.TRIGGER_DEAD_MAN_SWITCH:
        await this.triggerDeadManSwitch(trigger, data, actionConfig.parameters)
        break
    }
  }

  private async activateEmergencyAccess(trigger: TriggerCondition, data: any, params: any): Promise<void> {
    // Integrate with manual activation service
    await manualActivationService.triggerSystemActivation(
      trigger.userId,
      `Triggered by ${trigger.type}: ${trigger.name}`,
      params.activationLevel || 'partial',
      trigger.priority
    )
  }

  private async notifyBeneficiaries(trigger: TriggerCondition, data: any, params: any): Promise<void> {
    // Implementation would notify all beneficiaries
    console.log(`Notifying beneficiaries for trigger ${trigger.id}`)
  }

  private async sendAlerts(trigger: TriggerCondition, data: any, params: any): Promise<void> {
    // Implementation would send various alerts
    console.log(`Sending alerts for trigger ${trigger.id}`)
  }

  private async logTriggerEvent(trigger: TriggerCondition, data: any, params: any): Promise<void> {
    await auditLoggingService.logEvent({
      eventType: 'trigger_event',
      action: 'custom_trigger_logged',
      resource: 'trigger_condition',
      resourceId: trigger.id,
      result: 'success',
      userId: trigger.userId,
      details: { triggerData: data, customParams: params },
      riskLevel: 'medium'
    })
  }

  private async escalateToManualReview(trigger: TriggerCondition, data: any, params: any): Promise<void> {
    // Implementation would create manual review task
    console.log(`Escalating trigger ${trigger.id} to manual review`)
  }

  private async triggerDeadManSwitch(trigger: TriggerCondition, data: any, params: any): Promise<void> {
    // Integration with dead man's switch service
    console.log(`Triggering dead man's switch for user ${trigger.userId}`)
  }

  // Evaluation methods for different trigger types
  private async evaluateMedicalTrigger(trigger: TriggerCondition, data: MedicalEmergencyData): Promise<boolean> {
    const params = trigger.parameters
    
    // Check device type match
    if (params.medicalDevices && !params.medicalDevices.includes(data.deviceType)) {
      return false
    }

    // Check severity threshold
    if (data.severity === 'critical' || (data.severity === 'high' && trigger.priority !== TriggerPriority.LOW)) {
      return true
    }

    // Check vital signs thresholds
    if (params.vitalThresholds && data.vitals) {
      for (const [vital, threshold] of Object.entries(params.vitalThresholds)) {
        const value = (data.vitals as any)[vital]
        if (value !== undefined) {
          if ((threshold.min && value < threshold.min) || (threshold.max && value > threshold.max)) {
            return true
          }
        }
      }
    }

    return false
  }

  private async evaluateLegalDocumentTrigger(trigger: TriggerCondition, data: LegalDocumentData): Promise<boolean> {
    const params = trigger.parameters
    
    // Check document type
    if (params.documentTypes && !params.documentTypes.includes(data.documentType)) {
      return false
    }

    // Check jurisdiction
    if (params.jurisdictions && !params.jurisdictions.includes(data.jurisdiction)) {
      return false
    }

    // Check verification status
    if (data.verificationStatus !== 'verified') {
      return false
    }

    return true
  }

  private async evaluateBeneficiaryPetitionTrigger(trigger: TriggerCondition, petition: BeneficiaryPetition): Promise<boolean> {
    const params = trigger.parameters
    
    // Check if petitioner is in required list
    if (params.requiredBeneficiaries && !params.requiredBeneficiaries.includes(petition.petitionerId)) {
      return false
    }

    // Check minimum supporting beneficiaries
    if (params.minimumPetitioners && petition.supportingBeneficiaries) {
      if (petition.supportingBeneficiaries.length < params.minimumPetitioners) {
        return false
      }
    }

    // Check urgency level
    if (petition.urgencyLevel === 'critical' || (petition.urgencyLevel === 'high' && trigger.priority !== TriggerPriority.LOW)) {
      return true
    }

    return false
  }

  private async evaluateThirdPartyTrigger(trigger: TriggerCondition, signal: ThirdPartyTrigger): Promise<boolean> {
    const params = trigger.parameters
    
    // Check service provider
    if (params.serviceProviders && !params.serviceProviders.includes(signal.serviceId)) {
      return false
    }

    // Check confidence threshold
    if (signal.confidence < 0.7) { // Minimum 70% confidence
      return false
    }

    return signal.isValid
  }

  private async checkInactivityTrigger(trigger: TriggerCondition): Promise<void> {
    // Implementation would check user activity
  }

  private async checkScheduledTrigger(trigger: TriggerCondition): Promise<void> {
    // Implementation would check scheduled events
  }

  private async checkDeviceDetectionTrigger(trigger: TriggerCondition): Promise<void> {
    // Implementation would check device presence
  }

  private async checkFinancialInactivityTrigger(trigger: TriggerCondition): Promise<void> {
    // Implementation would check financial activity
  }

  private generateTriggerId(): string {
    return `trigger_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Singleton instance
export const triggerConditionsService = new TriggerConditionsService()