import crypto from 'crypto';
import { 
  AccessControlMatrix,
  AccessControlRule,
  AccessSubject,
  AccessResource,
  AccessPermissionSet,
  AccessCondition,
  AccessRequest,
  TemporaryAccessGrant,
  PermissionEvaluation,
  TimeConstraint,
  ResourceType,
  ConditionType,
  BeneficiaryManagementSystem,
  Beneficiary,
  BeneficiaryGroup
} from '@/types/data';
import { auditLoggingService } from './audit-logging-service';
import { beneficiaryManagementService } from './beneficiary-management-service';

export class AccessControlService {
  private static instance: AccessControlService;
  private dataDirectory: string;
  private permissionCache: Map<string, { evaluation: PermissionEvaluation; timestamp: number }> = new Map();
  private cacheExpiryMs: number = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.dataDirectory = process.cwd() + '/data/access-control';
    this.ensureDataDirectory();
  }

  public static getInstance(): AccessControlService {
    if (!AccessControlService.instance) {
      AccessControlService.instance = new AccessControlService();
    }
    return AccessControlService.instance;
  }

  /**
   * Create a new access control matrix
   */
  async createMatrix(
    name: string,
    description?: string,
    createdBy: string = 'system'
  ): Promise<AccessControlMatrix> {
    const matrix: AccessControlMatrix = {
      id: crypto.randomUUID(),
      name,
      description,
      rules: [],
      defaultPermissions: this.createDefaultPermissions(),
      settings: this.createDefaultSettings(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy,
      isActive: true,
      version: 1
    };

    await this.saveMatrix(matrix);

    await auditLoggingService.logEvent({
      eventType: 'admin_action',
      action: 'create_access_matrix',
      resource: 'access_control_matrix',
      resourceId: matrix.id,
      result: 'success',
      details: { matrixName: name },
      riskLevel: 'medium',
      userId: createdBy
    });

    return matrix;
  }

  /**
   * Add a new access control rule
   */
  async addRule(
    matrix: AccessControlMatrix,
    rule: Omit<AccessControlRule, 'id'>,
    createdBy: string = 'system'
  ): Promise<AccessControlMatrix> {
    const newRule: AccessControlRule = {
      ...rule,
      id: crypto.randomUUID()
    };

    const updatedMatrix = {
      ...matrix,
      rules: [...matrix.rules, newRule].sort((a, b) => a.priority - b.priority),
      updatedAt: new Date().toISOString(),
      version: matrix.version + 1
    };

    await this.saveMatrix(updatedMatrix);
    this.clearPermissionCache();

    await auditLoggingService.logEvent({
      eventType: 'admin_action',
      action: 'add_access_rule',
      resource: 'access_control_rule',
      resourceId: newRule.id,
      result: 'success',
      details: {
        matrixId: matrix.id,
        ruleName: newRule.name,
        priority: newRule.priority
      },
      riskLevel: 'medium',
      userId: createdBy
    });

    return updatedMatrix;
  }

  /**
   * Evaluate permissions for a beneficiary to access a resource
   */
  async evaluatePermissions(
    matrix: AccessControlMatrix,
    beneficiaryId: string,
    resourceType: ResourceType,
    resourceId?: string,
    context?: {
      ipAddress?: string;
      userAgent?: string;
      timestamp?: Date;
      requestedActions?: string[];
    }
  ): Promise<PermissionEvaluation> {
    const startTime = Date.now();
    const cacheKey = `${matrix.id}:${beneficiaryId}:${resourceType}:${resourceId || 'all'}`;

    // Check cache if enabled
    if (matrix.settings.cachePermissions) {
      const cached = this.permissionCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.cacheExpiryMs) {
        return cached.evaluation;
      }
    }

    const beneficiary = await this.getBeneficiary(beneficiaryId);
    if (!beneficiary) {
      return this.createDeniedEvaluation('Beneficiary not found', startTime);
    }

    const applicableRules = await this.findApplicableRules(matrix, beneficiary, resourceType, resourceId);
    const evaluation = await this.processRules(matrix, applicableRules, beneficiary, resourceType, resourceId, context);

    // Cache the result if enabled
    if (matrix.settings.cachePermissions) {
      this.permissionCache.set(cacheKey, {
        evaluation,
        timestamp: Date.now()
      });
    }

    // Audit if enabled
    if (matrix.settings.auditAllAccess) {
      await auditLoggingService.logEvent({
        eventType: 'authorization',
        action: 'evaluate_permissions',
        resource: resourceType,
        resourceId: resourceId,
        result: evaluation.allowed ? 'success' : 'blocked',
        details: {
          beneficiaryId,
          appliedRules: evaluation.appliedRules,
          accessLevel: evaluation.accessLevel,
          evaluationTime: evaluation.evaluationTime
        },
        riskLevel: evaluation.allowed ? 'low' : 'medium',
        userId: beneficiaryId
      });
    }

    return evaluation;
  }

  /**
   * Create a temporary access grant
   */
  async createTemporaryGrant(
    matrix: AccessControlMatrix,
    beneficiaryId: string,
    rule: AccessControlRule,
    expiresAt: string,
    reason: string,
    grantedBy: string,
    maxUsage?: number
  ): Promise<TemporaryAccessGrant> {
    const grant: TemporaryAccessGrant = {
      id: crypto.randomUUID(),
      beneficiaryId,
      rule,
      grantedBy,
      grantedAt: new Date().toISOString(),
      expiresAt,
      reason,
      isActive: true,
      usageCount: 0,
      maxUsage
    };

    await this.saveTemporaryGrant(grant);
    this.clearPermissionCache(); // Clear cache as permissions changed

    await auditLoggingService.logEvent({
      eventType: 'admin_action',
      action: 'create_temporary_grant',
      resource: 'temporary_access_grant',
      resourceId: grant.id,
      result: 'success',
      details: {
        beneficiaryId,
        reason,
        expiresAt,
        maxUsage
      },
      riskLevel: 'medium',
      userId: grantedBy
    });

    return grant;
  }

  /**
   * Process an access request
   */
  async processAccessRequest(
    matrix: AccessControlMatrix,
    request: AccessRequest,
    action: 'approve' | 'deny',
    processedBy: string,
    reason?: string
  ): Promise<AccessRequest> {
    const updatedRequest: AccessRequest = {
      ...request,
      status: action === 'approve' ? 'approved' : 'denied'
    };

    if (action === 'approve') {
      updatedRequest.approvedBy = processedBy;
      updatedRequest.approvedAt = new Date().toISOString();
      updatedRequest.grantedPermissions = request.requestedPermissions as AccessPermissionSet;
      
      // Set validity period (default 24 hours if not specified)
      if (!updatedRequest.validUntil) {
        const validUntil = new Date();
        validUntil.setHours(validUntil.getHours() + 24);
        updatedRequest.validUntil = validUntil.toISOString();
      }
    } else {
      updatedRequest.deniedBy = processedBy;
      updatedRequest.deniedAt = new Date().toISOString();
      updatedRequest.denialReason = reason;
    }

    await this.saveAccessRequest(updatedRequest);
    this.clearPermissionCache(); // Clear cache as permissions may have changed

    await auditLoggingService.logEvent({
      eventType: 'admin_action',
      action: `${action}_access_request`,
      resource: 'access_request',
      resourceId: request.id,
      result: 'success',
      details: {
        requesterId: request.requesterId,
        resourceType: request.resourceType,
        resourceId: request.resourceId,
        reason: action === 'deny' ? reason : undefined
      },
      riskLevel: 'medium',
      userId: processedBy
    });

    return updatedRequest;
  }

  /**
   * Check if a condition is satisfied
   */
  async evaluateCondition(
    condition: AccessCondition,
    context: {
      beneficiary: Beneficiary;
      matrix: AccessControlMatrix;
      resourceType: ResourceType;
      resourceId?: string;
      timestamp?: Date;
      ipAddress?: string;
    }
  ): Promise<{ satisfied: boolean; reason?: string }> {
    const { beneficiary, matrix, timestamp = new Date(), ipAddress } = context;

    switch (condition.type) {
      case 'timeDelay':
        return this.evaluateTimeDelayCondition(condition, beneficiary, timestamp);

      case 'multiFactorAuth':
        return this.evaluateMultiFactorAuthCondition(condition, beneficiary);

      case 'locationBased':
        return this.evaluateLocationCondition(condition, ipAddress);

      case 'emergencyTrigger':
        return this.evaluateEmergencyTriggerCondition(condition, matrix);

      case 'userInactivity':
        return this.evaluateUserInactivityCondition(condition, beneficiary, timestamp);

      case 'deviceTrust':
        return this.evaluateDeviceTrustCondition(condition, context);

      case 'externalVerification':
        return this.evaluateExternalVerificationCondition(condition, beneficiary);

      case 'customCondition':
        return this.evaluateCustomCondition(condition, context);

      default:
        return { satisfied: false, reason: `Unknown condition type: ${condition.type}` };
    }
  }

  // Private helper methods

  private async findApplicableRules(
    matrix: AccessControlMatrix,
    beneficiary: Beneficiary,
    resourceType: ResourceType,
    resourceId?: string
  ): Promise<AccessControlRule[]> {
    const applicableRules: AccessControlRule[] = [];

    for (const rule of matrix.rules) {
      if (!rule.isActive) continue;

      // Check if rule applies to this beneficiary
      const subjectMatch = rule.subjects.some(subject => 
        this.matchesSubject(subject, beneficiary)
      );

      if (!subjectMatch) continue;

      // Check if rule applies to this resource
      const resourceMatch = rule.resources.some(resource =>
        this.matchesResource(resource, resourceType, resourceId)
      );

      if (resourceMatch) {
        applicableRules.push(rule);
      }
    }

    return applicableRules.sort((a, b) => a.priority - b.priority);
  }

  private matchesSubject(subject: AccessSubject, beneficiary: Beneficiary): boolean {
    switch (subject.type) {
      case 'beneficiary':
        return subject.id === beneficiary.id;
      
      case 'trustLevel':
        return subject.id === beneficiary.trustLevel;
      
      case 'relationship':
        return subject.id === beneficiary.relationship;
      
      case 'group':
        // Check if beneficiary is in the specified group
        return this.isBeneficiaryInGroup(beneficiary.id, subject.id);
      
      default:
        return false;
    }
  }

  private matchesResource(
    resource: AccessResource,
    resourceType: ResourceType,
    resourceId?: string
  ): boolean {
    if (resource.type !== resourceType) return false;
    
    // If resource specifies an ID, it must match
    if (resource.id && resourceId) {
      return resource.id === resourceId;
    }
    
    // If no specific ID is required, it matches the type
    return true;
  }

  private async processRules(
    matrix: AccessControlMatrix,
    rules: AccessControlRule[],
    beneficiary: Beneficiary,
    resourceType: ResourceType,
    resourceId?: string,
    context?: any
  ): Promise<PermissionEvaluation> {
    const startTime = Date.now();
    let effectivePermissions = { ...matrix.defaultPermissions };
    const appliedRules: string[] = [];
    const conditionResults: { condition: AccessCondition; satisfied: boolean; reason?: string }[] = [];
    const timeConstraints: TimeConstraint[] = [];
    const requiredActions: string[] = [];

    for (const rule of rules) {
      // Evaluate all conditions for this rule
      let allConditionsSatisfied = true;
      
      for (const condition of rule.conditions) {
        const result = await this.evaluateCondition(condition, {
          beneficiary,
          matrix,
          resourceType,
          resourceId,
          timestamp: context?.timestamp,
          ipAddress: context?.ipAddress
        });
        
        conditionResults.push({
          condition,
          satisfied: result.satisfied,
          reason: result.reason
        });

        if (!result.satisfied) {
          allConditionsSatisfied = false;
          if (result.reason) {
            requiredActions.push(result.reason);
          }
        }
      }

      // Check time constraints
      if (rule.timeConstraints) {
        for (const constraint of rule.timeConstraints) {
          const constraintMet = this.evaluateTimeConstraint(constraint, context?.timestamp);
          if (!constraintMet.satisfied) {
            allConditionsSatisfied = false;
            timeConstraints.push(constraint);
            if (constraintMet.reason) {
              requiredActions.push(constraintMet.reason);
            }
          }
        }
      }

      if (allConditionsSatisfied) {
        // Apply rule permissions based on conflict resolution strategy
        effectivePermissions = this.mergePermissions(
          effectivePermissions,
          rule.permissions,
          matrix.settings.conflictResolution
        );
        appliedRules.push(rule.id);
      }
    }

    const hasAnyPermission = Object.values(effectivePermissions).some(p => p === true);
    const accessLevel = this.determineAccessLevel(effectivePermissions);

    return {
      allowed: hasAnyPermission && conditionResults.every(c => c.satisfied),
      appliedRules,
      deniedBy: conditionResults.find(c => !c.satisfied)?.condition.type,
      conditions: conditionResults,
      effectivePermissions,
      timeConstraints: timeConstraints.length > 0 ? timeConstraints : undefined,
      requiredActions: requiredActions.length > 0 ? requiredActions : undefined,
      accessLevel,
      evaluationTime: Date.now() - startTime
    };
  }

  private mergePermissions(
    base: AccessPermissionSet,
    additional: AccessPermissionSet,
    strategy: 'mostPermissive' | 'mostRestrictive' | 'priority' | 'explicit'
  ): AccessPermissionSet {
    const result = { ...base };

    switch (strategy) {
      case 'mostPermissive':
        Object.keys(additional).forEach(key => {
          if (key !== 'customPermissions') {
            result[key as keyof AccessPermissionSet] = 
              (base[key as keyof AccessPermissionSet] as boolean) || 
              (additional[key as keyof AccessPermissionSet] as boolean);
          }
        });
        break;

      case 'mostRestrictive':
        Object.keys(additional).forEach(key => {
          if (key !== 'customPermissions') {
            result[key as keyof AccessPermissionSet] = 
              (base[key as keyof AccessPermissionSet] as boolean) && 
              (additional[key as keyof AccessPermissionSet] as boolean);
          }
        });
        break;

      case 'priority':
      case 'explicit':
        // Later rules override earlier ones (higher priority)
        Object.assign(result, additional);
        break;
    }

    // Merge custom permissions
    if (additional.customPermissions) {
      result.customPermissions = {
        ...result.customPermissions,
        ...additional.customPermissions
      };
    }

    return result;
  }

  private determineAccessLevel(permissions: AccessPermissionSet): 'full' | 'partial' | 'none' {
    const permissionCount = Object.values(permissions).filter(p => p === true).length;
    
    if (permissionCount === 0) return 'none';
    if (permissionCount >= 5) return 'full'; // Arbitrary threshold
    return 'partial';
  }

  private evaluateTimeConstraint(
    constraint: TimeConstraint,
    timestamp: Date = new Date()
  ): { satisfied: boolean; reason?: string } {
    switch (constraint.type) {
      case 'delay':
        if (constraint.delayHours) {
          // This would need additional context about when the delay started
          return { satisfied: true }; // Simplified for now
        }
        break;

      case 'schedule':
        if (constraint.startTime && constraint.endTime) {
          const start = new Date(constraint.startTime);
          const end = new Date(constraint.endTime);
          
          if (timestamp >= start && timestamp <= end) {
            return { satisfied: true };
          }
          
          return { 
            satisfied: false, 
            reason: `Access only allowed between ${start.toISOString()} and ${end.toISOString()}` 
          };
        }
        break;

      case 'timeWindow':
        // Check if current time falls within allowed window
        // Implementation would depend on recurrence rules
        break;

      case 'dateRange':
        if (constraint.startTime && constraint.endTime) {
          const start = new Date(constraint.startTime);
          const end = new Date(constraint.endTime);
          
          if (timestamp >= start && timestamp <= end) {
            return { satisfied: true };
          }
          
          return { 
            satisfied: false, 
            reason: `Access only allowed within date range` 
          };
        }
        break;
    }

    return { satisfied: true };
  }

  // Condition evaluation methods

  private async evaluateTimeDelayCondition(
    condition: AccessCondition,
    beneficiary: Beneficiary,
    timestamp: Date
  ): Promise<{ satisfied: boolean; reason?: string }> {
    const delayHours = condition.parameters.delayHours || 24;
    const delayType = condition.parameters.delayType || 'afterGrant';
    const referenceEvent = condition.parameters.referenceEvent || 'grant';
    
    let referenceTime: Date;
    
    switch (referenceEvent) {
      case 'grant':
        // Check when access was initially granted
        referenceTime = condition.parameters.grantedAt 
          ? new Date(condition.parameters.grantedAt)
          : timestamp; // Default to current time if no grant time specified
        break;
        
      case 'request':
        // Check when access was requested
        referenceTime = condition.parameters.requestedAt
          ? new Date(condition.parameters.requestedAt)
          : timestamp;
        break;
        
      case 'lastAccess':
        // Check beneficiary's last access time
        referenceTime = beneficiary.lastAccessAt
          ? new Date(beneficiary.lastAccessAt)
          : new Date(0); // Very old date if never accessed
        break;
        
      case 'activation':
        // Check when emergency access was activated
        referenceTime = condition.parameters.activatedAt
          ? new Date(condition.parameters.activatedAt)
          : new Date(); // Default to now
        break;
        
      default:
        referenceTime = timestamp;
    }
    
    const elapsedHours = (timestamp.getTime() - referenceTime.getTime()) / (60 * 60 * 1000);
    
    if (elapsedHours >= delayHours) {
      return { satisfied: true };
    }
    
    const remainingHours = Math.ceil(delayHours - elapsedHours);
    const availableAt = new Date(referenceTime.getTime() + (delayHours * 60 * 60 * 1000));
    
    return { 
      satisfied: false, 
      reason: `Access delayed. Available in ${remainingHours} hours (${availableAt.toISOString()})` 
    };
  }

  private async evaluateMultiFactorAuthCondition(
    condition: AccessCondition,
    beneficiary: Beneficiary
  ): Promise<{ satisfied: boolean; reason?: string }> {
    // Check if beneficiary has completed MFA
    // This would integrate with authentication system
    return { 
      satisfied: false, 
      reason: 'Multi-factor authentication required' 
    };
  }

  private async evaluateLocationCondition(
    condition: AccessCondition,
    ipAddress?: string
  ): Promise<{ satisfied: boolean; reason?: string }> {
    if (!ipAddress) {
      return { satisfied: false, reason: 'IP address required for location verification' };
    }

    const allowedCountries = condition.parameters.allowedCountries || [];
    const blockedCountries = condition.parameters.blockedCountries || [];
    
    // This would need IP geolocation service
    // For now, simplified implementation
    return { satisfied: true };
  }

  private async evaluateEmergencyTriggerCondition(
    condition: AccessCondition,
    matrix: AccessControlMatrix
  ): Promise<{ satisfied: boolean; reason?: string }> {
    const requiredTriggerType = condition.parameters.triggerType || 'any';
    const requiredSeverity = condition.parameters.severity || 'medium';
    
    // Check if emergency override is active
    const hasActiveOverride = await this.checkActiveEmergencyOverride(
      condition.parameters.beneficiaryId,
      condition.parameters.resourceType,
      condition.parameters.resourceId
    );

    if (hasActiveOverride) {
      return { satisfied: true };
    }

    // Check if emergency access has been triggered via other means
    const emergencyStatus = await this.getEmergencyAccessStatus();
    
    if (emergencyStatus.isActive && 
        this.meetsSeverityRequirement(emergencyStatus.severity, requiredSeverity) &&
        this.meetsTriggerTypeRequirement(emergencyStatus.triggerType, requiredTriggerType)) {
      return { satisfied: true };
    }

    return { 
      satisfied: false, 
      reason: `Emergency access not activated (required: ${requiredTriggerType} with ${requiredSeverity}+ severity)` 
    };
  }

  private async evaluateUserInactivityCondition(
    condition: AccessCondition,
    beneficiary: Beneficiary,
    timestamp: Date
  ): Promise<{ satisfied: boolean; reason?: string }> {
    const requiredInactivityDays = condition.parameters.inactivityDays || 30;
    
    // Check user's last login time
    if (beneficiary.lastAccessAt) {
      const lastAccess = new Date(beneficiary.lastAccessAt);
      const daysSinceAccess = (timestamp.getTime() - lastAccess.getTime()) / (24 * 60 * 60 * 1000);
      
      if (daysSinceAccess >= requiredInactivityDays) {
        return { satisfied: true };
      }
      
      return { 
        satisfied: false, 
        reason: `User must be inactive for ${requiredInactivityDays} days` 
      };
    }
    
    return { satisfied: true }; // No last access recorded
  }

  private async evaluateDeviceTrustCondition(
    condition: AccessCondition,
    context: any
  ): Promise<{ satisfied: boolean; reason?: string }> {
    // Check device trust level based on user agent, fingerprinting, etc.
    return { satisfied: false, reason: 'Device trust verification required' };
  }

  private async evaluateExternalVerificationCondition(
    condition: AccessCondition,
    beneficiary: Beneficiary
  ): Promise<{ satisfied: boolean; reason?: string }> {
    // Check if external verification has been completed
    return { satisfied: false, reason: 'External verification required' };
  }

  private async evaluateCustomCondition(
    condition: AccessCondition,
    context: any
  ): Promise<{ satisfied: boolean; reason?: string }> {
    // Execute custom business logic
    return { satisfied: true };
  }

  // Utility methods

  private createDefaultPermissions(): AccessPermissionSet {
    return {
      read: false,
      write: false,
      delete: false,
      share: false,
      download: false,
      print: false,
      execute: false
    };
  }

  private createDefaultSettings() {
    return {
      enableInheritance: true,
      conflictResolution: 'mostPermissive' as const,
      cachePermissions: true,
      auditAllAccess: true,
      requireReasonForAccess: false,
      enableEmergencyOverride: true,
      notificationSettings: {
        notifyOnAccess: false,
        notifyOnPermissionChange: true,
        notifyOnRuleChange: true,
        recipients: []
      }
    };
  }

  private createDeniedEvaluation(reason: string, startTime: number): PermissionEvaluation {
    return {
      allowed: false,
      appliedRules: [],
      deniedBy: 'system',
      conditions: [],
      effectivePermissions: this.createDefaultPermissions(),
      accessLevel: 'none',
      evaluationTime: Date.now() - startTime,
      requiredActions: [reason]
    };
  }

  private async getBeneficiary(beneficiaryId: string): Promise<Beneficiary | null> {
    // This would load from the beneficiary management service
    // For now, return null as we need integration
    return null;
  }

  private isBeneficiaryInGroup(beneficiaryId: string, groupId: string): boolean {
    // Check if beneficiary is in the specified group
    // This would integrate with beneficiary management service
    return false;
  }

  private clearPermissionCache(): void {
    this.permissionCache.clear();
  }

  // File system operations

  private async saveMatrix(matrix: AccessControlMatrix): Promise<void> {
    // Implementation would save to file system
    console.log('Saving access control matrix:', matrix.id);
  }

  private async saveTemporaryGrant(grant: TemporaryAccessGrant): Promise<void> {
    // Implementation would save to file system
    console.log('Saving temporary grant:', grant.id);
  }

  private async saveAccessRequest(request: AccessRequest): Promise<void> {
    // Implementation would save to file system
    console.log('Saving access request:', request.id);
  }

  private async ensureDataDirectory(): Promise<void> {
    if (typeof window !== 'undefined') {
      return;
    }
    
    try {
      const { access, mkdir } = await import('fs/promises');
      await access(this.dataDirectory);
    } catch {
      const { mkdir } = await import('fs/promises');
      await mkdir(this.dataDirectory, { recursive: true });
    }
  }

  /**
   * Create a time delay condition for common scenarios
   */
  static createTimeDelayCondition(
    delayType: 'immediate' | '24h' | '7d' | '30d' | 'custom',
    customHours?: number,
    referenceEvent: 'grant' | 'request' | 'lastAccess' | 'activation' = 'grant'
  ): AccessCondition {
    const delayPresets = {
      'immediate': 0,
      '24h': 24,
      '7d': 168, // 7 * 24
      '30d': 720 // 30 * 24
    };

    const delayHours = delayType === 'custom' 
      ? (customHours || 24) 
      : delayPresets[delayType];

    return {
      type: 'timeDelay',
      parameters: {
        delayHours,
        delayType: 'afterGrant',
        referenceEvent
      }
    };
  }

  /**
   * Create common access control rules with time delays
   */
  static createTimedRule(
    name: string,
    subjects: AccessSubject[],
    resources: AccessResource[],
    permissions: AccessPermissionSet,
    delayType: 'immediate' | '24h' | '7d' | '30d' | 'custom',
    customHours?: number,
    priority: number = 100
  ): Omit<AccessControlRule, 'id'> {
    const conditions: AccessCondition[] = [];
    
    if (delayType !== 'immediate') {
      conditions.push(
        AccessControlService.createTimeDelayCondition(delayType, customHours)
      );
    }

    return {
      name,
      description: `Timed access rule with ${delayType} delay`,
      subjects,
      resources,
      permissions,
      conditions,
      priority,
      isActive: true
    };
  }

  /**
   * Check if a beneficiary has any pending time-delayed access
   */
  async checkPendingTimeDelayedAccess(
    beneficiaryId: string,
    resourceType?: ResourceType,
    resourceId?: string
  ): Promise<{
    hasPending: boolean;
    pendingAccess: Array<{
      resourceType: ResourceType;
      resourceId?: string;
      availableAt: string;
      remainingHours: number;
    }>;
  }> {
    // This would query stored time-delayed access records
    // For now, return empty result
    return {
      hasPending: false,
      pendingAccess: []
    };
  }

  /**
   * Activate time-delayed access that has become available
   */
  async activateAvailableTimeDelayedAccess(
    beneficiaryId: string
  ): Promise<{
    activated: number;
    details: Array<{
      resourceType: ResourceType;
      resourceId?: string;
      activatedAt: string;
    }>;
  }> {
    // This would:
    // 1. Find all time-delayed access records for beneficiary
    // 2. Check which ones are now available (delay period has passed)
    // 3. Activate them and update their status
    // 4. Return details of activated access

    return {
      activated: 0,
      details: []
    };
  }

  /**
   * Check if there's an active emergency override
   */
  private async checkActiveEmergencyOverride(
    beneficiaryId?: string,
    resourceType?: string,
    resourceId?: string
  ): Promise<boolean> {
    // This would check stored emergency overrides
    // For now, return false
    return false;
  }

  /**
   * Get current emergency access status
   */
  private async getEmergencyAccessStatus(): Promise<{
    isActive: boolean;
    severity: 'low' | 'medium' | 'high' | 'critical';
    triggerType: string;
    activatedAt?: string;
    activatedBy?: string;
  }> {
    // This would check with emergency access service
    return {
      isActive: false,
      severity: 'medium',
      triggerType: 'none'
    };
  }

  /**
   * Check if severity meets requirement
   */
  private meetsSeverityRequirement(
    currentSeverity: string,
    requiredSeverity: string
  ): boolean {
    const severityLevels = ['low', 'medium', 'high', 'critical'];
    const currentIndex = severityLevels.indexOf(currentSeverity);
    const requiredIndex = severityLevels.indexOf(requiredSeverity);
    
    return currentIndex >= requiredIndex;
  }

  /**
   * Check if trigger type meets requirement
   */
  private meetsTriggerTypeRequirement(
    currentType: string,
    requiredType: string
  ): boolean {
    if (requiredType === 'any') return true;
    return currentType === requiredType;
  }

  /**
   * Create emergency override condition
   */
  static createEmergencyOverrideCondition(
    triggerType: 'manual' | 'automatic' | 'deadman' | 'external' | 'any' = 'any',
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    beneficiaryId?: string,
    resourceType?: string,
    resourceId?: string
  ): AccessCondition {
    return {
      type: 'emergencyTrigger',
      parameters: {
        triggerType,
        severity,
        beneficiaryId,
        resourceType,
        resourceId
      }
    };
  }

  /**
   * Evaluate permissions with emergency override consideration
   */
  async evaluatePermissionsWithEmergencyOverride(
    matrix: AccessControlMatrix,
    beneficiaryId: string,
    resourceType: ResourceType,
    resourceId?: string,
    context?: any
  ): Promise<PermissionEvaluation> {
    // First check for active emergency overrides
    const hasOverride = await this.checkActiveEmergencyOverride(beneficiaryId, resourceType, resourceId);
    
    if (hasOverride) {
      // Emergency override grants full permissions
      const fullPermissions: AccessPermissionSet = {
        read: true,
        write: true,
        delete: true,
        share: true,
        download: true,
        print: true,
        execute: true
      };

      return {
        allowed: true,
        appliedRules: ['emergency_override'],
        conditions: [],
        effectivePermissions: fullPermissions,
        accessLevel: 'full',
        evaluationTime: 0,
        requiredActions: ['Emergency override active - all permissions granted']
      };
    }

    // If no emergency override, evaluate normally
    return this.evaluatePermissions(matrix, beneficiaryId, resourceType, resourceId, context);
  }
}

// Export singleton instance
export const accessControlService = AccessControlService.getInstance();