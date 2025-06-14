import { notificationService } from './notification-service'
import { emailService } from './email-service'
import { triggerConditionsService, TriggerCondition, TriggerType, TriggerStatus } from './trigger-conditions-service'
import { emergencyAccessService } from './emergency-access-service'
import { auditLoggingService } from './audit-logging-service'
import { EvaluationResult } from './trigger-evaluation-engine'
import { v4 as uuidv4 } from 'uuid'

export interface TriggerNotification {
  id: string
  triggerId: string
  triggerType: TriggerType
  userId: string
  type: NotificationType
  channel: NotificationChannel
  recipient: NotificationRecipient
  priority: NotificationPriority
  subject: string
  message: string
  data: Record<string, any>
  status: NotificationStatus
  sentAt?: Date
  deliveredAt?: Date
  readAt?: Date
  failureReason?: string
  retryCount: number
  maxRetries: number
  expiresAt?: Date
  requiresAction: boolean
  actionUrl?: string
  actionType?: NotificationAction
  groupId?: string
  metadata: Record<string, any>
}

export enum NotificationType {
  TRIGGER_ACTIVATED = 'trigger_activated',
  TRIGGER_WARNING = 'trigger_warning',
  TRIGGER_ESCALATION = 'trigger_escalation',
  ACCESS_GRANTED = 'access_granted',
  ACCESS_DENIED = 'access_denied',
  VERIFICATION_REQUIRED = 'verification_required',
  EMERGENCY_ALERT = 'emergency_alert',
  SYSTEM_ALERT = 'system_alert',
  TEST_NOTIFICATION = 'test_notification'
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
  WEBHOOK = 'webhook',
  PHONE_CALL = 'phone_call'
}

export interface NotificationRecipient {
  id: string
  type: 'user' | 'contact' | 'beneficiary' | 'professional' | 'admin'
  name: string
  email?: string
  phone?: string
  pushToken?: string
  webhookUrl?: string
  preferences: NotificationPreferences
}

export interface NotificationPreferences {
  channels: NotificationChannel[]
  quietHours?: { start: string, end: string }
  language: string
  timezone: string
  urgentOnly: boolean
  groupNotifications: boolean
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
  CRITICAL = 'critical'
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled'
}

export enum NotificationAction {
  VERIFY_ACCESS = 'verify_access',
  GRANT_ACCESS = 'grant_access',
  DENY_ACCESS = 'deny_access',
  CHECK_IN = 'check_in',
  VIEW_DETAILS = 'view_details',
  CONTACT_USER = 'contact_user',
  EMERGENCY_OVERRIDE = 'emergency_override'
}

export interface NotificationTemplate {
  id: string
  type: NotificationType
  channel: NotificationChannel
  subject: string
  body: string
  variables: string[]
  priority: NotificationPriority
  requiresAction: boolean
  actionType?: NotificationAction
  expirationHours?: number
}

export interface NotificationGroup {
  id: string
  type: string
  triggerIds: string[]
  recipientIds: string[]
  created: Date
  summary: string
}

export interface NotificationSchedule {
  id: string
  notificationId: string
  scheduledFor: Date
  recurrence?: NotificationRecurrence
  active: boolean
}

export interface NotificationRecurrence {
  frequency: 'once' | 'daily' | 'weekly' | 'monthly'
  interval: number
  endDate?: Date
  daysOfWeek?: number[]
  dayOfMonth?: number
}

export class TriggerNotificationService {
  private notifications: Map<string, TriggerNotification> = new Map()
  private notificationGroups: Map<string, NotificationGroup> = new Map()
  private schedules: Map<string, NotificationSchedule> = new Map()
  private templates: Map<string, NotificationTemplate> = new Map()
  private retryQueue: TriggerNotification[] = []
  private processingInterval: NodeJS.Timeout | null = null

  constructor() {
    this.initializeTemplates()
    this.startNotificationProcessor()
  }

