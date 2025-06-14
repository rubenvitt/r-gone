'use client'

import { emergencyAccessService } from './emergency-access-service'
import { notificationService } from './notification-service'
import { auditLoggingService } from './audit-logging-service'
import { activationAuditService } from './activation-audit-service'
import { randomBytes } from 'crypto'

export interface ActivationRequest {
  id: string
  type: ActivationType
  initiatorType: InitiatorType
  initiatorId: string
  initiatorName: string
  userId: string
  reason: string
  urgencyLevel: UrgencyLevel
  activationLevel: ActivationLevel
  status: ActivationStatus
  verificationCode?: string
  verificationMethod?: VerificationMethod
  createdAt: Date
  activatedAt?: Date
  expiresAt?: Date
  metadata?: any
}

export enum ActivationType {
  PANIC_BUTTON = 'panic_button',
  SMS_CODE = 'sms_code',
  TRUSTED_CONTACT = 'trusted_contact',
  MEDICAL_PROFESSIONAL = 'medical_professional',
  LEGAL_REPRESENTATIVE = 'legal_representative',
  SYSTEM_TRIGGER = 'system_trigger'
}

export enum InitiatorType {
  USER = 'user',
  TRUSTED_CONTACT = 'trusted_contact',
  MEDICAL_PROFESSIONAL = 'medical_professional',
  LEGAL_REPRESENTATIVE = 'legal_representative',
  SYSTEM = 'system'
}

export enum UrgencyLevel {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum ActivationLevel {
  FULL = 'full',
  PARTIAL = 'partial',
  LIMITED = 'limited',
  VIEW_ONLY = 'view_only'
}

export enum ActivationStatus {
  PENDING_VERIFICATION = 'pending_verification',
  VERIFIED = 'verified',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected'
}

export enum VerificationMethod {
  SMS = 'sms',
  EMAIL = 'email',
  PHONE_CALL = 'phone_call',
  IN_APP = 'in_app',
  BIOMETRIC = 'biometric',
  TWO_FACTOR = 'two_factor'
}

export interface ActivationConfig {
  requireVerification: boolean
  verificationTimeout: number // minutes
  activationDuration: number // hours
  notifyContacts: boolean
  allowPartialActivation: boolean
  enablePanicButton: boolean
  enableSMSActivation: boolean
  enableTrustedContacts: boolean
  enableProfessionalActivation: boolean
}

export interface SMSActivationCode {
  code: string
  userId: string
  phoneNumber: string
  activationLevel: ActivationLevel
  createdAt: Date
  expiresAt: Date
  used: boolean
}

export interface ProfessionalCredentials {
  id: string
  type: 'medical' | 'legal'
  name: string
  licenseNumber: string
  organization?: string
  verifiedAt?: Date
  authorizedUsers: string[]
}

class ManualActivationService {
  private activationRequests: Map<string, ActivationRequest> = new Map()
  private smsActivationCodes: Map<string, SMSActivationCode> = new Map()
  private professionalCredentials: Map<string, ProfessionalCredentials> = new Map()
  private config: ActivationConfig = {
    requireVerification: true,
    verificationTimeout: 5, // 5 minutes
    activationDuration: 24, // 24 hours
    notifyContacts: true,
    allowPartialActivation: true,
    enablePanicButton: true,
    enableSMSActivation: true,
    enableTrustedContacts: true,
    enableProfessionalActivation: true
  }

  /**
   * Trigger panic button activation
   */
  async triggerPanicButton(
    userId: string,
    activationLevel: ActivationLevel = ActivationLevel.FULL,
    reason: string = 'Emergency panic button activation'
  ): Promise<ActivationRequest> {
    if (!this.config.enablePanicButton) {
      throw new Error('Panic button activation is disabled')
    }

    const request: ActivationRequest = {
      id: randomBytes(16).toString('hex'),
      type: ActivationType.PANIC_BUTTON,
      initiatorType: InitiatorType.USER,
      initiatorId: userId,
      initiatorName: 'User',
      userId,
      reason,
      urgencyLevel: UrgencyLevel.CRITICAL,
      activationLevel,
      status: this.config.requireVerification 
        ? ActivationStatus.PENDING_VERIFICATION 
        : ActivationStatus.ACTIVE,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.activationDuration * 60 * 60 * 1000)
    }

