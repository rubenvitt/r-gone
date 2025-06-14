import { triggerConditionsService, TriggerCondition, TriggerType, TriggerStatus, TriggerPriority, TriggerAction, TriggerMetadata } from './trigger-conditions-service'
import { medicalEmergencyIntegrationService } from './medical-emergency-integration-service'
import { legalDocumentDetectionService } from './legal-document-detection-service'
import { beneficiaryPetitionService } from './beneficiary-petition-service'
import { thirdPartyIntegrationService } from './third-party-integration-service'
import { manualOverrideService } from './manual-override-service'
import { deadManSwitchService } from './dead-man-switch-service'
import { emergencyAccessService } from './emergency-access-service'
import { notificationService } from './notification-service'
import { auditLoggingService } from './audit-logging-service'
import { emailService } from './email-service'

export interface EvaluationResult {
  triggerId: string
  triggered: boolean
  confidence: number // 0-1 scale
  reason: string
  requiredActions: TriggerAction[]
  metadata: Record<string, any>
  timestamp: Date
}

export interface EvaluationContext {
  userId: string
  triggers: TriggerCondition[]
  lastEvaluationAt?: Date
  overrides: Record<string, any>
  emergencyContacts: string[]
}

export interface EvaluationRule {
  id: string
  name: string
  description: string
  conditions: RuleCondition[]
  actions: RuleAction[]
  priority: number
  enabled: boolean
}

export interface RuleCondition {
  type: 'all' | 'any' | 'none'
  conditions: Array<{
    field: string
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in'
    value: any
    weight?: number
  }>
}

export interface RuleAction {
  type: 'notify' | 'grant_access' | 'escalate' | 'wait' | 'require_approval'
  target?: string
  parameters: Record<string, any>
  delay?: number // minutes
}

export interface EvaluationSchedule {
  userId: string
  frequency: 'realtime' | 'minute' | 'hourly' | 'daily' | 'weekly'
  lastRun?: Date
  nextRun: Date
  enabled: boolean
}

export class TriggerEvaluationEngine {
  private evaluationSchedules: Map<string, EvaluationSchedule> = new Map()
  private evaluationRules: Map<string, EvaluationRule[]> = new Map()
  private activeEvaluations: Map<string, NodeJS.Timeout> = new Map()
  private evaluationHistory: Map<string, EvaluationResult[]> = new Map()
  
  constructor() {
    this.initializeDefaultRules()
    this.startEvaluationScheduler()
  }

