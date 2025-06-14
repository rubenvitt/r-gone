'use client'

import { gdprComplianceService } from './gdpr-compliance-service'
import { auditLoggingService } from './audit-logging-service'
import { randomBytes } from 'crypto'

export interface CCPARequest {
  id: string
  userId: string
  type: CCPARequestType
  status: CCPARequestStatus
  isCaliforniaResident: boolean
  createdAt: Date
  completedAt?: Date
  data?: any
  verificationMethod?: string
  ipAddress?: string
}

export enum CCPARequestType {
  KNOW = 'right_to_know',
  DELETE = 'right_to_delete',
  OPT_OUT = 'right_to_opt_out',
  OPT_IN = 'right_to_opt_in',
  NON_DISCRIMINATION = 'non_discrimination'
}

export enum CCPARequestStatus {
  PENDING_VERIFICATION = 'pending_verification',
  VERIFIED = 'verified',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  DENIED = 'denied',
  EXPIRED = 'expired'
}

export interface DataSaleOptOut {
  userId: string
  optedOut: boolean
  optOutDate?: Date
  optInDate?: Date
  categories: string[]
  ipAddress?: string
  verificationToken?: string
}

export interface ConsumerInfo {
  categories: string[]
  sources: string[]
  purposes: string[]
  thirdParties: string[]
  retention: Record<string, string>
}

export interface CaliforniaPrivacyRights {
  rightToKnow: boolean
  rightToDelete: boolean
  rightToOptOut: boolean
  rightToNonDiscrimination: boolean
  verifiedRequest: boolean
  requestHistory: CCPARequest[]
}

class CCPAComplianceService {
  private ccpaRequests: Map<string, CCPARequest> = new Map()
  private optOutRecords: Map<string, DataSaleOptOut> = new Map()
  private californiaResidents: Set<string> = new Set()

  /**
   * Check if user is California resident
   */
  async isCaliforniaResident(
    userId: string,
    ipAddress?: string,
    declaredState?: string
  ): Promise<boolean> {
    // Check declared state
    if (declaredState?.toLowerCase() === 'ca' || declaredState?.toLowerCase() === 'california') {
      this.californiaResidents.add(userId)
      return true
    }

    // Check IP geolocation (placeholder - would use actual geolocation service)
    if (ipAddress && this.isCaliforniaIP(ipAddress)) {
      this.californiaResidents.add(userId)
      return true
    }

    // Check stored status
    return this.californiaResidents.has(userId)
  }

  /**
   * Create CCPA request
   */
  async createCCPARequest(
    userId: string,
    type: CCPARequestType,
    ipAddress?: string
  ): Promise<CCPARequest> {
    const isCaliforniaResident = await this.isCaliforniaResident(userId, ipAddress)
    
    const request: CCPARequest = {
      id: randomBytes(16).toString('hex'),
      userId,
      type,
      status: CCPARequestStatus.PENDING_VERIFICATION,
      isCaliforniaResident,
      createdAt: new Date(),
      ipAddress
    }

    this.ccpaRequests.set(request.id, request)

    // Log request
    await auditLoggingService.logEvent({
      eventType: 'compliance_event',
      action: 'ccpa_request_created',
      resource: 'ccpa_request',
      resourceId: request.id,
      result: 'success',
      details: { type, isCaliforniaResident },
      riskLevel: 'low',
      userId
    })

    // Send verification if needed
    if (isCaliforniaResident) {
      await this.sendVerification(request)
    } else {
      request.status = CCPARequestStatus.DENIED
      request.data = { reason: 'Not a California resident' }
    }

    return request
  }

  /**
   * Verify CCPA request
   */
  async verifyRequest(
    requestId: string,
    verificationCode: string
  ): Promise<boolean> {
    const request = this.ccpaRequests.get(requestId)
    if (!request) return false

    // Verify code (placeholder - would check actual verification)
    const isValid = true // Placeholder

    if (isValid) {
      request.status = CCPARequestStatus.VERIFIED
      request.verificationMethod = 'email'
      
      // Process request
      await this.processRequest(request)
      return true
    }

    return false
  }

