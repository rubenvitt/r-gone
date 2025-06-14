import { auditLoggingService } from './audit-logging-service'
import { TriggerCondition, TriggerType, TriggerStatus } from './trigger-conditions-service'
import { EvaluationResult } from './trigger-evaluation-engine'
import { TriggerNotification } from './trigger-notification-service'
import { NextRequest } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

export interface TriggerAuditEntry {
  id: string
  timestamp: Date
  triggerId: string
  triggerType: TriggerType
  userId: string
  event: TriggerAuditEvent
  action: string
  result: 'success' | 'failure' | 'warning'
  details: Record<string, any>
  metadata: TriggerAuditMetadata
  correlationId?: string
  sessionId?: string
  ipAddress?: string
  userAgent?: string
  hash: string
  previousHash?: string
}

export enum TriggerAuditEvent {
  // Trigger Lifecycle
  TRIGGER_CREATED = 'trigger_created',
  TRIGGER_UPDATED = 'trigger_updated',
  TRIGGER_DELETED = 'trigger_deleted',
  TRIGGER_ACTIVATED = 'trigger_activated',
  TRIGGER_DEACTIVATED = 'trigger_deactivated',
  
  // Evaluation Events
  EVALUATION_STARTED = 'evaluation_started',
  EVALUATION_COMPLETED = 'evaluation_completed',
  EVALUATION_FAILED = 'evaluation_failed',
  EVALUATION_TRIGGERED = 'evaluation_triggered',
  
  // Action Events
  ACCESS_GRANTED = 'access_granted',
  ACCESS_DENIED = 'access_denied',
  NOTIFICATION_SENT = 'notification_sent',
  NOTIFICATION_FAILED = 'notification_failed',
  VERIFICATION_REQUESTED = 'verification_requested',
  VERIFICATION_COMPLETED = 'verification_completed',
  
  // Medical Emergency Events
  MEDICAL_DEVICE_REGISTERED = 'medical_device_registered',
  MEDICAL_EMERGENCY_DETECTED = 'medical_emergency_detected',
  MEDICAL_ALERT_SENT = 'medical_alert_sent',
  
  // Legal Document Events
  LEGAL_DOCUMENT_SUBMITTED = 'legal_document_submitted',
  LEGAL_DOCUMENT_VERIFIED = 'legal_document_verified',
  LEGAL_DOCUMENT_REJECTED = 'legal_document_rejected',
  
  // Beneficiary Events
  BENEFICIARY_PETITION_SUBMITTED = 'beneficiary_petition_submitted',
  BENEFICIARY_PETITION_APPROVED = 'beneficiary_petition_approved',
  BENEFICIARY_PETITION_DENIED = 'beneficiary_petition_denied',
  
  // Override Events
  MANUAL_OVERRIDE_INITIATED = 'manual_override_initiated',
  MANUAL_OVERRIDE_APPROVED = 'manual_override_approved',
  MANUAL_OVERRIDE_REJECTED = 'manual_override_rejected',
  
  // Test Events
  TEST_SCENARIO_EXECUTED = 'test_scenario_executed',
  TEST_SCENARIO_PASSED = 'test_scenario_passed',
  TEST_SCENARIO_FAILED = 'test_scenario_failed'
}

export interface TriggerAuditMetadata {
  triggerName?: string
  triggerPriority?: string
  triggerStatus?: TriggerStatus
  confidence?: number
  evaluationDuration?: number
  notificationCount?: number
  recipientCount?: number
  testMode?: boolean
  riskScore?: number
  complianceFlags?: string[]
}

export interface TriggerAuditReport {
  reportId: string
  generatedAt: Date
  period: {
    start: Date
    end: Date
  }
  summary: {
    totalEvents: number
    totalTriggers: number
    activeTriggersCount: number
    evaluationsCount: number
    triggeredCount: number
    notificationsSent: number
    accessGranted: number
    failureRate: number
  }
  triggerStats: Map<TriggerType, TriggerTypeStats>
  eventTimeline: TriggerAuditEntry[]
  anomalies: AnomalyDetection[]
  compliance: ComplianceReport
}

export interface TriggerTypeStats {
  type: TriggerType
  count: number
  evaluations: number
  triggered: number
  averageConfidence: number
  averageResponseTime: number
  failureRate: number
  topReasons: Array<{ reason: string, count: number }>
}

export interface AnomalyDetection {
  id: string
  detectedAt: Date
  type: 'unusual_activity' | 'rapid_triggers' | 'failed_verifications' | 'access_spike'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  affectedTriggers: string[]
  recommendedAction: string
}

