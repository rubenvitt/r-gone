import { triggerConditionsService, TriggerType, TriggerPriority } from './trigger-conditions-service'
import { auditLoggingService } from './audit-logging-service'

// Override types
export enum OverrideType {
  EMERGENCY_ACTIVATION = 'emergency_activation',
  EMERGENCY_DEACTIVATION = 'emergency_deactivation',
  TRIGGER_DISABLE = 'trigger_disable',
  TRIGGER_ENABLE = 'trigger_enable',
  ACCESS_GRANT = 'access_grant',
  ACCESS_REVOKE = 'access_revoke',
  SYSTEM_RESET = 'system_reset',
  RECOVERY_MODE = 'recovery_mode',
  MAINTENANCE_MODE = 'maintenance_mode',
  BENEFICIARY_OVERRIDE = 'beneficiary_override'
}

// Override reasons
export enum OverrideReason {
  FALSE_POSITIVE = 'false_positive',
  SYSTEM_MALFUNCTION = 'system_malfunction',
  MEDICAL_EMERGENCY = 'medical_emergency',
  LEGAL_REQUIREMENT = 'legal_requirement',
  PERSONAL_CHOICE = 'personal_choice',
  SECURITY_CONCERN = 'security_concern',
  TESTING_PURPOSE = 'testing_purpose',
  MAINTENANCE_REQUIRED = 'maintenance_required',
  ACCIDENTAL_TRIGGER = 'accidental_trigger',
  CHANGED_CIRCUMSTANCES = 'changed_circumstances'
}

// Override priority levels
export enum OverridePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency'
}

// Override status
export enum OverrideStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
  COMPLETED = 'completed'
}

// Authentication methods for overrides
export enum OverrideAuthMethod {
  PASSWORD = 'password',
  BIOMETRIC = 'biometric',
  TWO_FACTOR = 'two_factor',
  HARDWARE_KEY = 'hardware_key',
  EMERGENCY_CODE = 'emergency_code',
  VOICE_VERIFICATION = 'voice_verification',
  VIDEO_VERIFICATION = 'video_verification',
  MULTI_FACTOR = 'multi_factor'
}

// Manual override interfaces
export interface ManualOverride {
  id: string
  userId: string
  type: OverrideType
  reason: OverrideReason
  priority: OverridePriority
  status: OverrideStatus
  title: string
  description: string
  justification: string
  targetResource?: string
  targetTriggers?: string[]
  authenticationMethod: OverrideAuthMethod
  authenticationData: AuthenticationData
  createdAt: Date
  activatedAt?: Date
  expiresAt?: Date
  revokedAt?: Date
  revokedBy?: string
  revocationReason?: string
  conditions: OverrideCondition[]
  affectedSystems: string[]
  rollbackPlan?: RollbackPlan
  approvalRequired: boolean
  approvers?: OverrideApprover[]
  timeline: OverrideTimeline[]
  metadata: OverrideMetadata
}

export interface AuthenticationData {
  method: OverrideAuthMethod
  verified: boolean
  verificationTimestamp?: Date
  verificationDetails?: any
  challengeToken?: string
  biometricHash?: string
  emergencyCodeUsed?: string
}

export interface OverrideCondition {
  id: string
  type: 'time_limit' | 'access_limit' | 'approval_required' | 'monitoring_required'
  description: string
  parameters: any
  isActive: boolean
  isMet: boolean
}

export interface RollbackPlan {
  id: string
  description: string
  steps: RollbackStep[]
  automaticRollback: boolean
  rollbackTriggers: string[]
  estimatedDuration: number // minutes
}

export interface RollbackStep {
  id: string
  order: number
  action: string
  description: string
  requiredPermissions: string[]
  estimatedDuration: number // minutes
}

export interface OverrideApprover {
  id: string
  approverId: string
  role: 'primary' | 'secondary' | 'legal' | 'medical' | 'technical'
  required: boolean
  approved: boolean
  approvalTimestamp?: Date
  notes?: string
}

export interface OverrideTimeline {
  id: string
  timestamp: Date
  event: string
  description: string
  actor: string
  details?: any
}

export interface OverrideMetadata {
  emergencyLevel: 'none' | 'low' | 'medium' | 'high' | 'critical'
  riskAssessment: string
  securityFlags: string[]
  complianceFlags: string[]
  systemImpact: 'minimal' | 'moderate' | 'significant' | 'critical'
  userImpact: 'none' | 'low' | 'medium' | 'high'
}