  /**
   * Process verified CCPA request
   */
  private async processRequest(request: CCPARequest): Promise<void> {
    request.status = CCPARequestStatus.PROCESSING

    try {
      switch (request.type) {
        case CCPARequestType.KNOW:
          await this.handleRightToKnow(request)
          break

        case CCPARequestType.DELETE:
          await this.handleRightToDelete(request)
          break

        case CCPARequestType.OPT_OUT:
          await this.handleOptOut(request)
          break

        case CCPARequestType.OPT_IN:
          await this.handleOptIn(request)
          break

        case CCPARequestType.NON_DISCRIMINATION:
          await this.handleNonDiscrimination(request)
          break
      }

      request.status = CCPARequestStatus.COMPLETED
      request.completedAt = new Date()

    } catch (error) {
      request.status = CCPARequestStatus.DENIED
      request.data = { error: error instanceof Error ? error.message : 'Processing failed' }
    }
  }

  /**
   * Handle Right to Know request
   */
  private async handleRightToKnow(request: CCPARequest): Promise<void> {
    // Collect information about data collection
    const consumerInfo: ConsumerInfo = {
      categories: [
        'Identifiers (name, email, IP address)',
        'Commercial information (transaction history)',
        'Internet activity (browsing history, search history)',
        'Geolocation data',
        'Professional information',
        'Inferences drawn from other data'
      ],
      sources: [
        'Directly from you',
        'Automatically when you use our services',
        'From third-party services you connect'
      ],
      purposes: [
        'To provide and maintain our services',
        'To communicate with you',
        'To improve our services',
        'For security and fraud prevention',
        'To comply with legal obligations'
      ],
      thirdParties: [
        'Service providers (hosting, analytics)',
        'Legal authorities when required',
        'Business partners with your consent'
      ],
      retention: {
        'Personal data': '3 years or until deletion requested',
        'Transaction data': '7 years for tax purposes',
        'Analytics data': '2 years',
        'Security logs': '1 year'
      }
    }

    // Get specific user data (reuse GDPR export functionality)
    const gdprRequest = await gdprComplianceService.createDataRequest(
      request.userId,
      'data_export' as any
    )

    // Wait for GDPR request to complete (in production, this would be async)
    await new Promise(resolve => setTimeout(resolve, 1000))

    const userData = gdprComplianceService.getRequestStatus(gdprRequest.id)?.data

    request.data = {
      consumerInfo,
      userData,
      disclosureDate: new Date()
    }
  }

  /**
   * Handle Right to Delete request
   */
  private async handleRightToDelete(request: CCPARequest): Promise<void> {
    // Check for exceptions (legal obligations, security, etc.)
    const exceptions = this.checkDeletionExceptions(request.userId)
    
    if (exceptions.length > 0) {
      request.data = {
        deleted: false,
        reason: 'Cannot delete due to legal/security requirements',
        exceptions
      }
      return
    }

    // Use GDPR deletion functionality
    const gdprRequest = await gdprComplianceService.createDataRequest(
      request.userId,
      'data_deletion' as any
    )

    // Wait for deletion
    await new Promise(resolve => setTimeout(resolve, 1000))

    request.data = {
      deleted: true,
      deletionDate: new Date(),
      categories: ['All personal information except legally required data']
    }
  }

  /**
   * Handle opt-out of data sale
   */
  private async handleOptOut(request: CCPARequest): Promise<void> {
    const optOut: DataSaleOptOut = {
      userId: request.userId,
      optedOut: true,
      optOutDate: new Date(),
      categories: ['all'],
      ipAddress: request.ipAddress
    }

    this.optOutRecords.set(request.userId, optOut)

    request.data = {
      optedOut: true,
      effectiveDate: new Date(),
      confirmation: 'You have opted out of the sale of your personal information'
    }

    // Log opt-out
    await auditLoggingService.logEvent({
      eventType: 'compliance_event',
      action: 'ccpa_opt_out',
      resource: 'data_sale',
      resourceId: request.userId,
      result: 'success',
      riskLevel: 'low',
      userId: request.userId
    })
  }

