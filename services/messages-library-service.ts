'use client'

import { 
  PersonalMessage,
  MessagesLibrary,
  MessageType,
  MessageFormat,
  MessageCategory,
  MessageContent,
  MessageRecipient,
  MessageMetadata,
  MessageTemplate,
  MessageStatus,
  TemplateCategory,
  DeliveryMethod,
  MessageDeliveryLog,
  DeliveryStatus,
  MessageCondition,
  MessageScheduling,
  MessageAttachment,
  RecipientType,
  MessagePermissions,
  MessageTone,
  ConditionalRule
} from '@/types/data'

export interface MessageCreateOptions {
  type: MessageType
  format: MessageFormat
  category?: MessageCategory
  title: string
  content: MessageContent
  recipients: MessageRecipient[]
  metadata?: Partial<MessageMetadata>
  conditions?: MessageCondition[]
  scheduling?: MessageScheduling
  attachments?: MessageAttachment[]
  locale?: string
  parentMessageId?: string
}

export class MessagesLibraryService {
  private static instance: MessagesLibraryService
  
  public static getInstance(): MessagesLibraryService {
    if (!MessagesLibraryService.instance) {
      MessagesLibraryService.instance = new MessagesLibraryService()
    }
    return MessagesLibraryService.instance
  }

  /**
   * Create a new empty messages library
   */
  createEmptyLibrary(): MessagesLibrary {
    return {
      messages: [],
      templates: this.getDefaultTemplates(),
      categories: ['immediate', 'timed', 'conditional', 'milestone', 'recurring', 'manual'],
      deliveryLogs: [],
      conditionalRules: [],
      settings: {
        defaultFormat: 'text',
        defaultCategory: 'immediate',
        enableAudioMessages: true,
        enableVideoMessages: true,
        maxAudioDuration: 300, // 5 minutes
        maxVideoDuration: 600, // 10 minutes
        maxFileSize: 100 * 1024 * 1024, // 100MB
        supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko'],
        defaultLanguage: 'en',
        enableTemplates: true,
        enableAIAssistance: false,
        enableScheduling: true,
        enableConditionalDelivery: true,
        deliveryRetryAttempts: 3,
        deliveryRetryInterval: 24, // hours
        archiveDeliveredMessages: true,
        archiveAfterDays: 90,
        notificationSettings: {
          notifyOnDraft: false,
          notifyOnScheduled: true,
          notifyOnDelivered: true,
          notifyOnViewed: true,
          notifyOnFailed: true,
          notificationChannels: ['email']
        },
        mediaStorage: {
          provider: 'local',
          encryptMedia: true,
          compressMedia: true,
          generateTranscripts: false,
          generateThumbnails: true
        }
      },
      statistics: {
        totalMessages: 0,
        messagesByType: {} as Record<MessageType, number>,
        messagesByFormat: {} as Record<MessageFormat, number>,
        messagesByStatus: {} as Record<MessageStatus, number>,
        totalRecipients: 0,
        deliveredMessages: 0,
        viewedMessages: 0,
        failedDeliveries: 0,
        averageDeliveryTime: 0,
        popularTemplates: [],
        languageDistribution: {},
        lastAnalysis: new Date().toISOString()
      }
    }
  }

  /**
   * Validate message data
   */
  validateMessage(options: MessageCreateOptions): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Required fields
    if (!options.title?.trim()) {
      errors.push('Message title is required')
    }
    if (!options.type) {
      errors.push('Message type is required')
    }
    if (!options.format) {
      errors.push('Message format is required')
    }
    if (!options.content || Object.keys(options.content).length === 0) {
      errors.push('Message content is required')
    }
    if (!options.recipients || options.recipients.length === 0) {
      errors.push('At least one recipient is required')
    }

    // Validate content based on format
    if (options.format === 'text' && !options.content.text && !options.content.plainText) {
      errors.push('Text content is required for text format')
    }
    if (options.format === 'audio' && !options.content.audioUrl) {
      errors.push('Audio URL is required for audio format')
    }
    if (options.format === 'video' && !options.content.videoUrl) {
      errors.push('Video URL is required for video format')
    }

