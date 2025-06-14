'use client'

import {
  MessagesLibrary,
  PersonalMessage,
  MessageDeliveryLog,
  DeliveryStatus,
  DeliveryMethod,
  ConditionalRule
} from '@/types/data'
import { messagesLibraryService } from './messages-library-service'
import { ruleEvaluationService } from './rule-evaluation-service'

export interface DeliveryTask {
  id: string
  messageId: string
  recipientId: string
  scheduledAt: Date
  priority: number
  retryCount: number
  maxRetries: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error?: string
  metadata?: Record<string, any>
}

export interface DeliveryQueueStats {
  pending: number
  processing: number
  completed: number
  failed: number
  nextDelivery?: Date
}

export class ScheduledDeliveryService {
  private static instance: ScheduledDeliveryService
  private deliveryQueue: DeliveryTask[] = []
  private processingInterval: NodeJS.Timeout | null = null
  private isProcessing = false
  
  // Configuration
  private readonly CHECK_INTERVAL = 60000 // Check every minute
  private readonly BATCH_SIZE = 10 // Process up to 10 messages at once
  private readonly DEFAULT_RETRY_COUNT = 3
  private readonly RETRY_DELAY = 300000 // 5 minutes
  
  public static getInstance(): ScheduledDeliveryService {
    if (!ScheduledDeliveryService.instance) {
      ScheduledDeliveryService.instance = new ScheduledDeliveryService()
    }
    return ScheduledDeliveryService.instance
  }

  /**
   * Start the delivery service
   */
  start(): void {
    if (this.processingInterval) return
    
    // Start processing immediately
    this.processQueue()
    
    // Set up interval for regular checks
    this.processingInterval = setInterval(() => {
      this.processQueue()
    }, this.CHECK_INTERVAL)
    
    console.log('Scheduled delivery service started')
  }

