import { auditLoggingService } from './audit-logging-service'
import { ActivationRequest, ActivationType, ActivationStatus } from './manual-activation-service'

export interface ActivationAuditEntry {
  id: string
  timestamp: Date
  activationRequestId: string
  action: ActivationAuditAction
  performedBy: {
    id: string
    name: string
    type: 'user' | 'system' | 'professional' | 'contact'
  }
  details: Record<string, any>
  ipAddress?: string
  userAgent?: string
  riskScore: number
}

export enum ActivationAuditAction {
  REQUEST_CREATED = 'request_created',
  REQUEST_VERIFIED = 'request_verified',
  REQUEST_REJECTED = 'request_rejected',
  REQUEST_ACTIVATED = 'request_activated',
  REQUEST_EXPIRED = 'request_expired',
  REQUEST_CANCELLED = 'request_cancelled',
  VERIFICATION_ATTEMPTED = 'verification_attempted',
  VERIFICATION_FAILED = 'verification_failed',
  ACCESS_GRANTED = 'access_granted',
  ACCESS_REVOKED = 'access_revoked',
  NOTIFICATION_SENT = 'notification_sent',
  NOTIFICATION_FAILED = 'notification_failed',
  CREDENTIALS_REGISTERED = 'credentials_registered',
  CREDENTIALS_VERIFIED = 'credentials_verified'
}

class ActivationAuditService {
  private auditEntries: Map<string, ActivationAuditEntry[]> = new Map()

  /**
   * Log activation request creation
   */
  async logRequestCreation(
    request: ActivationRequest,
    performedBy: ActivationAuditEntry['performedBy'],
    context?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    const entry: ActivationAuditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      activationRequestId: request.id,
      action: ActivationAuditAction.REQUEST_CREATED,
      performedBy,
      details: {
        type: request.type,
        urgencyLevel: request.urgencyLevel,
        activationLevel: request.activationLevel,
        reason: request.reason,
        metadata: request.metadata
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      riskScore: this.calculateRiskScore(request, ActivationAuditAction.REQUEST_CREATED)
    }

    await this.addAuditEntry(entry)

    // Also log to main audit service
    await auditLoggingService.logEvent({
      eventType: 'emergency_access',
      action: 'activation_request_created',
      resource: 'activation_request',
      resourceId: request.id,
      result: 'success',
      userId: request.userId,
      details: entry.details,
      riskLevel: entry.riskScore >= 8 ? 'critical' : entry.riskScore >= 5 ? 'high' : 'medium',
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent
    })
  }

  /**
   * Log verification attempts
   */
  async logVerificationAttempt(
    requestId: string,
    success: boolean,
    method: string,
    performedBy: ActivationAuditEntry['performedBy'],
    context?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    const action = success 
      ? ActivationAuditAction.REQUEST_VERIFIED 
      : ActivationAuditAction.VERIFICATION_FAILED

    const entry: ActivationAuditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      activationRequestId: requestId,
      action,
      performedBy,
      details: {
        verificationMethod: method,
        success,
        attemptNumber: this.getVerificationAttemptCount(requestId) + 1
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      riskScore: success ? 2 : 6
    }

    await this.addAuditEntry(entry)
  }

  /**
   * Log activation state changes
   */
  async logStatusChange(
    request: ActivationRequest,
    oldStatus: ActivationStatus,
    newStatus: ActivationStatus,
    performedBy: ActivationAuditEntry['performedBy'],
    reason?: string
  ): Promise<void> {
    let action: ActivationAuditAction
    
    switch (newStatus) {
      case ActivationStatus.ACTIVE:
        action = ActivationAuditAction.REQUEST_ACTIVATED
        break
      case ActivationStatus.REJECTED:
        action = ActivationAuditAction.REQUEST_REJECTED
        break
      case ActivationStatus.CANCELLED:
        action = ActivationAuditAction.REQUEST_CANCELLED
        break
      case ActivationStatus.EXPIRED:
        action = ActivationAuditAction.REQUEST_EXPIRED
        break
      default:
        return // Don't log other status changes
    }

    const entry: ActivationAuditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      activationRequestId: request.id,
      action,
      performedBy,
      details: {
        oldStatus,
        newStatus,
        reason,
        duration: request.activatedAt 
          ? new Date().getTime() - request.activatedAt.getTime() 
          : null
      },
      riskScore: action === ActivationAuditAction.REQUEST_ACTIVATED ? 8 : 3
    }