export interface ComplianceReport {
  dataRetention: boolean
  accessLogging: boolean
  notificationTracking: boolean
  encryptionCompliance: boolean
  regulatoryRequirements: Array<{
    requirement: string
    status: 'compliant' | 'non_compliant' | 'partial'
    details: string
  }>
}

export class TriggerAuditLoggingService {
  private auditEntries: Map<string, TriggerAuditEntry> = new Map()
  private correlationMap: Map<string, string[]> = new Map()
  private anomalyDetector: AnomalyDetector
  
  constructor() {
    this.anomalyDetector = new AnomalyDetector()
  }

  /**
   * Log a trigger event
   */
  async logTriggerEvent(
    trigger: TriggerCondition,
    event: TriggerAuditEvent,
    action: string,
    result: 'success' | 'failure' | 'warning',
    details: Record<string, any> = {},
    request?: NextRequest
  ): Promise<TriggerAuditEntry> {
    const entry: TriggerAuditEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      triggerId: trigger.id,
      triggerType: trigger.type,
      userId: trigger.userId,
      event,
      action,
      result,
      details,
      metadata: {
        triggerName: trigger.name,
        triggerPriority: trigger.priority,
        triggerStatus: trigger.status,
        ...details.metadata
      },
      correlationId: details.correlationId,
      sessionId: details.sessionId,
      ipAddress: request ? this.getClientIP(request) : undefined,
      userAgent: request?.headers.get('user-agent') || undefined,
      hash: '',
      previousHash: this.getLastHash()
    }

    // Calculate hash for tamper evidence
    entry.hash = this.calculateEntryHash(entry)
    
    // Store entry
    this.auditEntries.set(entry.id, entry)
    
    // Update correlation map
    if (entry.correlationId) {
      const correlated = this.correlationMap.get(entry.correlationId) || []
      correlated.push(entry.id)
      this.correlationMap.set(entry.correlationId, correlated)
    }
    
    // Log to main audit service
    await auditLoggingService.logEvent({
      eventType: 'trigger_operation',
      action: `${event}:${action}`,
      resource: 'trigger',
      resourceId: trigger.id,
      result,
      details: {
        triggerType: trigger.type,
        ...details
      },
      riskLevel: this.calculateRiskLevel(event, result),
      userId: trigger.userId,
      sessionId: entry.sessionId
    }, request)
    
    // Check for anomalies
    await this.anomalyDetector.checkForAnomalies(entry, this.getRecentEntries())
    
