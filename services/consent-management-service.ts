'use client'

import { gdprComplianceService } from './gdpr-compliance-service'
import { auditLoggingService } from './audit-logging-service'
import { randomBytes } from 'crypto'

export interface ConsentCategory {
  id: string
  name: string
  description: string
  purposes: ConsentPurpose[]
  requiredByLaw: boolean
  defaultState: boolean
  allowWithdrawal: boolean
}

export interface ConsentPurpose {
  id: string
  name: string
  description: string
  dataTypes: string[]
  processingBasis: ProcessingBasis
  retentionPeriod: string
  thirdParties?: string[]
  internationalTransfer: boolean
}

export enum ProcessingBasis {
  CONSENT = 'consent',
  CONTRACT = 'contract',
  LEGAL_OBLIGATION = 'legal_obligation',
  VITAL_INTERESTS = 'vital_interests',
  PUBLIC_TASK = 'public_task',
  LEGITIMATE_INTERESTS = 'legitimate_interests'
}

export interface UserConsent {
  id: string
  userId: string
  categoryId: string
  purposeId: string
  granted: boolean
  grantedAt?: Date
  withdrawnAt?: Date
  expiresAt?: Date
  version: string
  method: ConsentMethod
  ipAddress?: string
  userAgent?: string
  parentalConsent?: boolean
  verificationToken?: string
}

export enum ConsentMethod {
  EXPLICIT_CHECKBOX = 'explicit_checkbox',
  EXPLICIT_BUTTON = 'explicit_button',
  IMPLICIT_CONTINUED_USE = 'implicit_continued_use',
  EMAIL_CONFIRMATION = 'email_confirmation',
  DOUBLE_OPTIN = 'double_optin',
  WRITTEN_FORM = 'written_form',
  VERBAL_RECORDING = 'verbal_recording'
}

export interface ConsentHistory {
  userId: string
  changes: ConsentChange[]
}

export interface ConsentChange {
  timestamp: Date
  categoryId: string
  purposeId: string
  previousState: boolean
  newState: boolean
  reason?: string
  method: ConsentMethod
}

export interface ConsentPreferences {
  userId: string
  globalOptOut: boolean
  communicationPreferences: {
    email: boolean
    sms: boolean
    phone: boolean
    push: boolean
  }
  dataSharing: {
    analytics: boolean
    marketing: boolean
    thirdParty: boolean
    improvement: boolean
  }
  cookiePreferences: {
    necessary: boolean
    functional: boolean
    analytics: boolean
    marketing: boolean
  }
}

export interface ConsentBanner {
  id: string
  version: string
  content: string
  categories: ConsentCategory[]
  displayRules: DisplayRule[]
  styling: BannerStyling
}

export interface DisplayRule {
  condition: 'first_visit' | 'consent_expired' | 'policy_updated' | 'region_based'
  parameters?: Record<string, any>
}

export interface BannerStyling {
  position: 'top' | 'bottom' | 'center' | 'corner'
  theme: 'light' | 'dark' | 'custom'
  customCSS?: string
}

class ConsentManagementService {
  private consentCategories: Map<string, ConsentCategory> = new Map()
  private userConsents: Map<string, UserConsent[]> = new Map()
  private consentHistory: Map<string, ConsentHistory> = new Map()
  private consentPreferences: Map<string, ConsentPreferences> = new Map()
  private consentBanners: Map<string, ConsentBanner> = new Map()

  constructor() {
    this.initializeDefaultCategories()
  }