    await this.addAuditEntry(entry)
  }

  /**
   * Log access grants and revocations
   */
  async logAccessChange(
    requestId: string,
    granted: boolean,
    recipients: string[],
    performedBy: ActivationAuditEntry['performedBy'],
    accessLevel?: string
  ): Promise<void> {
    const entry: ActivationAuditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      activationRequestId: requestId,
      action: granted ? ActivationAuditAction.ACCESS_GRANTED : ActivationAuditAction.ACCESS_REVOKED,
      performedBy,
      details: {
        recipients,
        recipientCount: recipients.length,
        accessLevel
      },
      riskScore: granted ? 7 : 2
    }

    await this.addAuditEntry(entry)
  }

  /**
   * Log notification events
   */
  async logNotificationEvent(
    requestId: string,
    success: boolean,
    notificationType: string,
    recipients: string[],
    performedBy: ActivationAuditEntry['performedBy'] = { id: 'system', name: 'System', type: 'system' }
  ): Promise<void> {
    const entry: ActivationAuditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      activationRequestId: requestId,
      action: success ? ActivationAuditAction.NOTIFICATION_SENT : ActivationAuditAction.NOTIFICATION_FAILED,
      performedBy,
      details: {
        notificationType,
        recipients,
        recipientCount: recipients.length
      },
      riskScore: 1
    }

    await this.addAuditEntry(entry)
  }

  /**
   * Get audit trail for an activation request
   */
  getAuditTrail(activationRequestId: string): ActivationAuditEntry[] {
    return this.auditEntries.get(activationRequestId) || []
  }

  /**
   * Get all audit entries within a time range
   */
  getAuditEntriesByTimeRange(
    startDate: Date,
    endDate: Date,
    filters?: {
      action?: ActivationAuditAction
      performedByType?: ActivationAuditEntry['performedBy']['type']
      minRiskScore?: number
    }
  ): ActivationAuditEntry[] {
    const allEntries: ActivationAuditEntry[] = []
    
    for (const entries of this.auditEntries.values()) {
      allEntries.push(...entries)
    }

    return allEntries.filter(entry => {
      const inTimeRange = entry.timestamp >= startDate && entry.timestamp <= endDate
      
      if (!inTimeRange) return false
      
      if (filters?.action && entry.action !== filters.action) return false
      if (filters?.performedByType && entry.performedBy.type !== filters.performedByType) return false
      if (filters?.minRiskScore && entry.riskScore < filters.minRiskScore) return false
      
      return true
    }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Generate audit report
   */
  generateAuditReport(activationRequestId: string): {
    summary: {
      totalActions: number
      verificationAttempts: number
      notificationsSent: number
      highRiskActions: number
      uniquePerformers: number
    }
    timeline: ActivationAuditEntry[]
    riskAnalysis: {
      averageRiskScore: number
      maxRiskScore: number
      riskEvents: ActivationAuditEntry[]
    }
  } {
    const entries = this.getAuditTrail(activationRequestId)
    
    const verificationAttempts = entries.filter(e => 
      e.action === ActivationAuditAction.VERIFICATION_ATTEMPTED ||
      e.action === ActivationAuditAction.VERIFICATION_FAILED
    ).length

    const notificationsSent = entries.filter(e => 
      e.action === ActivationAuditAction.NOTIFICATION_SENT
    ).length

    const highRiskActions = entries.filter(e => e.riskScore >= 7).length
    
    const uniquePerformers = new Set(entries.map(e => e.performedBy.id)).size
    
    const riskScores = entries.map(e => e.riskScore)
    const averageRiskScore = riskScores.length > 0
      ? riskScores.reduce((a, b) => a + b, 0) / riskScores.length
      : 0
    
    const maxRiskScore = Math.max(...riskScores, 0)
    
    return {
      summary: {
        totalActions: entries.length,
        verificationAttempts,
        notificationsSent,
        highRiskActions,
        uniquePerformers
      },
      timeline: entries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
      riskAnalysis: {
        averageRiskScore,
        maxRiskScore,
        riskEvents: entries.filter(e => e.riskScore >= 7)
      }
    }
  }

  /**
   * Private helper methods
   */
  private async addAuditEntry(entry: ActivationAuditEntry): Promise<void> {
    const entries = this.auditEntries.get(entry.activationRequestId) || []
    entries.push(entry)
    this.auditEntries.set(entry.activationRequestId, entries)
  }

  private calculateRiskScore(
    request: ActivationRequest, 
    action: ActivationAuditAction
  ): number {
    let score = 5 // Base score

    // Adjust based on activation type
    switch (request.type) {
      case ActivationType.PANIC_BUTTON:
        score += 3
        break
      case ActivationType.MEDICAL_PROFESSIONAL:
      case ActivationType.LEGAL_REPRESENTATIVE:
        score += 2
        break
      case ActivationType.SMS_CODE:
        score += 1
        break
    }

    // Adjust based on urgency
    if (request.urgencyLevel === 'critical') score += 2
    if (request.urgencyLevel === 'high') score += 1

    // Adjust based on access level
    if (request.activationLevel === 'full') score += 2
    if (request.activationLevel === 'partial') score += 1

    // Cap at 10
    return Math.min(score, 10)
  }

  private getVerificationAttemptCount(requestId: string): number {
    const entries = this.auditEntries.get(requestId) || []
    return entries.filter(e => 
      e.action === ActivationAuditAction.VERIFICATION_ATTEMPTED ||
      e.action === ActivationAuditAction.VERIFICATION_FAILED
    ).length
  }
}

// Singleton instance
export const activationAuditService = new ActivationAuditService()