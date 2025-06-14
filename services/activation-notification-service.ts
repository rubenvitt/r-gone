import { manualActivationService, ActivationRequest, ActivationStatus, ActivationType, UrgencyLevel } from './manual-activation-service'
import { notificationService } from './notification-service'
import { emailService } from './email-service'

interface NotificationConfig {
  sendEmail: boolean
  sendSMS: boolean
  sendInApp: boolean
  recipients: NotificationRecipient[]
}

interface NotificationRecipient {
  id: string
  name: string
  email?: string
  phone?: string
  type: 'user' | 'emergency_contact' | 'professional' | 'admin'
}

interface ActivationNotification {
  id: string
  activationRequestId: string
  type: 'request' | 'approval' | 'rejection' | 'expiry' | 'cancellation'
  sentAt: Date
  recipients: NotificationRecipient[]
  deliveryStatus: Record<string, 'sent' | 'failed' | 'pending'>
}

class ActivationNotificationService {
  private notifications: Map<string, ActivationNotification> = new Map()

  async notifyActivationRequest(request: ActivationRequest, config?: Partial<NotificationConfig>): Promise<void> {
    const defaultConfig: NotificationConfig = {
      sendEmail: true,
      sendSMS: request.urgencyLevel === UrgencyLevel.CRITICAL,
      sendInApp: true,
      recipients: this.getDefaultRecipients(request)
    }

    const finalConfig = { ...defaultConfig, ...config }

    // Send notifications based on activation type
    switch (request.type) {
      case ActivationType.PANIC_BUTTON:
        await this.sendPanicButtonNotifications(request, finalConfig)
        break
      case ActivationType.TRUSTED_CONTACT:
        await this.sendTrustedContactNotifications(request, finalConfig)
        break
      case ActivationType.MEDICAL_PROFESSIONAL:
      case ActivationType.LEGAL_REPRESENTATIVE:
        await this.sendProfessionalNotifications(request, finalConfig)
        break
      case ActivationType.SMS_CODE:
        await this.sendSMSActivationNotifications(request, finalConfig)
        break
      default:
        await this.sendGenericNotifications(request, finalConfig)
    }

    // Store notification record
    this.storeNotificationRecord(request, 'request', finalConfig.recipients)
  }

  async notifyActivationApproval(request: ActivationRequest): Promise<void> {
    const recipients = this.getApprovalRecipients(request)
    
    // Notify all emergency contacts
    for (const recipient of recipients) {
      if (recipient.email) {
        await emailService.sendEmergencyAccessGrantedEmail(
          recipient.email,
          recipient.name,
          request.userId,
          request.activationLevel,
          request.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000)
        )
      }

      if (recipient.phone && request.urgencyLevel === UrgencyLevel.CRITICAL) {
        await this.sendSMSNotification(
          recipient.phone,
          `Emergency access granted for ${request.userId}. Level: ${request.activationLevel}. Valid until ${request.expiresAt?.toLocaleString()}`
        )
      }
    }

    // In-app notification
    await notificationService.notify({
      userId: request.userId,
      type: 'emergency_access_granted',
      title: 'Emergency Access Activated',
      message: `${request.initiatorName} has been granted ${request.activationLevel} access`,
      priority: 'high',
      data: {
        requestId: request.id,
        initiatorName: request.initiatorName,
        activationLevel: request.activationLevel
      }
    })