  /**
   * Initialize notification templates
   */
  private initializeTemplates(): void {
    const templates: NotificationTemplate[] = [
      // Medical Emergency Templates
      {
        id: 'medical-emergency-critical',
        type: NotificationType.EMERGENCY_ALERT,
        channel: NotificationChannel.EMAIL,
        subject: 'CRITICAL: Medical Emergency Detected - {{userName}}',
        body: `URGENT MEDICAL EMERGENCY ALERT

A critical medical emergency has been detected for {{userName}}.

Emergency Details:
- Type: {{emergencyType}}
- Severity: {{severity}}
- Device: {{deviceName}}
- Time: {{detectedAt}}
- Location: {{location}}

Vital Signs:
{{vitalSigns}}

IMMEDIATE ACTION REQUIRED:
1. Check on {{userName}} immediately
2. Contact emergency services if needed: {{emergencyNumber}}
3. Access emergency medical information: {{accessUrl}}

This is an automated emergency notification. Please respond immediately.`,
        variables: ['userName', 'emergencyType', 'severity', 'deviceName', 'detectedAt', 'location', 'vitalSigns', 'emergencyNumber', 'accessUrl'],
        priority: NotificationPriority.CRITICAL,
        requiresAction: true,
        actionType: NotificationAction.VIEW_DETAILS,
        expirationHours: 1
      },

      // Legal Document Filed
      {
        id: 'legal-document-verified',
        type: NotificationType.TRIGGER_ACTIVATED,
        channel: NotificationChannel.EMAIL,
        subject: 'Legal Document Verified - Emergency Access Activated',
        body: `Legal Document Verification - Access Granted

This notification confirms that a legal document has been verified for {{userName}}.

Document Details:
- Type: {{documentType}}
- Jurisdiction: {{jurisdiction}}
- Case Number: {{caseNumber}}
- Verified By: {{verifiedBy}}
- Date: {{verificationDate}}

As a result of this verification, emergency access has been granted according to the predefined access control matrix.

Access Information:
- Access Level: {{accessLevel}}
- Valid Until: {{expirationDate}}
- Access Portal: {{accessUrl}}

Please use this access responsibly and only for the intended purposes.

If you believe this is an error, please contact: {{supportContact}}`,
        variables: ['userName', 'documentType', 'jurisdiction', 'caseNumber', 'verifiedBy', 'verificationDate', 'accessLevel', 'expirationDate', 'accessUrl', 'supportContact'],
        priority: NotificationPriority.HIGH,
        requiresAction: true,
        actionType: NotificationAction.VIEW_DETAILS
      },

      // Beneficiary Petition
      {
        id: 'beneficiary-petition-threshold',
        type: NotificationType.VERIFICATION_REQUIRED,
        channel: NotificationChannel.EMAIL,
        subject: 'Multiple Beneficiary Access Requests - Verification Required',
        body: `Beneficiary Access Request Alert

Multiple beneficiaries have requested emergency access to your account.

Request Summary:
- Total Requests: {{requestCount}}
- Urgent Requests: {{urgentCount}}
- Beneficiaries: {{beneficiaryList}}

Recent Requests:
{{requestDetails}}

ACTION REQUIRED:
This requires your immediate attention. Please verify these requests within {{timeLimit}} to prevent automatic access grant.

Options:
1. Approve all requests: {{approveAllUrl}}
2. Review individually: {{reviewUrl}}
3. Deny all requests: {{denyAllUrl}}

If you do not respond within {{timeLimit}}, the system will evaluate these requests based on your predefined rules.`,
        variables: ['requestCount', 'urgentCount', 'beneficiaryList', 'requestDetails', 'timeLimit', 'approveAllUrl', 'reviewUrl', 'denyAllUrl'],
        priority: NotificationPriority.URGENT,
        requiresAction: true,
        actionType: NotificationAction.VERIFY_ACCESS,
        expirationHours: 24
      },

      // Inactivity Warning
      {
        id: 'inactivity-warning',
        type: NotificationType.TRIGGER_WARNING,
        channel: NotificationChannel.EMAIL,
        subject: 'Activity Required - Dead Man Switch Warning',
        body: `Inactivity Warning - Action Required

Your account has been inactive for {{daysSinceActivity}} days.

Dead Man Switch Status:
- Last Check-in: {{lastCheckin}}
- Days Overdue: {{daysOverdue}}
- Grace Period Remaining: {{gracePeriodDays}} days
- Scheduled Activation: {{activationDate}}

To prevent emergency access activation:
1. Check in now: {{checkinUrl}}
2. Update your status: {{statusUrl}}
3. Enable holiday mode: {{holidayUrl}}

What happens if you don't respond:
- Emergency contacts will be notified
- Beneficiaries will gain access to designated information
- Your digital legacy plan will be activated

If you're unable to respond due to an emergency, the system will work as designed to protect your digital assets.`,
        variables: ['daysSinceActivity', 'lastCheckin', 'daysOverdue', 'gracePeriodDays', 'activationDate', 'checkinUrl', 'statusUrl', 'holidayUrl'],
        priority: NotificationPriority.HIGH,
        requiresAction: true,
        actionType: NotificationAction.CHECK_IN
      },

      // Manual Override
      {
        id: 'manual-override-notification',
        type: NotificationType.EMERGENCY_ALERT,
        channel: NotificationChannel.EMAIL,
        subject: 'Emergency Override Activated - Immediate Access Granted',
        body: `Emergency Manual Override Notification

An emergency manual override has been activated for {{userName}}'s account.

Override Details:
- Type: {{overrideType}}
- Reason: {{reason}}
- Initiated By: {{initiatorName}}
- Authentication: {{authMethod}}
- Time: {{timestamp}}

Access Granted:
- Level: {{accessLevel}}
- Duration: {{duration}}
- Restrictions: {{restrictions}}

This override was authenticated using {{authMethod}} and has been logged for security purposes.

Emergency Contact: {{emergencyContact}}
Override ID: {{overrideId}}

If this activation was not authorized, please contact security immediately.`,
        variables: ['userName', 'overrideType', 'reason', 'initiatorName', 'authMethod', 'timestamp', 'accessLevel', 'duration', 'restrictions', 'emergencyContact', 'overrideId'],
        priority: NotificationPriority.CRITICAL,
        requiresAction: false
      },

      // SMS Templates
      {
        id: 'sms-emergency-alert',
        type: NotificationType.EMERGENCY_ALERT,
        channel: NotificationChannel.SMS,
        subject: '',
        body: 'EMERGENCY: {{emergencyType}} detected for {{userName}}. Severity: {{severity}}. Check immediately. Details: {{shortUrl}}',
        variables: ['emergencyType', 'userName', 'severity', 'shortUrl'],
        priority: NotificationPriority.CRITICAL,
        requiresAction: true,
        actionType: NotificationAction.VIEW_DETAILS
      },

      {
        id: 'sms-verification-required',
        type: NotificationType.VERIFICATION_REQUIRED,
        channel: NotificationChannel.SMS,
        subject: '',
        body: 'URGENT: {{requestCount}} access requests pending. Verify within {{timeLimit}}. {{shortUrl}} or reply APPROVE/DENY',
        variables: ['requestCount', 'timeLimit', 'shortUrl'],
        priority: NotificationPriority.URGENT,
        requiresAction: true,
        actionType: NotificationAction.VERIFY_ACCESS
      }
    ]

    templates.forEach(template => {
      this.templates.set(template.id, template)
    })
  }