    // Validate recipients
    options.recipients?.forEach((recipient, index) => {
      if (!recipient.name) {
        errors.push(`Recipient ${index + 1}: Name is required`)
      }
      if (!recipient.identifier) {
        errors.push(`Recipient ${index + 1}: Identifier is required`)
      }
      if (!recipient.deliveryMethod || recipient.deliveryMethod.length === 0) {
        errors.push(`Recipient ${index + 1}: At least one delivery method is required`)
      }
    })

    // Validate scheduling
    if (options.scheduling) {
      if (options.scheduling.type === 'scheduled' && !options.scheduling.deliverAt) {
        errors.push('Delivery date is required for scheduled messages')
      }
      if (options.scheduling.type === 'delayed' && !options.scheduling.delayHours) {
        errors.push('Delay hours is required for delayed messages')
      }
      if (options.scheduling.type === 'recurring' && !options.scheduling.recurringPattern) {
        errors.push('Recurring pattern is required for recurring messages')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Create a new message
   */
  createMessage(library: MessagesLibrary, options: MessageCreateOptions): MessagesLibrary {
    const validation = this.validateMessage(options)
    if (!validation.isValid) {
      throw new Error(`Invalid message data: ${validation.errors.join(', ')}`)
    }

    const now = new Date().toISOString()
    const message: PersonalMessage = {
      id: crypto.randomUUID(),
      type: options.type,
      format: options.format,
      category: options.category || library.settings.defaultCategory,
      title: options.title.trim(),
      content: options.content,
      recipients: options.recipients.map(r => ({
        ...r,
        id: r.id || crypto.randomUUID()
      })),
      metadata: {
        importance: 'medium',
        sensitivity: 'private',
        language: options.locale || library.settings.defaultLanguage,
        readTime: this.calculateReadTime(options.content),
        keywords: [],
        tone: 'neutral',
        approvalStatus: 'draft',
        ...options.metadata
      },
      conditions: options.conditions || [],
      scheduling: options.scheduling,
      attachments: options.attachments || [],
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      createdBy: 'current-user',
      version: 1,
      locale: options.locale || library.settings.defaultLanguage,
      parentMessageId: options.parentMessageId
    }

    const updatedLibrary = {
      ...library,
      messages: [...library.messages, message]
    }

    return this.updateStatistics(updatedLibrary)
  }

  /**
   * Update an existing message
   */
  updateMessage(library: MessagesLibrary, messageId: string, updates: Partial<PersonalMessage>): MessagesLibrary {
    const messageIndex = library.messages.findIndex(m => m.id === messageId)
    if (messageIndex === -1) {
      throw new Error('Message not found')
    }

    const currentMessage = library.messages[messageIndex]
    const updatedMessage: PersonalMessage = {
      ...currentMessage,
      ...updates,
      id: messageId, // Ensure ID doesn't change
      updatedAt: new Date().toISOString(),
      lastModifiedBy: 'current-user',
      version: currentMessage.version + 1
    }

    const updatedMessages = [...library.messages]
    updatedMessages[messageIndex] = updatedMessage

    const updatedLibrary = {
      ...library,
      messages: updatedMessages
    }

    return this.updateStatistics(updatedLibrary)
  }

  /**
   * Delete a message
   */
  deleteMessage(library: MessagesLibrary, messageId: string): MessagesLibrary {
    const updatedLibrary = {
      ...library,
      messages: library.messages.filter(m => m.id !== messageId),
      deliveryLogs: library.deliveryLogs.filter(log => log.messageId !== messageId)
    }

    return this.updateStatistics(updatedLibrary)
  }

  /**
   * Schedule a message for delivery
   */
  scheduleMessage(library: MessagesLibrary, messageId: string): MessagesLibrary {
    const message = library.messages.find(m => m.id === messageId)
    if (!message) {
      throw new Error('Message not found')
    }

    if (message.status !== 'draft') {
      throw new Error('Only draft messages can be scheduled')
    }

    return this.updateMessage(library, messageId, {
      status: 'scheduled'
    })
  }

  /**
   * Cancel a scheduled message
   */
  cancelMessage(library: MessagesLibrary, messageId: string): MessagesLibrary {
    const message = library.messages.find(m => m.id === messageId)
    if (!message) {
      throw new Error('Message not found')
    }

    if (!['scheduled', 'pending'].includes(message.status)) {
      throw new Error('Only scheduled or pending messages can be cancelled')
    }

    return this.updateMessage(library, messageId, {
      status: 'cancelled'
    })
  }

  /**
   * Create a message from template
   */
  createFromTemplate(
    library: MessagesLibrary, 
    templateId: string, 
    variables: Record<string, any>,
    recipients: MessageRecipient[]
  ): MessagesLibrary {
    const template = library.templates.find(t => t.id === templateId)
    if (!template) {
      throw new Error('Template not found')
    }

    // Process template variables
    let processedContent = { ...template.content.content }
    if (processedContent.text) {
      processedContent.text = this.processTemplateVariables(processedContent.text, variables)
    }
    if (processedContent.plainText) {
      processedContent.plainText = this.processTemplateVariables(processedContent.plainText, variables)
    }

    const messageOptions: MessageCreateOptions = {
      type: template.content.type!,
      format: template.content.format!,
      category: template.content.category,
      title: this.processTemplateVariables(template.content.title || template.name, variables),
      content: processedContent as MessageContent,
      recipients,
      metadata: {
        ...template.content.metadata,
        isTemplate: true,
        templateId: template.id,
        templateVariables: variables
      },
      conditions: template.content.conditions,
      scheduling: template.content.scheduling,
      attachments: template.content.attachments
    }

    // Update template usage
    const updatedTemplates = library.templates.map(t => 
      t.id === templateId ? { ...t, usage: t.usage + 1 } : t
    )

    const libraryWithUpdatedTemplates = {
      ...library,
      templates: updatedTemplates
    }

    return this.createMessage(libraryWithUpdatedTemplates, messageOptions)
  }

  /**
   * Process template variables
   */
  private processTemplateVariables(text: string, variables: Record<string, any>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return variables[varName] !== undefined ? String(variables[varName]) : match
    })
  }