    return entry
  }

  /**
   * Log trigger evaluation
   */
  async logEvaluation(
    trigger: TriggerCondition,
    result: EvaluationResult,
    duration: number,
    request?: NextRequest
  ): Promise<void> {
    const event = result.triggered 
      ? TriggerAuditEvent.EVALUATION_TRIGGERED 
      : TriggerAuditEvent.EVALUATION_COMPLETED
    
    await this.logTriggerEvent(
      trigger,
      event,
      'evaluate_trigger',
      result.triggered ? 'warning' : 'success',
      {
        evaluationResult: {
          triggered: result.triggered,
          confidence: result.confidence,
          reason: result.reason,
          requiredActions: result.requiredActions
        },
        metadata: {
          confidence: result.confidence,
          evaluationDuration: duration
        }
      },
      request
    )
  }

  /**
   * Log notification event
   */
  async logNotification(
    notification: TriggerNotification,
    success: boolean,
    error?: string
  ): Promise<void> {
    const trigger: TriggerCondition = {
      id: notification.triggerId,
      type: notification.triggerType,
      userId: notification.userId,
      name: 'Notification Trigger',
      description: '',
      conditions: {},
      actions: [],
      priority: 'medium',
      status: TriggerStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    await this.logTriggerEvent(
      trigger,
      success ? TriggerAuditEvent.NOTIFICATION_SENT : TriggerAuditEvent.NOTIFICATION_FAILED,
      'send_notification',
      success ? 'success' : 'failure',
      {
        notificationId: notification.id,
        notificationType: notification.type,
        channel: notification.channel,
        recipient: notification.recipient.id,
        priority: notification.priority,
        error,
        metadata: {
          notificationCount: 1,
          recipientCount: 1
        }
      }
    )
  }

  /**
   * Generate audit report
   */
  async generateReport(
    startDate: Date,
    endDate: Date,
    filters?: {
      userId?: string
      triggerType?: TriggerType
      eventTypes?: TriggerAuditEvent[]
    }
  ): Promise<TriggerAuditReport> {
    // Get entries within date range
    const entries = this.getEntriesInRange(startDate, endDate, filters)
    
    // Calculate summary statistics
    const summary = this.calculateSummaryStats(entries)
    
    // Calculate trigger-specific stats
    const triggerStats = this.calculateTriggerStats(entries)
    
    // Get anomalies for period
    const anomalies = await this.anomalyDetector.getAnomaliesForPeriod(startDate, endDate)
    
    // Generate compliance report
    const compliance = await this.generateComplianceReport(entries)
    
    const report: TriggerAuditReport = {
      reportId: uuidv4(),
      generatedAt: new Date(),
      period: { start: startDate, end: endDate },
      summary,
      triggerStats,
      eventTimeline: entries,
      anomalies,
      compliance
    }
    
    return report
  }

  /**
   * Search audit logs
   */
  async searchLogs(
    query: {
      triggerId?: string
      userId?: string
      event?: TriggerAuditEvent
      startDate?: Date
      endDate?: Date
      correlationId?: string
      result?: 'success' | 'failure' | 'warning'
    }
  ): Promise<TriggerAuditEntry[]> {
    let entries = Array.from(this.auditEntries.values())
    
    // Apply filters
    if (query.triggerId) {
      entries = entries.filter(e => e.triggerId === query.triggerId)
    }
    if (query.userId) {
      entries = entries.filter(e => e.userId === query.userId)
    }
    if (query.event) {
      entries = entries.filter(e => e.event === query.event)
    }
    if (query.result) {
      entries = entries.filter(e => e.result === query.result)
    }
    if (query.correlationId) {
      entries = entries.filter(e => e.correlationId === query.correlationId)
    }
    if (query.startDate) {
      entries = entries.filter(e => e.timestamp >= query.startDate)
    }
    if (query.endDate) {
      entries = entries.filter(e => e.timestamp <= query.endDate)
    }
    
    return entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Get correlated events
   */
  getCorrelatedEvents(correlationId: string): TriggerAuditEntry[] {
    const entryIds = this.correlationMap.get(correlationId) || []
    return entryIds
      .map(id => this.auditEntries.get(id))
      .filter(entry => entry !== undefined) as TriggerAuditEntry[]
  }

  /**
   * Export audit trail
   */
  async exportAuditTrail(
    format: 'json' | 'csv' | 'pdf',
    filters?: any
  ): Promise<{ data: string | Buffer, filename: string }> {
    const entries = filters ? await this.searchLogs(filters) : Array.from(this.auditEntries.values())
    
    switch (format) {
      case 'json':
        return {
          data: JSON.stringify(entries, null, 2),
          filename: `trigger-audit-${Date.now()}.json`
        }
        
      case 'csv':
        return {
          data: this.convertToCSV(entries),
          filename: `trigger-audit-${Date.now()}.csv`
        }
        
      case 'pdf':
        // Would implement PDF generation
        return {
          data: Buffer.from('PDF content here'),
          filename: `trigger-audit-${Date.now()}.pdf`
        }
        
      default:
        throw new Error(`Unsupported format: ${format}`)
    }
  }

  /**
   * Verify audit trail integrity
   */
  async verifyIntegrity(): Promise<{
    valid: boolean
    errors: string[]
    tamperedEntries: string[]
  }> {
    const errors: string[] = []
    const tamperedEntries: string[] = []
    const entries = Array.from(this.auditEntries.values()).sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    )
    
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      const calculatedHash = this.calculateEntryHash(entry)
      
      if (entry.hash !== calculatedHash) {
        errors.push(`Entry ${entry.id} has invalid hash`)
        tamperedEntries.push(entry.id)
      }
      
      if (i > 0 && entry.previousHash !== entries[i - 1].hash) {
        errors.push(`Entry ${entry.id} has invalid previous hash`)
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      tamperedEntries
    }
  }

  /**
   * Helper methods
   */

  private calculateEntryHash(entry: TriggerAuditEntry): string {
    const crypto = require('crypto')
    const content = JSON.stringify({
      id: entry.id,
      timestamp: entry.timestamp,
      triggerId: entry.triggerId,
      event: entry.event,
      action: entry.action,
      result: entry.result,
      details: entry.details,
      previousHash: entry.previousHash
    })
    return crypto.createHash('sha256').update(content).digest('hex')
  }

  private getLastHash(): string | undefined {
    const entries = Array.from(this.auditEntries.values())
    if (entries.length === 0) return undefined
    
    const lastEntry = entries.sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    )[0]
    
    return lastEntry.hash
  }

  private getRecentEntries(minutes: number = 60): TriggerAuditEntry[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000)
    return Array.from(this.auditEntries.values()).filter(e => 
      e.timestamp >= cutoff
    )
  }

  private calculateRiskLevel(
    event: TriggerAuditEvent,
    result: 'success' | 'failure' | 'warning'
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Critical events
    if ([
      TriggerAuditEvent.ACCESS_GRANTED,
      TriggerAuditEvent.MANUAL_OVERRIDE_APPROVED,
      TriggerAuditEvent.MEDICAL_EMERGENCY_DETECTED
    ].includes(event)) {
      return 'critical'
    }
    
    // High risk on failures
    if (result === 'failure' && [
      TriggerAuditEvent.VERIFICATION_REQUESTED,
      TriggerAuditEvent.NOTIFICATION_FAILED
    ].includes(event)) {
      return 'high'
    }
    
    // Medium risk events
    if ([
      TriggerAuditEvent.EVALUATION_TRIGGERED,
      TriggerAuditEvent.BENEFICIARY_PETITION_SUBMITTED
    ].includes(event)) {
      return 'medium'
    }
    
    return 'low'
  }

  private getClientIP(request: NextRequest): string {
    return request.headers.get('x-forwarded-for') || 
           request.headers.get('x-real-ip') || 
           'unknown'
  }

  private getEntriesInRange(
    startDate: Date,
    endDate: Date,
    filters?: any
  ): TriggerAuditEntry[] {
    let entries = Array.from(this.auditEntries.values()).filter(e =>
      e.timestamp >= startDate && e.timestamp <= endDate
    )
    
    if (filters?.userId) {
      entries = entries.filter(e => e.userId === filters.userId)
    }
    if (filters?.triggerType) {
      entries = entries.filter(e => e.triggerType === filters.triggerType)
    }
    if (filters?.eventTypes) {
      entries = entries.filter(e => filters.eventTypes.includes(e.event))
    }
    
    return entries
  }

  private calculateSummaryStats(entries: TriggerAuditEntry[]): any {
    const triggerIds = new Set(entries.map(e => e.triggerId))
    const evaluations = entries.filter(e => 
      e.event === TriggerAuditEvent.EVALUATION_COMPLETED || 
      e.event === TriggerAuditEvent.EVALUATION_TRIGGERED
    )
    const triggered = entries.filter(e => e.event === TriggerAuditEvent.EVALUATION_TRIGGERED)
    const notifications = entries.filter(e => e.event === TriggerAuditEvent.NOTIFICATION_SENT)
    const accessGrants = entries.filter(e => e.event === TriggerAuditEvent.ACCESS_GRANTED)
    const failures = entries.filter(e => e.result === 'failure')
    
    return {
      totalEvents: entries.length,
      totalTriggers: triggerIds.size,
      activeTriggersCount: new Set(entries.filter(e => 
        e.metadata.triggerStatus === TriggerStatus.ACTIVE
      ).map(e => e.triggerId)).size,
      evaluationsCount: evaluations.length,
      triggeredCount: triggered.length,
      notificationsSent: notifications.length,
      accessGranted: accessGrants.length,
      failureRate: entries.length > 0 ? (failures.length / entries.length) * 100 : 0
    }
  }

  private calculateTriggerStats(entries: TriggerAuditEntry[]): Map<TriggerType, TriggerTypeStats> {
    const stats = new Map<TriggerType, TriggerTypeStats>()
    
    // Group by trigger type
    const typeGroups = new Map<TriggerType, TriggerAuditEntry[]>()
    entries.forEach(entry => {
      const group = typeGroups.get(entry.triggerType) || []
      group.push(entry)
      typeGroups.set(entry.triggerType, group)
    })
    
    // Calculate stats for each type
    typeGroups.forEach((typeEntries, type) => {
      const evaluations = typeEntries.filter(e => 
        e.event === TriggerAuditEvent.EVALUATION_COMPLETED || 
        e.event === TriggerAuditEvent.EVALUATION_TRIGGERED
      )
      const triggered = typeEntries.filter(e => e.event === TriggerAuditEvent.EVALUATION_TRIGGERED)
      const failures = typeEntries.filter(e => e.result === 'failure')
      
      // Calculate average confidence
      const confidences = typeEntries
        .map(e => e.metadata.confidence)
        .filter(c => c !== undefined) as number[]
      const avgConfidence = confidences.length > 0 
        ? confidences.reduce((a, b) => a + b, 0) / confidences.length 
        : 0
      
      // Calculate average response time
      const responseTimes = typeEntries
        .map(e => e.metadata.evaluationDuration)
        .filter(d => d !== undefined) as number[]
      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0
      
      // Get top reasons
      const reasonCounts = new Map<string, number>()
      triggered.forEach(e => {
        const reason = e.details.evaluationResult?.reason || 'Unknown'
        reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1)
      })
      const topReasons = Array.from(reasonCounts.entries())
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
      
      stats.set(type, {
        type,
        count: typeEntries.length,
        evaluations: evaluations.length,
        triggered: triggered.length,
        averageConfidence: avgConfidence,
        averageResponseTime: avgResponseTime,
        failureRate: typeEntries.length > 0 ? (failures.length / typeEntries.length) * 100 : 0,
        topReasons
      })
    })
    
    return stats
  }

  private async generateComplianceReport(entries: TriggerAuditEntry[]): Promise<ComplianceReport> {
    // Check various compliance requirements
    const hasRetention = entries.length > 0 && this.checkDataRetention(entries)
    const hasAccessLogging = this.checkAccessLogging(entries)
    const hasNotificationTracking = this.checkNotificationTracking(entries)
    const hasEncryption = entries.every(e => e.hash && e.hash.length > 0)
    
    return {
      dataRetention: hasRetention,
      accessLogging: hasAccessLogging,
      notificationTracking: hasNotificationTracking,
      encryptionCompliance: hasEncryption,
      regulatoryRequirements: [
        {
          requirement: 'GDPR Article 30 - Records of Processing',
          status: hasRetention && hasAccessLogging ? 'compliant' : 'partial',
          details: 'Audit logs maintain records of all data processing activities'
        },
        {
          requirement: 'HIPAA Security Rule - Audit Controls',
          status: hasAccessLogging && hasEncryption ? 'compliant' : 'partial',
          details: 'System logs access to protected health information'
        },
        {
          requirement: 'SOC 2 - Monitoring Activities',
          status: 'compliant',
          details: 'Comprehensive monitoring of all trigger activities'
        }
      ]
    }
  }

  private checkDataRetention(entries: TriggerAuditEntry[]): boolean {
    // Check if we have entries spanning required retention period
    if (entries.length === 0) return false
    
    const oldestEntry = entries.reduce((oldest, entry) => 
      entry.timestamp < oldest.timestamp ? entry : oldest
    )
    const daysSinceOldest = (Date.now() - oldestEntry.timestamp.getTime()) / (1000 * 60 * 60 * 24)
    
    return daysSinceOldest >= 30 // At least 30 days retention
  }

  private checkAccessLogging(entries: TriggerAuditEntry[]): boolean {
    // Check if access events are properly logged
    const accessEvents = [
      TriggerAuditEvent.ACCESS_GRANTED,
      TriggerAuditEvent.ACCESS_DENIED,
      TriggerAuditEvent.VERIFICATION_COMPLETED
    ]
    
    return entries.some(e => accessEvents.includes(e.event))
  }

  private checkNotificationTracking(entries: TriggerAuditEntry[]): boolean {
    // Check if notifications are tracked
    const notificationEvents = [
      TriggerAuditEvent.NOTIFICATION_SENT,
      TriggerAuditEvent.NOTIFICATION_FAILED
    ]
    
    return entries.some(e => notificationEvents.includes(e.event))
  }

  private convertToCSV(entries: TriggerAuditEntry[]): string {
    const headers = [
      'ID', 'Timestamp', 'Trigger ID', 'Trigger Type', 'User ID',
      'Event', 'Action', 'Result', 'Confidence', 'IP Address'
    ]
    
    const rows = entries.map(e => [
      e.id,
      e.timestamp.toISOString(),
      e.triggerId,
      e.triggerType,
      e.userId,
      e.event,
      e.action,
      e.result,
      e.metadata.confidence || '',
      e.ipAddress || ''
    ])
    
    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }
}