  /**
   * Initialize default evaluation rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: EvaluationRule[] = [
      // Critical medical emergency rule
      {
        id: 'medical-emergency-critical',
        name: 'Critical Medical Emergency',
        description: 'Immediate access for critical medical emergencies',
        conditions: [{
          type: 'any',
          conditions: [
            { field: 'type', operator: 'equals', value: TriggerType.MEDICAL_EMERGENCY },
            { field: 'metadata.severity', operator: 'equals', value: 'critical' },
            { field: 'metadata.alertType', operator: 'in', value: ['cardiac_arrest', 'severe_fall', 'no_pulse'] }
          ]
        }],
        actions: [
          { type: 'grant_access', parameters: { level: 'full', duration: 24 } },
          { type: 'notify', target: 'emergency_contacts', parameters: { priority: 'urgent' } },
          { type: 'notify', target: 'medical_professionals', parameters: { includeVitals: true } }
        ],
        priority: 100,
        enabled: true
      },
      
      // Legal document verification rule
      {
        id: 'legal-document-death-cert',
        name: 'Death Certificate Filed',
        description: 'Grant access when death certificate is verified',
        conditions: [{
          type: 'all',
          conditions: [
            { field: 'type', operator: 'equals', value: TriggerType.LEGAL_DOCUMENT_FILED },
            { field: 'metadata.documentType', operator: 'equals', value: 'death_certificate' },
            { field: 'metadata.verificationStatus', operator: 'equals', value: 'verified' }
          ]
        }],
        actions: [
          { type: 'wait', parameters: { minutes: 1440 } }, // 24 hour delay
          { type: 'grant_access', parameters: { level: 'full', permanent: true } },
          { type: 'notify', target: 'beneficiaries', parameters: { type: 'final_access' } }
        ],
        priority: 90,
        enabled: true
      },
      
      // Beneficiary petition threshold rule
      {
        id: 'beneficiary-petition-threshold',
        name: 'Multiple Beneficiary Petitions',
        description: 'Evaluate access when multiple beneficiaries petition',
        conditions: [{
          type: 'all',
          conditions: [
            { field: 'type', operator: 'equals', value: TriggerType.BENEFICIARY_PETITION },
            { field: 'metadata.petitionCount', operator: 'greater_than', value: 2 },
            { field: 'metadata.urgency', operator: 'in', value: ['high', 'critical'] }
          ]
        }],
        actions: [
          { type: 'require_approval', target: 'account_owner', parameters: { timeout: 300 } }, // 5 min
          { type: 'escalate', parameters: { to: 'emergency_contacts' } },
          { type: 'notify', target: 'account_owner', parameters: { method: 'all_channels' } }
        ],
        priority: 80,
        enabled: true
      },
      
      // Inactivity detection rule
      {
        id: 'inactivity-detection',
        name: 'Extended Inactivity',
        description: 'Trigger evaluation on extended inactivity',
        conditions: [{
          type: 'all',
          conditions: [
            { field: 'type', operator: 'equals', value: TriggerType.INACTIVITY },
            { field: 'metadata.daysSinceActivity', operator: 'greater_than', value: 30 }
          ]
        }],
        actions: [
          { type: 'notify', target: 'account_owner', parameters: { reminder: true } },
          { type: 'wait', parameters: { minutes: 10080 } }, // 7 days
          { type: 'escalate', parameters: { to: 'trusted_contacts' } }
        ],
        priority: 50,
        enabled: true
      },
      
      // Manual override rule
      {
        id: 'manual-override-immediate',
        name: 'Manual Override Activation',
        description: 'Immediate activation on manual override',
        conditions: [{
          type: 'all',
          conditions: [
            { field: 'type', operator: 'equals', value: TriggerType.MANUAL_OVERRIDE },
            { field: 'metadata.authenticated', operator: 'equals', value: true }
          ]
        }],
        actions: [
          { type: 'grant_access', parameters: { level: 'requested', immediate: true } },
          { type: 'notify', target: 'all', parameters: { includeReason: true } }
        ],
        priority: 95,
        enabled: true
      }
    ]
    
    // Store default rules
    this.evaluationRules.set('default', defaultRules)
  }

  /**
   * Start the evaluation scheduler
   */
  private startEvaluationScheduler(): void {
    // Check for scheduled evaluations every minute
    setInterval(() => {
      this.runScheduledEvaluations()
    }, 60000) // 1 minute
  }

  /**
   * Run scheduled evaluations
   */
  private async runScheduledEvaluations(): Promise<void> {
    const now = new Date()
    
    for (const [userId, schedule] of this.evaluationSchedules) {
      if (!schedule.enabled || schedule.nextRun > now) continue
      
      try {
        await this.evaluateUserTriggers(userId)
        
        // Update next run time
        schedule.lastRun = now
        schedule.nextRun = this.calculateNextRun(schedule.frequency, now)
        this.evaluationSchedules.set(userId, schedule)
      } catch (error) {
        console.error(`Failed to run scheduled evaluation for user ${userId}:`, error)
        await auditLoggingService.logError(
          'trigger_evaluation_failed',
          `Scheduled evaluation failed for user ${userId}`,
          { userId, error: error instanceof Error ? error.message : 'Unknown error' }
        )
      }
    }
  }

  /**
   * Calculate next run time based on frequency
   */
  private calculateNextRun(frequency: EvaluationSchedule['frequency'], from: Date): Date {
    const next = new Date(from)
    
    switch (frequency) {
      case 'realtime':
        return next // Realtime checks are event-driven
      case 'minute':
        next.setMinutes(next.getMinutes() + 1)
        break
      case 'hourly':
        next.setHours(next.getHours() + 1)
        break
      case 'daily':
        next.setDate(next.getDate() + 1)
        break
      case 'weekly':
        next.setDate(next.getDate() + 7)
        break
    }
    
    return next
  }