  /**
   * Search messages
   */
  searchMessages(library: MessagesLibrary, query: string): PersonalMessage[] {
    const searchTerm = query.toLowerCase()
    
    return library.messages.filter(message => {
      const titleMatch = message.title.toLowerCase().includes(searchTerm)
      const textMatch = message.content.text?.toLowerCase().includes(searchTerm) || 
                       message.content.plainText?.toLowerCase().includes(searchTerm)
      const typeMatch = message.type.toLowerCase().includes(searchTerm)
      const recipientMatch = message.recipients.some(r => 
        r.name.toLowerCase().includes(searchTerm) ||
        r.identifier.toLowerCase().includes(searchTerm)
      )
      const keywordMatch = message.metadata.keywords?.some(k => 
        k.toLowerCase().includes(searchTerm)
      )
      
      return titleMatch || textMatch || typeMatch || recipientMatch || keywordMatch
    })
  }

  /**
   * Filter messages
   */
  filterMessages(library: MessagesLibrary, filters: {
    type?: MessageType
    format?: MessageFormat
    category?: MessageCategory
    status?: MessageStatus
    recipientId?: string
    language?: string
    dateRange?: { start: string; end: string }
  }): PersonalMessage[] {
    let messages = library.messages

    if (filters.type) {
      messages = messages.filter(m => m.type === filters.type)
    }
    if (filters.format) {
      messages = messages.filter(m => m.format === filters.format)
    }
    if (filters.category) {
      messages = messages.filter(m => m.category === filters.category)
    }
    if (filters.status) {
      messages = messages.filter(m => m.status === filters.status)
    }
    if (filters.recipientId) {
      messages = messages.filter(m => 
        m.recipients.some(r => r.identifier === filters.recipientId)
      )
    }
    if (filters.language) {
      messages = messages.filter(m => m.locale === filters.language)
    }
    if (filters.dateRange) {
      const start = new Date(filters.dateRange.start)
      const end = new Date(filters.dateRange.end)
      messages = messages.filter(m => {
        const created = new Date(m.createdAt)
        return created >= start && created <= end
      })
    }

    return messages
  }