  /**
   * Initialize default consent categories
   */
  private initializeDefaultCategories(): void {
    const defaultCategories: ConsentCategory[] = [
      {
        id: 'necessary',
        name: 'Necessary',
        description: 'Essential for the website to function properly',
        purposes: [
          {
            id: 'authentication',
            name: 'Authentication',
            description: 'Keeping you logged in and maintaining your session',
            dataTypes: ['User ID', 'Session tokens'],
            processingBasis: ProcessingBasis.CONTRACT,
            retentionPeriod: 'Duration of session',
            internationalTransfer: false
          },
          {
            id: 'security',
            name: 'Security',
            description: 'Protecting your account and preventing fraud',
            dataTypes: ['IP address', 'Login attempts'],
            processingBasis: ProcessingBasis.LEGITIMATE_INTERESTS,
            retentionPeriod: '30 days',
            internationalTransfer: false
          }
        ],
        requiredByLaw: false,
        defaultState: true,
        allowWithdrawal: false
      },
      {
        id: 'functional',
        name: 'Functional',
        description: 'Enable enhanced functionality and personalization',
        purposes: [
          {
            id: 'preferences',
            name: 'User Preferences',
            description: 'Remembering your settings and preferences',
            dataTypes: ['Language', 'Theme', 'Display preferences'],
            processingBasis: ProcessingBasis.CONSENT,
            retentionPeriod: '1 year',
            internationalTransfer: false
          }
        ],
        requiredByLaw: false,
        defaultState: false,
        allowWithdrawal: true
      },
      {
        id: 'analytics',
        name: 'Analytics',
        description: 'Help us understand how you use our service',
        purposes: [
          {
            id: 'usage_analytics',
            name: 'Usage Analytics',
            description: 'Analyzing how users interact with our service',
            dataTypes: ['Page views', 'Feature usage', 'Performance metrics'],
            processingBasis: ProcessingBasis.CONSENT,
            retentionPeriod: '2 years',
            thirdParties: ['Google Analytics', 'Mixpanel'],
            internationalTransfer: true
          }
        ],
        requiredByLaw: false,
        defaultState: false,
        allowWithdrawal: true
      },
      {
        id: 'marketing',
        name: 'Marketing',
        description: 'Used for marketing and advertising purposes',
        purposes: [
          {
            id: 'email_marketing',
            name: 'Email Marketing',
            description: 'Sending you promotional emails and newsletters',
            dataTypes: ['Email', 'Name', 'Interaction history'],
            processingBasis: ProcessingBasis.CONSENT,
            retentionPeriod: 'Until withdrawal',
            thirdParties: ['Email service provider'],
            internationalTransfer: true
          },
          {
            id: 'targeted_advertising',
            name: 'Targeted Advertising',
            description: 'Showing you relevant ads based on your interests',
            dataTypes: ['Browsing history', 'Interests', 'Demographics'],
            processingBasis: ProcessingBasis.CONSENT,
            retentionPeriod: '1 year',
            thirdParties: ['Ad networks'],
            internationalTransfer: true
          }
        ],
        requiredByLaw: false,
        defaultState: false,
        allowWithdrawal: true
      }
    ]

    defaultCategories.forEach(category => {
      this.consentCategories.set(category.id, category)
    })
  }

  /**
   * Record user consent
   */
  async recordConsent(
    userId: string,
    categoryId: string,
    purposeId: string,
    granted: boolean,
    method: ConsentMethod,
    ipAddress?: string,
    userAgent?: string
  ): Promise<UserConsent> {
    const category = this.consentCategories.get(categoryId)
    if (!category) {
      throw new Error('Invalid consent category')
    }

    const purpose = category.purposes.find(p => p.id === purposeId)
    if (!purpose) {
      throw new Error('Invalid consent purpose')
    }

    // Create consent record
    const consent: UserConsent = {
      id: randomBytes(16).toString('hex'),
      userId,
      categoryId,
      purposeId,
      granted,
      grantedAt: granted ? new Date() : undefined,
      withdrawnAt: !granted ? new Date() : undefined,
      version: '1.0',
      method,
      ipAddress,
      userAgent
    }

    // Store consent
    if (!this.userConsents.has(userId)) {
      this.userConsents.set(userId, [])
    }
    this.userConsents.get(userId)!.push(consent)

    // Update history
    this.updateConsentHistory(userId, categoryId, purposeId, !granted, granted, method)

    // Log consent change
    await auditLoggingService.logEvent({
      eventType: 'compliance_event',
      action: granted ? 'consent_granted' : 'consent_withdrawn',
      resource: 'consent',
      resourceId: consent.id,
      result: 'success',
      details: { categoryId, purposeId, method },
      riskLevel: 'low',
      userId
    })

    // Update GDPR compliance service
    await gdprComplianceService.recordConsent(
      userId,
      `${categoryId}:${purposeId}`,
      purpose.description,
      granted,
      ipAddress,
      userAgent
    )

    return consent
  }

