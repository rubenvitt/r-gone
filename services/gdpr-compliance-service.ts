'use client'

import { fileService } from './file-service'
import { auditLoggingService } from './audit-logging-service'
import { randomBytes } from 'crypto'

export interface GDPRDataRequest {
  id: string
  userId: string
  type: GDPRRequestType
  status: GDPRRequestStatus
  createdAt: Date
  completedAt?: Date
  data?: any
  downloadUrl?: string
  expiresAt?: Date
}

export enum GDPRRequestType {
  DATA_ACCESS = 'data_access',
  DATA_EXPORT = 'data_export',
  DATA_DELETION = 'data_deletion',
  DATA_RECTIFICATION = 'data_rectification',
  DATA_PORTABILITY = 'data_portability',
  PROCESSING_RESTRICTION = 'processing_restriction',
  OBJECTION = 'objection'
}

export enum GDPRRequestStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface UserDataExport {
  personalData: {
    profile: any
    preferences: any
    settings: any
  }
  contentData: {
    files: any[]
    messages: any[]
    contacts: any[]
    assets: any[]
    passwords: any[]
  }
  activityData: {
    loginHistory: any[]
    auditLogs: any[]
    accessLogs: any[]
  }
  metadata: {
    exportDate: Date
    userId: string
    format: 'json' | 'csv' | 'xml'
  }
}

export interface DataRetentionPolicy {
  dataType: string
  retentionPeriod: number // days
  isActive: boolean
  deletionMethod: 'hard' | 'soft' | 'anonymize'
  exceptions?: string[]
}

export interface ConsentRecord {
  id: string
  userId: string
  purpose: string
  description: string
  granted: boolean
  grantedAt?: Date
  withdrawnAt?: Date
  version: string
  ipAddress?: string
  userAgent?: string
}

class GDPRComplianceService {
  private dataRequests: Map<string, GDPRDataRequest> = new Map()
  private retentionPolicies: Map<string, DataRetentionPolicy> = new Map()
  private consentRecords: Map<string, ConsentRecord[]> = new Map()

  constructor() {
    this.initializeDefaultPolicies()
  }

  /**
   * Initialize default retention policies
   */
  private initializeDefaultPolicies(): void {
    const defaultPolicies: DataRetentionPolicy[] = [
      {
        dataType: 'user_profile',
        retentionPeriod: 365 * 3, // 3 years
        isActive: true,
        deletionMethod: 'anonymize'
      },
      {
        dataType: 'audit_logs',
        retentionPeriod: 365 * 7, // 7 years for compliance
        isActive: true,
        deletionMethod: 'hard',
        exceptions: ['security_events']
      },
      {
        dataType: 'messages',
        retentionPeriod: 365 * 2, // 2 years
        isActive: true,
        deletionMethod: 'hard'
      },
      {
        dataType: 'temporary_files',
        retentionPeriod: 30, // 30 days
        isActive: true,
        deletionMethod: 'hard'
      },
      {
        dataType: 'backup_files',
        retentionPeriod: 365, // 1 year
        isActive: true,
        deletionMethod: 'hard'
      }
    ]

    defaultPolicies.forEach(policy => {
      this.retentionPolicies.set(policy.dataType, policy)
    })
  }

  /**
   * Create data access/export request
   */
  async createDataRequest(
    userId: string,
    type: GDPRRequestType
  ): Promise<GDPRDataRequest> {
    const request: GDPRDataRequest = {
      id: randomBytes(16).toString('hex'),
      userId,
      type,
      status: GDPRRequestStatus.PENDING,
      createdAt: new Date()
    }

    this.dataRequests.set(request.id, request)

    // Log the request
    await auditLoggingService.logEvent({
      eventType: 'compliance_event',
      action: 'gdpr_request_created',
      resource: 'gdpr_request',
      resourceId: request.id,
      result: 'success',
      details: { type },
      riskLevel: 'low',
      userId
    })

    // Process request asynchronously
    this.processDataRequest(request)

    return request
  }

