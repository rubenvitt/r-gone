import { triggerConditionsService, TriggerType, TriggerPriority } from './trigger-conditions-service'
import { auditLoggingService } from './audit-logging-service'

// Third-party service types
export enum ServiceType {
  SOCIAL_MEDIA = 'social_media',
  FINANCIAL_INSTITUTION = 'financial_institution',
  HEALTHCARE_PROVIDER = 'healthcare_provider',
  GOVERNMENT_AGENCY = 'government_agency',
  LEGAL_SERVICE = 'legal_service',
  INSURANCE_PROVIDER = 'insurance_provider',
  EMPLOYER = 'employer',
  UTILITY_COMPANY = 'utility_company',
  SUBSCRIPTION_SERVICE = 'subscription_service',
  CLOUD_PROVIDER = 'cloud_provider',
  EMAIL_PROVIDER = 'email_provider',
  TELECOMMUNICATIONS = 'telecommunications'
}

// Integration methods
export enum IntegrationMethod {
  API = 'api',
  WEBHOOK = 'webhook',
  EMAIL_MONITORING = 'email_monitoring',
  WEB_SCRAPING = 'web_scraping',
  RSS_FEED = 'rss_feed',
  MANUAL_SUBMISSION = 'manual_submission',
  THIRD_PARTY_RELAY = 'third_party_relay'
}

// Signal types from third-party services
export enum ThirdPartySignalType {
  ACCOUNT_INACTIVITY = 'account_inactivity',
  MEMORIAL_ACCOUNT_CREATION = 'memorial_account_creation',
  OBITUARY_PUBLISHED = 'obituary_published',
  DEATH_NOTIFICATION = 'death_notification',
  ACCOUNT_SUSPENSION = 'account_suspension',
  ACCOUNT_CLOSURE = 'account_closure',
  BILLING_FAILURE = 'billing_failure',
  EMERGENCY_CONTACT_NOTIFICATION = 'emergency_contact_notification',
  MEDICAL_ALERT = 'medical_alert',
  LEGAL_PROCEEDING = 'legal_proceeding',
  INSURANCE_CLAIM = 'insurance_claim',
  EMPLOYMENT_TERMINATION = 'employment_termination',
  UTILITY_DISCONNECTION = 'utility_disconnection',
  BANK_ACCOUNT_DORMANCY = 'bank_account_dormancy',
  SUBSCRIPTION_CANCELLATION = 'subscription_cancellation'
}

// Service provider configurations
export interface ThirdPartyServiceProvider {
  id: string
  name: string
  type: ServiceType
  description: string
  integrationMethod: IntegrationMethod
  isActive: boolean
  configuration: ServiceConfiguration
  supportedSignals: ThirdPartySignalType[]
  rateLimits: RateLimitConfig
  authentication: AuthenticationConfig
  webhookUrl?: string
  apiEndpoints: ApiEndpoint[]
  monitoringSettings: MonitoringSettings
  createdAt: Date
  updatedAt: Date
}

export interface ServiceConfiguration {
  baseUrl?: string
  version?: string
  timeout: number
  retryAttempts: number
  batchSize?: number
  pollingInterval?: number // milliseconds
  customHeaders?: Record<string, string>
  customParameters?: Record<string, any>
}

export interface RateLimitConfig {
  requestsPerSecond: number
  requestsPerHour: number
  requestsPerDay: number
  burstLimit: number
}

export interface AuthenticationConfig {
  type: 'api_key' | 'oauth2' | 'bearer_token' | 'basic_auth' | 'certificate'
  credentials: Record<string, string>
  refreshToken?: string
  expiresAt?: Date
  scopes?: string[]
}

export interface ApiEndpoint {
  id: string
  name: string
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  purpose: string
  parameters?: Record<string, any>
  responseMapping: ResponseMapping
}

export interface ResponseMapping {
  signalType: ThirdPartySignalType
  dataPath: string
  timestampPath?: string
  identifierPath?: string
  metadataPath?: string
}

export interface MonitoringSettings {
  enabled: boolean
  frequency: number // minutes
  alertThresholds: AlertThreshold[]
  failureNotifications: boolean
  healthCheckEndpoint?: string
}

export interface AlertThreshold {
  metric: 'response_time' | 'error_rate' | 'signal_volume'
  threshold: number
  timeWindow: number // minutes
  action: 'log' | 'alert' | 'disable_service'
}