    this.activationRequests.set(request.id, request)
    
    // Log to activation audit service
    await activationAuditService.logRequestCreation(
      request,
      { id: userId, name: 'User', type: 'user' }
    )

    // Log panic activation
    await auditLoggingService.logEvent({
      eventType: 'emergency_access',
      action: 'panic_button_triggered',
      resource: 'activation_request',
      resourceId: request.id,
      result: 'success',
      userId,
      details: { activationLevel, reason },
      riskLevel: 'critical'
    })

    if (!this.config.requireVerification) {
      await this.activateRequest(request.id)
    } else {
      // Send verification prompt
      await this.sendVerificationPrompt(request)
    }

    return request
  }

  /**
   * Generate SMS activation code
   */
  async generateSMSActivationCode(
    userId: string,
    phoneNumber: string,
    activationLevel: ActivationLevel = ActivationLevel.FULL
  ): Promise<SMSActivationCode> {
    if (!this.config.enableSMSActivation) {
      throw new Error('SMS activation is disabled')
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString()

    const smsCode: SMSActivationCode = {
      code,
      userId,
      phoneNumber,
      activationLevel,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      used: false
    }

    this.smsActivationCodes.set(code, smsCode)

    // Send SMS (placeholder - would integrate with SMS service)
    await this.sendSMSCode(phoneNumber, code)

    // Log code generation
    await auditLoggingService.logEvent({
      eventType: 'system_event',
      action: 'sms_activation_code_generated',
      resource: 'sms_code',
      result: 'success',
      userId,
      details: { phoneNumber: phoneNumber.slice(-4), activationLevel },
      riskLevel: 'medium'
    })

    return smsCode
  }

  /**
   * Activate using SMS code
   */
  async activateWithSMSCode(
    code: string,
    reason: string = 'SMS code activation'
  ): Promise<ActivationRequest> {
    const smsCode = this.smsActivationCodes.get(code)
    
    if (!smsCode) {
      throw new Error('Invalid activation code')
    }

    if (smsCode.used) {
      throw new Error('Activation code already used')
    }

    if (new Date() > smsCode.expiresAt) {
      throw new Error('Activation code expired')
    }

    // Mark code as used
    smsCode.used = true

    // Create activation request
    const request: ActivationRequest = {
      id: randomBytes(16).toString('hex'),
      type: ActivationType.SMS_CODE,
      initiatorType: InitiatorType.USER,
      initiatorId: smsCode.userId,
      initiatorName: 'User',
      userId: smsCode.userId,
      reason,
      urgencyLevel: UrgencyLevel.HIGH,
      activationLevel: smsCode.activationLevel,
      status: ActivationStatus.ACTIVE,
      verificationCode: code,
      verificationMethod: VerificationMethod.SMS,
      createdAt: new Date(),
      activatedAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.activationDuration * 60 * 60 * 1000)
    }

    this.activationRequests.set(request.id, request)

    // Activate immediately
    await this.activateRequest(request.id)

    return request
  }

  /**
   * Request activation by trusted contact
   */
  async requestActivationByTrustedContact(
    contactId: string,
    contactName: string,
    userId: string,
    reason: string,
    urgencyLevel: UrgencyLevel = UrgencyLevel.HIGH,
    activationLevel: ActivationLevel = ActivationLevel.PARTIAL
  ): Promise<ActivationRequest> {
    if (!this.config.enableTrustedContacts) {
      throw new Error('Trusted contact activation is disabled')
    }

    const request: ActivationRequest = {
      id: randomBytes(16).toString('hex'),
      type: ActivationType.TRUSTED_CONTACT,
      initiatorType: InitiatorType.TRUSTED_CONTACT,
      initiatorId: contactId,
      initiatorName: contactName,
      userId,
      reason,
      urgencyLevel,
      activationLevel,
      status: ActivationStatus.PENDING_VERIFICATION,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.activationDuration * 60 * 60 * 1000)
    }

    this.activationRequests.set(request.id, request)