  /**
   * Evaluate all triggers for a user
   */
  async evaluateUserTriggers(userId: string): Promise<EvaluationResult[]> {
    try {
      // Get all active triggers for user
      const triggers = await triggerConditionsService.getUserTriggers(userId)
      const activeTriggers = triggers.filter(t => 
        t.status === TriggerStatus.ACTIVE || t.status === TriggerStatus.PENDING
      )
      
      if (activeTriggers.length === 0) {
        return []
      }
      
      // Get user context
      const context: EvaluationContext = {
        userId,
        triggers: activeTriggers,
        lastEvaluationAt: this.getLastEvaluationTime(userId),
        overrides: await this.getUserOverrides(userId),
        emergencyContacts: await this.getEmergencyContacts(userId)
      }
      
      // Evaluate each trigger
      const results: EvaluationResult[] = []
      for (const trigger of activeTriggers) {
        const result = await this.evaluateTrigger(trigger, context)
        results.push(result)
        
        // Process result if triggered
        if (result.triggered) {
          await this.processTriggerResult(trigger, result, context)
        }
      }
      
      // Store evaluation history
      this.storeEvaluationHistory(userId, results)
      
      // Log evaluation
      await auditLoggingService.logTriggerEvaluation(
        userId,
        'evaluation_completed',
        'success',
        {
          triggersEvaluated: results.length,
          triggered: results.filter(r => r.triggered).length
        }
      )
      
      return results
    } catch (error) {
      console.error('Error evaluating user triggers:', error)
      throw error
    }
  }

  /**
   * Evaluate a single trigger
   */
  private async evaluateTrigger(
    trigger: TriggerCondition,
    context: EvaluationContext
  ): Promise<EvaluationResult> {
    const result: EvaluationResult = {
      triggerId: trigger.id,
      triggered: false,
      confidence: 0,
      reason: 'Not triggered',
      requiredActions: [],
      metadata: {},
      timestamp: new Date()
    }
    
    try {
      // Check trigger-specific conditions
      switch (trigger.type) {
        case TriggerType.MEDICAL_EMERGENCY:
          const medicalResult = await this.evaluateMedicalEmergency(trigger, context)
          Object.assign(result, medicalResult)
          break
          
        case TriggerType.LEGAL_DOCUMENT_FILED:
          const legalResult = await this.evaluateLegalDocument(trigger, context)
          Object.assign(result, legalResult)
          break
          
        case TriggerType.BENEFICIARY_PETITION:
          const petitionResult = await this.evaluateBeneficiaryPetition(trigger, context)
          Object.assign(result, petitionResult)
          break
          
        case TriggerType.THIRD_PARTY_SIGNAL:
          const thirdPartyResult = await this.evaluateThirdPartySignal(trigger, context)
          Object.assign(result, thirdPartyResult)
          break
          
        case TriggerType.MANUAL_OVERRIDE:
          const overrideResult = await this.evaluateManualOverride(trigger, context)
          Object.assign(result, overrideResult)
          break
          
        case TriggerType.INACTIVITY:
          const inactivityResult = await this.evaluateInactivity(trigger, context)
          Object.assign(result, inactivityResult)
          break
          
        default:
          result.reason = `Unknown trigger type: ${trigger.type}`
      }
      
      // Apply rules to determine actions
      if (result.triggered) {
        const rules = await this.getApplicableRules(trigger, result)
        result.requiredActions = this.determineActions(rules, trigger, result)
      }
      
    } catch (error) {
      console.error(`Error evaluating trigger ${trigger.id}:`, error)
      result.reason = 'Evaluation error'
      result.metadata.error = error instanceof Error ? error.message : 'Unknown error'
    }
    
    return result
  }