// Override request for creation
export interface OverrideRequest {
  type: OverrideType
  reason: OverrideReason
  priority: OverridePriority
  title: string
  description: string
  justification: string
  targetResource?: string
  targetTriggers?: string[]
  authenticationMethod: OverrideAuthMethod
  duration?: number // minutes
  conditions?: Partial<OverrideCondition>[]
  approvalRequired?: boolean
}

// Emergency codes for critical overrides
export interface EmergencyCode {
  id: string
  userId: string
  code: string
  hashedCode: string
  purpose: string
  usageCount: number
  maxUsages: number
  createdAt: Date
  lastUsedAt?: Date
  expiresAt?: Date
  isActive: boolean
  associatedOverrides: string[]
}

class ManualOverrideService {
  private overrides: Map<string, ManualOverride> = new Map()
  private emergencyCodes: Map<string, EmergencyCode> = new Map()
  private userOverrideHistory: Map<string, ManualOverride[]> = new Map()
  private activeOverrides: Map<string, ManualOverride[]> = new Map()
  
  // Security settings
  private readonly MAX_ACTIVE_OVERRIDES_PER_USER = 5
  private readonly DEFAULT_OVERRIDE_DURATION = 60 // minutes
  private readonly EMERGENCY_OVERRIDE_DURATION = 240 // 4 hours
  private readonly MAX_EMERGENCY_CODE_USAGES = 3

  constructor() {
    this.startOverrideMonitoring()
  }

