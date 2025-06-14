import { triggerConditionsService, LegalDocumentData, TriggerType, TriggerPriority } from './trigger-conditions-service'
import { auditLoggingService } from './audit-logging-service'

// Legal document types that can trigger emergency access
export enum LegalDocumentType {
  DEATH_CERTIFICATE = 'death_certificate',
  WILL_PROBATE = 'will_probate',
  POWER_OF_ATTORNEY = 'power_of_attorney',
  GUARDIANSHIP_ORDER = 'guardianship_order',
  COURT_ORDER = 'court_order',
  CONSERVATORSHIP = 'conservatorship',
  MEDICAL_DIRECTIVE = 'medical_directive',
  TRUST_DOCUMENT = 'trust_document',
  ESTATE_SETTLEMENT = 'estate_settlement',
  BANKRUPTCY_FILING = 'bankruptcy_filing'
}

// Document verification status
export enum DocumentVerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  UNDER_REVIEW = 'under_review',
  EXPIRED = 'expired'
}

// Legal authority levels
export enum LegalAuthorityLevel {
  NONE = 'none',
  LIMITED = 'limited',
  PARTIAL = 'partial',
  FULL = 'full',
  EXECUTOR = 'executor'
}

// Legal document filing data interface
export interface LegalDocumentFiling {
  id: string
  userId: string
  documentType: LegalDocumentType
  documentNumber: string
  filingDate: Date
  effectiveDate?: Date
  expirationDate?: Date
  issuingAuthority: string
  jurisdiction: string
  courtName?: string
  caseNumber?: string
  verificationStatus: DocumentVerificationStatus
  authorityLevel: LegalAuthorityLevel
  grantedPermissions: string[]
  documentHash?: string
  submittedBy: string
  submissionDate: Date
  verifiedBy?: string
  verificationDate?: Date
  rejectionReason?: string
  attachments: DocumentAttachment[]
  relatedPersons: RelatedPerson[]
}

export interface DocumentAttachment {
  id: string
  filename: string
  fileType: string
  fileSize: number
  uploadDate: Date
  verified: boolean
  documentHash: string
}

export interface RelatedPerson {
  id: string
  role: 'beneficiary' | 'executor' | 'attorney' | 'guardian' | 'trustee' | 'witness'
  name: string
  contactInfo?: string
  relationship?: string
  verificationStatus: DocumentVerificationStatus
}

// Legal service provider integration
export interface LegalServiceProvider {
  id: string
  name: string
  type: 'court_system' | 'document_service' | 'legal_platform' | 'government_agency'
  apiBaseUrl: string
  authType: 'api_key' | 'oauth' | 'webhook' | 'manual'
  isActive: boolean
  supportedDocuments: LegalDocumentType[]
  jurisdictions: string[]
  verificationCapabilities: string[]
  webhookSecret?: string
  apiKey?: string
}

// Enhanced legal document data for trigger processing
export interface EnhancedLegalDocumentData extends LegalDocumentData {
  filing: LegalDocumentFiling
  triggerActions: string[]
  accessLevel: LegalAuthorityLevel
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical'
  processingInstructions: string
  requiredVerifications: string[]
  automaticActions: boolean
}

class LegalDocumentDetectionService {
  private filings: Map<string, LegalDocumentFiling> = new Map()
  private providers: Map<string, LegalServiceProvider> = new Map()
  private documentHistory: Map<string, LegalDocumentFiling[]> = new Map()
  
  // Monitoring for document updates
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map()
  private readonly DEFAULT_MONITORING_INTERVAL = 3600000 // 1 hour

  constructor() {
    this.initializeDefaultProviders()
    this.startPeriodicMonitoring()
  }