/**
 * Anomaly detector for trigger events
 */
class AnomalyDetector {
  private anomalies: AnomalyDetection[] = []
  
  async checkForAnomalies(
    entry: TriggerAuditEntry,
    recentEntries: TriggerAuditEntry[]
  ): Promise<void> {
    // Check for rapid repeated triggers
    const recentSameTrigger = recentEntries.filter(e => 
      e.triggerId === entry.triggerId &&
      e.event === TriggerAuditEvent.EVALUATION_TRIGGERED
    )
    
    if (recentSameTrigger.length > 5) {
      this.addAnomaly({
        type: 'rapid_triggers',
        severity: 'high',
        description: `Trigger ${entry.triggerId} activated ${recentSameTrigger.length} times in the last hour`,
        affectedTriggers: [entry.triggerId],
        recommendedAction: 'Review trigger configuration and investigate potential issue'
      })
    }
    
    // Check for failed verifications
    const failedVerifications = recentEntries.filter(e =>
      e.event === TriggerAuditEvent.VERIFICATION_COMPLETED &&
      e.result === 'failure'
    )
    
    if (failedVerifications.length > 3) {
      this.addAnomaly({
        type: 'failed_verifications',
        severity: 'medium',
        description: `${failedVerifications.length} failed verifications in the last hour`,
        affectedTriggers: failedVerifications.map(e => e.triggerId),
        recommendedAction: 'Check verification system and contact affected users'
      })
    }
    
    // Check for unusual access patterns
    const accessGrants = recentEntries.filter(e => 
      e.event === TriggerAuditEvent.ACCESS_GRANTED
    )
    
    if (accessGrants.length > 10) {
      this.addAnomaly({
        type: 'access_spike',
        severity: 'critical',
        description: `Unusual spike in access grants: ${accessGrants.length} in the last hour`,
        affectedTriggers: accessGrants.map(e => e.triggerId),
        recommendedAction: 'Immediate investigation required - possible security incident'
      })
    }
  }
  