  /**
   * Get messages by recipient
   */
  getMessagesByRecipient(library: MessagesLibrary, recipientId: string): PersonalMessage[] {
    return library.messages.filter(message =>
      message.recipients.some(r => r.identifier === recipientId)
    )
  }

  /**
   * Get scheduled messages
   */
  getScheduledMessages(library: MessagesLibrary): PersonalMessage[] {
    return library.messages.filter(m => 
      m.status === 'scheduled' || m.status === 'pending'
    )
  }

  /**
   * Calculate read time for content
   */
  private calculateReadTime(content: MessageContent): number {
    const wordsPerMinute = 200
    let wordCount = 0

    if (content.text) {
      const plainText = content.text.replace(/<[^>]*>/g, '')
      wordCount += plainText.split(/\s+/).length
    }
    if (content.plainText) {
      wordCount += content.plainText.split(/\s+/).length
    }

    // Add time for media
    const audioTime = content.duration ? Math.ceil(content.duration / 60) : 0
    const videoTime = content.duration ? Math.ceil(content.duration / 60) : 0

    return Math.ceil(wordCount / wordsPerMinute) + audioTime + videoTime
  }

  /**
   * Log message delivery
   */
  logDelivery(
    library: MessagesLibrary, 
    messageId: string, 
    recipientId: string,
    deliveryMethod: DeliveryMethod,
    status: DeliveryStatus,
    metadata?: Record<string, any>
  ): MessagesLibrary {
    const log: MessageDeliveryLog = {
      id: crypto.randomUUID(),
      messageId,
      recipientId,
      deliveryMethod,
      status,
      attemptedAt: new Date().toISOString(),
      deliveredAt: status === 'delivered' ? new Date().toISOString() : undefined,
      retryCount: 0,
      metadata
    }

    return {
      ...library,
      deliveryLogs: [...library.deliveryLogs, log]
    }
  }