  /**
   * Start notification processor
   */
  private startNotificationProcessor(): void {
    // Process retry queue every minute
    this.processingInterval = setInterval(() => {
      this.processRetryQueue()
    }, 60000)
  }

  /**
   * Send trigger notification
   */
  async sendTriggerNotification(
    trigger: TriggerCondition,
    result: EvaluationResult,
    recipients: NotificationRecipient[],
    type: NotificationType,
    priority?: NotificationPriority
  ): Promise<TriggerNotification[]> {
    const notifications: TriggerNotification[] = []

    try {
      // Group recipients by preference
      const grouped = this.groupRecipientsByChannel(recipients)

      for (const [channel, channelRecipients] of grouped) {
        // Find appropriate template
        const template = this.findTemplate(type, channel)
        if (!template) {
          console.warn(`No template found for ${type} on ${channel}`)
          continue
        }

        // Generate notification content
        const content = await this.generateContent(template, trigger, result)

        // Create notifications for each recipient
        for (const recipient of channelRecipients) {
          const notification = await this.createNotification({
            triggerId: trigger.id,
            triggerType: trigger.type,
            userId: trigger.userId,
            type,
            channel,
            recipient,
            priority: priority || template.priority,
            subject: content.subject,
            message: content.body,
            data: {
              trigger,
              result,
              templateId: template.id
            },
            requiresAction: template.requiresAction,
            actionType: template.actionType,
            expiresAt: template.expirationHours 
              ? new Date(Date.now() + template.expirationHours * 60 * 60 * 1000)
              : undefined
          })

          // Send notification
          await this.send(notification)
          notifications.push(notification)
        }
      }

      // Group notifications if needed
      if (notifications.length > 3) {
        await this.createNotificationGroup(notifications, trigger)
      }

      return notifications
    } catch (error) {
      console.error('Failed to send trigger notifications:', error)
      await auditLoggingService.logError(
        'trigger_notification_failed',
        'Failed to send trigger notifications',
        { 
          triggerId: trigger.id, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }
      )
      throw error
    }
  }