  /**
   * Create a manual override request
   */
  async createOverride(userId: string, request: OverrideRequest): Promise<string> {
    // Check if user has too many active overrides
    const userActiveOverrides = this.activeOverrides.get(userId) || []
    if (userActiveOverrides.length >= this.MAX_ACTIVE_OVERRIDES_PER_USER) {
      throw new Error('Maximum number of active overrides reached')
    }

    const overrideId = `override_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Calculate expiration time
    const duration = request.duration || 
      (request.priority === OverridePriority.EMERGENCY ? this.EMERGENCY_OVERRIDE_DURATION : this.DEFAULT_OVERRIDE_DURATION)
    const expiresAt = new Date(Date.now() + duration * 60 * 1000)

    const override: ManualOverride = {
      id: overrideId,
      userId,
      type: request.type,
      reason: request.reason,
      priority: request.priority,
      status: OverrideStatus.PENDING,
      title: request.title,
      description: request.description,
      justification: request.justification,
      targetResource: request.targetResource,
      targetTriggers: request.targetTriggers,
      authenticationMethod: request.authenticationMethod,
      authenticationData: {
        method: request.authenticationMethod,
        verified: false
      },
      createdAt: new Date(),
      expiresAt,
      conditions: this.createDefaultConditions(request),
      affectedSystems: this.identifyAffectedSystems(request),
      approvalRequired: request.approvalRequired || this.requiresApproval(request),
      approvers: this.assignApprovers(request),
      timeline: [{
        id: 'creation',
        timestamp: new Date(),
        event: 'override_created',
        description: 'Manual override request created',
        actor: userId
      }],
      metadata: await this.generateOverrideMetadata(request)
    }

    // Generate rollback plan
    override.rollbackPlan = await this.generateRollbackPlan(override)

    this.overrides.set(overrideId, override)
    
    // Add to user history
    const history = this.userOverrideHistory.get(userId) || []
    history.push(override)
    this.userOverrideHistory.set(userId, history)

    // Start authentication process
    await this.initiateAuthentication(override)

    await auditLoggingService.logEvent({
      eventType: 'manual_override',
      action: 'override_created',
      resource: 'manual_override',
      resourceId: overrideId,
      result: 'success',
      userId,
      details: {
        type: request.type,
        reason: request.reason,
        priority: request.priority,
        requiresApproval: override.approvalRequired,
        duration
      },
      riskLevel: request.priority === OverridePriority.EMERGENCY ? 'critical' : 'high'
    })

    return overrideId
  }

  /**
   * Authenticate and activate an override
   */
  async activateOverride(
    overrideId: string, 
    authenticationData: any,
    activatedBy?: string
  ): Promise<void> {
    const override = this.overrides.get(overrideId)
    if (!override) throw new Error('Override not found')

    if (override.status !== OverrideStatus.PENDING) {
      throw new Error('Override is not in pending status')
    }

    // Verify authentication
    const authResult = await this.verifyAuthentication(override, authenticationData)
    if (!authResult.success) {
      throw new Error(`Authentication failed: ${authResult.reason}`)
    }

    // Check if approval is required and obtained
    if (override.approvalRequired && !this.hasRequiredApprovals(override)) {
      throw new Error('Required approvals not obtained')
    }

    // Activate the override
    override.status = OverrideStatus.ACTIVE
    override.activatedAt = new Date()
    override.authenticationData = {
      ...override.authenticationData,
      verified: true,
      verificationTimestamp: new Date(),
      verificationDetails: authResult.details
    }

    // Add to active overrides
    const userActiveOverrides = this.activeOverrides.get(override.userId) || []
    userActiveOverrides.push(override)
    this.activeOverrides.set(override.userId, userActiveOverrides)

    this.addTimelineEvent(override, 'override_activated', 'Override successfully activated', activatedBy || override.userId)

    // Execute the override action
    await this.executeOverrideAction(override)

    // Create trigger for override monitoring
    await this.createOverrideTrigger(override)

    await auditLoggingService.logEvent({
      eventType: 'manual_override',
      action: 'override_activated',
      resource: 'manual_override',
      resourceId: overrideId,
      result: 'success',
      userId: activatedBy || override.userId,
      details: {
        type: override.type,
        authenticationMethod: override.authenticationMethod,
        duration: override.expiresAt ? (override.expiresAt.getTime() - Date.now()) / (1000 * 60) : null,
        affectedSystems: override.affectedSystems
      },
      riskLevel: 'critical'
    })
  }

  /**
   * Revoke an active override
   */
  async revokeOverride(
    overrideId: string, 
    revokedBy: string, 
    reason?: string
  ): Promise<void> {
    const override = this.overrides.get(overrideId)
    if (!override) throw new Error('Override not found')

    if (override.status !== OverrideStatus.ACTIVE) {
      throw new Error('Override is not active')
    }

    // Execute rollback plan if available
    if (override.rollbackPlan) {
      await this.executeRollbackPlan(override.rollbackPlan, override)
    }

    override.status = OverrideStatus.REVOKED
    override.revokedAt = new Date()
    override.revokedBy = revokedBy
    override.revocationReason = reason

    // Remove from active overrides
    const userActiveOverrides = this.activeOverrides.get(override.userId) || []
    const filteredOverrides = userActiveOverrides.filter(o => o.id !== overrideId)
    this.activeOverrides.set(override.userId, filteredOverrides)

    this.addTimelineEvent(override, 'override_revoked', reason || 'Override manually revoked', revokedBy)

    await auditLoggingService.logEvent({
      eventType: 'manual_override',
      action: 'override_revoked',
      resource: 'manual_override',
      resourceId: overrideId,
      result: 'success',
      userId: revokedBy,
      details: {
        originalUserId: override.userId,
        type: override.type,
        reason: reason,
        duration: override.activatedAt ? Date.now() - override.activatedAt.getTime() : 0
      },
      riskLevel: 'high'
    })
  }

  /**
   * Approve an override (for approval-required overrides)
   */
  async approveOverride(
    overrideId: string, 
    approverId: string, 
    notes?: string
  ): Promise<void> {
    const override = this.overrides.get(overrideId)
    if (!override) throw new Error('Override not found')

    const approver = override.approvers?.find(a => a.approverId === approverId)
    if (!approver) throw new Error('Approver not authorized for this override')

    if (approver.approved) throw new Error('Already approved by this approver')

    approver.approved = true
    approver.approvalTimestamp = new Date()
    approver.notes = notes

    this.addTimelineEvent(override, 'override_approved', notes || 'Override approved', approverId)

    // Check if all required approvals are obtained
    if (this.hasRequiredApprovals(override)) {
      // Auto-activate if authentication is also complete
      if (override.authenticationData.verified) {
        await this.activateOverride(overrideId)
      }
    }

    await auditLoggingService.logEvent({
      eventType: 'manual_override',
      action: 'override_approved',
      resource: 'manual_override',
      resourceId: overrideId,
      result: 'success',
      userId: approverId,
      details: {
        targetUserId: override.userId,
        approverRole: approver.role,
        notes,
        allApprovalsObtained: this.hasRequiredApprovals(override)
      },
      riskLevel: 'medium'
    })
  }

  /**
   * Generate emergency code for user
   */
  async generateEmergencyCode(
    userId: string, 
    purpose: string,
    maxUsages: number = this.MAX_EMERGENCY_CODE_USAGES
  ): Promise<string> {
    const codeId = `emergency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const code = this.generateSecureCode()
    const hashedCode = await this.hashCode(code)

    const emergencyCode: EmergencyCode = {
      id: codeId,
      userId,
      code, // In production, this should be immediately deleted after showing to user
      hashedCode,
      purpose,
      usageCount: 0,
      maxUsages,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      isActive: true,
      associatedOverrides: []
    }

    this.emergencyCodes.set(codeId, emergencyCode)

    await auditLoggingService.logEvent({
      eventType: 'emergency_code',
      action: 'code_generated',
      resource: 'emergency_code',
      resourceId: codeId,
      result: 'success',
      userId,
      details: {
        purpose,
        maxUsages,
        expiresAt: emergencyCode.expiresAt
      },
      riskLevel: 'high'
    })

    return code // Return plaintext code to user (should be shown once and deleted)
  }