  /**
   * Evaluate medical emergency trigger
   */
  private async evaluateMedicalEmergency(
    trigger: TriggerCondition,
    context: EvaluationContext
  ): Promise<Partial<EvaluationResult>> {
    const emergencies = await medicalEmergencyIntegrationService.getActiveEmergencies(context.userId)
    
    if (emergencies.length === 0) {
      return { triggered: false, confidence: 0, reason: 'No active medical emergencies' }
    }
    
    // Find highest severity emergency
    const critical = emergencies.find(e => e.severity === 'critical')
    const high = emergencies.find(e => e.severity === 'high')
    const emergency = critical || high || emergencies[0]
    
    if (!emergency) {
      return { triggered: false, confidence: 0, reason: 'No significant emergencies' }
    }
    
    // Calculate confidence based on factors
    let confidence = 0.5
    if (emergency.severity === 'critical') confidence = 1.0
    else if (emergency.severity === 'high') confidence = 0.8
    if (emergency.verified) confidence = Math.min(confidence + 0.2, 1.0)
    if (emergency.deviceData?.signalStrength && emergency.deviceData.signalStrength > 80) {
      confidence = Math.min(confidence + 0.1, 1.0)
    }
    
    return {
      triggered: true,
      confidence,
      reason: `${emergency.severity} medical emergency detected: ${emergency.type}`,
      metadata: {
        emergencyId: emergency.id,
        type: emergency.type,
        severity: emergency.severity,
        deviceId: emergency.deviceId,
        timestamp: emergency.detectedAt
      }
    }
  }

  /**
   * Evaluate legal document trigger
   */
  private async evaluateLegalDocument(
    trigger: TriggerCondition,
    context: EvaluationContext
  ): Promise<Partial<EvaluationResult>> {
    const documents = await legalDocumentDetectionService.getVerifiedDocuments(context.userId)
    
    const deathCert = documents.find(d => 
      d.type === 'death_certificate' && 
      d.verificationStatus === 'verified'
    )
    
    if (deathCert) {
      return {
        triggered: true,
        confidence: 1.0,
        reason: 'Verified death certificate on file',
        metadata: {
          documentId: deathCert.id,
          documentType: deathCert.type,
          verifiedAt: deathCert.verifiedAt,
          jurisdiction: deathCert.jurisdiction
        }
      }
    }
    
    // Check for other critical documents
    const criticalDocs = documents.filter(d => 
      ['court_order', 'medical_directive'].includes(d.type) &&
      d.verificationStatus === 'verified'
    )
    
    if (criticalDocs.length > 0) {
      return {
        triggered: true,
        confidence: 0.8,
        reason: `${criticalDocs.length} critical legal documents verified`,
        metadata: {
          documents: criticalDocs.map(d => ({
            id: d.id,
            type: d.type,
            verifiedAt: d.verifiedAt
          }))
        }
      }
    }
    
    return { triggered: false, confidence: 0, reason: 'No verified critical documents' }
  }

  /**
   * Evaluate beneficiary petition trigger
   */
  private async evaluateBeneficiaryPetition(
    trigger: TriggerCondition,
    context: EvaluationContext
  ): Promise<Partial<EvaluationResult>> {
    const petitions = await beneficiaryPetitionService.getActivePetitions(context.userId)
    const approvedPetitions = petitions.filter(p => p.status === 'approved')
    const pendingPetitions = petitions.filter(p => p.status === 'pending')
    
    // Check for auto-approved petitions
    if (approvedPetitions.length > 0) {
      return {
        triggered: true,
        confidence: 1.0,
        reason: `${approvedPetitions.length} beneficiary petitions approved`,
        metadata: {
          approvedCount: approvedPetitions.length,
          petitions: approvedPetitions.map(p => ({
            id: p.id,
            petitionerId: p.petitionerId,
            type: p.type,
            approvedAt: p.updatedAt
          }))
        }
      }
    }
    
    // Check threshold for pending petitions
    const urgentPetitions = pendingPetitions.filter(p => 
      ['high', 'critical'].includes(p.urgency)
    )
    
    if (urgentPetitions.length >= 3) {
      return {
        triggered: true,
        confidence: 0.7,
        reason: `${urgentPetitions.length} urgent beneficiary petitions pending`,
        metadata: {
          pendingCount: urgentPetitions.length,
          totalPetitions: petitions.length,
          requiresApproval: true
        }
      }
    }
    
    return { 
      triggered: false, 
      confidence: 0, 
      reason: 'Insufficient beneficiary petitions',
      metadata: { pendingCount: pendingPetitions.length }
    }
  }