  /**
   * Send emergency alert
   */
  async sendEmergencyAlert(
    userId: string,
    emergency: {
      type: string
      severity: string
      details: Record<string, any>
    },
    contacts: NotificationRecipient[]
  ): Promise<void> {
    try {
      // Filter contacts who accept emergency alerts
      const urgentContacts = contacts.filter(c => 
        !c.preferences.urgentOnly || emergency.severity === 'critical'
      )

      // Send via all available channels for critical emergencies
      if (emergency.severity === 'critical') {
        for (const contact of urgentContacts) {
          for (const channel of contact.preferences.channels) {
            const template = this.templates.get(`${channel}-emergency-alert`)
            if (!template) continue

            const notification = await this.createNotification({
              triggerId: `emergency-${Date.now()}`,
              triggerType: TriggerType.MEDICAL_EMERGENCY,
              userId,
              type: NotificationType.EMERGENCY_ALERT,
              channel,
              recipient: contact,
              priority: NotificationPriority.CRITICAL,
              subject: 'CRITICAL EMERGENCY ALERT',
              message: this.processTemplate(template.body, {
                emergencyType: emergency.type,
                severity: emergency.severity,
                ...emergency.details
              }),
              data: emergency,
              requiresAction: true,
              actionType: NotificationAction.VIEW_DETAILS
            })

            await this.send(notification, true) // Force immediate send
          }
        }
      } else {
        // Send via preferred channels for non-critical
        await this.sendTriggerNotification(
          {
            id: `emergency-${Date.now()}`,
            type: TriggerType.MEDICAL_EMERGENCY,
            userId,
            metadata: emergency
          } as TriggerCondition,
          {
            triggered: true,
            confidence: 1.0,
            reason: `${emergency.type} detected`,
            metadata: emergency
          } as EvaluationResult,
          urgentContacts,
          NotificationType.EMERGENCY_ALERT,
          NotificationPriority.HIGH
        )
      }
    } catch (error) {
      console.error('Failed to send emergency alert:', error)
      // Don't throw - emergency alerts should not fail silently
    }
  }

  /**
   * Send verification request
   */
  async sendVerificationRequest(
    userId: string,
    verificationId: string,
    details: {
      type: string
      requester: string
      reason: string
      expiresIn: number // minutes
    }
  ): Promise<TriggerNotification | null> {
    try {
      // Get user's primary contact
      const userContact = await this.getUserPrimaryContact(userId)
      if (!userContact) {
        throw new Error('No primary contact found for user')
      }

      const template = this.findTemplate(
        NotificationType.VERIFICATION_REQUIRED,
        userContact.preferences.channels[0]
      )
      if (!template) {
        throw new Error('No verification template found')
      }

      const notification = await this.createNotification({
        triggerId: verificationId,
        triggerType: TriggerType.MANUAL_OVERRIDE,
        userId,
        type: NotificationType.VERIFICATION_REQUIRED,
        channel: userContact.preferences.channels[0],
        recipient: userContact,
        priority: NotificationPriority.URGENT,
        subject: `Verification Required: ${details.type}`,
        message: this.processTemplate(template.body, {
          type: details.type,
          requester: details.requester,
          reason: details.reason,
          timeLimit: `${details.expiresIn} minutes`,
          approveUrl: `${process.env.NEXT_PUBLIC_URL}/verify/${verificationId}?action=approve`,
          denyUrl: `${process.env.NEXT_PUBLIC_URL}/verify/${verificationId}?action=deny`
        }),
        data: details,
        requiresAction: true,
        actionType: NotificationAction.VERIFY_ACCESS,
        actionUrl: `${process.env.NEXT_PUBLIC_URL}/verify/${verificationId}`,
        expiresAt: new Date(Date.now() + details.expiresIn * 60 * 1000)
      })

      await this.send(notification, true) // Immediate send for verification
      return notification
    } catch (error) {
      console.error('Failed to send verification request:', error)
      return null
    }
  }