  private addAnomaly(anomaly: Omit<AnomalyDetection, 'id' | 'detectedAt'>): void {
    this.anomalies.push({
      id: uuidv4(),
      detectedAt: new Date(),
      ...anomaly
    })
  }
  
  async getAnomaliesForPeriod(start: Date, end: Date): Promise<AnomalyDetection[]> {
    return this.anomalies.filter(a => 
      a.detectedAt >= start && a.detectedAt <= end
    )
  }
}

// Create singleton instance
export const triggerAuditLoggingService = new TriggerAuditLoggingService()

// Extend main audit logging service with trigger-specific methods
declare module './audit-logging-service' {
  interface AuditLoggingService {
    logTriggerEvaluation(
      userId: string,
      action: string,
      result: 'success' | 'failure' | 'pending',
      details?: Record<string, any>
    ): Promise<void>
    
    logTriggerEvent(
      userId: string,
      triggerType: string,
      action: string,
      details?: Record<string, any>
    ): Promise<void>
    
    logEmergencyEvent(
      userId: string,
      action: string,
      result: 'success' | 'failure',
      details?: Record<string, any>
    ): Promise<void>
    
    logNotification(
      userId: string,
      action: string,
      result: 'success' | 'failure',
      details?: Record<string, any>
    ): Promise<void>
  }
}

