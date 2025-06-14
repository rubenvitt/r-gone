'use client'

import { auditLoggingService } from './audit-logging-service'
import { encryptionService } from './encryption-service'
import { randomBytes, createHash } from 'crypto'

export interface PHIRecord {
  id: string
  patientId: string
  type: PHIType
  data: any // Always encrypted
  createdAt: Date
  createdBy: string
  lastAccessedAt?: Date
  lastAccessedBy?: string
  encryptionKeyId: string
  integrityHash: string
}

export enum PHIType {
  MEDICAL_HISTORY = 'medical_history',
  MEDICATIONS = 'medications',
  ALLERGIES = 'allergies',
  DIAGNOSES = 'diagnoses',
  PROCEDURES = 'procedures',
  LAB_RESULTS = 'lab_results',
  IMMUNIZATIONS = 'immunizations',
  INSURANCE = 'insurance',
  EMERGENCY_CONTACTS = 'emergency_contacts'
}

export interface HIPAAAccessLog {
  id: string
  userId: string
  phiRecordId: string
  action: HIPAAAction
  timestamp: Date
  ipAddress?: string
  userAgent?: string
  purpose: string
  success: boolean
  details?: any
}

export enum HIPAAAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  EXPORT = 'export',
  SHARE = 'share',
  PRINT = 'print'
}

export interface AccessControl {
  userId: string
  role: UserRole
  permissions: Permission[]
  restrictions?: AccessRestriction[]
}

export enum UserRole {
  PATIENT = 'patient',
  AUTHORIZED_REP = 'authorized_representative',
  HEALTHCARE_PROVIDER = 'healthcare_provider',
  ADMIN = 'admin',
  AUDITOR = 'auditor'
}

export interface Permission {
  resource: PHIType | 'all'
  actions: HIPAAAction[]
  conditions?: Record<string, any>
}

export interface AccessRestriction {
  type: 'time_based' | 'location_based' | 'purpose_based'
  parameters: Record<string, any>
}

export interface DataIntegrityCheck {
  recordId: string
  checkDate: Date
  isValid: boolean
  expectedHash: string
  actualHash: string
  errors?: string[]
}

export interface SecurityIncident {
  id: string
  type: IncidentType
  severity: 'low' | 'medium' | 'high' | 'critical'
  detectedAt: Date
  description: string
  affectedRecords: string[]
  containmentActions: string[]
  status: 'detected' | 'contained' | 'resolved'
}

export enum IncidentType {
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  DATA_BREACH = 'data_breach',
  INTEGRITY_VIOLATION = 'integrity_violation',
  AVAILABILITY_ISSUE = 'availability_issue',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity'
}

class HIPAAComplianceService {
  private phiRecords: Map<string, PHIRecord> = new Map()
  private accessLogs: Map<string, HIPAAAccessLog> = new Map()
  private accessControls: Map<string, AccessControl> = new Map()
  private securityIncidents: Map<string, SecurityIncident> = new Map()
  private encryptionPassphrase: string = ''

  /**
   * Initialize HIPAA compliance service
   */
  async initialize(passphrase: string): Promise<void> {
    this.encryptionPassphrase = passphrase
    
    // Initialize audit logging for HIPAA
    await this.initializeHIPAAAuditing()
    
    // Set up automatic integrity checks
    this.scheduleIntegrityChecks()
  }