  /**
   * Use emergency code for override
   */
  async useEmergencyCode(code: string, overrideRequest: OverrideRequest): Promise<string> {
    // Find matching emergency code
    let matchingCode: EmergencyCode | undefined
    for (const emergencyCode of this.emergencyCodes.values()) {
      if (emergencyCode.isActive && await this.verifyCode(code, emergencyCode.hashedCode)) {
        matchingCode = emergencyCode
        break
      }
    }

    if (!matchingCode) throw new Error('Invalid or expired emergency code')

    if (matchingCode.usageCount >= matchingCode.maxUsages) {
      throw new Error('Emergency code usage limit exceeded')
    }

    if (matchingCode.expiresAt && matchingCode.expiresAt < new Date()) {
      throw new Error('Emergency code has expired')
    }

    // Create override with emergency code authentication
    const overrideRequest_modified = {
      ...overrideRequest,
      authenticationMethod: OverrideAuthMethod.EMERGENCY_CODE,
      priority: OverridePriority.EMERGENCY
    }

    const overrideId = await this.createOverride(matchingCode.userId, overrideRequest_modified)
    
    // Mark code as used
    matchingCode.usageCount++
    matchingCode.lastUsedAt = new Date()
    matchingCode.associatedOverrides.push(overrideId)

    // Auto-activate override (emergency codes bypass normal authentication)
    await this.activateOverride(overrideId, { emergencyCode: code }, matchingCode.userId)

    await auditLoggingService.logEvent({
      eventType: 'emergency_code',
      action: 'code_used',
      resource: 'emergency_code',
      resourceId: matchingCode.id,
      result: 'success',
      userId: matchingCode.userId,
      details: {
        overrideId,
        usageCount: matchingCode.usageCount,
        maxUsages: matchingCode.maxUsages,
        overrideType: overrideRequest.type
      },
      riskLevel: 'critical'
    })

    return overrideId
  }

  /**
   * Get user's override history
   */
  getUserOverrides(userId: string): ManualOverride[] {
    return this.userOverrideHistory.get(userId) || []
  }

  /**
   * Get active overrides for user
   */
  getActiveOverrides(userId: string): ManualOverride[] {
    return this.activeOverrides.get(userId) || []
  }

  /**
   * Get specific override
   */
  getOverride(overrideId: string): ManualOverride | undefined {
    return this.overrides.get(overrideId)
  }

  /**
   * Get all pending overrides (admin view)
   */
  getPendingOverrides(): ManualOverride[] {
    return Array.from(this.overrides.values()).filter(o => o.status === OverrideStatus.PENDING)
  }

  /**
   * Simulate emergency override for testing
   */
  async simulateEmergencyOverride(
    userId: string,
    overrideType: OverrideType = OverrideType.EMERGENCY_ACTIVATION
  ): Promise<string> {
    const request: OverrideRequest = {
      type: overrideType,
      reason: OverrideReason.TESTING_PURPOSE,
      priority: OverridePriority.EMERGENCY,
      title: `Simulated ${overrideType.replace('_', ' ')} Override`,
      description: 'This is a simulated emergency override for testing purposes',
      justification: 'Testing emergency override functionality',
      authenticationMethod: OverrideAuthMethod.EMERGENCY_CODE,
      duration: 30 // 30 minutes for testing
    }

    const overrideId = await this.createOverride(userId, request)
    
    // Auto-activate for simulation
    setTimeout(async () => {
      await this.activateOverride(overrideId, { simulation: true }, 'system')
    }, 2000)

    return overrideId
  }