  /**
   * Get default message templates
   */
  private getDefaultTemplates(): MessageTemplate[] {
    return [
      {
        id: 'farewell-letter',
        name: 'Farewell Letter',
        description: 'A heartfelt goodbye message to loved ones',
        type: 'farewell',
        category: 'farewell',
        content: {
          type: 'farewell',
          format: 'text',
          category: 'immediate',
          title: 'My Final Goodbye',
          content: {
            text: `<p>My Dearest {{recipientName}},</p>
<p>If you're reading this, it means I'm no longer with you. I want you to know that you meant the world to me, and I'm grateful for every moment we shared together.</p>
<p>{{personalMessage}}</p>
<p>Please remember me with joy, not sadness. Live your life to the fullest and know that I'll always be with you in spirit.</p>
<p>With all my love,<br>{{senderName}}</p>`,
            plainText: `My Dearest {{recipientName}},\n\nIf you're reading this, it means I'm no longer with you. I want you to know that you meant the world to me, and I'm grateful for every moment we shared together.\n\n{{personalMessage}}\n\nPlease remember me with joy, not sadness. Live your life to the fullest and know that I'll always be with you in spirit.\n\nWith all my love,\n{{senderName}}`
          },
          metadata: {
            importance: 'high',
            sensitivity: 'private',
            language: 'en',
            tone: 'loving'
          }
        },
        variables: [
          {
            name: 'recipientName',
            type: 'text',
            label: 'Recipient Name',
            required: true,
            placeholder: 'Enter recipient name'
          },
          {
            name: 'personalMessage',
            type: 'text',
            label: 'Personal Message',
            required: true,
            placeholder: 'Enter your personal message'
          },
          {
            name: 'senderName',
            type: 'text',
            label: 'Your Name',
            required: true,
            placeholder: 'Enter your name'
          }
        ],
        tags: ['farewell', 'goodbye', 'final'],
        isSystem: true,
        isPublic: true,
        usage: 0,
        rating: 4.8,
        author: 'System',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        locale: 'en'
      },
      {
        id: 'financial-instructions',
        name: 'Financial Instructions',
        description: 'Instructions for handling financial accounts and assets',
        type: 'financial',
        category: 'instructions',
        content: {
          type: 'financial',
          format: 'text',
          category: 'immediate',
          title: 'Important Financial Information',
          content: {
            text: `<h3>Financial Account Information</h3>
<p>Dear {{recipientName}},</p>
<p>This document contains important information about my financial accounts and how to access them.</p>
<h4>Bank Accounts:</h4>
<p>{{bankInfo}}</p>
<h4>Investment Accounts:</h4>
<p>{{investmentInfo}}</p>
<h4>Insurance Policies:</h4>
<p>{{insuranceInfo}}</p>
<h4>Important Contacts:</h4>
<p>Financial Advisor: {{advisorInfo}}<br>
Accountant: {{accountantInfo}}<br>
Attorney: {{attorneyInfo}}</p>
<p>Please contact these professionals for assistance with any financial matters.</p>`,
            plainText: `Financial Account Information\n\nDear {{recipientName}},\n\nThis document contains important information about my financial accounts and how to access them.\n\nBank Accounts:\n{{bankInfo}}\n\nInvestment Accounts:\n{{investmentInfo}}\n\nInsurance Policies:\n{{insuranceInfo}}\n\nImportant Contacts:\nFinancial Advisor: {{advisorInfo}}\nAccountant: {{accountantInfo}}\nAttorney: {{attorneyInfo}}\n\nPlease contact these professionals for assistance with any financial matters.`
          },
          metadata: {
            importance: 'critical',
            sensitivity: 'confidential',
            language: 'en',
            tone: 'professional'
          }
        },
        variables: [
          {
            name: 'recipientName',
            type: 'text',
            label: 'Recipient Name',
            required: true,
            placeholder: 'Enter recipient name'
          },
          {
            name: 'bankInfo',
            type: 'text',
            label: 'Bank Account Information',
            required: false,
            placeholder: 'Enter bank account details'
          },
          {
            name: 'investmentInfo',
            type: 'text',
            label: 'Investment Account Information',
            required: false,
            placeholder: 'Enter investment account details'
          },
          {
            name: 'insuranceInfo',
            type: 'text',
            label: 'Insurance Policy Information',
            required: false,
            placeholder: 'Enter insurance policy details'
          },
          {
            name: 'advisorInfo',
            type: 'text',
            label: 'Financial Advisor Contact',
            required: false,
            placeholder: 'Enter financial advisor contact'
          },
          {
            name: 'accountantInfo',
            type: 'text',
            label: 'Accountant Contact',
            required: false,
            placeholder: 'Enter accountant contact'
          },
          {
            name: 'attorneyInfo',
            type: 'text',
            label: 'Attorney Contact',
            required: false,
            placeholder: 'Enter attorney contact'
          }
        ],
        tags: ['financial', 'accounts', 'instructions'],
        isSystem: true,
        isPublic: true,
        usage: 0,
        rating: 4.9,
        author: 'System',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        locale: 'en'
      },
      {
        id: 'medical-wishes',
        name: 'Medical Wishes',
        description: 'Medical treatment preferences and healthcare directives',
        type: 'medical',
        category: 'medical',
        content: {
          type: 'medical',
          format: 'text',
          category: 'immediate',
          title: 'My Medical Wishes',
          content: {
            text: `<h3>Medical Treatment Preferences</h3>
<p>To my loved ones and medical providers,</p>
<p>These are my wishes regarding medical treatment:</p>
<h4>Life Support:</h4>
<p>{{lifeSupport}}</p>
<h4>Pain Management:</h4>
<p>{{painManagement}}</p>
<h4>Organ Donation:</h4>
<p>{{organDonation}}</p>
<h4>Additional Instructions:</h4>
<p>{{additionalInstructions}}</p>
<h4>Healthcare Proxy:</h4>
<p>I have designated {{proxyName}} as my healthcare proxy. They can be reached at {{proxyContact}}.</p>`,
            plainText: `Medical Treatment Preferences\n\nTo my loved ones and medical providers,\n\nThese are my wishes regarding medical treatment:\n\nLife Support:\n{{lifeSupport}}\n\nPain Management:\n{{painManagement}}\n\nOrgan Donation:\n{{organDonation}}\n\nAdditional Instructions:\n{{additionalInstructions}}\n\nHealthcare Proxy:\nI have designated {{proxyName}} as my healthcare proxy. They can be reached at {{proxyContact}}.`
          },
          metadata: {
            importance: 'critical',
            sensitivity: 'confidential',
            language: 'en',
            tone: 'serious'
          }
        },
        variables: [
          {
            name: 'lifeSupport',
            type: 'text',
            label: 'Life Support Preferences',
            required: true,
            placeholder: 'Describe your wishes regarding life support'
          },
          {
            name: 'painManagement',
            type: 'text',
            label: 'Pain Management Preferences',
            required: true,
            placeholder: 'Describe your pain management preferences'
          },
          {
            name: 'organDonation',
            type: 'select',
            label: 'Organ Donation',
            required: true,
            options: [
              { label: 'Yes, I wish to be an organ donor', value: 'yes' },
              { label: 'No, I do not wish to be an organ donor', value: 'no' },
              { label: 'Let my family decide', value: 'family' }
            ]
          },
          {
            name: 'additionalInstructions',
            type: 'text',
            label: 'Additional Instructions',
            required: false,
            placeholder: 'Any additional medical instructions'
          },
          {
            name: 'proxyName',
            type: 'text',
            label: 'Healthcare Proxy Name',
            required: true,
            placeholder: 'Name of healthcare proxy'
          },
          {
            name: 'proxyContact',
            type: 'text',
            label: 'Healthcare Proxy Contact',
            required: true,
            placeholder: 'Contact information for healthcare proxy'
          }
        ],
        tags: ['medical', 'healthcare', 'wishes'],
        isSystem: true,
        isPublic: true,
        usage: 0,
        rating: 4.7,
        author: 'System',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        locale: 'en'
      }
    ]
  }