  /**
   * Store PHI with HIPAA-compliant encryption
   */
  async storePHI(
    patientId: string,
    type: PHIType,
    data: any,
    userId: string,
    purpose: string
  ): Promise<PHIRecord> {
    // Check access permissions
    if (!this.hasPermission(userId, type, HIPAAAction.CREATE)) {
      throw new Error('Unauthorized: Cannot create PHI record')
    }

    // Encrypt the data
    const encryptedResult = await encryptionService.encryptContent(
      JSON.stringify(data),
      this.encryptionPassphrase,
      `PHI: ${type}`
    )

    if (!encryptedResult.success || !encryptedResult.encryptedData) {
      throw new Error('Failed to encrypt PHI data')
    }

    // Create integrity hash
    const integrityHash = this.createIntegrityHash(encryptedResult.encryptedData)

    // Create PHI record
    const record: PHIRecord = {
      id: randomBytes(16).toString('hex'),
      patientId,
      type,
      data: encryptedResult.encryptedData,
      createdAt: new Date(),
      createdBy: userId,
      encryptionKeyId: 'default', // In production, use key management service
      integrityHash
    }

    // Store record
    this.phiRecords.set(record.id, record)

    // Log access
    await this.logAccess(
      userId,
      record.id,
      HIPAAAction.CREATE,
      purpose,
      true
    )

    return {
      ...record,
      data: '[ENCRYPTED]' // Don't return encrypted data
    }
  }

  /**
   * Retrieve PHI with access control
   */
  async retrievePHI(
    recordId: string,
    userId: string,
    purpose: string
  ): Promise<any> {
    const record = this.phiRecords.get(recordId)
    if (!record) {
      throw new Error('PHI record not found')
    }

    // Check access permissions
    if (!this.hasPermission(userId, record.type, HIPAAAction.READ)) {
      await this.logAccess(userId, recordId, HIPAAAction.READ, purpose, false)
      throw new Error('Unauthorized: Cannot access PHI record')
    }

    // Verify integrity
    const integrityCheck = this.verifyIntegrity(record)
    if (!integrityCheck.isValid) {
      await this.reportSecurityIncident(
        IncidentType.INTEGRITY_VIOLATION,
        'PHI record integrity check failed',
        [recordId]
      )
      throw new Error('Data integrity violation detected')
    }

    // Decrypt data
    const decryptedResult = await encryptionService.decryptContent(
      record.data,
      this.encryptionPassphrase
    )

    if (!decryptedResult.success || !decryptedResult.decryptedData) {
      throw new Error('Failed to decrypt PHI data')
    }

    // Update access timestamp
    record.lastAccessedAt = new Date()
    record.lastAccessedBy = userId

    // Log access
    await this.logAccess(
      userId,
      recordId,
      HIPAAAction.READ,
      purpose,
      true
    )

    // Extract the actual data from the decrypted sections
    const content = decryptedResult.decryptedData.sections[0].content[0]
    return JSON.parse(content)
  }

  /**
   * Update PHI with versioning
   */
  async updatePHI(
    recordId: string,
    updates: any,
    userId: string,
    purpose: string
  ): Promise<PHIRecord> {
    const record = this.phiRecords.get(recordId)
    if (!record) {
      throw new Error('PHI record not found')
    }

    // Check access permissions
    if (!this.hasPermission(userId, record.type, HIPAAAction.UPDATE)) {
      await this.logAccess(userId, recordId, HIPAAAction.UPDATE, purpose, false)
      throw new Error('Unauthorized: Cannot update PHI record')
    }

    // Get current data
    const currentData = await this.retrievePHI(recordId, userId, `Update: ${purpose}`)

    // Merge updates
    const updatedData = { ...currentData, ...updates, lastModified: new Date() }

    // Encrypt updated data
    const encryptedResult = await encryptionService.encryptContent(
      JSON.stringify(updatedData),
      this.encryptionPassphrase,
      `PHI: ${record.type}`
    )

    if (!encryptedResult.success || !encryptedResult.encryptedData) {
      throw new Error('Failed to encrypt updated PHI data')
    }

    // Update record
    record.data = encryptedResult.encryptedData
    record.integrityHash = this.createIntegrityHash(encryptedResult.encryptedData)

    // Log access
    await this.logAccess(
      userId,
      recordId,
      HIPAAAction.UPDATE,
      purpose,
      true,
      { fieldsUpdated: Object.keys(updates) }
    )

    return {
      ...record,
      data: '[ENCRYPTED]'
    }
  }