  /**
   * Submit a legal document for verification and processing
   */
  async submitLegalDocument(filing: Omit<LegalDocumentFiling, 'id' | 'submissionDate'>): Promise<string> {
    const documentId = `legal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const completeFiling: LegalDocumentFiling = {
      ...filing,
      id: documentId,
      submissionDate: new Date(),
      verificationStatus: DocumentVerificationStatus.PENDING
    }

    this.filings.set(documentId, completeFiling)
    
    // Add to user's document history
    const userHistory = this.documentHistory.get(filing.userId) || []
    userHistory.push(completeFiling)
    this.documentHistory.set(filing.userId, userHistory)

    // Start verification process
    await this.initiateDocumentVerification(documentId)

    // Create corresponding trigger condition
    await this.createLegalDocumentTrigger(completeFiling)

    await auditLoggingService.logEvent({
      eventType: 'legal_document',
      action: 'document_submitted',
      resource: 'legal_document',
      resourceId: documentId,
      result: 'success',
      userId: filing.userId,
      details: {
        documentType: filing.documentType,
        documentNumber: filing.documentNumber,
        issuingAuthority: filing.issuingAuthority,
        jurisdiction: filing.jurisdiction
      },
      riskLevel: 'high'
    })

    return documentId
  }

  /**
   * Process incoming legal document data (from external services)
   */
  async processLegalDocumentData(data: LegalDocumentData): Promise<void> {
    const filing = this.filings.get(data.documentId)
    if (!filing) {
      console.warn(`Received data for unknown document: ${data.documentId}`)
      return
    }

    // Enhance the legal document data
    const enhancedData = await this.enhanceLegalDocumentData(data, filing)
    
    // Evaluate if this triggers emergency access
    const shouldTrigger = await this.evaluateTriggerConditions(enhancedData)
    
    if (shouldTrigger) {
      // Process through trigger conditions service
      await triggerConditionsService.processLegalDocumentFiling(enhancedData)
      
      // Execute automatic actions if enabled
      if (enhancedData.automaticActions) {
        await this.executeAutomaticActions(enhancedData)
      }
    }

    // Log the processing
    await auditLoggingService.logEvent({
      eventType: 'legal_document',
      action: 'document_processed',
      resource: 'legal_document',
      resourceId: data.documentId,
      result: 'success',
      userId: filing.userId,
      details: {
        documentType: filing.documentType,
        shouldTrigger,
        accessLevel: enhancedData.accessLevel,
        urgencyLevel: enhancedData.urgencyLevel
      },
      riskLevel: shouldTrigger ? 'critical' : 'medium'
    })
  }

  /**
   * Update document verification status
   */
  async updateDocumentVerification(
    documentId: string, 
    status: DocumentVerificationStatus, 
    verifiedBy?: string,
    rejectionReason?: string
  ): Promise<void> {
    const filing = this.filings.get(documentId)
    if (!filing) throw new Error('Document not found')

    filing.verificationStatus = status
    filing.verificationDate = new Date()
    filing.verifiedBy = verifiedBy
    filing.rejectionReason = rejectionReason

    // If verified, process for potential triggers
    if (status === DocumentVerificationStatus.VERIFIED) {
      await this.processVerifiedDocument(filing)
    }

    await auditLoggingService.logEvent({
      eventType: 'legal_document',
      action: 'verification_updated',
      resource: 'legal_document',
      resourceId: documentId,
      result: 'success',
      userId: filing.userId,
      details: {
        verificationStatus: status,
        verifiedBy,
        rejectionReason
      },
      riskLevel: status === DocumentVerificationStatus.VERIFIED ? 'high' : 'medium'
    })
  }

  /**
   * Get user's legal document history
   */
  getUserDocuments(userId: string): LegalDocumentFiling[] {
    return this.documentHistory.get(userId) || []
  }

  /**
   * Get specific document by ID
   */
  getDocument(documentId: string): LegalDocumentFiling | undefined {
    return this.filings.get(documentId)
  }

  /**
   * Check for pending verifications
   */
  getPendingVerifications(): LegalDocumentFiling[] {
    return Array.from(this.filings.values()).filter(
      filing => filing.verificationStatus === DocumentVerificationStatus.PENDING ||
                filing.verificationStatus === DocumentVerificationStatus.UNDER_REVIEW
    )
  }

  /**
   * Simulate legal document filing for testing
   */
  async simulateDocumentFiling(
    userId: string,
    documentType: LegalDocumentType,
    customData?: Partial<LegalDocumentFiling>
  ): Promise<string> {
    const simulatedFiling: Omit<LegalDocumentFiling, 'id' | 'submissionDate'> = {
      userId,
      documentType,
      documentNumber: `SIM-${Date.now()}`,
      filingDate: new Date(),
      issuingAuthority: 'Simulated Court System',
      jurisdiction: 'Test Jurisdiction',
      courtName: 'Test Court',
      caseNumber: `TEST-${Date.now()}`,
      verificationStatus: DocumentVerificationStatus.PENDING,
      authorityLevel: this.getDefaultAuthorityLevel(documentType),
      grantedPermissions: this.getDefaultPermissions(documentType),
      submittedBy: 'Test User',
      attachments: [],
      relatedPersons: [],
      ...customData
    }

    const documentId = await this.submitLegalDocument(simulatedFiling)
    
    // Auto-verify for simulation
    setTimeout(async () => {
      await this.updateDocumentVerification(documentId, DocumentVerificationStatus.VERIFIED, 'Simulation System')
    }, 2000)

    return documentId
  }

  /**
   * Private helper methods
   */
  private async initiateDocumentVerification(documentId: string): Promise<void> {
    const filing = this.filings.get(documentId)
    if (!filing) return

    // Update status to under review
    filing.verificationStatus = DocumentVerificationStatus.UNDER_REVIEW

    // In a real implementation, this would:
    // 1. Submit to appropriate legal service providers
    // 2. Perform automated checks against court databases
    // 3. Verify document authenticity
    // 4. Check signatures and seals
    // 5. Validate jurisdiction and authority

    // For now, simulate verification process
    console.log(`Initiating verification for ${filing.documentType} document ${documentId}`)
  }

  private async processVerifiedDocument(filing: LegalDocumentFiling): Promise<void> {
    // Create enhanced legal document data for trigger processing
    const legalData: LegalDocumentData = {
      documentId: filing.id,
      documentType: filing.documentType,
      filingDate: filing.filingDate,
      issuingAuthority: filing.issuingAuthority,
      jurisdiction: filing.jurisdiction,
      verificationStatus: filing.verificationStatus,
      caseNumber: filing.caseNumber,
      effectiveDate: filing.effectiveDate,
      authorizedPersons: filing.relatedPersons.map(p => p.name)
    }

    await this.processLegalDocumentData(legalData)
  }

  private async enhanceLegalDocumentData(
    data: LegalDocumentData, 
    filing: LegalDocumentFiling
  ): Promise<EnhancedLegalDocumentData> {
    return {
      ...data,
      filing,
      triggerActions: this.determineTriggerActions(filing),
      accessLevel: filing.authorityLevel,
      urgencyLevel: this.determineUrgencyLevel(filing),
      processingInstructions: this.generateProcessingInstructions(filing),
      requiredVerifications: this.getRequiredVerifications(filing),
      automaticActions: this.shouldEnableAutomaticActions(filing)
    }
  }

  private async evaluateTriggerConditions(data: EnhancedLegalDocumentData): Promise<boolean> {
    // Always trigger for certain document types
    const criticalDocuments = [
      LegalDocumentType.DEATH_CERTIFICATE,
      LegalDocumentType.COURT_ORDER,
      LegalDocumentType.GUARDIANSHIP_ORDER
    ]

    if (criticalDocuments.includes(data.filing.documentType)) {
      return true
    }

    // Check if document grants sufficient authority
    if (data.accessLevel === LegalAuthorityLevel.FULL || 
        data.accessLevel === LegalAuthorityLevel.EXECUTOR) {
      return true
    }

    // Check urgency level
    if (data.urgencyLevel === 'critical' || data.urgencyLevel === 'high') {
      return true
    }

    return false
  }

  private async executeAutomaticActions(data: EnhancedLegalDocumentData): Promise<void> {
    // Execute actions based on document type and authority level
    for (const action of data.triggerActions) {
      console.log(`Executing automatic action: ${action} for document ${data.documentId}`)
      
      // In a real implementation, this would trigger specific workflows
      // such as notifying beneficiaries, unlocking access, etc.
    }
  }

  private async createLegalDocumentTrigger(filing: LegalDocumentFiling): Promise<void> {
    await triggerConditionsService.createTrigger({
      userId: filing.userId,
      type: TriggerType.LEGAL_DOCUMENT_FILED,
      name: `Legal Document - ${filing.documentType}`,
      description: `Automatically created trigger for ${filing.documentType} filing`,
      status: 'active' as any,
      priority: TriggerPriority.HIGH,
      isEnabled: true,
      parameters: {
        documentType: filing.documentType,
        documentNumber: filing.documentNumber,
        issuingAuthority: filing.issuingAuthority,
        jurisdiction: filing.jurisdiction,
        requiredVerification: true,
        authorityLevel: filing.authorityLevel
      },
      actions: [
        {
          id: 'legal_access_activation',
          action: 'activate_emergency_access' as any,
          parameters: { 
            activationLevel: filing.authorityLevel,
            documentReference: filing.id
          }
        },
        {
          id: 'notify_stakeholders',
          action: 'notify_beneficiaries' as any,
          parameters: {
            notificationType: 'legal_document_filed',
            urgency: this.determineUrgencyLevel(filing)
          }
        }
      ],
      conditions: [
        {
          field: 'verificationStatus',
          operator: 'equals',
          value: DocumentVerificationStatus.VERIFIED
        },
        {
          field: 'documentType',
          operator: 'equals',
          value: filing.documentType
        }
      ]
    })
  }

  private determineTriggerActions(filing: LegalDocumentFiling): string[] {
    const actions: string[] = []

    switch (filing.documentType) {
      case LegalDocumentType.DEATH_CERTIFICATE:
        actions.push('activate_full_access', 'notify_all_beneficiaries', 'begin_estate_process')
        break
      case LegalDocumentType.WILL_PROBATE:
        actions.push('activate_executor_access', 'notify_heirs', 'release_estate_documents')
        break
      case LegalDocumentType.POWER_OF_ATTORNEY:
        actions.push('activate_limited_access', 'notify_primary_contacts')
        break
      case LegalDocumentType.GUARDIANSHIP_ORDER:
        actions.push('activate_guardian_access', 'transfer_control', 'notify_family')
        break
      case LegalDocumentType.COURT_ORDER:
        actions.push('comply_with_order', 'activate_required_access', 'notify_legal_contacts')
        break
      default:
        actions.push('review_document', 'notify_administrators')
    }

    return actions
  }

  private determineUrgencyLevel(filing: LegalDocumentFiling): 'low' | 'medium' | 'high' | 'critical' {
    const criticalDocuments = [LegalDocumentType.DEATH_CERTIFICATE, LegalDocumentType.COURT_ORDER]
    const highDocuments = [LegalDocumentType.GUARDIANSHIP_ORDER, LegalDocumentType.WILL_PROBATE]
    const mediumDocuments = [LegalDocumentType.POWER_OF_ATTORNEY, LegalDocumentType.CONSERVATORSHIP]

    if (criticalDocuments.includes(filing.documentType)) return 'critical'
    if (highDocuments.includes(filing.documentType)) return 'high'
    if (mediumDocuments.includes(filing.documentType)) return 'medium'
    return 'low'
  }

  private generateProcessingInstructions(filing: LegalDocumentFiling): string {
    switch (filing.documentType) {
      case LegalDocumentType.DEATH_CERTIFICATE:
        return 'Verify certificate authenticity. Activate full estate access. Notify all beneficiaries immediately.'
      case LegalDocumentType.WILL_PROBATE:
        return 'Verify probate court authorization. Grant executor access to estate documents. Begin succession process.'
      case LegalDocumentType.POWER_OF_ATTORNEY:
        return 'Verify attorney authorization scope. Grant limited access based on powers granted. Monitor usage.'
      case LegalDocumentType.COURT_ORDER:
        return 'Verify court jurisdiction and authenticity. Comply with all directives immediately. Document compliance.'
      default:
        return 'Review document for authenticity and legal authority. Determine appropriate access level.'
    }
  }

  private getRequiredVerifications(filing: LegalDocumentFiling): string[] {
    const verifications: string[] = ['document_authenticity', 'issuing_authority_validation']

    switch (filing.documentType) {
      case LegalDocumentType.DEATH_CERTIFICATE:
        verifications.push('vital_records_check', 'medical_examiner_verification')
        break
      case LegalDocumentType.COURT_ORDER:
        verifications.push('court_records_check', 'judge_signature_verification')
        break
      case LegalDocumentType.WILL_PROBATE:
        verifications.push('probate_court_verification', 'executor_identity_check')
        break
      case LegalDocumentType.POWER_OF_ATTORNEY:
        verifications.push('notarization_check', 'principal_identity_verification')
        break
    }

    return verifications
  }

  private shouldEnableAutomaticActions(filing: LegalDocumentFiling): boolean {
    // Enable automatic actions for high-trust document types
    const autoActionDocuments = [
      LegalDocumentType.DEATH_CERTIFICATE,
      LegalDocumentType.COURT_ORDER
    ]

    return autoActionDocuments.includes(filing.documentType) && 
           filing.verificationStatus === DocumentVerificationStatus.VERIFIED
  }

  private getDefaultAuthorityLevel(documentType: LegalDocumentType): LegalAuthorityLevel {
    const authorityMap = {
      [LegalDocumentType.DEATH_CERTIFICATE]: LegalAuthorityLevel.FULL,
      [LegalDocumentType.WILL_PROBATE]: LegalAuthorityLevel.EXECUTOR,
      [LegalDocumentType.COURT_ORDER]: LegalAuthorityLevel.FULL,
      [LegalDocumentType.GUARDIANSHIP_ORDER]: LegalAuthorityLevel.FULL,
      [LegalDocumentType.POWER_OF_ATTORNEY]: LegalAuthorityLevel.LIMITED,
      [LegalDocumentType.CONSERVATORSHIP]: LegalAuthorityLevel.PARTIAL,
      [LegalDocumentType.MEDICAL_DIRECTIVE]: LegalAuthorityLevel.LIMITED,
      [LegalDocumentType.TRUST_DOCUMENT]: LegalAuthorityLevel.PARTIAL,
      [LegalDocumentType.ESTATE_SETTLEMENT]: LegalAuthorityLevel.EXECUTOR,
      [LegalDocumentType.BANKRUPTCY_FILING]: LegalAuthorityLevel.LIMITED
    }

    return authorityMap[documentType] || LegalAuthorityLevel.NONE
  }

  private getDefaultPermissions(documentType: LegalDocumentType): string[] {
    const permissionMap = {
      [LegalDocumentType.DEATH_CERTIFICATE]: ['full_access', 'estate_management', 'beneficiary_notification'],
      [LegalDocumentType.WILL_PROBATE]: ['executor_access', 'asset_distribution', 'legal_proceedings'],
      [LegalDocumentType.COURT_ORDER]: ['court_mandated_access', 'compliance_actions'],
      [LegalDocumentType.GUARDIANSHIP_ORDER]: ['guardian_access', 'care_decisions', 'financial_management'],
      [LegalDocumentType.POWER_OF_ATTORNEY]: ['limited_access', 'specific_powers'],
      [LegalDocumentType.CONSERVATORSHIP]: ['financial_management', 'asset_protection'],
      [LegalDocumentType.MEDICAL_DIRECTIVE]: ['medical_access', 'healthcare_decisions'],
      [LegalDocumentType.TRUST_DOCUMENT]: ['trust_administration', 'beneficiary_management'],
      [LegalDocumentType.ESTATE_SETTLEMENT]: ['settlement_access', 'distribution_rights'],
      [LegalDocumentType.BANKRUPTCY_FILING]: ['asset_disclosure', 'creditor_notification']
    }

    return permissionMap[documentType] || ['basic_access']
  }

  private initializeDefaultProviders(): void {
    const providers: LegalServiceProvider[] = [
      {
        id: 'court_records_api',
        name: 'Court Records API',
        type: 'court_system',
        apiBaseUrl: 'https://api.courtrecords.gov',
        authType: 'api_key',
        isActive: true,
        supportedDocuments: [
          LegalDocumentType.COURT_ORDER,
          LegalDocumentType.WILL_PROBATE,
          LegalDocumentType.GUARDIANSHIP_ORDER
        ],
        jurisdictions: ['federal', 'state', 'county'],
        verificationCapabilities: ['authenticity', 'status', 'jurisdiction']
      },
      {
        id: 'vital_records_system',
        name: 'Vital Records System',
        type: 'government_agency',
        apiBaseUrl: 'https://api.vitalrecords.gov',
        authType: 'oauth',
        isActive: true,
        supportedDocuments: [LegalDocumentType.DEATH_CERTIFICATE],
        jurisdictions: ['state', 'county'],
        verificationCapabilities: ['authenticity', 'issuing_authority']
      },
      {
        id: 'legal_document_service',
        name: 'LegalZoom Document Service',
        type: 'legal_platform',
        apiBaseUrl: 'https://api.legalzoom.com',
        authType: 'oauth',
        isActive: true,
        supportedDocuments: [
          LegalDocumentType.POWER_OF_ATTORNEY,
          LegalDocumentType.TRUST_DOCUMENT,
          LegalDocumentType.MEDICAL_DIRECTIVE
        ],
        jurisdictions: ['multi_state'],
        verificationCapabilities: ['notarization', 'witness_verification']
      }
    ]

    providers.forEach(provider => {
      this.providers.set(provider.id, provider)
    })
  }

  private startPeriodicMonitoring(): void {
    // Monitor for document status updates
    setInterval(async () => {
      await this.checkDocumentUpdates()
    }, this.DEFAULT_MONITORING_INTERVAL)
  }

  private async checkDocumentUpdates(): Promise<void> {
    // Check for pending documents that need follow-up
    const pendingDocs = this.getPendingVerifications()
    
    for (const doc of pendingDocs) {
      // In a real implementation, this would check with external services
      // for status updates on document verification
      console.log(`Checking status for document ${doc.id}`)
    }
  }
}

// Singleton instance
export const legalDocumentDetectionService = new LegalDocumentDetectionService()