  /**
   * Stop the delivery service
   */
  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
    }
    this.isProcessing = false
    console.log('Scheduled delivery service stopped')
  }

  /**
   * Check messages for scheduled delivery
   */
  async checkScheduledMessages(library: MessagesLibrary): Promise<void> {
    const now = new Date()
    
    // Find messages that need to be delivered
    const scheduledMessages = library.messages.filter(message => {
      if (message.status !== 'scheduled') return false
      
      if (message.scheduling?.type === 'scheduled' && message.scheduling.deliverAt) {
        const deliverAt = new Date(message.scheduling.deliverAt)
        return deliverAt <= now
      }
      
      if (message.scheduling?.type === 'delayed' && message.scheduling.delayHours) {
        const createdAt = new Date(message.createdAt)
        const deliverAt = new Date(createdAt.getTime() + (message.scheduling.delayHours * 60 * 60 * 1000))
        return deliverAt <= now
      }
      
      return false
    })
    
    // Add to delivery queue
    for (const message of scheduledMessages) {
      await this.scheduleMessageDelivery(message, library)
    }
  }

  /**
   * Check conditional rules
   */
  async checkConditionalRules(library: MessagesLibrary): Promise<void> {
    if (!library.conditionalRules || library.conditionalRules.length === 0) return
    
    // Build evaluation context
    const context = ruleEvaluationService.buildEvaluationContext(
      'system', // TODO: Get actual user ID
      library
    )
    
    // Evaluate all enabled rules
    const enabledRules = library.conditionalRules.filter(rule => rule.enabled)
    const results = await ruleEvaluationService.evaluateRules(enabledRules, context)
    
    // Process matched rules
    for (const result of results) {
      if (result.matched && result.actions.length > 0) {
        const rule = library.conditionalRules.find(r => r.id === result.ruleId)
        if (rule) {
          await this.executeRuleActions(rule, result, library)
        }
      }
    }
  }

  /**
   * Schedule a message for delivery
   */
  async scheduleMessageDelivery(
    message: PersonalMessage,
    library: MessagesLibrary
  ): Promise<void> {
    // Create delivery tasks for each recipient
    for (const recipient of message.recipients) {
      const task: DeliveryTask = {
        id: crypto.randomUUID(),
        messageId: message.id,
        recipientId: recipient.identifier,
        scheduledAt: new Date(),
        priority: message.metadata.importance === 'critical' ? 0 : 
                  message.metadata.importance === 'high' ? 1 : 2,
        retryCount: 0,
        maxRetries: this.DEFAULT_RETRY_COUNT,
        status: 'pending',
        metadata: {
          recipientType: recipient.type,
          recipientName: recipient.name,
          deliveryMethod: recipient.deliveryPreferences?.preferredMethod || 'email'
        }
      }
      
      this.addToQueue(task)
    }
    
    // Update message status
    messagesLibraryService.updateMessage(library, message.id, { status: 'pending' })
  }

  /**
   * Add task to delivery queue
   */
  private addToQueue(task: DeliveryTask): void {
    // Check if task already exists
    const exists = this.deliveryQueue.find(t => 
      t.messageId === task.messageId && 
      t.recipientId === task.recipientId &&
      t.status === 'pending'
    )
    
    if (!exists) {
      this.deliveryQueue.push(task)
      this.sortQueue()
    }
  }

  /**
   * Sort queue by priority and scheduled time
   */
  private sortQueue(): void {
    this.deliveryQueue.sort((a, b) => {
      // First by priority
      if (a.priority !== b.priority) {
        return a.priority - b.priority
      }
      // Then by scheduled time
      return a.scheduledAt.getTime() - b.scheduledAt.getTime()
    })
  }

  /**
   * Process the delivery queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return
    this.isProcessing = true
    
    try {
      // Get pending tasks
      const pendingTasks = this.deliveryQueue
        .filter(t => t.status === 'pending')
        .slice(0, this.BATCH_SIZE)
      
      // Process each task
      await Promise.all(pendingTasks.map(task => this.processTask(task)))
      
      // Clean up completed and permanently failed tasks
      this.cleanupQueue()
    } catch (error) {
      console.error('Error processing delivery queue:', error)
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Process a single delivery task
   */
  private async processTask(task: DeliveryTask): Promise<void> {
    task.status = 'processing'
    
    try {
      // Simulate delivery based on method
      const deliveryMethod = task.metadata?.deliveryMethod as DeliveryMethod || 'email'
      const success = await this.deliverMessage(task, deliveryMethod)
      
      if (success) {
        task.status = 'completed'
        await this.createDeliveryLog(task, 'delivered')
      } else {
        throw new Error('Delivery failed')
      }
    } catch (error) {
      task.retryCount++
      
      if (task.retryCount >= task.maxRetries) {
        task.status = 'failed'
        task.error = error instanceof Error ? error.message : 'Unknown error'
        await this.createDeliveryLog(task, 'failed')
      } else {
        // Reschedule with delay
        task.status = 'pending'
        task.scheduledAt = new Date(Date.now() + this.RETRY_DELAY)
      }
    }
  }

  /**
   * Deliver message using specified method
   */
  private async deliverMessage(
    task: DeliveryTask,
    method: DeliveryMethod
  ): Promise<boolean> {
    // This is where you would integrate with actual delivery services
    // For now, we'll simulate delivery
    
    switch (method) {
      case 'email':
        console.log(`Delivering message ${task.messageId} to ${task.recipientId} via email`)
        // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
        return Math.random() > 0.1 // 90% success rate for testing
        
      case 'sms':
        console.log(`Delivering message ${task.messageId} to ${task.recipientId} via SMS`)
        // TODO: Integrate with SMS service (Twilio, etc.)
        return Math.random() > 0.15 // 85% success rate for testing
        
      case 'push':
        console.log(`Delivering message ${task.messageId} to ${task.recipientId} via push notification`)
        // TODO: Integrate with push notification service
        return Math.random() > 0.05 // 95% success rate for testing
        
      case 'inApp':
        console.log(`Delivering message ${task.messageId} to ${task.recipientId} in-app`)
        // In-app messages are always "delivered" when the user logs in
        return true
        
      default:
        console.warn(`Unknown delivery method: ${method}`)
        return false
    }
  }

  /**
   * Create delivery log entry
   */
  private async createDeliveryLog(
    task: DeliveryTask,
    status: DeliveryStatus
  ): Promise<void> {
    const log: MessageDeliveryLog = {
      id: crypto.randomUUID(),
      messageId: task.messageId,
      recipientId: task.recipientId,
      deliveryMethod: task.metadata?.deliveryMethod as DeliveryMethod || 'email',
      status,
      attempts: task.retryCount + 1,
      attemptedAt: task.scheduledAt.toISOString(),
      deliveredAt: status === 'delivered' ? new Date().toISOString() : undefined,
      error: task.error,
      metadata: {
        ...task.metadata,
        taskId: task.id
      }
    }
    
    // TODO: Save to library
    console.log('Delivery log:', log)
  }

  /**
   * Execute actions from conditional rules
   */
  private async executeRuleActions(
    rule: ConditionalRule,
    result: any,
    library: MessagesLibrary
  ): Promise<void> {
    await ruleEvaluationService.executeActions(
      result.actions,
      ruleEvaluationService.buildEvaluationContext('system', library),
      library,
      async (action, actionResult) => {
        console.log(`Rule ${rule.name} - Action ${action.type}:`, actionResult)
        
        // Update rule statistics
        messagesLibraryService.updateRuleStatistics(
          library,
          rule.id,
          actionResult.success
        )
      }
    )
  }

  /**
   * Clean up completed and failed tasks
   */
  private cleanupQueue(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000) // 24 hours
    
    this.deliveryQueue = this.deliveryQueue.filter(task => {
      // Keep pending and processing tasks
      if (task.status === 'pending' || task.status === 'processing') {
        return true
      }
      
      // Keep recent completed/failed tasks for debugging
      return task.scheduledAt.getTime() > cutoffTime
    })
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): DeliveryQueueStats {
    const stats: DeliveryQueueStats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0
    }
    
    this.deliveryQueue.forEach(task => {
      stats[task.status]++
    })
    
    // Find next delivery time
    const nextPending = this.deliveryQueue
      .filter(t => t.status === 'pending')
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0]
    
    if (nextPending) {
      stats.nextDelivery = nextPending.scheduledAt
    }
    
    return stats
  }

  /**
   * Get tasks for a specific message
   */
  getMessageTasks(messageId: string): DeliveryTask[] {
    return this.deliveryQueue.filter(task => task.messageId === messageId)
  }

  /**
   * Cancel all tasks for a message
   */
  cancelMessageDelivery(messageId: string): void {
    this.deliveryQueue = this.deliveryQueue.filter(task => {
      if (task.messageId === messageId && task.status === 'pending') {
        return false // Remove from queue
      }
      return true
    })
  }

  /**
   * Retry failed delivery
   */
  retryFailedDelivery(taskId: string): void {
    const task = this.deliveryQueue.find(t => t.id === taskId)
    if (task && task.status === 'failed') {
      task.status = 'pending'
      task.retryCount = 0
      task.scheduledAt = new Date()
      task.error = undefined
      this.sortQueue()
    }
  }
}

// Export singleton instance
export const scheduledDeliveryService = ScheduledDeliveryService.getInstance()