  /**
   * Evaluate third-party signal trigger
   */
  private async evaluateThirdPartySignal(
    trigger: TriggerCondition,
    context: EvaluationContext
  ): Promise<Partial<EvaluationResult>> {
    const signals = await thirdPartyIntegrationService.getActiveSignals(context.userId)
    const verifiedSignals = signals.filter(s => s.verified)
    
    // Check for death notifications
    const deathSignals = verifiedSignals.filter(s => 
      s.signalType === 'death_notification'
    )
    
    if (deathSignals.length > 0) {
      return {
        triggered: true,
        confidence: 0.9,
        reason: `Death notification from ${deathSignals.length} sources`,
        metadata: {
          signals: deathSignals.map(s => ({
            id: s.id,
            source: s.sourceName,
            receivedAt: s.receivedAt
          }))
        }
      }
    }
    
    // Check for multiple corroborating signals
    const criticalSignals = verifiedSignals.filter(s => 
      ['obituary_published', 'memorial_account_creation'].includes(s.signalType)
    )
    
    if (criticalSignals.length >= 2) {
      return {
        triggered: true,
        confidence: 0.8,
        reason: 'Multiple third-party indicators detected',
        metadata: {
          signalCount: criticalSignals.length,
          signalTypes: [...new Set(criticalSignals.map(s => s.signalType))]
        }
      }
    }
    
    return { 
      triggered: false, 
      confidence: 0, 
      reason: 'No significant third-party signals'
    }
  }

  /**
   * Evaluate manual override trigger
   */
  private async evaluateManualOverride(
    trigger: TriggerCondition,
    context: EvaluationContext
  ): Promise<Partial<EvaluationResult>> {
    const overrides = await manualOverrideService.getActiveOverrides(context.userId)
    
    if (overrides.length === 0) {
      return { triggered: false, confidence: 0, reason: 'No active manual overrides' }
    }
    
    // Find highest priority override
    const emergency = overrides.find(o => o.priority === 'emergency')
    const critical = overrides.find(o => o.priority === 'critical')
    const override = emergency || critical || overrides[0]
    
    return {
      triggered: true,
      confidence: 1.0, // Manual overrides are always high confidence
      reason: `Manual override: ${override.reason}`,
      metadata: {
        overrideId: override.id,
        type: override.type,
        priority: override.priority,
        authenticatedWith: override.authenticationMethod,
        initiatedAt: override.createdAt
      }
    }
  }

  /**
   * Evaluate inactivity trigger
   */
  private async evaluateInactivity(
    trigger: TriggerCondition,
    context: EvaluationContext
  ): Promise<Partial<EvaluationResult>> {
    const switchStatus = await deadManSwitchService.getSwitchStatus(context.userId)
    
    if (!switchStatus || !switchStatus.isEnabled) {
      return { triggered: false, confidence: 0, reason: 'Dead man switch not enabled' }
    }
    
    const daysSinceCheckin = Math.floor(
      (Date.now() - new Date(switchStatus.lastCheckinAt).getTime()) / (1000 * 60 * 60 * 24)
    )
    
    if (daysSinceCheckin < switchStatus.checkInIntervalDays) {
      return { 
        triggered: false, 
        confidence: 0, 
        reason: 'Recent check-in recorded',
        metadata: { daysSinceCheckin, requiredDays: switchStatus.checkInIntervalDays }
      }
    }
    
    // Calculate confidence based on how overdue
    const daysOverdue = daysSinceCheckin - switchStatus.checkInIntervalDays
    const confidence = Math.min(0.5 + (daysOverdue * 0.1), 1.0)
    
    return {
      triggered: true,
      confidence,
      reason: `No check-in for ${daysSinceCheckin} days (${daysOverdue} days overdue)`,
      metadata: {
        lastCheckinAt: switchStatus.lastCheckinAt,
        daysSinceCheckin,
        daysOverdue,
        checkInInterval: switchStatus.checkInIntervalDays
      }
    }
  }