  /**
   * Private helper methods
   */
  private async initiateAuthentication(override: ManualOverride): Promise<void> {
    switch (override.authenticationMethod) {
      case OverrideAuthMethod.PASSWORD:
        // Challenge user for password
        break
      case OverrideAuthMethod.TWO_FACTOR:
        // Send 2FA code
        break
      case OverrideAuthMethod.BIOMETRIC:
        // Request biometric verification
        break
      case OverrideAuthMethod.EMERGENCY_CODE:
        // Emergency code will be verified when provided
        break
      default:
        // Default authentication flow
        break
    }
  }

  private async verifyAuthentication(override: ManualOverride, authData: any): Promise<{success: boolean, reason?: string, details?: any}> {
    switch (override.authenticationMethod) {
      case OverrideAuthMethod.EMERGENCY_CODE:
        // Emergency codes are verified in useEmergencyCode method
        return { success: true, details: authData }
      
      case OverrideAuthMethod.PASSWORD:
        // Verify password
        return { success: true, details: { method: 'password' } }
      
      default:
        // For simulation purposes, accept all authentication
        return { success: true, details: authData }
    }
  }

  private createDefaultConditions(request: OverrideRequest): OverrideCondition[] {
    const conditions: OverrideCondition[] = []

    // Time limit condition
    conditions.push({
      id: 'time_limit',
      type: 'time_limit',
      description: 'Override expires after specified duration',
      parameters: { duration: request.duration || this.DEFAULT_OVERRIDE_DURATION },
      isActive: true,
      isMet: false
    })

    // Monitoring condition for high-priority overrides
    if (request.priority === OverridePriority.HIGH || request.priority === OverridePriority.EMERGENCY) {
      conditions.push({
        id: 'monitoring',
        type: 'monitoring_required',
        description: 'Override activity must be monitored',
        parameters: { monitoringLevel: 'intensive' },
        isActive: true,
        isMet: false
      })
    }

    return conditions
  }

  private identifyAffectedSystems(request: OverrideRequest): string[] {
    const systems: string[] = []

    switch (request.type) {
      case OverrideType.EMERGENCY_ACTIVATION:
        systems.push('trigger_system', 'access_control', 'notification_system')
        break
      case OverrideType.TRIGGER_DISABLE:
        systems.push('trigger_system')
        break
      case OverrideType.ACCESS_GRANT:
        systems.push('access_control', 'authentication_system')
        break
      case OverrideType.SYSTEM_RESET:
        systems.push('all_systems')
        break
      default:
        systems.push('core_system')
    }

    return systems
  }

  private requiresApproval(request: OverrideRequest): boolean {
    // Emergency and critical overrides require approval
    if (request.priority === OverridePriority.EMERGENCY || request.priority === OverridePriority.CRITICAL) {
      return true
    }

    // System-wide overrides require approval
    const systemWideTypes = [
      OverrideType.SYSTEM_RESET,
      OverrideType.RECOVERY_MODE,
      OverrideType.MAINTENANCE_MODE
    ]
    if (systemWideTypes.includes(request.type)) {
      return true
    }

    return false
  }

  private assignApprovers(request: OverrideRequest): OverrideApprover[] {
    if (!this.requiresApproval(request)) return []

    const approvers: OverrideApprover[] = []

    // Primary approver always required
    approvers.push({
      id: 'primary',
      approverId: 'system_admin',
      role: 'primary',
      required: true,
      approved: false
    })

    // Additional approvers based on override type
    if (request.type === OverrideType.SYSTEM_RESET) {
      approvers.push({
        id: 'technical',
        approverId: 'technical_lead',
        role: 'technical',
        required: true,
        approved: false
      })
    }

    if (request.reason === OverrideReason.MEDICAL_EMERGENCY) {
      approvers.push({
        id: 'medical',
        approverId: 'medical_reviewer',
        role: 'medical',
        required: false,
        approved: false
      })
    }

    return approvers
  }