  /**
   * Delete PHI with audit trail
   */
  async deletePHI(
    recordId: string,
    userId: string,
    purpose: string,
    reason: string
  ): Promise<void> {
    const record = this.phiRecords.get(recordId)
    if (!record) {
      throw new Error('PHI record not found')
    }

    // Check access permissions
    if (!this.hasPermission(userId, record.type, HIPAAAction.DELETE)) {
      await this.logAccess(userId, recordId, HIPAAAction.DELETE, purpose, false)
      throw new Error('Unauthorized: Cannot delete PHI record')
    }

    // Archive before deletion (for audit purposes)
    await this.archivePHI(record)

    // Delete record
    this.phiRecords.delete(recordId)

    // Log deletion with reason
    await this.logAccess(
      userId,
      recordId,
      HIPAAAction.DELETE,
      purpose,
      true,
      { reason, deletedAt: new Date() }
    )
  }

  /**
   * Set user access control
   */
  setAccessControl(userId: string, accessControl: AccessControl): void {
    this.accessControls.set(userId, accessControl)
  }

  /**
   * Check if user has permission
   */
  private hasPermission(
    userId: string,
    resource: PHIType,
    action: HIPAAAction
  ): boolean {
    const accessControl = this.accessControls.get(userId)
    if (!accessControl) return false

    // Admin has all permissions
    if (accessControl.role === UserRole.ADMIN) return true

    // Check specific permissions
    for (const permission of accessControl.permissions) {
      if (
        (permission.resource === 'all' || permission.resource === resource) &&
        permission.actions.includes(action)
      ) {
        // Check conditions if any
        if (permission.conditions) {
          // Implement condition checking logic
          return true
        }
        return true
      }
    }

    return false
  }

  /**
   * Log HIPAA access
   */
  private async logAccess(
    userId: string,
    phiRecordId: string,
    action: HIPAAAction,
    purpose: string,
    success: boolean,
    details?: any
  ): Promise<void> {
    const log: HIPAAAccessLog = {
      id: randomBytes(16).toString('hex'),
      userId,
      phiRecordId,
      action,
      timestamp: new Date(),
      purpose,
      success,
      details
    }

    this.accessLogs.set(log.id, log)

    // Also log to general audit service
    await auditLoggingService.logEvent({
      eventType: 'data_access',
      action: `hipaa_${action}`,
      resource: 'phi',
      resourceId: phiRecordId,
      result: success ? 'success' : 'failure',
      details: { purpose },
      riskLevel: success ? 'low' : 'medium',
      userId
    })
  }