  /**
   * Handle opt-in to data sale
   */
  private async handleOptIn(request: CCPARequest): Promise<void> {
    const existing = this.optOutRecords.get(request.userId)
    
    if (existing) {
      existing.optedOut = false
      existing.optInDate = new Date()
    }

    request.data = {
      optedIn: true,
      effectiveDate: new Date(),
      confirmation: 'You have opted in to the sale of your personal information'
    }
  }

  /**
   * Handle non-discrimination assertion
   */
  private async handleNonDiscrimination(request: CCPARequest): Promise<void> {
    request.data = {
      assertion: 'We do not discriminate against consumers who exercise their CCPA rights',
      policy: 'All users receive the same quality of service regardless of privacy choices',
      confirmedAt: new Date()
    }
  }

  /**
   * Check if user has opted out of data sale
   */
  hasOptedOut(userId: string): boolean {
    const record = this.optOutRecords.get(userId)
    return record?.optedOut || false
  }

  /**
   * Get user's CCPA rights status
   */
  getUserRights(userId: string): CaliforniaPrivacyRights {
    const isResident = this.californiaResidents.has(userId)
    const requests = Array.from(this.ccpaRequests.values())
      .filter(r => r.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    return {
      rightToKnow: isResident,
      rightToDelete: isResident,
      rightToOptOut: isResident,
      rightToNonDiscrimination: isResident,
      verifiedRequest: requests.some(r => r.status === CCPARequestStatus.VERIFIED),
      requestHistory: requests
    }
  }

  /**
   * Generate "Do Not Sell" link content
   */
  generateDoNotSellPage(): string {
    return `
      <h1>Do Not Sell My Personal Information</h1>
      <p>California residents have the right to opt out of the sale of their personal information.</p>
      
      <h2>Your Current Status</h2>
      <p id="opt-out-status">Loading...</p>
      
      <h2>Opt Out of Sale</h2>
      <form id="opt-out-form">
        <p>By clicking below, you are opting out of the sale of your personal information.</p>
        <button type="submit">Opt Out of Data Sale</button>
      </form>
      
      <h2>Your Rights</h2>
      <ul>
        <li>Right to know what personal information we collect</li>
        <li>Right to delete your personal information</li>
        <li>Right to opt-out of the sale of your personal information</li>
        <li>Right to non-discrimination for exercising your rights</li>
      </ul>
      
      <p>For more information, please see our <a href="/privacy">Privacy Policy</a>.</p>
    `
  }

  /**
   * Check deletion exceptions
   */
  private checkDeletionExceptions(userId: string): string[] {
    const exceptions: string[] = []

    // Check various exceptions
    // These are placeholders - actual implementation would check real conditions
    
    // Legal obligation
    if (this.hasLegalObligation(userId)) {
      exceptions.push('Legal obligation to retain certain data')
    }

    // Security/fraud prevention
    if (this.hasSecurityNeed(userId)) {
      exceptions.push('Data needed for security and fraud prevention')
    }

    // Internal uses
    if (this.hasInternalUse(userId)) {
      exceptions.push('Data used for internal purposes compatible with user expectations')
    }

    return exceptions
  }

  /**
   * Helper methods
   */
  private async sendVerification(request: CCPARequest): Promise<void> {
    // Send verification email/SMS
    console.log(`Sending verification for CCPA request ${request.id}`)
  }

  private isCaliforniaIP(ipAddress: string): boolean {
    // Placeholder - would use actual geolocation
    return false
  }

  private hasLegalObligation(userId: string): boolean {
    // Check if there are legal obligations to keep data
    return false
  }

  private hasSecurityNeed(userId: string): boolean {
    // Check if data is needed for security
    return false
  }

  private hasInternalUse(userId: string): boolean {
    // Check if data is used for compatible internal purposes
    return false
  }
}

// Singleton instance
export const ccpaComplianceService = new CCPAComplianceService()