  /**
   * Create notification
   */
  private async createNotification(params: {
    triggerId: string
    triggerType: TriggerType
    userId: string
    type: NotificationType
    channel: NotificationChannel
    recipient: NotificationRecipient
    priority: NotificationPriority
    subject: string
    message: string
    data: Record<string, any>
    requiresAction: boolean
    actionType?: NotificationAction
    actionUrl?: string
    expiresAt?: Date
    groupId?: string
  }): Promise<TriggerNotification> {
    const notification: TriggerNotification = {
      id: uuidv4(),
      triggerId: params.triggerId,
      triggerType: params.triggerType,
      userId: params.userId,
      type: params.type,
      channel: params.channel,
      recipient: params.recipient,
      priority: params.priority,
      subject: params.subject,
      message: params.message,
      data: params.data,
      status: NotificationStatus.PENDING,
      retryCount: 0,
      maxRetries: this.getMaxRetries(params.priority),
      requiresAction: params.requiresAction,
      actionType: params.actionType,
      actionUrl: params.actionUrl,
      expiresAt: params.expiresAt,
      groupId: params.groupId,
      metadata: {
        createdAt: new Date(),
        triggerType: params.triggerType
      }
    }

    this.notifications.set(notification.id, notification)
    return notification
  }

  /**
   * Send notification
   */
  private async send(
    notification: TriggerNotification,
    immediate: boolean = false
  ): Promise<void> {
    try {
      // Check if within quiet hours (unless immediate)
      if (!immediate && this.isQuietHours(notification.recipient)) {
        await this.scheduleNotification(notification, this.getNextAvailableTime(notification.recipient))
        return
      }

      // Check if notification expired
      if (notification.expiresAt && notification.expiresAt < new Date()) {
        notification.status = NotificationStatus.EXPIRED
        return
      }

      notification.sentAt = new Date()

      switch (notification.channel) {
        case NotificationChannel.EMAIL:
          await this.sendEmail(notification)
          break
        case NotificationChannel.SMS:
          await this.sendSMS(notification)
          break
        case NotificationChannel.PUSH:
          await this.sendPush(notification)
          break
        case NotificationChannel.IN_APP:
          await this.sendInApp(notification)
          break
        case NotificationChannel.WEBHOOK:
          await this.sendWebhook(notification)
          break
        case NotificationChannel.PHONE_CALL:
          await this.sendPhoneCall(notification)
          break
      }

      notification.status = NotificationStatus.SENT
      notification.deliveredAt = new Date()

      // Log notification
      await auditLoggingService.logNotification(
        notification.userId,
        'notification_sent',
        'success',
        {
          notificationId: notification.id,
          type: notification.type,
          channel: notification.channel,
          recipient: notification.recipient.id
        }
      )
    } catch (error) {
      console.error('Failed to send notification:', error)
      notification.status = NotificationStatus.FAILED
      notification.failureReason = error instanceof Error ? error.message : 'Unknown error'

      // Add to retry queue if retries remaining
      if (notification.retryCount < notification.maxRetries) {
        notification.retryCount++
        this.retryQueue.push(notification)
      }

      await auditLoggingService.logError(
        'notification_send_failed',
        'Failed to send notification',
        {
          notificationId: notification.id,
          error: notification.failureReason,
          retryCount: notification.retryCount
        }
      )
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(notification: TriggerNotification): Promise<void> {
    if (!notification.recipient.email) {
      throw new Error('No email address for recipient')
    }

    const result = await emailService.sendEmail({
      to: notification.recipient.email,
      subject: notification.subject,
      html: this.formatEmailHtml(notification),
      text: notification.message
    })

    if (!result.success) {
      throw new Error(result.error || 'Email send failed')
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMS(notification: TriggerNotification): Promise<void> {
    if (!notification.recipient.phone) {
      throw new Error('No phone number for recipient')
    }

    // Use existing notification service
    const success = await notificationService.sendNotification(
      {
        type: 'sms',
        destination: notification.recipient.phone,
        enabled: true
      },
      'sms_custom',
      { id: notification.triggerId } as any,
      { message: notification.message }
    )

    if (!success) {
      throw new Error('SMS send failed')
    }
  }

  /**
   * Send push notification
   */
  private async sendPush(notification: TriggerNotification): Promise<void> {
    if (!notification.recipient.pushToken) {
      throw new Error('No push token for recipient')
    }

    // TODO: Implement actual push notification
    console.log('Push notification:', {
      token: notification.recipient.pushToken,
      title: notification.subject,
      body: notification.message,
      data: notification.data
    })
  }

  /**
   * Send in-app notification
   */
  private async sendInApp(notification: TriggerNotification): Promise<void> {
    // Store for in-app retrieval
    const inAppNotifications = this.getInAppNotifications(notification.userId)
    inAppNotifications.push(notification)
    
    // Emit event for real-time updates
    this.emitNotificationEvent(notification)
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(notification: TriggerNotification): Promise<void> {
    if (!notification.recipient.webhookUrl) {
      throw new Error('No webhook URL for recipient')
    }

    const response = await fetch(notification.recipient.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Notification-Type': notification.type,
        'X-Trigger-Type': notification.triggerType
      },
      body: JSON.stringify({
        id: notification.id,
        type: notification.type,
        triggerType: notification.triggerType,
        subject: notification.subject,
        message: notification.message,
        priority: notification.priority,
        data: notification.data,
        timestamp: notification.sentAt
      })
    })

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status}`)
    }
  }

  /**
   * Send phone call notification
   */
  private async sendPhoneCall(notification: TriggerNotification): Promise<void> {
    if (!notification.recipient.phone) {
      throw new Error('No phone number for recipient')
    }

    // Use existing notification service
    const success = await notificationService.sendNotification(
      {
        type: 'phone_call',
        destination: notification.recipient.phone,
        enabled: true
      },
      'phone_custom',
      { id: notification.triggerId } as any,
      { message: notification.message }
    )

    if (!success) {
      throw new Error('Phone call failed')
    }
  }

  /**
   * Helper methods
   */

  private groupRecipientsByChannel(
    recipients: NotificationRecipient[]
  ): Map<NotificationChannel, NotificationRecipient[]> {
    const grouped = new Map<NotificationChannel, NotificationRecipient[]>()

    for (const recipient of recipients) {
      for (const channel of recipient.preferences.channels) {
        if (!grouped.has(channel)) {
          grouped.set(channel, [])
        }
        grouped.get(channel)!.push(recipient)
      }
    }

    return grouped
  }

  private findTemplate(
    type: NotificationType,
    channel: NotificationChannel
  ): NotificationTemplate | undefined {
    return Array.from(this.templates.values()).find(t => 
      t.type === type && t.channel === channel
    )
  }

  private async generateContent(
    template: NotificationTemplate,
    trigger: TriggerCondition,
    result: EvaluationResult
  ): Promise<{ subject: string, body: string }> {
    const variables: Record<string, any> = {
      userName: await this.getUserName(trigger.userId),
      triggerType: trigger.type,
      triggerName: trigger.name,
      confidence: `${(result.confidence * 100).toFixed(0)}%`,
      reason: result.reason,
      timestamp: new Date().toLocaleString(),
      ...trigger.metadata,
      ...result.metadata
    }

    return {
      subject: this.processTemplate(template.subject, variables),
      body: this.processTemplate(template.body, variables)
    }
  }

  private processTemplate(template: string, variables: Record<string, any>): string {
    let processed = template

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`
      processed = processed.replace(new RegExp(placeholder, 'g'), String(value))
    }

    return processed
  }

  private getMaxRetries(priority: NotificationPriority): number {
    switch (priority) {
      case NotificationPriority.CRITICAL:
        return 5
      case NotificationPriority.URGENT:
        return 3
      case NotificationPriority.HIGH:
        return 2
      default:
        return 1
    }
  }

  private isQuietHours(recipient: NotificationRecipient): boolean {
    if (!recipient.preferences.quietHours) return false

    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()
    
    const [startHour, startMin] = recipient.preferences.quietHours.start.split(':').map(Number)
    const [endHour, endMin] = recipient.preferences.quietHours.end.split(':').map(Number)
    
    const startTime = startHour * 60 + startMin
    const endTime = endHour * 60 + endMin

    if (startTime < endTime) {
      return currentTime >= startTime && currentTime < endTime
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime < endTime
    }
  }

  private getNextAvailableTime(recipient: NotificationRecipient): Date {
    if (!recipient.preferences.quietHours) return new Date()

    const now = new Date()
    const [endHour, endMin] = recipient.preferences.quietHours.end.split(':').map(Number)
    
    const nextAvailable = new Date(now)
    nextAvailable.setHours(endHour, endMin, 0, 0)
    
    if (nextAvailable <= now) {
      nextAvailable.setDate(nextAvailable.getDate() + 1)
    }
    
    return nextAvailable
  }

  private async scheduleNotification(
    notification: TriggerNotification,
    scheduledFor: Date
  ): Promise<void> {
    const schedule: NotificationSchedule = {
      id: uuidv4(),
      notificationId: notification.id,
      scheduledFor,
      active: true
    }
    
    this.schedules.set(schedule.id, schedule)
    notification.status = NotificationStatus.PENDING
    notification.metadata.scheduledFor = scheduledFor
  }

  private formatEmailHtml(notification: TriggerNotification): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${notification.subject}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f4f4f4; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .priority-${notification.priority} { 
      border-left: 4px solid ${this.getPriorityColor(notification.priority)}; 
      padding-left: 10px; 
    }
    .action-button {
      display: inline-block;
      padding: 10px 20px;
      background: #007bff;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin: 10px 0;
    }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>${notification.subject}</h2>
    </div>
    <div class="content priority-${notification.priority}">
      ${notification.message.replace(/\n/g, '<br>')}
      ${notification.requiresAction && notification.actionUrl ? `
        <p style="text-align: center; margin-top: 30px;">
          <a href="${notification.actionUrl}" class="action-button">
            ${this.getActionText(notification.actionType)}
          </a>
        </p>
      ` : ''}
    </div>
    <div class="footer">
      <p>This is an automated notification from your Digital Legacy System.</p>
      <p>Notification ID: ${notification.id}</p>
    </div>
  </div>
</body>
</html>
    `
  }

  private getPriorityColor(priority: NotificationPriority): string {
    switch (priority) {
      case NotificationPriority.CRITICAL: return '#dc3545'
      case NotificationPriority.URGENT: return '#fd7e14'
      case NotificationPriority.HIGH: return '#ffc107'
      case NotificationPriority.MEDIUM: return '#17a2b8'
      default: return '#6c757d'
    }
  }

  private getActionText(actionType?: NotificationAction): string {
    switch (actionType) {
      case NotificationAction.VERIFY_ACCESS: return 'Verify Access'
      case NotificationAction.GRANT_ACCESS: return 'Grant Access'
      case NotificationAction.DENY_ACCESS: return 'Deny Access'
      case NotificationAction.CHECK_IN: return 'Check In Now'
      case NotificationAction.VIEW_DETAILS: return 'View Details'
      case NotificationAction.CONTACT_USER: return 'Contact User'
      case NotificationAction.EMERGENCY_OVERRIDE: return 'Emergency Override'
      default: return 'Take Action'
    }
  }

  private async getUserName(userId: string): Promise<string> {
    // TODO: Implement actual user lookup
    return 'User'
  }

  private async getUserPrimaryContact(userId: string): Promise<NotificationRecipient | null> {
    // TODO: Implement actual user contact lookup
    return {
      id: userId,
      type: 'user',
      name: 'User',
      email: 'user@example.com',
      preferences: {
        channels: [NotificationChannel.EMAIL],
        language: 'en',
        timezone: 'UTC',
        urgentOnly: false,
        groupNotifications: true
      }
    }
  }

  private async createNotificationGroup(
    notifications: TriggerNotification[],
    trigger: TriggerCondition
  ): Promise<void> {
    const group: NotificationGroup = {
      id: uuidv4(),
      type: trigger.type,
      triggerIds: [trigger.id],
      recipientIds: notifications.map(n => n.recipient.id),
      created: new Date(),
      summary: `${notifications.length} notifications for ${trigger.type}`
    }

    this.notificationGroups.set(group.id, group)
    
    // Update notifications with group ID
    notifications.forEach(n => {
      n.groupId = group.id
    })
  }

  private getInAppNotifications(userId: string): TriggerNotification[] {
    return Array.from(this.notifications.values()).filter(n => 
      n.userId === userId && 
      n.channel === NotificationChannel.IN_APP &&
      n.status !== NotificationStatus.READ
    )
  }

  private emitNotificationEvent(notification: TriggerNotification): void {
    // TODO: Implement WebSocket or SSE for real-time updates
    console.log('Emit notification event:', notification.id)
  }

  private async processRetryQueue(): Promise<void> {
    const toRetry = [...this.retryQueue]
    this.retryQueue = []

    for (const notification of toRetry) {
      await this.send(notification)
    }
  }

  /**
   * Public API
   */

  /**
   * Get notification by ID
   */
  getNotification(id: string): TriggerNotification | undefined {
    return this.notifications.get(id)
  }

  /**
   * Get user notifications
   */
  getUserNotifications(
    userId: string,
    filter?: {
      type?: NotificationType
      status?: NotificationStatus
      channel?: NotificationChannel
      unreadOnly?: boolean
    }
  ): TriggerNotification[] {
    let notifications = Array.from(this.notifications.values()).filter(n => 
      n.userId === userId
    )

    if (filter) {
      if (filter.type) {
        notifications = notifications.filter(n => n.type === filter.type)
      }
      if (filter.status) {
        notifications = notifications.filter(n => n.status === filter.status)
      }
      if (filter.channel) {
        notifications = notifications.filter(n => n.channel === filter.channel)
      }
      if (filter.unreadOnly) {
        notifications = notifications.filter(n => n.status !== NotificationStatus.READ)
      }
    }

    return notifications.sort((a, b) => 
      (b.sentAt?.getTime() || 0) - (a.sentAt?.getTime() || 0)
    )
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): void {
    const notification = this.notifications.get(notificationId)
    if (notification && notification.status === NotificationStatus.DELIVERED) {
      notification.status = NotificationStatus.READ
      notification.readAt = new Date()
    }
  }

  /**
   * Cancel notification
   */
  cancelNotification(notificationId: string): boolean {
    const notification = this.notifications.get(notificationId)
    if (notification && notification.status === NotificationStatus.PENDING) {
      notification.status = NotificationStatus.CANCELLED
      return true
    }
    return false
  }

  /**
   * Get notification stats
   */
  getNotificationStats(userId?: string): {
    total: number
    sent: number
    delivered: number
    read: number
    failed: number
    pending: number
  } {
    const notifications = userId 
      ? this.getUserNotifications(userId)
      : Array.from(this.notifications.values())

    return {
      total: notifications.length,
      sent: notifications.filter(n => n.status === NotificationStatus.SENT).length,
      delivered: notifications.filter(n => n.status === NotificationStatus.DELIVERED).length,
      read: notifications.filter(n => n.status === NotificationStatus.READ).length,
      failed: notifications.filter(n => n.status === NotificationStatus.FAILED).length,
      pending: notifications.filter(n => n.status === NotificationStatus.PENDING).length
    }
  }

  /**
   * Clean up old notifications
   */
  async cleanup(daysToKeep: number = 30): Promise<number> {
    const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000)
    let removed = 0

    for (const [id, notification] of this.notifications) {
      if (notification.sentAt && notification.sentAt < cutoff) {
        this.notifications.delete(id)
        removed++
      }
    }

    return removed
  }
}

// Create singleton instance
export const triggerNotificationService = new TriggerNotificationService()