  /**
   * Update library statistics
   */
  private updateStatistics(library: MessagesLibrary): MessagesLibrary {
    const stats = {
      totalMessages: library.messages.length,
      messagesByType: {} as Record<MessageType, number>,
      messagesByFormat: {} as Record<MessageFormat, number>,
      messagesByStatus: {} as Record<MessageStatus, number>,
      totalRecipients: 0,
      deliveredMessages: 0,
      viewedMessages: 0,
      failedDeliveries: 0,
      averageDeliveryTime: 0,
      popularTemplates: [] as Array<{ templateId: string; usageCount: number }>,
      languageDistribution: {} as Record<string, number>,
      lastAnalysis: new Date().toISOString()
    }

    // Initialize counts
    const messageTypes: MessageType[] = ['personal', 'instruction', 'financial', 'medical', 'legal', 'funeral', 'password', 'emergency', 'farewell', 'memory', 'advice', 'confession', 'gratitude', 'apology', 'wish', 'legacy', 'business', 'creative', 'spiritual', 'custom']
    const messageFormats: MessageFormat[] = ['text', 'audio', 'video', 'mixed']
    const messageStatuses: MessageStatus[] = ['draft', 'scheduled', 'pending', 'sending', 'delivered', 'viewed', 'failed', 'expired', 'cancelled']

    messageTypes.forEach(type => stats.messagesByType[type] = 0)
    messageFormats.forEach(format => stats.messagesByFormat[format] = 0)
    messageStatuses.forEach(status => stats.messagesByStatus[status] = 0)

    // Count messages
    const recipientSet = new Set<string>()
    const deliveryTimes: number[] = []

    library.messages.forEach(message => {
      stats.messagesByType[message.type]++
      stats.messagesByFormat[message.format]++
      stats.messagesByStatus[message.status]++
      
      message.recipients.forEach(r => recipientSet.add(r.identifier))
      
      if (message.locale) {
        stats.languageDistribution[message.locale] = (stats.languageDistribution[message.locale] || 0) + 1
      }
    })

    stats.totalRecipients = recipientSet.size

    // Analyze delivery logs
    library.deliveryLogs.forEach(log => {
      if (log.status === 'delivered') {
        stats.deliveredMessages++
        if (log.deliveredAt && log.attemptedAt) {
          const deliveryTime = new Date(log.deliveredAt).getTime() - new Date(log.attemptedAt).getTime()
          deliveryTimes.push(deliveryTime / (1000 * 60)) // Convert to minutes
        }
      }
      if (log.status === 'viewed') {
        stats.viewedMessages++
      }
      if (log.status === 'failed') {
        stats.failedDeliveries++
      }
    })

    // Calculate average delivery time
    if (deliveryTimes.length > 0) {
      stats.averageDeliveryTime = deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length
    }

    // Popular templates
    const templateUsage = library.templates
      .filter(t => t.usage > 0)
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 5)
      .map(t => ({ templateId: t.id, usageCount: t.usage }))
    