  /**
   * Get applicable rules for trigger
   */
  private async getApplicableRules(
    trigger: TriggerCondition,
    result: EvaluationResult
  ): Promise<EvaluationRule[]> {
    const userRules = this.evaluationRules.get(trigger.userId) || []
    const defaultRules = this.evaluationRules.get('default') || []
    const allRules = [...userRules, ...defaultRules]
    
    // Filter rules that match the trigger and result
    return allRules.filter(rule => {
      if (!rule.enabled) return false
      
      // Evaluate rule conditions
      return this.evaluateRuleConditions(rule.conditions, trigger, result)
    }).sort((a, b) => b.priority - a.priority)
  }

  /**
   * Evaluate rule conditions
   */
  private evaluateRuleConditions(
    conditions: RuleCondition[],
    trigger: TriggerCondition,
    result: EvaluationResult
  ): boolean {
    for (const condition of conditions) {
      const matches = condition.conditions.map(c => {
        const value = this.getFieldValue(c.field, trigger, result)
        return this.evaluateCondition(value, c.operator, c.value)
      })
      
      switch (condition.type) {
        case 'all':
          if (!matches.every(m => m)) return false
          break
        case 'any':
          if (!matches.some(m => m)) return false
          break
        case 'none':
          if (matches.some(m => m)) return false
          break
      }
    }
    
    return true
  }

