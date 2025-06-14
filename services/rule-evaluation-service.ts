'use client'

import {
  ConditionalRule,
  MessageCondition,
  MessageConditionType,
  ConditionalAction,
  ConditionalActionType,
  PersonalMessage,
  MessagesLibrary,
  MessageDeliveryLog,
  DeliveryStatus
} from '@/types/data'

export interface RuleEvaluationContext {
  userId: string
  library: MessagesLibrary
  lastLoginDate?: Date
  currentDate: Date
  triggeredEvents: Set<string>
  accessedDocuments: Set<string>
  readMessages: Set<string>
  deliveredMessages: Set<string>
  activeDeadManSwitches: Set<string>
  grantedEmergencyAccess: Set<string>
  completedVerifications: Set<string>
  accessedVaultItems: Set<string>
  beneficiaryAccess: Map<string, Date>
  customData?: Record<string, any>
}

export interface RuleEvaluationResult {
  ruleId: string
  matched: boolean
  conditions: Array<{
    conditionId: string
    matched: boolean
    reason?: string
  }>
  actions: ConditionalAction[]
  timestamp: Date
}

export interface ActionExecutionResult {
  actionId: string
  type: ConditionalActionType
  success: boolean
  error?: string
  data?: any
}

export class RuleEvaluationService {
  private static instance: RuleEvaluationService
  
  public static getInstance(): RuleEvaluationService {
    if (!RuleEvaluationService.instance) {
      RuleEvaluationService.instance = new RuleEvaluationService()
    }
    return RuleEvaluationService.instance
  }

  /**
   * Evaluate all enabled rules against current context
   */
  async evaluateRules(
    rules: ConditionalRule[],
    context: RuleEvaluationContext
  ): Promise<RuleEvaluationResult[]> {
    const results: RuleEvaluationResult[] = []
    
    // Sort rules by priority (lower number = higher priority)
    const sortedRules = [...rules]
      .filter(rule => rule.enabled)
      .sort((a, b) => a.priority - b.priority)
    
    for (const rule of sortedRules) {
      const result = await this.evaluateRule(rule, context)
      results.push(result)
    }
    
    return results
  }