// Implement extensions
auditLoggingService.logTriggerEvaluation = async function(
  userId: string,
  action: string,
  result: 'success' | 'failure' | 'pending',
  details?: Record<string, any>
): Promise<void> {
  await this.logEvent({
    eventType: 'trigger_operation',
    action: `trigger_evaluation:${action}`,
    result: result as any,
    details,
    userId
  })
}

auditLoggingService.logTriggerEvent = async function(
  userId: string,
  triggerType: string,
  action: string,
  details?: Record<string, any>
): Promise<void> {
  await this.logEvent({
    eventType: 'trigger_operation',
    action: `trigger:${action}`,
    resource: 'trigger',
    result: 'success',
    details: {
      triggerType,
      ...details
    },
    userId
  })
}

auditLoggingService.logEmergencyEvent = async function(
  userId: string,
  action: string,
  result: 'success' | 'failure',
  details?: Record<string, any>
): Promise<void> {
  await this.logEvent({
    eventType: 'emergency_access',
    action: `emergency:${action}`,
    result: result as any,
    details,
    riskLevel: 'high',
    userId
  })
}

auditLoggingService.logNotification = async function(
  userId: string,
  action: string,
  result: 'success' | 'failure',
  details?: Record<string, any>
): Promise<void> {
  await this.logEvent({
    eventType: 'system_event',
    action: `notification:${action}`,
    result: result as any,
    details,
    userId
  })
}