  /**
   * Get access logs for audit
   */
  getAccessLogs(
    filters?: {
      userId?: string
      phiRecordId?: string
      startDate?: Date
      endDate?: Date
      action?: HIPAAAction
    }
  ): HIPAAAccessLog[] {
    let logs = Array.from(this.accessLogs.values())

    if (filters) {
      if (filters.userId) {
        logs = logs.filter(log => log.userId === filters.userId)
      }
      if (filters.phiRecordId) {
        logs = logs.filter(log => log.phiRecordId === filters.phiRecordId)
      }
      if (filters.action) {
        logs = logs.filter(log => log.action === filters.action)
      }
      if (filters.startDate) {
        logs = logs.filter(log => log.timestamp >= filters.startDate!)
      }
      if (filters.endDate) {
        logs = logs.filter(log => log.timestamp <= filters.endDate!)
      }
    }

    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Create integrity hash
   */
  private createIntegrityHash(data: string): string {
    return createHash('sha256').update(data).digest('hex')
  }

  /**
   * Verify data integrity
   */
  private verifyIntegrity(record: PHIRecord): DataIntegrityCheck {
    const actualHash = this.createIntegrityHash(record.data)
    const isValid = actualHash === record.integrityHash

    return {
      recordId: record.id,
      checkDate: new Date(),
      isValid,
      expectedHash: record.integrityHash,
      actualHash,
      errors: isValid ? undefined : ['Hash mismatch - data may have been tampered with']
    }
  }

  /**
   * Report security incident
   */
  private async reportSecurityIncident(
    type: IncidentType,
    description: string,
    affectedRecords: string[]
  ): Promise<void> {
    const incident: SecurityIncident = {
      id: randomBytes(16).toString('hex'),
      type,
      severity: this.calculateIncidentSeverity(type, affectedRecords.length),
      detectedAt: new Date(),
      description,
      affectedRecords,
      containmentActions: [],
      status: 'detected'
    }

    this.securityIncidents.set(incident.id, incident)

    // Log critical incident
    await auditLoggingService.logEvent({
      eventType: 'system_event',
      action: 'hipaa_security_incident',
      resource: 'security',
      resourceId: incident.id,
      result: 'success',
      details: incident,
      riskLevel: 'critical'
    })

    // In production, would trigger alerts and notifications
  }

  /**
   * Calculate incident severity
   */
  private calculateIncidentSeverity(
    type: IncidentType,
    affectedCount: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (type === IncidentType.DATA_BREACH || affectedCount > 100) {
      return 'critical'
    }
    if (type === IncidentType.UNAUTHORIZED_ACCESS || affectedCount > 10) {
      return 'high'
    }
    if (affectedCount > 1) {
      return 'medium'
    }
    return 'low'
  }

  /**
   * Archive PHI before deletion
   */
  private async archivePHI(record: PHIRecord): Promise<void> {
    // In production, would archive to secure long-term storage
    console.log(`Archiving PHI record ${record.id} before deletion`)
  }

  /**
   * Initialize HIPAA-specific auditing
   */
  private async initializeHIPAAAuditing(): Promise<void> {
    // Set up HIPAA-specific audit configuration
    console.log('HIPAA auditing initialized')
  }

  /**
   * Schedule automatic integrity checks
   */
  private scheduleIntegrityChecks(): void {
    // Run integrity checks every hour
    setInterval(() => {
      this.runIntegrityChecks()
    }, 60 * 60 * 1000)
  }

  /**
   * Run integrity checks on all PHI records
   */
  private async runIntegrityChecks(): Promise<void> {
    for (const [id, record] of this.phiRecords) {
      const check = this.verifyIntegrity(record)
      if (!check.isValid) {
        await this.reportSecurityIncident(
          IncidentType.INTEGRITY_VIOLATION,
          `Integrity check failed for PHI record ${id}`,
          [id]
        )
      }
    }
  }

  /**
   * Generate HIPAA compliance report
   */
  generateComplianceReport(): any {
    const totalRecords = this.phiRecords.size
    const accessLogs = Array.from(this.accessLogs.values())
    const incidents = Array.from(this.securityIncidents.values())

    return {
      summary: {
        totalPHIRecords: totalRecords,
        totalAccessLogs: accessLogs.length,
        securityIncidents: incidents.length,
        reportGeneratedAt: new Date()
      },
      accessStatistics: {
        reads: accessLogs.filter(l => l.action === HIPAAAction.READ).length,
        creates: accessLogs.filter(l => l.action === HIPAAAction.CREATE).length,
        updates: accessLogs.filter(l => l.action === HIPAAAction.UPDATE).length,
        deletes: accessLogs.filter(l => l.action === HIPAAAction.DELETE).length,
        unauthorized: accessLogs.filter(l => !l.success).length
      },
      incidentSummary: {
        critical: incidents.filter(i => i.severity === 'critical').length,
        high: incidents.filter(i => i.severity === 'high').length,
        medium: incidents.filter(i => i.severity === 'medium').length,
        low: incidents.filter(i => i.severity === 'low').length
      },
      recommendations: [
        'Regularly review access logs for suspicious activity',
        'Ensure all users have appropriate role-based access',
        'Maintain encryption keys securely',
        'Conduct periodic security assessments',
        'Keep incident response plan updated'
      ]
    }
  }
}

// Singleton instance
export const hipaaComplianceService = new HIPAAComplianceService()