    // Send verification to user
    await this.sendUserVerification(request)
    
    // Send notifications
    const { activationNotificationService } = await import('./activation-notification-service')
    await activationNotificationService.notifyActivationRequest(request)

    // Log request
    await auditLoggingService.logEvent({
      eventType: 'emergency_access',
      action: 'trusted_contact_activation_requested',
      resource: 'activation_request',
      resourceId: request.id,
      result: 'success',
      userId: contactId,
      details: { targetUserId: userId, reason, urgencyLevel, activationLevel },
      riskLevel: 'high'
    })

    return request
  }

  /**
   * Request activation by medical professional
   */
  async requestActivationByMedicalProfessional(
    professionalId: string,
    userId: string,
    reason: string,
    medicalJustification: string,
    urgencyLevel: UrgencyLevel = UrgencyLevel.HIGH
  ): Promise<ActivationRequest> {
    if (!this.config.enableProfessionalActivation) {
      throw new Error('Professional activation is disabled')
    }

    const credentials = this.professionalCredentials.get(professionalId)
    if (!credentials || credentials.type !== 'medical') {
      throw new Error('Invalid medical professional credentials')
    }

    if (!credentials.authorizedUsers.includes(userId)) {
      throw new Error('Medical professional not authorized for this user')
    }

    const request: ActivationRequest = {
      id: randomBytes(16).toString('hex'),
      type: ActivationType.MEDICAL_PROFESSIONAL,
      initiatorType: InitiatorType.MEDICAL_PROFESSIONAL,
      initiatorId: professionalId,
      initiatorName: credentials.name,
      userId,
      reason,
      urgencyLevel,
      activationLevel: ActivationLevel.PARTIAL,
      status: ActivationStatus.VERIFIED, // Pre-verified for medical professionals
      createdAt: new Date(),
      activatedAt: new Date(),
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours for medical
      metadata: {
        medicalJustification,
        licenseNumber: credentials.licenseNumber,
        organization: credentials.organization
      }
    }

    this.activationRequests.set(request.id, request)

    // Activate immediately for medical professionals
    await this.activateRequest(request.id)
    
    // Send notifications
    const { activationNotificationService } = await import('./activation-notification-service')
    await activationNotificationService.notifyActivationRequest(request)

    return request
  }

  /**
   * Request activation by legal representative
   */
  async requestActivationByLegalRepresentative(
    legalRepId: string,
    userId: string,
    reason: string,
    legalJustification: string,
    courtOrder?: string
  ): Promise<ActivationRequest> {
    if (!this.config.enableProfessionalActivation) {
      throw new Error('Professional activation is disabled')
    }

    const credentials = this.professionalCredentials.get(legalRepId)
    if (!credentials || credentials.type !== 'legal') {
      throw new Error('Invalid legal representative credentials')
    }

    if (!credentials.authorizedUsers.includes(userId)) {
      throw new Error('Legal representative not authorized for this user')
    }

    const request: ActivationRequest = {
      id: randomBytes(16).toString('hex'),
      type: ActivationType.LEGAL_REPRESENTATIVE,
      initiatorType: InitiatorType.LEGAL_REPRESENTATIVE,
      initiatorId: legalRepId,
      initiatorName: credentials.name,
      userId,
      reason,
      urgencyLevel: UrgencyLevel.MEDIUM,
      activationLevel: ActivationLevel.LIMITED,
      status: ActivationStatus.VERIFIED,
      createdAt: new Date(),
      activatedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days for legal
      metadata: {
        legalJustification,
        licenseNumber: credentials.licenseNumber,
        organization: credentials.organization,
        courtOrder
      }
    }

    this.activationRequests.set(request.id, request)

    // Activate with limited access
    await this.activateRequest(request.id)

    return request
  }

  /**
   * Verify activation request
   */
  async verifyActivation(
    requestId: string,
    verificationCode?: string,
    verificationMethod?: VerificationMethod
  ): Promise<boolean> {
    const request = this.activationRequests.get(requestId)
    if (!request) {
      throw new Error('Activation request not found')
    }

    if (request.status !== ActivationStatus.PENDING_VERIFICATION) {
      throw new Error('Request not pending verification')
    }

    // Verify based on method
    let verified = false
    if (verificationMethod === VerificationMethod.SMS && verificationCode) {
      verified = await this.verifySMSCode(verificationCode)
    } else if (verificationMethod === VerificationMethod.IN_APP) {
      verified = true // Assume in-app verification passed
    }

    if (verified) {
      request.status = ActivationStatus.VERIFIED
      request.verificationMethod = verificationMethod
      
      // Log successful verification
      await activationAuditService.logVerificationAttempt(
        requestId,
        true,
        verificationMethod,
        { id: request.userId, name: 'User', type: 'user' }
      )
      
      await this.activateRequest(requestId)
    } else {
      request.status = ActivationStatus.REJECTED
      
      // Log failed verification
      await activationAuditService.logVerificationAttempt(
        requestId,
        false,
        verificationMethod,
        { id: request.userId, name: 'User', type: 'user' }
      )
      
      // Send rejection notification
      const { activationNotificationService } = await import('./activation-notification-service')
      await activationNotificationService.notifyActivationRejection(request, 'Verification failed')
    }

    return verified
  }

  /**
   * Cancel activation request
   */
  async cancelActivation(requestId: string, reason: string): Promise<void> {
    const request = this.activationRequests.get(requestId)
    if (!request) {
      throw new Error('Activation request not found')
    }

    if (request.status === ActivationStatus.CANCELLED) {
      throw new Error('Request already cancelled')
    }

    const oldStatus = request.status
    request.status = ActivationStatus.CANCELLED
    
    // Log status change to audit service
    await activationAuditService.logStatusChange(
      request,
      oldStatus,
      ActivationStatus.CANCELLED,
      { id: 'system', name: 'System', type: 'system' },
      reason
    )

    // Log cancellation
    await auditLoggingService.logEvent({
      eventType: 'emergency_access',
      action: 'activation_cancelled',
      resource: 'activation_request',
      resourceId: requestId,
      result: 'success',
      userId: request.userId,
      details: { reason },
      riskLevel: 'low'
    })

    // Notify relevant parties
    if (this.config.notifyContacts) {
      await this.notifyActivationCancelled(request, reason)
    }
    
    // Send cancellation notifications via notification service
    const { activationNotificationService } = await import('./activation-notification-service')
    await activationNotificationService.notifyActivationCancellation(request, reason)
  }

  /**
   * Get activation status
   */
  getActivationStatus(requestId: string): ActivationRequest | null {
    return this.activationRequests.get(requestId) || null
  }

  /**
   * Get active activations for user
   */
  getActiveActivations(userId: string): ActivationRequest[] {
    return Array.from(this.activationRequests.values())
      .filter(req => 
        req.userId === userId && 
        req.status === ActivationStatus.ACTIVE &&
        (!req.expiresAt || new Date() < req.expiresAt)
      )
  }

  /**
   * Register professional credentials
   */
  async registerProfessionalCredentials(
    credentials: ProfessionalCredentials
  ): Promise<void> {
    // Verify credentials (placeholder - would verify with professional boards)
    credentials.verifiedAt = new Date()
    this.professionalCredentials.set(credentials.id, credentials)

    // Log registration
    await auditLoggingService.logEvent({
      eventType: 'system_event',
      action: 'professional_credentials_registered',
      resource: 'professional_credentials',
      resourceId: credentials.id,
      result: 'success',
      details: { type: credentials.type, name: credentials.name },
      riskLevel: 'low'
    })
  }

  /**
   * Update activation configuration
   */
  updateConfiguration(updates: Partial<ActivationConfig>): void {
    this.config = { ...this.config, ...updates }
  }

  /**
   * Private helper methods
   */
  private async activateRequest(requestId: string): Promise<void> {
    const request = this.activationRequests.get(requestId)
    if (!request) return

    const oldStatus = request.status
    request.status = ActivationStatus.ACTIVE
    request.activatedAt = new Date()
    
    // Log status change
    await activationAuditService.logStatusChange(
      request,
      oldStatus,
      ActivationStatus.ACTIVE,
      { id: request.initiatorId, name: request.initiatorName, type: 'user' }
    )

    // Grant emergency access based on activation level
    const accessLevel = this.mapActivationLevelToAccessLevel(request.activationLevel)
    
    // Create emergency access token
    await emergencyAccessService.generateEmergencyToken(
      request.userId,
      `Manual activation: ${request.type}`,
      24, // 24 hours
      {
        activationRequestId: requestId,
        initiatorType: request.initiatorType,
        initiatorId: request.initiatorId,
        accessLevel
      }
    )

    // Log activation
    await auditLoggingService.logEvent({
      eventType: 'emergency_access',
      action: 'activation_completed',
      resource: 'activation_request',
      resourceId: requestId,
      result: 'success',
      userId: request.userId,
      details: {
        type: request.type,
        initiator: request.initiatorName,
        level: request.activationLevel
      },
      riskLevel: 'high'
    })

    // Notify contacts
    if (this.config.notifyContacts) {
      await this.notifyActivation(request)
    }
    
    // Send approval notifications via notification service
    const { activationNotificationService } = await import('./activation-notification-service')
    await activationNotificationService.notifyActivationApproval(request)
  }

  private mapActivationLevelToAccessLevel(level: ActivationLevel): string {
    switch (level) {
      case ActivationLevel.FULL:
        return 'full'
      case ActivationLevel.PARTIAL:
        return 'partial'
      case ActivationLevel.LIMITED:
        return 'limited'
      case ActivationLevel.VIEW_ONLY:
        return 'view_only'
      default:
        return 'limited'
    }
  }

  private async sendVerificationPrompt(request: ActivationRequest): Promise<void> {
    // Send verification notification
    await notificationService.sendNotification({
      userId: request.userId,
      type: 'activation_verification',
      title: 'Emergency Activation Verification Required',
      message: `Verify emergency activation requested via ${request.type}`,
      priority: 'critical',
      data: {
        requestId: request.id,
        expiresAt: new Date(Date.now() + this.config.verificationTimeout * 60 * 1000)
      }
    })
  }

  private async sendUserVerification(request: ActivationRequest): Promise<void> {
    // Send verification to user about trusted contact request
    await notificationService.sendNotification({
      userId: request.userId,
      type: 'trusted_contact_activation',
      title: 'Trusted Contact Activation Request',
      message: `${request.initiatorName} has requested emergency access: ${request.reason}`,
      priority: 'critical',
      data: {
        requestId: request.id,
        contactName: request.initiatorName,
        urgencyLevel: request.urgencyLevel
      }
    })
  }

  private async sendSMSCode(phoneNumber: string, code: string): Promise<void> {
    // Placeholder - would integrate with SMS service
    console.log(`SMS to ${phoneNumber}: Your emergency activation code is ${code}`)
  }

  private async verifySMSCode(code: string): Promise<boolean> {
    const smsCode = this.smsActivationCodes.get(code)
    return smsCode !== undefined && !smsCode.used && new Date() < smsCode.expiresAt
  }

  private async notifyActivation(request: ActivationRequest): Promise<void> {
    // Get emergency contacts
    const contacts = await emergencyAccessService.getEmergencyContacts(request.userId)

    // Notify each contact
    for (const contact of contacts) {
      await notificationService.sendNotification({
        email: contact.email,
        type: 'emergency_activation',
        title: 'Emergency Access Activated',
        message: `Emergency access has been activated for ${request.userId} by ${request.initiatorName}. Reason: ${request.reason}`,
        priority: 'critical',
        data: {
          activationType: request.type,
          activationLevel: request.activationLevel,
          urgencyLevel: request.urgencyLevel
        }
      })
    }
  }

  private async notifyActivationCancelled(request: ActivationRequest, reason: string): Promise<void> {
    // Notify relevant parties about cancellation
    await notificationService.sendNotification({
      userId: request.userId,
      type: 'activation_cancelled',
      title: 'Emergency Activation Cancelled',
      message: `Emergency activation has been cancelled. Reason: ${reason}`,
      priority: 'medium',
      data: {
        requestId: request.id,
        cancellationReason: reason
      }
    })
  }
}

// Singleton instance
export const manualActivationService = new ManualActivationService()