  /**
   * Evaluate a single rule
   */
  async evaluateRule(
    rule: ConditionalRule,
    context: RuleEvaluationContext
  ): Promise<RuleEvaluationResult> {
    const conditionResults: Array<{
      conditionId: string
      matched: boolean
      reason?: string
    }> = []
    
    let overallMatch = true
    
    // Evaluate each condition
    for (const condition of rule.conditions) {
      const result = await this.evaluateCondition(condition, context)
      conditionResults.push({
        conditionId: condition.id,
        matched: result.matched,
        reason: result.reason
      })
      
      // Apply logical operators
      if (condition.operator === 'AND') {
        overallMatch = overallMatch && result.matched
      } else if (condition.operator === 'OR') {
        overallMatch = overallMatch || result.matched
      } else if (condition.operator === 'NOT') {
        overallMatch = overallMatch && !result.matched
      }
      
      // Short-circuit evaluation for AND
      if (condition.operator === 'AND' && !result.matched) {
        break
      }
    }
    
    return {
      ruleId: rule.id,
      matched: overallMatch,
      conditions: conditionResults,
      actions: overallMatch ? rule.actions : [],
      timestamp: new Date()
    }
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(
    condition: MessageCondition,
    context: RuleEvaluationContext
  ): Promise<{ matched: boolean; reason?: string }> {
    switch (condition.type) {
      case 'userInactivity':
        return this.evaluateUserInactivity(condition, context)
      
      case 'dateReached':
        return this.evaluateDateReached(condition, context)
      
      case 'messageRead':
        return this.evaluateMessageRead(condition, context)
      
      case 'messageDelivered':
        return this.evaluateMessageDelivered(condition, context)
      
      case 'beneficiaryAccessed':
        return this.evaluateBeneficiaryAccessed(condition, context)
      
      case 'documentAccessed':
        return this.evaluateDocumentAccessed(condition, context)
      
      case 'eventTriggered':
        return this.evaluateEventTriggered(condition, context)
      
      case 'deadManSwitch':
        return this.evaluateDeadManSwitch(condition, context)
      
      case 'emergencyAccess':
        return this.evaluateEmergencyAccess(condition, context)
      
      case 'verificationComplete':
        return this.evaluateVerificationComplete(condition, context)
      
      case 'passwordVaultAccessed':
        return this.evaluatePasswordVaultAccessed(condition, context)
      
      case 'customCondition':
        return this.evaluateCustomCondition(condition, context)
      
      default:
        return { matched: false, reason: 'Unknown condition type' }
    }
  }

  // Condition evaluators

  private evaluateUserInactivity(
    condition: MessageCondition,
    context: RuleEvaluationContext
  ): { matched: boolean; reason?: string } {
    const inactivityDays = condition.parameters.inactivityDays || 30
    
    if (!context.lastLoginDate) {
      return { matched: false, reason: 'No login history available' }
    }
    
    const daysSinceLogin = Math.floor(
      (context.currentDate.getTime() - context.lastLoginDate.getTime()) / 
      (1000 * 60 * 60 * 24)
    )
    
    const matched = daysSinceLogin >= inactivityDays
    
    return {
      matched,
      reason: matched 
        ? `User inactive for ${daysSinceLogin} days (threshold: ${inactivityDays})`
        : `User active ${daysSinceLogin} days ago (threshold: ${inactivityDays})`
    }
  }

  private evaluateDateReached(
    condition: MessageCondition,
    context: RuleEvaluationContext
  ): { matched: boolean; reason?: string } {
    const targetDate = condition.parameters.targetDate
    
    if (!targetDate) {
      return { matched: false, reason: 'No target date specified' }
    }
    
    const target = new Date(targetDate)
    const matched = context.currentDate >= target
    
    return {
      matched,
      reason: matched
        ? `Current date (${context.currentDate.toISOString()}) has passed target (${target.toISOString()})`
        : `Target date (${target.toISOString()}) not yet reached`
    }
  }

  private evaluateMessageRead(
    condition: MessageCondition,
    context: RuleEvaluationContext
  ): { matched: boolean; reason?: string } {
    const messageId = condition.parameters.messageId
    const messageIds = condition.parameters.messageIds || []
    
    const allIds = messageId ? [messageId, ...messageIds] : messageIds
    
    if (allIds.length === 0) {
      return { matched: false, reason: 'No messages specified' }
    }
    
    const readCount = allIds.filter(id => context.readMessages.has(id)).length
    const matched = readCount > 0
    
    return {
      matched,
      reason: matched
        ? `${readCount} of ${allIds.length} specified messages have been read`
        : 'None of the specified messages have been read'
    }
  }

  private evaluateMessageDelivered(
    condition: MessageCondition,
    context: RuleEvaluationContext
  ): { matched: boolean; reason?: string } {
    const messageId = condition.parameters.messageId
    const messageIds = condition.parameters.messageIds || []
    
    const allIds = messageId ? [messageId, ...messageIds] : messageIds
    
    if (allIds.length === 0) {
      return { matched: false, reason: 'No messages specified' }
    }
    
    const deliveredCount = allIds.filter(id => context.deliveredMessages.has(id)).length
    const matched = deliveredCount > 0
    
    return {
      matched,
      reason: matched
        ? `${deliveredCount} of ${allIds.length} specified messages have been delivered`
        : 'None of the specified messages have been delivered'
    }
  }

  private evaluateBeneficiaryAccessed(
    condition: MessageCondition,
    context: RuleEvaluationContext
  ): { matched: boolean; reason?: string } {
    const beneficiaryId = condition.parameters.beneficiaryId
    const beneficiaryIds = condition.parameters.beneficiaryIds || []
    
    const allIds = beneficiaryId ? [beneficiaryId, ...beneficiaryIds] : beneficiaryIds
    
    if (allIds.length === 0) {
      // Any beneficiary access
      const matched = context.beneficiaryAccess.size > 0
      return {
        matched,
        reason: matched
          ? `${context.beneficiaryAccess.size} beneficiaries have accessed the system`
          : 'No beneficiaries have accessed the system'
      }
    }
    
    const accessedCount = allIds.filter(id => context.beneficiaryAccess.has(id)).length
    const matched = accessedCount > 0
    
    return {
      matched,
      reason: matched
        ? `${accessedCount} of ${allIds.length} specified beneficiaries have accessed`
        : 'None of the specified beneficiaries have accessed'
    }
  }

  private evaluateDocumentAccessed(
    condition: MessageCondition,
    context: RuleEvaluationContext
  ): { matched: boolean; reason?: string } {
    const documentId = condition.parameters.documentId
    const documentIds = condition.parameters.documentIds || []
    
    const allIds = documentId ? [documentId, ...documentIds] : documentIds
    
    if (allIds.length === 0) {
      return { matched: false, reason: 'No documents specified' }
    }
    
    const accessedCount = allIds.filter(id => context.accessedDocuments.has(id)).length
    const matched = accessedCount > 0
    
    return {
      matched,
      reason: matched
        ? `${accessedCount} of ${allIds.length} specified documents have been accessed`
        : 'None of the specified documents have been accessed'
    }
  }

  private evaluateEventTriggered(
    condition: MessageCondition,
    context: RuleEvaluationContext
  ): { matched: boolean; reason?: string } {
    const eventName = condition.parameters.eventName
    
    if (!eventName) {
      return { matched: false, reason: 'No event name specified' }
    }
    
    const matched = context.triggeredEvents.has(eventName)
    
    return {
      matched,
      reason: matched
        ? `Event "${eventName}" has been triggered`
        : `Event "${eventName}" has not been triggered`
    }
  }

  private evaluateDeadManSwitch(
    condition: MessageCondition,
    context: RuleEvaluationContext
  ): { matched: boolean; reason?: string } {
    const switchId = condition.parameters.switchId
    
    if (switchId) {
      const matched = context.activeDeadManSwitches.has(switchId)
      return {
        matched,
        reason: matched
          ? `Dead man's switch "${switchId}" is active`
          : `Dead man's switch "${switchId}" is not active`
      }
    }
    
    // Any dead man's switch
    const matched = context.activeDeadManSwitches.size > 0
    return {
      matched,
      reason: matched
        ? `${context.activeDeadManSwitches.size} dead man's switches are active`
        : 'No dead man\'s switches are active'
    }
  }

  private evaluateEmergencyAccess(
    condition: MessageCondition,
    context: RuleEvaluationContext
  ): { matched: boolean; reason?: string } {
    const tokenId = condition.parameters.tokenId
    const grantId = condition.parameters.grantId
    
    if (tokenId || grantId) {
      const id = tokenId || grantId || ''
      const matched = context.grantedEmergencyAccess.has(id)
      return {
        matched,
        reason: matched
          ? `Emergency access "${id}" has been granted`
          : `Emergency access "${id}" has not been granted`
      }
    }
    
    // Any emergency access
    const matched = context.grantedEmergencyAccess.size > 0
    return {
      matched,
      reason: matched
        ? `${context.grantedEmergencyAccess.size} emergency accesses have been granted`
        : 'No emergency accesses have been granted'
    }
  }

  private evaluateVerificationComplete(
    condition: MessageCondition,
    context: RuleEvaluationContext
  ): { matched: boolean; reason?: string } {
    const verificationType = condition.parameters.verificationType
    
    if (verificationType) {
      const matched = context.completedVerifications.has(verificationType)
      return {
        matched,
        reason: matched
          ? `Verification type "${verificationType}" is complete`
          : `Verification type "${verificationType}" is not complete`
      }
    }
    
    // Any verification
    const matched = context.completedVerifications.size > 0
    return {
      matched,
      reason: matched
        ? `${context.completedVerifications.size} verifications are complete`
        : 'No verifications are complete'
    }
  }

  private evaluatePasswordVaultAccessed(
    condition: MessageCondition,
    context: RuleEvaluationContext
  ): { matched: boolean; reason?: string } {
    const vaultItemId = condition.parameters.vaultItemId
    
    if (vaultItemId) {
      const matched = context.accessedVaultItems.has(vaultItemId)
      return {
        matched,
        reason: matched
          ? `Vault item "${vaultItemId}" has been accessed`
          : `Vault item "${vaultItemId}" has not been accessed`
      }
    }
    
    // Any vault access
    const matched = context.accessedVaultItems.size > 0
    return {
      matched,
      reason: matched
        ? `${context.accessedVaultItems.size} vault items have been accessed`
        : 'No vault items have been accessed'
    }
  }

  private evaluateCustomCondition(
    condition: MessageCondition,
    context: RuleEvaluationContext
  ): { matched: boolean; reason?: string } {
    // For now, custom conditions always return false
    // In a real implementation, this would evaluate custom logic
    return {
      matched: false,
      reason: 'Custom condition evaluation not implemented'
    }
  }

  /**
   * Execute actions from evaluation results
   */
  async executeActions(
    actions: ConditionalAction[],
    context: RuleEvaluationContext,
    library: MessagesLibrary,
    onAction: (action: ConditionalAction, result: ActionExecutionResult) => Promise<void>
  ): Promise<ActionExecutionResult[]> {
    const results: ActionExecutionResult[] = []
    
    for (const action of actions) {
      // Apply delay if specified
      if (action.delay && action.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, action.delay * 60 * 1000))
      }
      
      const result = await this.executeAction(action, context, library)
      results.push(result)
      
      // Callback for each action
      await onAction(action, result)
      
      // Retry on failure if configured
      if (!result.success && action.retryOnFailure && action.maxRetries) {
        let retryCount = 0
        while (retryCount < action.maxRetries && !result.success) {
          await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
          const retryResult = await this.executeAction(action, context, library)
          if (retryResult.success) {
            results[results.length - 1] = retryResult
            await onAction(action, retryResult)
            break
          }
          retryCount++
        }
      }
    }
    