    stats.popularTemplates = templateUsage

    return {
      ...library,
      statistics: stats
    }
  }

  /**
   * Create a new conditional rule
   */
  createConditionalRule(library: MessagesLibrary, rule: ConditionalRule): MessagesLibrary {
    const newRule: ConditionalRule = {
      ...rule,
      id: rule.id || crypto.randomUUID(),
      enabled: rule.enabled ?? true,
      priority: rule.priority || 1,
      metadata: {
        ...rule.metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }

    const conditionalRules = [...(library.conditionalRules || []), newRule]
    
    return {
      ...library,
      conditionalRules: conditionalRules.sort((a, b) => a.priority - b.priority)
    }
  }

  /**
   * Update an existing conditional rule
   */
  updateConditionalRule(library: MessagesLibrary, ruleId: string, updates: Partial<ConditionalRule>): MessagesLibrary {
    const conditionalRules = (library.conditionalRules || []).map(rule => {
      if (rule.id === ruleId) {
        return {
          ...rule,
          ...updates,
          id: rule.id, // Preserve ID
          metadata: {
            ...rule.metadata,
            ...updates.metadata,
            updatedAt: new Date().toISOString()
          }
        }
      }
      return rule
    })

    return {
      ...library,
      conditionalRules: conditionalRules.sort((a, b) => a.priority - b.priority)
    }
  }

  /**
   * Delete a conditional rule
   */
  deleteConditionalRule(library: MessagesLibrary, ruleId: string): MessagesLibrary {
    const conditionalRules = (library.conditionalRules || []).filter(rule => rule.id !== ruleId)
    
    return {
      ...library,
      conditionalRules
    }
  }

  /**
   * Find rules that match current conditions
   */
  findMatchingRules(library: MessagesLibrary, context: any): ConditionalRule[] {
    if (!library.conditionalRules) return []
    
    return library.conditionalRules
      .filter(rule => rule.enabled)
      .sort((a, b) => a.priority - b.priority)
  }

  /**
   * Get rule by ID
   */
  getConditionalRule(library: MessagesLibrary, ruleId: string): ConditionalRule | undefined {
    return library.conditionalRules?.find(rule => rule.id === ruleId)
  }

  /**
   * Enable/disable a rule
   */
  toggleConditionalRule(library: MessagesLibrary, ruleId: string): MessagesLibrary {
    const rule = this.getConditionalRule(library, ruleId)
    if (!rule) return library
    
    return this.updateConditionalRule(library, ruleId, { enabled: !rule.enabled })
  }

  /**
   * Update rule statistics after execution
   */
  updateRuleStatistics(library: MessagesLibrary, ruleId: string, success: boolean): MessagesLibrary {
    return this.updateConditionalRule(library, ruleId, {
      metadata: {
        lastTriggered: new Date().toISOString(),
        triggerCount: ((library.conditionalRules?.find(r => r.id === ruleId)?.metadata?.triggerCount || 0) + 1) as any,
        lastStatus: success ? 'success' : 'failed'
      }
    })
  }

  /**
   * Export rules to JSON
   */
  exportRules(library: MessagesLibrary): string {
    return JSON.stringify(library.conditionalRules || [], null, 2)
  }

  /**
   * Import rules from JSON
   */
  importRules(library: MessagesLibrary, rulesJson: string): MessagesLibrary {
    try {
      const rules = JSON.parse(rulesJson) as ConditionalRule[]
      return {
        ...library,
        conditionalRules: rules.map(rule => ({
          ...rule,
          id: crypto.randomUUID(), // Generate new IDs to avoid conflicts
          metadata: {
            ...rule.metadata,
            importedAt: new Date().toISOString()
          }
        }))
      }
    } catch (error) {
      console.error('Failed to import rules:', error)
      return library
    }
  }
}

// Export singleton instance
export const messagesLibraryService = MessagesLibraryService.getInstance()