// Third-party signal data
export interface ThirdPartySignal {
  id: string
  providerId: string
  signalType: ThirdPartySignalType
  userId: string
  timestamp: Date
  confidence: number // 0-100
  source: string
  rawData: any
  processedData: ProcessedSignalData
  verificationStatus: 'pending' | 'verified' | 'rejected' | 'expired'
  verificationMethod?: string
  verifiedAt?: Date
  expiresAt?: Date
  metadata: SignalMetadata
}

export interface ProcessedSignalData {
  summary: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  category: string
  affectedServices?: string[]
  recommendedActions?: string[]
  relatedSignals?: string[]
}

export interface SignalMetadata {
  originalSource: string
  processingTimestamp: Date
  dataVersion: string
  processingMethod: string
  qualityScore: number
  flags: string[]
}

// User service connections
export interface UserServiceConnection {
  id: string
  userId: string
  providerId: string
  accountIdentifier: string
  connectionType: 'primary' | 'secondary' | 'monitoring_only'
  isActive: boolean
  connectedAt: Date
  lastVerified: Date
  verificationMethod: string
  permissions: string[]
  monitoringEnabled: boolean
  alertSettings: UserAlertSettings
}

export interface UserAlertSettings {
  enabledSignals: ThirdPartySignalType[]
  urgencyFilters: string[]
  notificationDelay: number // minutes
  autoProcessing: boolean
}

class ThirdPartyIntegrationService {
  private providers: Map<string, ThirdPartyServiceProvider> = new Map()
  private userConnections: Map<string, UserServiceConnection[]> = new Map()
  private signalHistory: Map<string, ThirdPartySignal[]> = new Map()
  private activeMonitoring: Map<string, NodeJS.Timeout> = new Map()
  
  // Processing queues
  private signalQueue: ThirdPartySignal[] = []
  private processingActive = false

  constructor() {
    this.initializeDefaultProviders()
    this.startSignalProcessing()
  }

  /**
   * Register a third-party service provider
   */
  async registerProvider(provider: Omit<ThirdPartyServiceProvider, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const providerId = `provider_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const completeProvider: ThirdPartyServiceProvider = {
      ...provider,
      id: providerId,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.providers.set(providerId, completeProvider)

    // Start monitoring if enabled
    if (provider.isActive && provider.monitoringSettings.enabled) {
      await this.startProviderMonitoring(providerId)
    }

    await auditLoggingService.logEvent({
      eventType: 'third_party_integration',
      action: 'provider_registered',
      resource: 'service_provider',
      resourceId: providerId,
      result: 'success',
      userId: 'system',
      details: {
        providerName: provider.name,
        serviceType: provider.type,
        integrationMethod: provider.integrationMethod
      },
      riskLevel: 'medium'
    })

    return providerId
  }

  /**
   * Connect user to a third-party service
   */
  async connectUserToService(
    userId: string,
    providerId: string,
    accountIdentifier: string,
    connectionType: 'primary' | 'secondary' | 'monitoring_only' = 'primary',
    permissions: string[] = []
  ): Promise<string> {
    const provider = this.providers.get(providerId)
    if (!provider) throw new Error('Provider not found')

    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const connection: UserServiceConnection = {
      id: connectionId,
      userId,
      providerId,
      accountIdentifier,
      connectionType,
      isActive: true,
      connectedAt: new Date(),
      lastVerified: new Date(),
      verificationMethod: 'manual',
      permissions,
      monitoringEnabled: true,
      alertSettings: {
        enabledSignals: provider.supportedSignals,
        urgencyFilters: ['medium', 'high', 'critical'],
        notificationDelay: 5,
        autoProcessing: false
      }
    }

    // Add to user's connections
    const userConnections = this.userConnections.get(userId) || []
    userConnections.push(connection)
    this.userConnections.set(userId, userConnections)

    // Create trigger for third-party signals
    await this.createThirdPartyTrigger(userId, providerId, provider)

    await auditLoggingService.logEvent({
      eventType: 'third_party_integration',
      action: 'user_service_connected',
      resource: 'user_connection',
      resourceId: connectionId,
      result: 'success',
      userId,
      details: {
        providerId,
        providerName: provider.name,
        connectionType,
        accountIdentifier
      },
      riskLevel: 'medium'
    })

    return connectionId
  }

  /**
   * Process incoming third-party signal
   */
  async processThirdPartySignal(rawSignal: {
    providerId: string
    signalType: ThirdPartySignalType
    userId?: string
    accountIdentifier?: string
    timestamp?: Date
    data: any
    source: string
  }): Promise<void> {
    const provider = this.providers.get(rawSignal.providerId)
    if (!provider || !provider.isActive) {
      console.warn(`Signal received from inactive provider: ${rawSignal.providerId}`)
      return
    }

    // Find user by account identifier if userId not provided
    let userId = rawSignal.userId
    if (!userId && rawSignal.accountIdentifier) {
      userId = await this.findUserByAccountIdentifier(rawSignal.providerId, rawSignal.accountIdentifier)
    }

    if (!userId) {
      console.warn(`Could not identify user for signal from ${rawSignal.providerId}`)
      return
    }

    // Create signal record
    const signal: ThirdPartySignal = {
      id: `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      providerId: rawSignal.providerId,
      signalType: rawSignal.signalType,
      userId,
      timestamp: rawSignal.timestamp || new Date(),
      confidence: this.calculateSignalConfidence(rawSignal, provider),
      source: rawSignal.source,
      rawData: rawSignal.data,
      processedData: await this.processSignalData(rawSignal, provider),
      verificationStatus: 'pending',
      metadata: {
        originalSource: rawSignal.source,
        processingTimestamp: new Date(),
        dataVersion: '1.0',
        processingMethod: provider.integrationMethod,
        qualityScore: this.assessDataQuality(rawSignal.data),
        flags: this.identifySignalFlags(rawSignal, provider)
      }
    }