  /**
   * Get field value from trigger or result
   */
  private getFieldValue(
    field: string,
    trigger: TriggerCondition,
    result: EvaluationResult
  ): any {
    const parts = field.split('.')
    let obj: any = { ...trigger, ...result }
    
    for (const part of parts) {
      obj = obj?.[part]
    }
    
    return obj
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(value: any, operator: string, target: any): boolean {
    switch (operator) {
      case 'equals':
        return value === target
      case 'not_equals':
        return value !== target
      case 'contains':
        return String(value).includes(String(target))
      case 'greater_than':
        return Number(value) > Number(target)
      case 'less_than':
        return Number(value) < Number(target)
      case 'in':
        return Array.isArray(target) && target.includes(value)
      case 'not_in':
        return Array.isArray(target) && !target.includes(value)
      default:
        return false
    }
  }

  /**
   * Determine actions from rules
   */
  private determineActions(
    rules: EvaluationRule[],
    trigger: TriggerCondition,
    result: EvaluationResult
  ): TriggerAction[] {
    const actions: TriggerAction[] = []
    
    for (const rule of rules) {
      for (const ruleAction of rule.actions) {
        const triggerAction = this.convertRuleAction(ruleAction, trigger, result)
        if (triggerAction) {
          actions.push(triggerAction)
        }
      }
    }
    
    // Remove duplicate actions
    return this.deduplicateActions(actions)
  }

  /**
   * Convert rule action to trigger action
   */
  private convertRuleAction(
    ruleAction: RuleAction,
    trigger: TriggerCondition,
    result: EvaluationResult
  ): TriggerAction | null {
    switch (ruleAction.type) {
      case 'grant_access':
        return TriggerAction.GRANT_ACCESS
      case 'notify':
        return TriggerAction.NOTIFY_CONTACTS
      case 'require_approval':
        return TriggerAction.REQUEST_VERIFICATION
      case 'escalate':
        return TriggerAction.ESCALATE
      case 'wait':
        return TriggerAction.TIME_DELAY
      default:
        return null
    }
  }

  /**
   * Deduplicate actions
   */
  private deduplicateActions(actions: TriggerAction[]): TriggerAction[] {
    return [...new Set(actions)]
  }

  /**
   * Process trigger result
   */
  private async processTriggerResult(
    trigger: TriggerCondition,
    result: EvaluationResult,
    context: EvaluationContext
  ): Promise<void> {
    try {
      // Update trigger status
      await triggerConditionsService.updateTriggerStatus(
        trigger.id,
        TriggerStatus.TRIGGERED,
        result.metadata
      )
      
      // Process each required action
      for (const action of result.requiredActions) {
        await this.executeAction(action, trigger, result, context)
      }
      
      // Send notifications
      await this.sendTriggerNotifications(trigger, result, context)
      
    } catch (error) {
      console.error('Error processing trigger result:', error)
      await auditLoggingService.logError(
        'trigger_processing_failed',
        `Failed to process trigger ${trigger.id}`,
        { triggerId: trigger.id, error: error instanceof Error ? error.message : 'Unknown error' }
      )
    }
  }

  /**
   * Execute a trigger action
   */
  private async executeAction(
    action: TriggerAction,
    trigger: TriggerCondition,
    result: EvaluationResult,
    context: EvaluationContext
  ): Promise<void> {
    switch (action) {
      case TriggerAction.GRANT_ACCESS:
        await this.grantEmergencyAccess(trigger, result, context)
        break
        
      case TriggerAction.NOTIFY_CONTACTS:
        await this.notifyEmergencyContacts(trigger, result, context)
        break
        
      case TriggerAction.REQUEST_VERIFICATION:
        await this.requestUserVerification(trigger, result, context)
        break
        
      case TriggerAction.TIME_DELAY:
        await this.scheduleDelayedAction(trigger, result, context)
        break
        
      case TriggerAction.ESCALATE:
        await this.escalateTrigger(trigger, result, context)
        break
        
      case TriggerAction.LOG_EVENT:
        await this.logTriggerEvent(trigger, result, context)
        break
    }
  }

  /**
   * Grant emergency access
   */
  private async grantEmergencyAccess(
    trigger: TriggerCondition,
    result: EvaluationResult,
    context: EvaluationContext
  ): Promise<void> {
    const accessLevel = result.metadata.accessLevel || 'view_only'
    const duration = result.metadata.duration || 24 // hours
    
    await emergencyAccessService.grantAccess({
      userId: context.userId,
      grantedTo: context.emergencyContacts,
      level: accessLevel,
      reason: `Automatic grant: ${result.reason}`,
      expiresIn: duration * 60 * 60 * 1000,
      triggerId: trigger.id
    })
  }

  /**
   * Notify emergency contacts
   */
  private async notifyEmergencyContacts(
    trigger: TriggerCondition,
    result: EvaluationResult,
    context: EvaluationContext
  ): Promise<void> {
    for (const contactId of context.emergencyContacts) {
      await notificationService.notify({
        userId: contactId,
        type: 'emergency_trigger',
        title: 'Emergency Access Trigger Activated',
        message: result.reason,
        priority: 'high',
        data: {
          triggerId: trigger.id,
          triggerType: trigger.type,
          confidence: result.confidence,
          metadata: result.metadata
        }
      })
    }
  }

  /**
   * Request user verification
   */
  private async requestUserVerification(
    trigger: TriggerCondition,
    result: EvaluationResult,
    context: EvaluationContext
  ): Promise<void> {
    await notificationService.notify({
      userId: context.userId,
      type: 'verification_required',
      title: 'Verification Required',
      message: `Emergency access requested: ${result.reason}. Please verify.`,
      priority: 'urgent',
      requiresAction: true,
      actionUrl: `/verify-trigger/${trigger.id}`,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    })
  }

  /**
   * Schedule delayed action
   */
  private async scheduleDelayedAction(
    trigger: TriggerCondition,
    result: EvaluationResult,
    context: EvaluationContext
  ): Promise<void> {
    const delayMinutes = result.metadata.delayMinutes || 60
    
    setTimeout(async () => {
      // Re-evaluate trigger after delay
      const newResult = await this.evaluateTrigger(trigger, context)
      if (newResult.triggered) {
        await this.processTriggerResult(trigger, newResult, context)
      }
    }, delayMinutes * 60 * 1000)
  }

  /**
   * Escalate trigger
   */
  private async escalateTrigger(
    trigger: TriggerCondition,
    result: EvaluationResult,
    context: EvaluationContext
  ): Promise<void> {
    await triggerConditionsService.updateTrigger(trigger.id, {
      priority: TriggerPriority.CRITICAL,
      metadata: {
        ...trigger.metadata,
        escalated: true,
        escalatedAt: new Date(),
        escalationReason: result.reason
      }
    })
  }

  /**
   * Log trigger event
   */
  private async logTriggerEvent(
    trigger: TriggerCondition,
    result: EvaluationResult,
    context: EvaluationContext
  ): Promise<void> {
    await auditLoggingService.logTriggerEvent(
      context.userId,
      trigger.type,
      'triggered',
      {
        triggerId: trigger.id,
        confidence: result.confidence,
        reason: result.reason,
        actions: result.requiredActions,
        metadata: result.metadata
      }
    )
  }

  /**
   * Send trigger notifications
   */
  private async sendTriggerNotifications(
    trigger: TriggerCondition,
    result: EvaluationResult,
    context: EvaluationContext
  ): Promise<void> {
    // Notify user if enabled
    if (trigger.conditions.notifyOnTrigger) {
      await notificationService.notify({
        userId: context.userId,
        type: 'trigger_activated',
        title: 'Emergency Trigger Activated',
        message: result.reason,
        priority: 'high',
        data: {
          triggerId: trigger.id,
          triggerType: trigger.type,
          actions: result.requiredActions
        }
      })
    }
    
    // Send emails if configured
    if (trigger.conditions.emailOnTrigger) {
      const userEmail = await this.getUserEmail(context.userId)
      if (userEmail) {
        await emailService.sendEmail({
          to: userEmail,
          subject: 'Emergency Access Trigger Activated',
          text: `
            An emergency access trigger has been activated for your account.
            
            Trigger Type: ${trigger.type}
            Reason: ${result.reason}
            Confidence: ${(result.confidence * 100).toFixed(0)}%
            Actions Taken: ${result.requiredActions.join(', ')}
            
            Please log in to review and manage this trigger.
          `
        })
      }
    }
  }

  /**
   * Helper methods
   */
  private async getUserOverrides(userId: string): Promise<Record<string, any>> {
    const overrides = await manualOverrideService.getActiveOverrides(userId)
    return overrides.reduce((acc, override) => {
      acc[override.type] = override
      return acc
    }, {} as Record<string, any>)
  }

  private async getEmergencyContacts(userId: string): Promise<string[]> {
    const contacts = await emergencyAccessService.getEmergencyContacts(userId)
    return contacts.map(c => c.id)
  }

  private getLastEvaluationTime(userId: string): Date | undefined {
    const history = this.evaluationHistory.get(userId)
    if (!history || history.length === 0) return undefined
    return history[history.length - 1].timestamp
  }

  private storeEvaluationHistory(userId: string, results: EvaluationResult[]): void {
    const history = this.evaluationHistory.get(userId) || []
    history.push(...results)
    
    // Keep only last 100 evaluations
    if (history.length > 100) {
      history.splice(0, history.length - 100)
    }
    
    this.evaluationHistory.set(userId, history)
  }

  private async getUserEmail(userId: string): Promise<string | null> {
    // This would normally fetch from user service
    return null
  }

  /**
   * Public API
   */
  
  /**
   * Register user for evaluation
   */
  async registerUser(
    userId: string,
    schedule: Omit<EvaluationSchedule, 'userId'>
  ): Promise<void> {
    this.evaluationSchedules.set(userId, {
      userId,
      ...schedule
    })
  }

  /**
   * Manually trigger evaluation
   */
  async triggerEvaluation(userId: string): Promise<EvaluationResult[]> {
    return this.evaluateUserTriggers(userId)
  }

  /**
   * Get evaluation history
   */
  getEvaluationHistory(userId: string): EvaluationResult[] {
    return this.evaluationHistory.get(userId) || []
  }

  /**
   * Update user rules
   */
  updateUserRules(userId: string, rules: EvaluationRule[]): void {
    this.evaluationRules.set(userId, rules)
  }

  /**
   * Get user schedule
   */
  getUserSchedule(userId: string): EvaluationSchedule | undefined {
    return this.evaluationSchedules.get(userId)
  }

  /**
   * Enable/disable user evaluation
   */
  setUserEvaluationEnabled(userId: string, enabled: boolean): void {
    const schedule = this.evaluationSchedules.get(userId)
    if (schedule) {
      schedule.enabled = enabled
      this.evaluationSchedules.set(userId, schedule)
    }
  }
}

// Create singleton instance
export const triggerEvaluationEngine = new TriggerEvaluationEngine()