  /**
   * Get user's current consent status
   */
  getUserConsentStatus(userId: string): Record<string, Record<string, boolean>> {
    const consents = this.userConsents.get(userId) || []
    const status: Record<string, Record<string, boolean>> = {}

    // Initialize with default states
    for (const [categoryId, category] of this.consentCategories) {
      status[categoryId] = {}
      for (const purpose of category.purposes) {
        status[categoryId][purpose.id] = category.defaultState
      }
    }

    // Apply user's consent choices
    for (const consent of consents) {
      // Get the most recent consent for each category/purpose
      const key = `${consent.categoryId}:${consent.purposeId}`
      const existing = consents.filter(c => 
        c.categoryId === consent.categoryId && 
        c.purposeId === consent.purposeId
      ).sort((a, b) => {
        const aTime = (a.grantedAt || a.withdrawnAt || new Date(0)).getTime()
        const bTime = (b.grantedAt || b.withdrawnAt || new Date(0)).getTime()
        return bTime - aTime
      })[0]

      if (existing) {
        status[consent.categoryId][consent.purposeId] = existing.granted
      }
    }

    return status
  }

  /**
   * Batch update consents
   */
  async updateConsents(
    userId: string,
    updates: Array<{
      categoryId: string
      purposeId: string
      granted: boolean
    }>,
    method: ConsentMethod,
    ipAddress?: string,
    userAgent?: string
  ): Promise<UserConsent[]> {
    const results: UserConsent[] = []

    for (const update of updates) {
      const consent = await this.recordConsent(
        userId,
        update.categoryId,
        update.purposeId,
        update.granted,
        method,
        ipAddress,
        userAgent
      )
      results.push(consent)
    }

    return results
  }

  /**
   * Get consent preferences
   */
  getConsentPreferences(userId: string): ConsentPreferences {
    const existing = this.consentPreferences.get(userId)
    if (existing) return existing

    // Create default preferences
    const defaults: ConsentPreferences = {
      userId,
      globalOptOut: false,
      communicationPreferences: {
        email: true,
        sms: false,
        phone: false,
        push: true
      },
      dataSharing: {
        analytics: false,
        marketing: false,
        thirdParty: false,
        improvement: true
      },
      cookiePreferences: {
        necessary: true,
        functional: true,
        analytics: false,
        marketing: false
      }
    }

    this.consentPreferences.set(userId, defaults)
    return defaults
  }

  /**
   * Update consent preferences
   */
  updateConsentPreferences(
    userId: string,
    updates: Partial<ConsentPreferences>
  ): ConsentPreferences {
    const current = this.getConsentPreferences(userId)
    const updated = { ...current, ...updates, userId }
    this.consentPreferences.set(userId, updated)
    return updated
  }

  /**
   * Get consent history
   */
  getConsentHistory(userId: string): ConsentHistory {
    return this.consentHistory.get(userId) || { userId, changes: [] }
  }