    return results
  }

  /**
   * Execute a single action
   */
  private async executeAction(
    action: ConditionalAction,
    context: RuleEvaluationContext,
    library: MessagesLibrary
  ): Promise<ActionExecutionResult> {
    try {
      switch (action.type) {
        case 'sendMessage':
          return this.executeSendMessage(action, context, library)
        
        case 'scheduleMessage':
          return this.executeScheduleMessage(action, context, library)
        
        case 'cancelMessage':
          return this.executeCancelMessage(action, context, library)
        
        case 'notifyUser':
          return this.executeNotifyUser(action, context)
        
        case 'notifyBeneficiary':
          return this.executeNotifyBeneficiary(action, context)
        
        case 'grantAccess':
          return this.executeGrantAccess(action, context)
        
        case 'revokeAccess':
          return this.executeRevokeAccess(action, context)
        
        case 'triggerEvent':
          return this.executeTriggerEvent(action, context)
        
        case 'executeWebhook':
          return this.executeWebhook(action, context)
        
        case 'logEvent':
          return this.executeLogEvent(action, context)
        
        default:
          return {
            actionId: action.id,
            type: action.type,
            success: false,
            error: 'Unknown action type'
          }
      }
    } catch (error) {
      return {
        actionId: action.id,
        type: action.type,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Action executors

  private async executeSendMessage(
    action: ConditionalAction,
    context: RuleEvaluationContext,
    library: MessagesLibrary
  ): Promise<ActionExecutionResult> {
    const messageId = action.parameters.messageId
    const recipientIds = action.parameters.recipientIds || []
    
    if (!messageId) {
      return {
        actionId: action.id,
        type: action.type,
        success: false,
        error: 'No message ID specified'
      }
    }
    
    const message = library.messages.find(m => m.id === messageId)
    if (!message) {
      return {
        actionId: action.id,
        type: action.type,
        success: false,
        error: 'Message not found'
      }
    }
    
    // Create delivery log
    const deliveryLog: MessageDeliveryLog = {
      id: crypto.randomUUID(),
      messageId: message.id,
      recipientId: recipientIds[0] || 'system', // TODO: Handle multiple recipients
      deliveryMethod: action.parameters.deliveryMethod || 'system',
      status: 'pending' as DeliveryStatus,
      attempts: 1,
      scheduledAt: new Date().toISOString(),
      metadata: {
        triggeredByRule: action.id
      }
    }
    
    // In a real implementation, this would trigger actual message delivery
    console.log('Sending message:', message.title, 'to', recipientIds)
    
    return {
      actionId: action.id,
      type: action.type,
      success: true,
      data: { deliveryLogId: deliveryLog.id }
    }
  }

  private async executeScheduleMessage(
    action: ConditionalAction,
    context: RuleEvaluationContext,
    library: MessagesLibrary
  ): Promise<ActionExecutionResult> {
    const messageId = action.parameters.messageId
    const scheduledTime = action.parameters.scheduledTime
    
    if (!messageId || !scheduledTime) {
      return {
        actionId: action.id,
        type: action.type,
        success: false,
        error: 'Message ID and scheduled time are required'
      }
    }
    
    // In a real implementation, this would schedule the message
    console.log('Scheduling message:', messageId, 'for', scheduledTime)
    
    return {
      actionId: action.id,
      type: action.type,
      success: true,
      data: { scheduledTime }
    }
  }

  private async executeCancelMessage(
    action: ConditionalAction,
    context: RuleEvaluationContext,
    library: MessagesLibrary
  ): Promise<ActionExecutionResult> {
    const messageInstanceId = action.parameters.messageInstanceId
    
    if (!messageInstanceId) {
      return {
        actionId: action.id,
        type: action.type,
        success: false,
        error: 'Message instance ID is required'
      }
    }
    
    // In a real implementation, this would cancel the scheduled message
    console.log('Cancelling message instance:', messageInstanceId)
    
    return {
      actionId: action.id,
      type: action.type,
      success: true
    }
  }

  private async executeNotifyUser(
    action: ConditionalAction,
    context: RuleEvaluationContext
  ): Promise<ActionExecutionResult> {
    const { notificationTitle, notificationBody, notificationChannels } = action.parameters
    
    if (!notificationTitle || !notificationBody) {
      return {
        actionId: action.id,
        type: action.type,
        success: false,
        error: 'Notification title and body are required'
      }
    }
    
    // In a real implementation, this would send notifications
    console.log('Notifying user:', notificationTitle, 'via', notificationChannels)
    
    return {
      actionId: action.id,
      type: action.type,
      success: true
    }
  }

  private async executeNotifyBeneficiary(
    action: ConditionalAction,
    context: RuleEvaluationContext
  ): Promise<ActionExecutionResult> {
    const { notificationTitle, notificationBody, notificationChannels } = action.parameters
    
    if (!notificationTitle || !notificationBody) {
      return {
        actionId: action.id,
        type: action.type,
        success: false,
        error: 'Notification title and body are required'
      }
    }
    
    // In a real implementation, this would send notifications to beneficiaries
    console.log('Notifying beneficiaries:', notificationTitle, 'via', notificationChannels)
    
    return {
      actionId: action.id,
      type: action.type,
      success: true
    }
  }

  private async executeGrantAccess(
    action: ConditionalAction,
    context: RuleEvaluationContext
  ): Promise<ActionExecutionResult> {
    const { resourceId, resourceType, permissionLevel } = action.parameters
    
    if (!resourceId || !resourceType) {
      return {
        actionId: action.id,
        type: action.type,
        success: false,
        error: 'Resource ID and type are required'
      }
    }
    
    // In a real implementation, this would grant access
    console.log('Granting access to:', resourceType, resourceId, 'level:', permissionLevel)
    
    return {
      actionId: action.id,
      type: action.type,
      success: true
    }
  }

  private async executeRevokeAccess(
    action: ConditionalAction,
    context: RuleEvaluationContext
  ): Promise<ActionExecutionResult> {
    const { resourceId, resourceType } = action.parameters
    
    if (!resourceId || !resourceType) {
      return {
        actionId: action.id,
        type: action.type,
        success: false,
        error: 'Resource ID and type are required'
      }
    }
    
    // In a real implementation, this would revoke access
    console.log('Revoking access to:', resourceType, resourceId)
    
    return {
      actionId: action.id,
      type: action.type,
      success: true
    }
  }

  private async executeTriggerEvent(
    action: ConditionalAction,
    context: RuleEvaluationContext
  ): Promise<ActionExecutionResult> {
    const { eventName, eventPayload } = action.parameters
    
    if (!eventName) {
      return {
        actionId: action.id,
        type: action.type,
        success: false,
        error: 'Event name is required'
      }
    }
    
    // Add to triggered events
    context.triggeredEvents.add(eventName)
    
    // In a real implementation, this would trigger the event
    console.log('Triggering event:', eventName, 'with payload:', eventPayload)
    
    return {
      actionId: action.id,
      type: action.type,
      success: true,
      data: { eventName, eventPayload }
    }
  }

  private async executeWebhook(
    action: ConditionalAction,
    context: RuleEvaluationContext
  ): Promise<ActionExecutionResult> {
    const { webhookUrl, webhookMethod, webhookHeaders, webhookBody } = action.parameters
    
    if (!webhookUrl) {
      return {
        actionId: action.id,
        type: action.type,
        success: false,
        error: 'Webhook URL is required'
      }
    }
    
    try {
      const response = await fetch(webhookUrl, {
        method: webhookMethod || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...webhookHeaders
        },
        body: JSON.stringify(webhookBody || {})
      })
      
      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}`)
      }
      
      return {
        actionId: action.id,
        type: action.type,
        success: true,
        data: { statusCode: response.status }
      }
    } catch (error) {
      return {
        actionId: action.id,
        type: action.type,
        success: false,
        error: error instanceof Error ? error.message : 'Webhook execution failed'
      }
    }
  }

  private async executeLogEvent(
    action: ConditionalAction,
    context: RuleEvaluationContext
  ): Promise<ActionExecutionResult> {
    const { logLevel, logMessage, logData } = action.parameters
    
    if (!logMessage) {
      return {
        actionId: action.id,
        type: action.type,
        success: false,
        error: 'Log message is required'
      }
    }
    
    // Log the event
    const logMethod = logLevel === 'error' ? console.error : 
                     logLevel === 'warning' ? console.warn : 
                     console.log
    
    logMethod(`[Rule Engine] ${logMessage}`, logData)
    
    return {
      actionId: action.id,
      type: action.type,
      success: true,
      data: { logLevel, logMessage }
    }
  }

  /**
   * Build evaluation context from current system state
   */
  buildEvaluationContext(
    userId: string,
    library: MessagesLibrary,
    additionalData?: Partial<RuleEvaluationContext>
  ): RuleEvaluationContext {
    // Extract delivered and read messages from delivery logs
    const deliveredMessages = new Set<string>()
    const readMessages = new Set<string>()
    
    library.deliveryLogs.forEach(log => {
      if (log.status === 'delivered' || log.status === 'viewed') {
        deliveredMessages.add(log.messageId)
      }
      if (log.status === 'viewed') {
        readMessages.add(log.messageId)
      }
    })
    
    return {
      userId,
      library,
      currentDate: new Date(),
      triggeredEvents: new Set(),
      accessedDocuments: new Set(),
      readMessages,
      deliveredMessages,
      activeDeadManSwitches: new Set(),
      grantedEmergencyAccess: new Set(),
      completedVerifications: new Set(),
      accessedVaultItems: new Set(),
      beneficiaryAccess: new Map(),
      ...additionalData
    }
  }
}

// Export singleton instance
export const ruleEvaluationService = RuleEvaluationService.getInstance()