  /**
   * Process GDPR data request
   */
  private async processDataRequest(request: GDPRDataRequest): Promise<void> {
    try {
      request.status = GDPRRequestStatus.PROCESSING

      switch (request.type) {
        case GDPRRequestType.DATA_ACCESS:
        case GDPRRequestType.DATA_EXPORT:
        case GDPRRequestType.DATA_PORTABILITY:
          await this.handleDataExportRequest(request)
          break

        case GDPRRequestType.DATA_DELETION:
          await this.handleDataDeletionRequest(request)
          break

        case GDPRRequestType.DATA_RECTIFICATION:
          await this.handleDataRectificationRequest(request)
          break

        case GDPRRequestType.PROCESSING_RESTRICTION:
          await this.handleProcessingRestrictionRequest(request)
          break

        case GDPRRequestType.OBJECTION:
          await this.handleObjectionRequest(request)
          break
      }

      request.status = GDPRRequestStatus.COMPLETED
      request.completedAt = new Date()

    } catch (error) {
      console.error('Error processing GDPR request:', error)
      request.status = GDPRRequestStatus.FAILED
      request.data = { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Handle data export request
   */
  private async handleDataExportRequest(request: GDPRDataRequest): Promise<void> {
    const userData = await this.collectUserData(request.userId)
    
    // Generate export file
    const exportData = JSON.stringify(userData, null, 2)
    const exportId = randomBytes(16).toString('hex')
    
    // Store export temporarily (24 hours)
    await fileService.createFile(
      request.userId,
      `gdpr-export-${exportId}.json`,
      exportData,
      {
        type: 'gdpr_export',
        mimeType: 'application/json',
        isTemporary: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    )

    request.data = userData
    request.downloadUrl = `/api/gdpr/download/${exportId}`
    request.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    // Log export
    await auditLoggingService.logEvent({
      eventType: 'data_access',
      action: 'gdpr_data_exported',
      resource: 'gdpr_export',
      resourceId: exportId,
      result: 'success',
      riskLevel: 'low',
      userId: request.userId
    })
  }

  /**
   * Handle data deletion request
   */
  private async handleDataDeletionRequest(request: GDPRDataRequest): Promise<void> {
    const userId = request.userId

    // Delete user data from various services
    const deletionResults = {
      files: await this.deleteUserFiles(userId),
      messages: await this.deleteUserMessages(userId),
      contacts: await this.deleteUserContacts(userId),
      assets: await this.deleteUserAssets(userId),
      passwords: await this.deleteUserPasswords(userId),
      profile: await this.anonymizeUserProfile(userId)
    }

    request.data = deletionResults

    // Log deletion
    await auditLoggingService.logEvent({
      eventType: 'data_access',
      action: 'gdpr_data_deleted',
      resource: 'user_data',
      resourceId: userId,
      result: 'success',
      details: deletionResults,
      riskLevel: 'medium',
      userId
    })
  }

  /**
   * Collect all user data for export
   */
  private async collectUserData(userId: string): Promise<UserDataExport> {
    // Collect data from various services
    const files = await fileService.listFiles(userId)
    const auditLogs = await auditLoggingService.getLogs({ userId })

    // Mock data for demonstration - in production, collect from actual services
    const userData: UserDataExport = {
      personalData: {
        profile: {
          userId,
          email: 'user@example.com',
          createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
        },
        preferences: {
          language: 'en',
          timezone: 'UTC',
          notifications: true
        },
        settings: {
          twoFactorEnabled: true,
          dataRetention: 'standard'
        }
      },
      contentData: {
        files: files.map(f => ({
          id: f.id,
          name: f.name,
          type: f.type,
          createdAt: f.createdAt,
          size: f.size
        })),
        messages: [],
        contacts: [],
        assets: [],
        passwords: [] // Only metadata, not actual passwords
      },
      activityData: {
        loginHistory: [],
        auditLogs: auditLogs.slice(0, 100), // Recent 100 logs
        accessLogs: []
      },
      metadata: {
        exportDate: new Date(),
        userId,
        format: 'json'
      }
    }

    return userData
  }

  /**
   * Delete user files
   */
  private async deleteUserFiles(userId: string): Promise<any> {
    const files = await fileService.listFiles(userId)
    let deletedCount = 0

    for (const file of files) {
      try {
        await fileService.deleteFile(userId, file.id)
        deletedCount++
      } catch (error) {
        console.error(`Failed to delete file ${file.id}:`, error)
      }
    }

    return { totalFiles: files.length, deletedCount }
  }

  /**
   * Delete user messages
   */
  private async deleteUserMessages(userId: string): Promise<any> {
    // Implementation would delete from messages service
    return { deletedCount: 0 }
  }

  /**
   * Delete user contacts
   */
  private async deleteUserContacts(userId: string): Promise<any> {
    // Implementation would delete from contacts service
    return { deletedCount: 0 }
  }

  /**
   * Delete user assets
   */
  private async deleteUserAssets(userId: string): Promise<any> {
    // Implementation would delete from assets service
    return { deletedCount: 0 }
  }

  /**
   * Delete user passwords
   */
  private async deleteUserPasswords(userId: string): Promise<any> {
    // Implementation would delete from password vault
    return { deletedCount: 0 }
  }

  /**
   * Anonymize user profile
   */
  private async anonymizeUserProfile(userId: string): Promise<any> {
    // Replace personal data with anonymized values
    const anonymizedProfile = {
      userId: `anon_${randomBytes(8).toString('hex')}`,
      email: 'deleted@example.com',
      name: 'Deleted User',
      anonymizedAt: new Date()
    }

    return anonymizedProfile
  }

  /**
   * Handle data rectification request
   */
  private async handleDataRectificationRequest(request: GDPRDataRequest): Promise<void> {
    // Implementation for correcting user data
    request.data = { message: 'Data rectification requires manual review' }
  }

  /**
   * Handle processing restriction request
   */
  private async handleProcessingRestrictionRequest(request: GDPRDataRequest): Promise<void> {
    // Implementation for restricting data processing
    request.data = { restricted: true, appliedAt: new Date() }
  }

  /**
   * Handle objection request
   */
  private async handleObjectionRequest(request: GDPRDataRequest): Promise<void> {
    // Implementation for handling objections to processing
    request.data = { objectionRecorded: true, recordedAt: new Date() }
  }

  /**
   * Get request status
   */
  getRequestStatus(requestId: string): GDPRDataRequest | null {
    return this.dataRequests.get(requestId) || null
  }

  /**
   * List user requests
   */
  listUserRequests(userId: string): GDPRDataRequest[] {
    return Array.from(this.dataRequests.values())
      .filter(request => request.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  /**
   * Record consent
   */
  async recordConsent(
    userId: string,
    purpose: string,
    description: string,
    granted: boolean,
    ipAddress?: string,
    userAgent?: string
  ): Promise<ConsentRecord> {
    const consent: ConsentRecord = {
      id: randomBytes(16).toString('hex'),
      userId,
      purpose,
      description,
      granted,
      grantedAt: granted ? new Date() : undefined,
      withdrawnAt: !granted ? new Date() : undefined,
      version: '1.0',
      ipAddress,
      userAgent
    }

    if (!this.consentRecords.has(userId)) {
      this.consentRecords.set(userId, [])
    }
    this.consentRecords.get(userId)!.push(consent)

    // Log consent
    await auditLoggingService.logEvent({
      eventType: 'compliance_event',
      action: granted ? 'consent_granted' : 'consent_withdrawn',
      resource: 'consent',
      resourceId: consent.id,
      result: 'success',
      details: { purpose },
      riskLevel: 'low',
      userId
    })

    return consent
  }

  /**
   * Get user consents
   */
  getUserConsents(userId: string): ConsentRecord[] {
    return this.consentRecords.get(userId) || []
  }

  /**
   * Check if user has valid consent
   */
  hasValidConsent(userId: string, purpose: string): boolean {
    const consents = this.getUserConsents(userId)
    const relevantConsents = consents
      .filter(c => c.purpose === purpose)
      .sort((a, b) => {
        const aTime = (a.grantedAt || a.withdrawnAt || new Date(0)).getTime()
        const bTime = (b.grantedAt || b.withdrawnAt || new Date(0)).getTime()
        return bTime - aTime
      })

    if (relevantConsents.length === 0) return false
    return relevantConsents[0].granted
  }

  /**
   * Get data retention policies
   */
  getRetentionPolicies(): DataRetentionPolicy[] {
    return Array.from(this.retentionPolicies.values())
  }

  /**
   * Update retention policy
   */
  updateRetentionPolicy(dataType: string, policy: Partial<DataRetentionPolicy>): void {
    const existing = this.retentionPolicies.get(dataType)
    if (existing) {
      this.retentionPolicies.set(dataType, { ...existing, ...policy })
    }
  }

  /**
   * Apply retention policies
   */
  async applyRetentionPolicies(): Promise<any> {
    const results: any[] = []

    for (const [dataType, policy] of this.retentionPolicies) {
      if (!policy.isActive) continue

      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - policy.retentionPeriod)

      // Apply policy based on data type
      const result = await this.applyPolicyToDataType(dataType, cutoffDate, policy)
      results.push({ dataType, ...result })
    }

    return results
  }

  /**
   * Apply retention policy to specific data type
   */
  private async applyPolicyToDataType(
    dataType: string,
    cutoffDate: Date,
    policy: DataRetentionPolicy
  ): Promise<any> {
    // Implementation would vary by data type
    // This is a placeholder
    return {
      processed: 0,
      deleted: 0,
      anonymized: 0,
      errors: 0
    }
  }
}

// Singleton instance
export const gdprComplianceService = new GDPRComplianceService()