  /**
   * Generate consent banner
   */
  generateConsentBanner(
    region?: string,
    language: string = 'en'
  ): ConsentBanner {
    const bannerId = `banner-${region || 'global'}-${language}`
    const existing = this.consentBanners.get(bannerId)
    if (existing) return existing

    const banner: ConsentBanner = {
      id: bannerId,
      version: '1.0',
      content: this.generateBannerContent(language),
      categories: Array.from(this.consentCategories.values()),
      displayRules: [
        { condition: 'first_visit' },
        { condition: 'consent_expired' },
        { condition: 'policy_updated' }
      ],
      styling: {
        position: 'bottom',
        theme: 'light'
      }
    }

    if (region === 'EU') {
      banner.displayRules.push({
        condition: 'region_based',
        parameters: { regions: ['EU'] }
      })
    }

    this.consentBanners.set(bannerId, banner)
    return banner
  }

  /**
   * Check if consent is required
   */
  isConsentRequired(
    userId: string,
    categoryId: string,
    purposeId: string
  ): boolean {
    const category = this.consentCategories.get(categoryId)
    if (!category) return false

    const purpose = category.purposes.find(p => p.id === purposeId)
    if (!purpose) return false

    // Consent not required for certain legal bases
    if (purpose.processingBasis === ProcessingBasis.CONTRACT ||
        purpose.processingBasis === ProcessingBasis.LEGAL_OBLIGATION ||
        purpose.processingBasis === ProcessingBasis.VITAL_INTERESTS) {
      return false
    }

    return true
  }

  /**
   * Export user consents
   */
  exportUserConsents(userId: string): any {
    const consents = this.userConsents.get(userId) || []
    const preferences = this.getConsentPreferences(userId)
    const history = this.getConsentHistory(userId)

    return {
      userId,
      exportDate: new Date(),
      currentConsents: this.getUserConsentStatus(userId),
      preferences,
      history: history.changes,
      allConsents: consents.map(c => ({
        ...c,
        category: this.consentCategories.get(c.categoryId)?.name,
        purpose: this.consentCategories.get(c.categoryId)?.purposes
          .find(p => p.id === c.purposeId)?.name
      }))
    }
  }

  /**
   * Private helper methods
   */
  private updateConsentHistory(
    userId: string,
    categoryId: string,
    purposeId: string,
    previousState: boolean,
    newState: boolean,
    method: ConsentMethod
  ): void {
    if (!this.consentHistory.has(userId)) {
      this.consentHistory.set(userId, { userId, changes: [] })
    }

    const history = this.consentHistory.get(userId)!
    history.changes.push({
      timestamp: new Date(),
      categoryId,
      purposeId,
      previousState,
      newState,
      method
    })

    // Keep only last 100 changes
    if (history.changes.length > 100) {
      history.changes = history.changes.slice(-100)
    }
  }

  private generateBannerContent(language: string): string {
    const content: Record<string, string> = {
      en: 'We use cookies and similar technologies to enhance your experience, analyze usage, and deliver personalized content. By continuing to use our service, you consent to our use of cookies.',
      es: 'Utilizamos cookies y tecnologías similares para mejorar su experiencia, analizar el uso y ofrecer contenido personalizado.',
      de: 'Wir verwenden Cookies und ähnliche Technologien, um Ihre Erfahrung zu verbessern, die Nutzung zu analysieren und personalisierte Inhalte bereitzustellen.'
    }

    return content[language] || content.en
  }

  /**
   * Generate consent UI components
   */
  generateConsentUI(): {
    banner: string
    preferenceCenter: string
    consentButton: string
  } {
    return {
      banner: `
        <div class="consent-banner">
          <p>We value your privacy</p>
          <button onclick="acceptAll()">Accept All</button>
          <button onclick="rejectAll()">Reject All</button>
          <button onclick="showPreferences()">Manage Preferences</button>
        </div>
      `,
      preferenceCenter: `
        <div class="consent-preferences">
          <h2>Privacy Preferences</h2>
          <!-- Categories and toggles generated dynamically -->
        </div>
      `,
      consentButton: `
        <button class="consent-settings" onclick="showConsentSettings()">
          Cookie Settings
        </button>
      `
    }
  }
}

// Singleton instance
export const consentManagementService = new ConsentManagementService()