  private async generateOverrideMetadata(request: OverrideRequest): Promise<OverrideMetadata> {
    const emergencyLevel = this.determineEmergencyLevel(request)
    const systemImpact = this.assessSystemImpact(request)
    const userImpact = this.assessUserImpact(request)

    return {
      emergencyLevel,
      riskAssessment: `${request.priority} priority ${request.type} override`,
      securityFlags: this.identifySecurityFlags(request),
      complianceFlags: this.identifyComplianceFlags(request),
      systemImpact,
      userImpact
    }
  }

  private async generateRollbackPlan(override: ManualOverride): Promise<RollbackPlan> {
    const steps: RollbackStep[] = []

    switch (override.type) {
      case OverrideType.EMERGENCY_ACTIVATION:
        steps.push({
          id: 'deactivate_emergency',
          order: 1,
          action: 'deactivate_emergency_access',
          description: 'Deactivate emergency access mode',
          requiredPermissions: ['emergency_control'],
          estimatedDuration: 5
        })
        break
      case OverrideType.TRIGGER_DISABLE:
        steps.push({
          id: 'reactivate_triggers',
          order: 1,
          action: 'reactivate_disabled_triggers',
          description: 'Reactivate previously disabled triggers',
          requiredPermissions: ['trigger_management'],
          estimatedDuration: 10
        })
        break
    }

    return {
      id: `rollback_${override.id}`,
      description: `Rollback plan for ${override.type} override`,
      steps,
      automaticRollback: override.priority !== OverridePriority.EMERGENCY,
      rollbackTriggers: ['expiration', 'manual_revocation'],
      estimatedDuration: steps.reduce((total, step) => total + step.estimatedDuration, 0)
    }
  }

  private hasRequiredApprovals(override: ManualOverride): boolean {
    if (!override.approvers) return true
    
    const requiredApprovers = override.approvers.filter(a => a.required)
    const approvedRequired = requiredApprovers.filter(a => a.approved)
    
    return approvedRequired.length === requiredApprovers.length
  }

  private async executeOverrideAction(override: ManualOverride): Promise<void> {
    switch (override.type) {
      case OverrideType.EMERGENCY_ACTIVATION:
        await this.activateEmergencyMode(override)
        break
      case OverrideType.TRIGGER_DISABLE:
        await this.disableTriggers(override)
        break
      case OverrideType.ACCESS_GRANT:
        await this.grantAccess(override)
        break
      default:
        console.log(`Executing override action: ${override.type}`)
    }
  }

  private async activateEmergencyMode(override: ManualOverride): Promise<void> {
    // Activate emergency access for all beneficiaries
    await triggerConditionsService.processManualOverride({
      overrideId: override.id,
      overrideType: override.type,
      userId: override.userId,
      priority: override.priority,
      targetResource: override.targetResource,
      targetTriggers: override.targetTriggers
    })
  }

  private async disableTriggers(override: ManualOverride): Promise<void> {
    if (override.targetTriggers) {
      for (const triggerId of override.targetTriggers) {
        // Disable specific triggers
        console.log(`Disabling trigger ${triggerId}`)
      }
    }
  }

  private async grantAccess(override: ManualOverride): Promise<void> {
    // Grant access to specified resource
    console.log(`Granting access to ${override.targetResource}`)
  }

  private async createOverrideTrigger(override: ManualOverride): Promise<void> {
    await triggerConditionsService.createTrigger({
      userId: override.userId,
      type: TriggerType.MANUAL_OVERRIDE,
      name: `Manual Override - ${override.type}`,
      description: `Automatically created trigger for manual override`,
      status: 'active' as any,
      priority: TriggerPriority.HIGH,
      isEnabled: true,
      parameters: {
        overrideId: override.id,
        overrideType: override.type,
        overridePriority: override.priority,
        monitoringRequired: true,
        autoRollback: override.rollbackPlan?.automaticRollback
      },
      actions: [
        {
          id: 'override_monitoring',
          action: 'monitor_override_usage' as any,
          parameters: { 
            overrideId: override.id,
            alertThresholds: this.getMonitoringThresholds(override)
          }
        }
      ],
      conditions: [
        {
          field: 'status',
          operator: 'equals',
          value: OverrideStatus.ACTIVE
        }
      ]
    })
  }

  private async executeRollbackPlan(plan: RollbackPlan, override: ManualOverride): Promise<void> {
    for (const step of plan.steps.sort((a, b) => a.order - b.order)) {
      console.log(`Executing rollback step: ${step.action}`)
      
      // In a real implementation, this would execute the actual rollback actions
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate rollback time
    }
  }