    // Add to signal history
    const history = this.signalHistory.get(userId) || []
    history.push(signal)
    this.signalHistory.set(userId, history)

    // Add to processing queue
    this.signalQueue.push(signal)

    await auditLoggingService.logEvent({
      eventType: 'third_party_signal',
      action: 'signal_received',
      resource: 'third_party_signal',
      resourceId: signal.id,
      result: 'success',
      userId,
      details: {
        providerId: rawSignal.providerId,
        signalType: rawSignal.signalType,
        confidence: signal.confidence,
        priority: signal.processedData.priority
      },
      riskLevel: signal.processedData.priority === 'critical' ? 'critical' : 'medium'
    })
  }

  /**
   * Verify a third-party signal
   */
  async verifySignal(
    signalId: string, 
    verificationMethod: string, 
    isValid: boolean,
    verifiedBy: string
  ): Promise<void> {
    // Find signal across all users
    let signal: ThirdPartySignal | undefined
    let userId: string | undefined

    for (const [uid, signals] of this.signalHistory.entries()) {
      const found = signals.find(s => s.id === signalId)
      if (found) {
        signal = found
        userId = uid
        break
      }
    }

    if (!signal || !userId) throw new Error('Signal not found')

    signal.verificationStatus = isValid ? 'verified' : 'rejected'
    signal.verificationMethod = verificationMethod
    signal.verifiedAt = new Date()

    // If verified and high priority, process immediately
    if (isValid && (signal.processedData.priority === 'high' || signal.processedData.priority === 'critical')) {
      await this.processVerifiedSignal(signal)
    }

    await auditLoggingService.logEvent({
      eventType: 'third_party_signal',
      action: 'signal_verified',
      resource: 'third_party_signal',
      resourceId: signalId,
      result: 'success',
      userId: verifiedBy,
      details: {
        targetUserId: userId,
        signalType: signal.signalType,
        verificationMethod,
        isValid,
        priority: signal.processedData.priority
      },
      riskLevel: isValid && signal.processedData.priority === 'critical' ? 'critical' : 'low'
    })
  }

  /**
   * Get user's service connections
   */
  getUserConnections(userId: string): UserServiceConnection[] {
    return this.userConnections.get(userId) || []
  }

  /**
   * Get user's signal history
   */
  getUserSignals(userId: string, limit?: number): ThirdPartySignal[] {
    const signals = this.signalHistory.get(userId) || []
    return limit ? signals.slice(-limit) : signals
  }

  /**
   * Get pending signals for review
   */
  getPendingSignals(): ThirdPartySignal[] {
    const allSignals: ThirdPartySignal[] = []
    
    for (const signals of this.signalHistory.values()) {
      allSignals.push(...signals.filter(s => s.verificationStatus === 'pending'))
    }

    // Sort by priority and timestamp
    return allSignals.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      const aPriority = priorityOrder[a.processedData.priority]
      const bPriority = priorityOrder[b.processedData.priority]
      
      if (aPriority !== bPriority) return bPriority - aPriority
      return b.timestamp.getTime() - a.timestamp.getTime()
    })
  }

  /**
   * Simulate third-party signal for testing
   */
  async simulateSignal(
    userId: string,
    providerId: string,
    signalType: ThirdPartySignalType,
    customData?: any
  ): Promise<string> {
    const provider = this.providers.get(providerId)
    if (!provider) throw new Error('Provider not found')

    const simulatedData = customData || this.generateTestData(signalType)

    await this.processThirdPartySignal({
      providerId,
      signalType,
      userId,
      timestamp: new Date(),
      data: simulatedData,
      source: 'simulation'
    })

    const signals = this.getUserSignals(userId, 1)
    return signals[0]?.id || ''
  }

  /**
   * Private helper methods
   */
  private async startProviderMonitoring(providerId: string): Promise<void> {
    const provider = this.providers.get(providerId)
    if (!provider || !provider.monitoringSettings.enabled) return

    // Stop existing monitoring
    const existingInterval = this.activeMonitoring.get(providerId)
    if (existingInterval) {
      clearInterval(existingInterval)
    }

    // Start new monitoring
    const interval = setInterval(async () => {
      await this.monitorProvider(providerId)
    }, provider.monitoringSettings.frequency * 60 * 1000)

    this.activeMonitoring.set(providerId, interval)
  }

  private async monitorProvider(providerId: string): Promise<void> {
    const provider = this.providers.get(providerId)
    if (!provider) return

    try {
      // Monitor each API endpoint
      for (const endpoint of provider.apiEndpoints) {
        await this.checkEndpoint(provider, endpoint)
      }

      // Health check
      if (provider.monitoringSettings.healthCheckEndpoint) {
        await this.performHealthCheck(provider)
      }
    } catch (error) {
      console.error(`Error monitoring provider ${providerId}:`, error)
      
      if (provider.monitoringSettings.failureNotifications) {
        await this.sendProviderAlert(provider, 'monitoring_failure', error)
      }
    }
  }

  private async checkEndpoint(provider: ThirdPartyServiceProvider, endpoint: ApiEndpoint): Promise<void> {
    // In a real implementation, this would:
    // 1. Make HTTP requests to the endpoint
    // 2. Parse responses according to responseMapping
    // 3. Extract signals and process them
    // 4. Track performance metrics
    
    console.log(`Checking endpoint ${endpoint.name} for provider ${provider.name}`)
  }

  private async performHealthCheck(provider: ThirdPartyServiceProvider): Promise<void> {
    // Health check implementation
    console.log(`Performing health check for provider ${provider.name}`)
  }

  private async sendProviderAlert(provider: ThirdPartyServiceProvider, alertType: string, error: any): Promise<void> {
    console.log(`Alert for provider ${provider.name}: ${alertType}`, error)
  }

  private async findUserByAccountIdentifier(providerId: string, accountIdentifier: string): Promise<string | undefined> {
    for (const [userId, connections] of this.userConnections.entries()) {
      const connection = connections.find(c => 
        c.providerId === providerId && 
        c.accountIdentifier === accountIdentifier &&
        c.isActive
      )
      if (connection) return userId
    }
    return undefined
  }

  private calculateSignalConfidence(rawSignal: any, provider: ThirdPartyServiceProvider): number {
    let confidence = 50 // Base confidence

    // Provider reliability
    if (provider.type === ServiceType.GOVERNMENT_AGENCY) confidence += 30
    else if (provider.type === ServiceType.FINANCIAL_INSTITUTION) confidence += 25
    else if (provider.type === ServiceType.HEALTHCARE_PROVIDER) confidence += 20

    // Signal type reliability
    const highConfidenceSignals = [
      ThirdPartySignalType.DEATH_NOTIFICATION,
      ThirdPartySignalType.MEMORIAL_ACCOUNT_CREATION,
      ThirdPartySignalType.OBITUARY_PUBLISHED
    ]
    if (highConfidenceSignals.includes(rawSignal.signalType)) confidence += 20

    // Data quality
    const dataQuality = this.assessDataQuality(rawSignal.data)
    confidence += (dataQuality - 50) * 0.5

    return Math.max(0, Math.min(100, confidence))
  }

  private async processSignalData(rawSignal: any, provider: ThirdPartyServiceProvider): Promise<ProcessedSignalData> {
    const summary = this.generateSignalSummary(rawSignal)
    const priority = this.determinePriority(rawSignal.signalType, rawSignal.data)
    const category = this.categorizeSignal(rawSignal.signalType)

    return {
      summary,
      priority,
      category,
      affectedServices: this.identifyAffectedServices(rawSignal, provider),
      recommendedActions: this.getRecommendedActions(rawSignal.signalType),
      relatedSignals: []
    }
  }

  private assessDataQuality(data: any): number {
    let quality = 50

    if (data && typeof data === 'object') {
      const keys = Object.keys(data)
      if (keys.length > 0) quality += 20
      if (keys.length > 5) quality += 10
      if (data.timestamp) quality += 10
      if (data.source) quality += 10
    }

    return Math.max(0, Math.min(100, quality))
  }

  private identifySignalFlags(rawSignal: any, provider: ThirdPartyServiceProvider): string[] {
    const flags: string[] = []

    if (rawSignal.confidence < 70) flags.push('low_confidence')
    if (!rawSignal.timestamp) flags.push('missing_timestamp')
    if (provider.integrationMethod === IntegrationMethod.WEB_SCRAPING) flags.push('scraped_data')
    if (rawSignal.signalType === ThirdPartySignalType.ACCOUNT_INACTIVITY) flags.push('indirect_signal')

    return flags
  }

  private async processVerifiedSignal(signal: ThirdPartySignal): Promise<void> {
    // Process through trigger conditions service
    await triggerConditionsService.processThirdPartySignal({
      signalId: signal.id,
      signalType: signal.signalType,
      userId: signal.userId,
      timestamp: signal.timestamp,
      confidence: signal.confidence,
      processedData: signal.processedData,
      providerId: signal.providerId
    })
  }

  private async createThirdPartyTrigger(userId: string, providerId: string, provider: ThirdPartyServiceProvider): Promise<void> {
    await triggerConditionsService.createTrigger({
      userId,
      type: TriggerType.THIRD_PARTY_SIGNAL,
      name: `Third-Party Signal - ${provider.name}`,
      description: `Automatically created trigger for ${provider.name} signals`,
      status: 'active' as any,
      priority: TriggerPriority.MEDIUM,
      isEnabled: true,
      parameters: {
        providerId,
        providerName: provider.name,
        serviceType: provider.type,
        supportedSignals: provider.supportedSignals,
        autoProcessing: false,
        verificationRequired: true
      },
      actions: [
        {
          id: 'signal_evaluation',
          action: 'evaluate_trigger_conditions' as any,
          parameters: { 
            signalSource: provider.name,
            requiresVerification: true
          }
        },
        {
          id: 'notify_administrators',
          action: 'notify_beneficiaries' as any,
          parameters: {
            notificationType: 'third_party_signal_received',
            urgency: 'medium'
          }
        }
      ],
      conditions: [
        {
          field: 'verificationStatus',
          operator: 'equals',
          value: 'verified'
        },
        {
          field: 'confidence',
          operator: 'greater_than',
          value: 70
        }
      ]
    })
  }

  private generateSignalSummary(rawSignal: any): string {
    const summaries = {
      [ThirdPartySignalType.DEATH_NOTIFICATION]: 'Death notification received from external service',
      [ThirdPartySignalType.MEMORIAL_ACCOUNT_CREATION]: 'Memorial account created on social media platform',
      [ThirdPartySignalType.OBITUARY_PUBLISHED]: 'Obituary published in public records',
      [ThirdPartySignalType.ACCOUNT_INACTIVITY]: 'Extended account inactivity detected',
      [ThirdPartySignalType.ACCOUNT_SUSPENSION]: 'Account suspended by service provider',
      [ThirdPartySignalType.BILLING_FAILURE]: 'Billing failure indicating potential account issues',
      [ThirdPartySignalType.MEDICAL_ALERT]: 'Medical alert received from healthcare provider',
      [ThirdPartySignalType.LEGAL_PROCEEDING]: 'Legal proceeding notification received',
      [ThirdPartySignalType.INSURANCE_CLAIM]: 'Insurance claim filed or processed'
    }

    return summaries[rawSignal.signalType] || `Signal received: ${rawSignal.signalType}`
  }

  private determinePriority(signalType: ThirdPartySignalType, data: any): 'low' | 'medium' | 'high' | 'critical' {
    const criticalSignals = [
      ThirdPartySignalType.DEATH_NOTIFICATION,
      ThirdPartySignalType.MEMORIAL_ACCOUNT_CREATION
    ]

    const highSignals = [
      ThirdPartySignalType.OBITUARY_PUBLISHED,
      ThirdPartySignalType.MEDICAL_ALERT,
      ThirdPartySignalType.LEGAL_PROCEEDING
    ]

    const mediumSignals = [
      ThirdPartySignalType.ACCOUNT_SUSPENSION,
      ThirdPartySignalType.INSURANCE_CLAIM,
      ThirdPartySignalType.EMPLOYMENT_TERMINATION
    ]

    if (criticalSignals.includes(signalType)) return 'critical'
    if (highSignals.includes(signalType)) return 'high'
    if (mediumSignals.includes(signalType)) return 'medium'
    return 'low'
  }

  private categorizeSignal(signalType: ThirdPartySignalType): string {
    const categories = {
      [ThirdPartySignalType.DEATH_NOTIFICATION]: 'mortality',
      [ThirdPartySignalType.MEMORIAL_ACCOUNT_CREATION]: 'mortality',
      [ThirdPartySignalType.OBITUARY_PUBLISHED]: 'mortality',
      [ThirdPartySignalType.ACCOUNT_INACTIVITY]: 'activity',
      [ThirdPartySignalType.ACCOUNT_SUSPENSION]: 'account_status',
      [ThirdPartySignalType.BILLING_FAILURE]: 'financial',
      [ThirdPartySignalType.MEDICAL_ALERT]: 'health',
      [ThirdPartySignalType.LEGAL_PROCEEDING]: 'legal',
      [ThirdPartySignalType.INSURANCE_CLAIM]: 'insurance'
    }

    return categories[signalType] || 'general'
  }

  private identifyAffectedServices(rawSignal: any, provider: ThirdPartyServiceProvider): string[] {
    // Based on signal type and provider, identify which services might be affected
    const services = [provider.name]
    
    if (rawSignal.signalType === ThirdPartySignalType.DEATH_NOTIFICATION) {
      services.push('all_connected_services')
    }

    return services
  }

  private getRecommendedActions(signalType: ThirdPartySignalType): string[] {
    const actions = {
      [ThirdPartySignalType.DEATH_NOTIFICATION]: ['verify_signal', 'activate_emergency_access', 'notify_beneficiaries'],
      [ThirdPartySignalType.MEMORIAL_ACCOUNT_CREATION]: ['cross_verify_with_other_sources', 'begin_account_transition'],
      [ThirdPartySignalType.ACCOUNT_INACTIVITY]: ['investigate_cause', 'attempt_contact', 'monitor_other_accounts'],
      [ThirdPartySignalType.MEDICAL_ALERT]: ['verify_with_healthcare_provider', 'activate_medical_protocols'],
      [ThirdPartySignalType.LEGAL_PROCEEDING]: ['obtain_legal_documents', 'consult_legal_counsel']
    }

    return actions[signalType] || ['review_signal', 'determine_appropriate_action']
  }

  private generateTestData(signalType: ThirdPartySignalType): any {
    const testData = {
      [ThirdPartySignalType.DEATH_NOTIFICATION]: {
        notification_type: 'death_certificate_filed',
        certificate_number: 'DC-2024-001234',
        date_of_death: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        issuing_authority: 'County Vital Records',
        verification_code: 'VER-789123'
      },
      [ThirdPartySignalType.MEMORIAL_ACCOUNT_CREATION]: {
        platform: 'Facebook',
        memorial_account_id: 'memorial_123456789',
        created_by: 'family_member',
        creation_date: new Date().toISOString(),
        original_profile_id: 'user_987654321'
      },
      [ThirdPartySignalType.ACCOUNT_INACTIVITY]: {
        last_login: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        account_type: 'premium',
        inactivity_days: 90,
        previous_activity_pattern: 'daily'
      }
    }

    return testData[signalType] || { signal_type: signalType, simulated: true }
  }

  private startSignalProcessing(): void {
    setInterval(async () => {
      if (!this.processingActive && this.signalQueue.length > 0) {
        this.processingActive = true
        
        try {
          const signal = this.signalQueue.shift()
          if (signal) {
            await this.processQueuedSignal(signal)
          }
        } catch (error) {
          console.error('Error processing queued signal:', error)
        } finally {
          this.processingActive = false
        }
      }
    }, 5000) // Process every 5 seconds
  }

  private async processQueuedSignal(signal: ThirdPartySignal): Promise<void> {
    // Check user alert settings
    const userConnections = this.getUserConnections(signal.userId)
    const relevantConnection = userConnections.find(c => c.providerId === signal.providerId)
    
    if (!relevantConnection || !relevantConnection.monitoringEnabled) return

    const alertSettings = relevantConnection.alertSettings
    
    // Check if signal type is enabled
    if (!alertSettings.enabledSignals.includes(signal.signalType)) return

    // Check urgency filter
    if (!alertSettings.urgencyFilters.includes(signal.processedData.priority)) return

    // Apply notification delay
    if (alertSettings.notificationDelay > 0) {
      setTimeout(async () => {
        await this.sendSignalNotification(signal)
      }, alertSettings.notificationDelay * 60 * 1000)
    } else {
      await this.sendSignalNotification(signal)
    }

    // Auto-process if enabled and high priority
    if (alertSettings.autoProcessing && 
        (signal.processedData.priority === 'high' || signal.processedData.priority === 'critical')) {
      await this.autoProcessSignal(signal)
    }
  }

  private async sendSignalNotification(signal: ThirdPartySignal): Promise<void> {
    console.log(`Sending notification for signal ${signal.id} to user ${signal.userId}`)
  }

  private async autoProcessSignal(signal: ThirdPartySignal): Promise<void> {
    // Auto-verify high-confidence signals from trusted sources
    if (signal.confidence > 90) {
      await this.verifySignal(signal.id, 'auto_verification', true, 'system')
    }
  }

  private initializeDefaultProviders(): void {
    const defaultProviders = [
      {
        name: 'Facebook/Meta',
        type: ServiceType.SOCIAL_MEDIA,
        description: 'Monitor for memorial account creation and inactivity',
        integrationMethod: IntegrationMethod.API,
        isActive: true,
        configuration: {
          timeout: 30000,
          retryAttempts: 3,
          pollingInterval: 3600000
        },
        supportedSignals: [
          ThirdPartySignalType.MEMORIAL_ACCOUNT_CREATION,
          ThirdPartySignalType.ACCOUNT_INACTIVITY,
          ThirdPartySignalType.ACCOUNT_SUSPENSION
        ],
        rateLimits: {
          requestsPerSecond: 5,
          requestsPerHour: 200,
          requestsPerDay: 4000,
          burstLimit: 10
        },
        authentication: {
          type: 'oauth2' as const,
          credentials: {},
          scopes: ['user_posts', 'user_status']
        },
        apiEndpoints: [],
        monitoringSettings: {
          enabled: true,
          frequency: 60,
          alertThresholds: [],
          failureNotifications: true
        }
      },
      {
        name: 'Legacy.com',
        type: ServiceType.LEGAL_SERVICE,
        description: 'Monitor obituary publications',
        integrationMethod: IntegrationMethod.RSS_FEED,
        isActive: true,
        configuration: {
          timeout: 15000,
          retryAttempts: 2,
          pollingInterval: 1800000
        },
        supportedSignals: [
          ThirdPartySignalType.OBITUARY_PUBLISHED,
          ThirdPartySignalType.DEATH_NOTIFICATION
        ],
        rateLimits: {
          requestsPerSecond: 1,
          requestsPerHour: 50,
          requestsPerDay: 1000,
          burstLimit: 3
        },
        authentication: {
          type: 'api_key' as const,
          credentials: {}
        },
        apiEndpoints: [],
        monitoringSettings: {
          enabled: true,
          frequency: 30,
          alertThresholds: [],
          failureNotifications: true
        }
      }
    ]

    defaultProviders.forEach(async (provider) => {
      await this.registerProvider(provider)
    })
  }
}

// Singleton instance
export const thirdPartyIntegrationService = new ThirdPartyIntegrationService()