    this.storeNotificationRecord(request, 'approval', recipients)
  }

  async notifyActivationRejection(request: ActivationRequest, reason: string): Promise<void> {
    const initiatorRecipient = this.getInitiatorRecipient(request)
    
    if (initiatorRecipient.email) {
      await emailService.sendActivationRejectedEmail(
        initiatorRecipient.email,
        initiatorRecipient.name,
        reason
      )
    }

    // In-app notification for initiator
    await notificationService.notify({
      userId: request.initiatorId,
      type: 'activation_rejected',
      title: 'Access Request Denied',
      message: `Your emergency access request was denied. Reason: ${reason}`,
      priority: 'medium',
      data: {
        requestId: request.id,
        reason
      }
    })

    this.storeNotificationRecord(request, 'rejection', [initiatorRecipient])
  }

  async notifyActivationExpiry(request: ActivationRequest): Promise<void> {
    const recipients = [...this.getApprovalRecipients(request), this.getInitiatorRecipient(request)]
    
    for (const recipient of recipients) {
      if (recipient.email) {
        await emailService.sendActivationExpiredEmail(
          recipient.email,
          recipient.name,
          request.id
        )
      }
    }

    // In-app notifications
    await notificationService.notify({
      userId: request.userId,
      type: 'activation_expired',
      title: 'Emergency Access Expired',
      message: `Emergency access for ${request.initiatorName} has expired`,
      priority: 'medium',
      data: { requestId: request.id }
    })

    this.storeNotificationRecord(request, 'expiry', recipients)
  }

  async notifyActivationCancellation(request: ActivationRequest, reason: string): Promise<void> {
    const recipients = this.getApprovalRecipients(request)
    
    for (const recipient of recipients) {
      if (recipient.email) {
        await emailService.sendActivationCancelledEmail(
          recipient.email,
          recipient.name,
          request.id,
          reason
        )
      }
    }

    this.storeNotificationRecord(request, 'cancellation', recipients)
  }

  private async sendPanicButtonNotifications(request: ActivationRequest, config: NotificationConfig): Promise<void> {
    const message = `URGENT: Panic button activated by ${request.initiatorName}. Emergency access granted immediately.`
    
    // Send to all emergency contacts immediately
    for (const recipient of config.recipients) {
      if (config.sendEmail && recipient.email) {
        await emailService.sendUrgentActivationEmail(
          recipient.email,
          recipient.name,
          request,
          'Panic Button Activated - Immediate Action Required'
        )
      }

      if (config.sendSMS && recipient.phone) {
        await this.sendSMSNotification(recipient.phone, message)
      }
    }

    // High-priority in-app notification
    await notificationService.notify({
      userId: request.userId,
      type: 'panic_activation',
      title: 'PANIC BUTTON ACTIVATED',
      message,
      priority: 'critical',
      requiresAcknowledgment: true,
      data: { requestId: request.id }
    })
  }

  private async sendTrustedContactNotifications(request: ActivationRequest, config: NotificationConfig): Promise<void> {
    // Notify the user for verification
    if (config.sendInApp) {
      await notificationService.notify({
        userId: request.userId,
        type: 'verification_required',
        title: 'Emergency Access Request',
        message: `${request.initiatorName} is requesting emergency access. Please verify.`,
        priority: 'high',
        requiresAction: true,
        actionUrl: `/verify-activation/${request.id}`,
        data: { requestId: request.id }
      })
    }

    if (config.sendEmail) {
      const userEmail = await this.getUserEmail(request.userId)
      if (userEmail) {
        await emailService.sendVerificationRequiredEmail(
          userEmail,
          request.userId,
          request
        )
      }
    }
  }

  private async sendProfessionalNotifications(request: ActivationRequest, config: NotificationConfig): Promise<void> {
    const professionalType = request.type === ActivationType.MEDICAL_PROFESSIONAL ? 'Medical' : 'Legal'
    
    // Notify user and admin
    await notificationService.notify({
      userId: request.userId,
      type: 'professional_activation',
      title: `${professionalType} Professional Access`,
      message: `${request.initiatorName} (${professionalType} Professional) has activated emergency access`,
      priority: 'high',
      data: { 
        requestId: request.id,
        professionalType,
        credentials: request.professionalCredentials
      }
    })

    // Email notifications to admins
    const admins = config.recipients.filter(r => r.type === 'admin')
    for (const admin of admins) {
      if (admin.email) {
        await emailService.sendProfessionalActivationAlert(
          admin.email,
          admin.name,
          request,
          professionalType
        )
      }
    }
  }

  private async sendSMSActivationNotifications(request: ActivationRequest, config: NotificationConfig): Promise<void> {
    // Simple notification since SMS activation is self-initiated
    await notificationService.notify({
      userId: request.userId,
      type: 'sms_activation',
      title: 'Emergency Access Activated via SMS',
      message: 'You have successfully activated emergency access using SMS verification',
      priority: 'medium',
      data: { requestId: request.id }
    })

    // Notify emergency contacts
    const contacts = config.recipients.filter(r => r.type === 'emergency_contact')
    for (const contact of contacts) {
      if (contact.email) {
        await emailService.sendEmergencyAccessNotification(
          contact.email,
          contact.name,
          request.userId,
          'SMS activation'
        )
      }
    }
  }

  private async sendGenericNotifications(request: ActivationRequest, config: NotificationConfig): Promise<void> {
    for (const recipient of config.recipients) {
      if (config.sendEmail && recipient.email) {
        await emailService.sendGenericActivationEmail(
          recipient.email,
          recipient.name,
          request
        )
      }
    }
  }

  private async sendSMSNotification(phoneNumber: string, message: string): Promise<void> {
    // Implementation would integrate with SMS service
    // For now, log the message
    console.log(`SMS to ${phoneNumber}: ${message}`)
  }

  private getDefaultRecipients(request: ActivationRequest): NotificationRecipient[] {
    const recipients: NotificationRecipient[] = []

    // Always include the user
    recipients.push({
      id: request.userId,
      name: 'User',
      type: 'user'
    })

    // Add emergency contacts based on activation level
    // In production, fetch from emergency contacts service
    recipients.push({
      id: 'contact1',
      name: 'Emergency Contact 1',
      email: 'contact1@example.com',
      phone: '+1234567890',
      type: 'emergency_contact'
    })

    // Add admin for professional activations
    if ([ActivationType.MEDICAL_PROFESSIONAL, ActivationType.LEGAL_REPRESENTATIVE].includes(request.type)) {
      recipients.push({
        id: 'admin1',
        name: 'System Admin',
        email: 'admin@example.com',
        type: 'admin'
      })
    }

    return recipients
  }

  private getApprovalRecipients(request: ActivationRequest): NotificationRecipient[] {
    // Get emergency contacts who should be notified of approval
    return this.getDefaultRecipients(request).filter(r => r.type === 'emergency_contact')
  }

  private getInitiatorRecipient(request: ActivationRequest): NotificationRecipient {
    return {
      id: request.initiatorId,
      name: request.initiatorName,
      type: request.initiatorType === 'trusted_contact' ? 'emergency_contact' : 'professional'
    }
  }

  private async getUserEmail(userId: string): Promise<string | null> {
    // In production, fetch from user service
    return 'user@example.com'
  }

  private storeNotificationRecord(
    request: ActivationRequest, 
    type: ActivationNotification['type'],
    recipients: NotificationRecipient[]
  ): void {
    const notification: ActivationNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      activationRequestId: request.id,
      type,
      sentAt: new Date(),
      recipients,
      deliveryStatus: recipients.reduce((acc, r) => {
        acc[r.id] = 'sent'
        return acc
      }, {} as Record<string, 'sent' | 'failed' | 'pending'>)
    }

    this.notifications.set(notification.id, notification)
  }

  getNotificationHistory(activationRequestId: string): ActivationNotification[] {
    return Array.from(this.notifications.values())
      .filter(n => n.activationRequestId === activationRequestId)
      .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())
  }
}

export const activationNotificationService = new ActivationNotificationService()