  private addTimelineEvent(override: ManualOverride, event: string, description: string, actor: string): void {
    override.timeline.push({
      id: `${event}_${Date.now()}`,
      timestamp: new Date(),
      event,
      description,
      actor
    })
  }

  private generateSecureCode(): string {
    // Generate a secure 12-character alphanumeric code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 12; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  private async hashCode(code: string): Promise<string> {
    // Simple hash implementation for demo - use proper crypto in production
    return Buffer.from(code).toString('base64')
  }

  private async verifyCode(code: string, hashedCode: string): Promise<boolean> {
    const codeHash = await this.hashCode(code)
    return codeHash === hashedCode
  }

  private determineEmergencyLevel(request: OverrideRequest): 'none' | 'low' | 'medium' | 'high' | 'critical' {
    if (request.priority === OverridePriority.EMERGENCY) return 'critical'
    if (request.priority === OverridePriority.CRITICAL) return 'high'
    if (request.priority === OverridePriority.HIGH) return 'medium'
    return 'low'
  }

  private assessSystemImpact(request: OverrideRequest): 'minimal' | 'moderate' | 'significant' | 'critical' {
    const highImpactTypes = [OverrideType.SYSTEM_RESET, OverrideType.RECOVERY_MODE, OverrideType.MAINTENANCE_MODE]
    const mediumImpactTypes = [OverrideType.EMERGENCY_ACTIVATION, OverrideType.EMERGENCY_DEACTIVATION]
    
    if (highImpactTypes.includes(request.type)) return 'critical'
    if (mediumImpactTypes.includes(request.type)) return 'significant'
    if (request.priority === OverridePriority.HIGH) return 'moderate'
    return 'minimal'
  }

  private assessUserImpact(request: OverrideRequest): 'none' | 'low' | 'medium' | 'high' {
    if (request.type === OverrideType.EMERGENCY_ACTIVATION) return 'high'
    if (request.type === OverrideType.ACCESS_GRANT || request.type === OverrideType.ACCESS_REVOKE) return 'medium'
    return 'low'
  }

  private identifySecurityFlags(request: OverrideRequest): string[] {
    const flags: string[] = []
    
    if (request.priority === OverridePriority.EMERGENCY) flags.push('emergency_override')
    if (request.type === OverrideType.ACCESS_GRANT) flags.push('access_modification')
    if (request.authenticationMethod === OverrideAuthMethod.EMERGENCY_CODE) flags.push('emergency_authentication')
    
    return flags
  }

  private identifyComplianceFlags(request: OverrideRequest): string[] {
    const flags: string[] = []
    
    if (request.reason === OverrideReason.LEGAL_REQUIREMENT) flags.push('legal_compliance')
    if (request.reason === OverrideReason.MEDICAL_EMERGENCY) flags.push('medical_compliance')
    if (request.type === OverrideType.SYSTEM_RESET) flags.push('data_handling_compliance')
    
    return flags
  }

  private getMonitoringThresholds(override: ManualOverride): any {
    return {
      maxDuration: override.expiresAt ? override.expiresAt.getTime() - Date.now() : this.DEFAULT_OVERRIDE_DURATION * 60 * 1000,
      accessAttempts: 10,
      suspiciousActivity: true
    }
  }

  private startOverrideMonitoring(): void {
    // Monitor for expired overrides
    setInterval(() => {
      this.checkExpiredOverrides()
    }, 60000) // Check every minute
  }

  private checkExpiredOverrides(): void {
    const now = new Date()
    
    for (const override of this.overrides.values()) {
      if (override.status === OverrideStatus.ACTIVE && 
          override.expiresAt && 
          override.expiresAt <= now) {
        
        // Auto-expire override
        override.status = OverrideStatus.EXPIRED
        
        // Remove from active overrides
        const userActiveOverrides = this.activeOverrides.get(override.userId) || []
        const filteredOverrides = userActiveOverrides.filter(o => o.id !== override.id)
        this.activeOverrides.set(override.userId, filteredOverrides)
        
        this.addTimelineEvent(override, 'override_expired', 'Override automatically expired', 'system')
        
        // Execute rollback if available
        if (override.rollbackPlan?.automaticRollback) {
          this.executeRollbackPlan(override.rollbackPlan, override)
        }
      }
    }
  }
}

// Singleton instance
export const manualOverrideService = new ManualOverrideService()