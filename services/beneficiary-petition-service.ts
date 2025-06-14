import { triggerConditionsService, TriggerType, TriggerPriority } from './trigger-conditions-service'
import { auditLoggingService } from './audit-logging-service'

// Beneficiary petition types
export enum PetitionType {
  EMERGENCY_ACCESS = 'emergency_access',
  FULL_ACCESS = 'full_access',
  PARTIAL_ACCESS = 'partial_access',
  DOCUMENT_ACCESS = 'document_access',
  ASSET_ACCESS = 'asset_access',
  MEDICAL_RECORDS = 'medical_records',
  DIGITAL_ASSETS = 'digital_assets',
  ACCOUNT_RECOVERY = 'account_recovery',
  BENEFICIARY_VERIFICATION = 'beneficiary_verification',
  DISPUTE_RESOLUTION = 'dispute_resolution'
}

// Petition status
export enum PetitionStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  PENDING_VERIFICATION = 'pending_verification',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  WITHDRAWN = 'withdrawn'
}

// Petition urgency levels
export enum PetitionUrgency {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency'
}

// Evidence types for petition support
export enum EvidenceType {
  DEATH_CERTIFICATE = 'death_certificate',
  LEGAL_DOCUMENT = 'legal_document',
  MEDICAL_RECORD = 'medical_record',
  IDENTITY_VERIFICATION = 'identity_verification',
  RELATIONSHIP_PROOF = 'relationship_proof',
  WITNESS_STATEMENT = 'witness_statement',
  PROFESSIONAL_ATTESTATION = 'professional_attestation',
  COURT_ORDER = 'court_order',
  NOTARIZED_STATEMENT = 'notarized_statement',
  DIGITAL_SIGNATURE = 'digital_signature'
}

// Verification methods
export enum VerificationMethod {
  DOCUMENT_REVIEW = 'document_review',
  IDENTITY_CHECK = 'identity_check',
  BACKGROUND_CHECK = 'background_check',
  REFERENCE_VERIFICATION = 'reference_verification',
  LEGAL_VERIFICATION = 'legal_verification',
  BIOMETRIC_VERIFICATION = 'biometric_verification',
  VIDEO_CALL = 'video_call',
  IN_PERSON_MEETING = 'in_person_meeting'
}

// Petition data interfaces
export interface BeneficiaryPetition {
  id: string
  userId: string // Original account owner
  petitionerId: string // Person making the petition
  type: PetitionType
  status: PetitionStatus
  urgency: PetitionUrgency
  title: string
  description: string
  justification: string
  requestedAccess: AccessRequest[]
  evidence: Evidence[]
  supportingDocuments: SupportingDocument[]
  witnesses: Witness[]
  timeline: PetitionTimeline[]
  verification: VerificationRecord[]
  reviewers: Reviewer[]
  createdAt: Date
  updatedAt: Date
  submittedAt?: Date
  reviewDeadline?: Date
  approvedAt?: Date
  rejectedAt?: Date
  rejectionReason?: string
  approvedBy?: string
  conditions?: PetitionCondition[]
  expirationDate?: Date
}

export interface AccessRequest {
  id: string
  resource: string
  accessLevel: 'read' | 'write' | 'admin' | 'full'
  duration?: number // days
  purpose: string
  limitations?: string[]
}

export interface Evidence {
  id: string
  type: EvidenceType
  title: string
  description: string
  fileHash?: string
  verificationStatus: 'pending' | 'verified' | 'rejected'
  verifiedBy?: string
  verificationDate?: Date
  expirationDate?: Date
}

export interface SupportingDocument {
  id: string
  filename: string
  fileType: string
  fileSize: number
  uploadDate: Date
  verified: boolean
  documentHash: string
  description: string
}

export interface Witness {
  id: string
  name: string
  relationship: string
  contactInfo: string
  statement: string
  verificationStatus: 'pending' | 'verified' | 'rejected'
  verificationMethod?: VerificationMethod
  verifiedAt?: Date
}

export interface PetitionTimeline {
  id: string
  timestamp: Date
  event: string
  description: string
  actor: string
  metadata?: any
}

export interface VerificationRecord {
  id: string
  method: VerificationMethod
  status: 'pending' | 'completed' | 'failed'
  verifiedBy: string
  verificationDate: Date
  notes?: string
  confidence: number // 0-100
  metadata?: any
}

export interface Reviewer {
  id: string
  reviewerId: string
  role: 'primary' | 'secondary' | 'specialist' | 'legal'
  assignedAt: Date
  status: 'assigned' | 'reviewing' | 'completed'
  recommendation?: 'approve' | 'reject' | 'request_more_info'
  notes?: string
  completedAt?: Date
}

export interface PetitionCondition {
  id: string
  type: 'time_limit' | 'access_restriction' | 'reporting_requirement' | 'supervision'
  description: string
  parameters: any
  isActive: boolean
}

// Enhanced petition data for trigger processing
export interface EnhancedPetitionData {
  petition: BeneficiaryPetition
  riskAssessment: RiskAssessment
  autoApprovalEligible: boolean
  requiredApprovals: number
  estimatedProcessingTime: number
  priority: number
  triggerActions: string[]
  notificationTargets: string[]
}

export interface RiskAssessment {
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  riskFactors: string[]
  mitigationRequirements: string[]
  additionalVerificationNeeded: boolean
  legalReviewRequired: boolean
  escalationRequired: boolean
}

class BeneficiaryPetitionService {
  private petitions: Map<string, BeneficiaryPetition> = new Map()
  private petitionHistory: Map<string, BeneficiaryPetition[]> = new Map()
  private reviewQueue: Map<string, BeneficiaryPetition[]> = new Map()
  
  // Configuration
  private readonly DEFAULT_REVIEW_DEADLINE_HOURS = 72
  private readonly EMERGENCY_REVIEW_DEADLINE_HOURS = 4
  private readonly AUTO_APPROVAL_RISK_THRESHOLD = 30

  constructor() {
    this.initializeReviewQueues()
  }

  /**
   * Create a new beneficiary petition
   */
  async createPetition(
    petition: Omit<BeneficiaryPetition, 'id' | 'createdAt' | 'updatedAt' | 'timeline'>
  ): Promise<string> {
    const petitionId = `petition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const completePetition: BeneficiaryPetition = {
      ...petition,
      id: petitionId,
      createdAt: new Date(),
      updatedAt: new Date(),
      timeline: [{
        id: 'initial',
        timestamp: new Date(),
        event: 'petition_created',
        description: 'Petition created by beneficiary',
        actor: petition.petitionerId
      }]
    }

    this.petitions.set(petitionId, completePetition)
    
    // Add to petitioner's history
    const history = this.petitionHistory.get(petition.petitionerId) || []
    history.push(completePetition)
    this.petitionHistory.set(petition.petitionerId, history)

    await auditLoggingService.logEvent({
      eventType: 'beneficiary_petition',
      action: 'petition_created',
      resource: 'beneficiary_petition',
      resourceId: petitionId,
      result: 'success',
      userId: petition.petitionerId,
      details: {
        type: petition.type,
        urgency: petition.urgency,
        targetUserId: petition.userId,
        requestedAccessCount: petition.requestedAccess.length
      },
      riskLevel: 'medium'
    })

    return petitionId
  }

  /**
   * Submit petition for review
   */
  async submitPetition(petitionId: string): Promise<void> {
    const petition = this.petitions.get(petitionId)
    if (!petition) throw new Error('Petition not found')

    if (petition.status !== PetitionStatus.DRAFT) {
      throw new Error('Can only submit draft petitions')
    }

    // Update status and timeline
    petition.status = PetitionStatus.SUBMITTED
    petition.submittedAt = new Date()
    petition.updatedAt = new Date()
    
    // Set review deadline based on urgency
    const deadlineHours = petition.urgency === PetitionUrgency.EMERGENCY || 
                          petition.urgency === PetitionUrgency.CRITICAL
      ? this.EMERGENCY_REVIEW_DEADLINE_HOURS
      : this.DEFAULT_REVIEW_DEADLINE_HOURS

    petition.reviewDeadline = new Date(Date.now() + deadlineHours * 60 * 60 * 1000)

    this.addTimelineEvent(petition, 'petition_submitted', 'Petition submitted for review', petition.petitionerId)

    // Perform initial assessment
    const enhancedData = await this.assessPetition(petition)
    
    // Assign reviewers
    await this.assignReviewers(petition, enhancedData)
    
    // Check for auto-approval eligibility
    if (enhancedData.autoApprovalEligible) {
      await this.processAutoApproval(petition, enhancedData)
    } else {
      // Add to review queue
      await this.addToReviewQueue(petition)
    }

    // Create trigger condition for petition processing
    await this.createPetitionTrigger(petition)

    await auditLoggingService.logEvent({
      eventType: 'beneficiary_petition',
      action: 'petition_submitted',
      resource: 'beneficiary_petition',
      resourceId: petitionId,
      result: 'success',
      userId: petition.petitionerId,
      details: {
        autoApprovalEligible: enhancedData.autoApprovalEligible,
        riskLevel: enhancedData.riskAssessment.riskLevel,
        reviewDeadline: petition.reviewDeadline
      },
      riskLevel: enhancedData.riskAssessment.riskLevel === 'critical' ? 'critical' : 'high'
    })
  }

  /**
   * Review and approve/reject petition
   */
  async reviewPetition(
    petitionId: string, 
    reviewerId: string, 
    decision: 'approve' | 'reject' | 'request_more_info',
    notes?: string,
    conditions?: PetitionCondition[]
  ): Promise<void> {
    const petition = this.petitions.get(petitionId)
    if (!petition) throw new Error('Petition not found')

    // Update reviewer record
    const reviewer = petition.reviewers.find(r => r.reviewerId === reviewerId)
    if (reviewer) {
      reviewer.status = 'completed'
      reviewer.recommendation = decision
      reviewer.notes = notes
      reviewer.completedAt = new Date()
    }

    // Update petition based on decision
    switch (decision) {
      case 'approve':
        petition.status = PetitionStatus.APPROVED
        petition.approvedAt = new Date()
        petition.approvedBy = reviewerId
        petition.conditions = conditions || []
        
        // Execute approved access
        await this.executeApprovedAccess(petition)
        break

      case 'reject':
        petition.status = PetitionStatus.REJECTED
        petition.rejectedAt = new Date()
        petition.rejectionReason = notes || 'Petition denied'
        break

      case 'request_more_info':
        petition.status = PetitionStatus.PENDING_VERIFICATION
        break
    }

    petition.updatedAt = new Date()
    this.addTimelineEvent(petition, `petition_${decision}`, notes || `Petition ${decision}`, reviewerId)

    // Notify petitioner
    await this.sendPetitionStatusNotification(petition)

    await auditLoggingService.logEvent({
      eventType: 'beneficiary_petition',
      action: `petition_${decision}`,
      resource: 'beneficiary_petition',
      resourceId: petitionId,
      result: 'success',
      userId: reviewerId,
      details: {
        petitionerId: petition.petitionerId,
        decision,
        notes,
        hasConditions: (conditions || []).length > 0
      },
      riskLevel: decision === 'approve' ? 'high' : 'medium'
    })
  }

  /**
   * Update petition with additional information
   */
  async updatePetition(
    petitionId: string, 
    updates: {
      evidence?: Evidence[]
      supportingDocuments?: SupportingDocument[]
      witnesses?: Witness[]
      justification?: string
    }
  ): Promise<void> {
    const petition = this.petitions.get(petitionId)
    if (!petition) throw new Error('Petition not found')

    if (updates.evidence) {
      petition.evidence.push(...updates.evidence)
    }
    
    if (updates.supportingDocuments) {
      petition.supportingDocuments.push(...updates.supportingDocuments)
    }
    
    if (updates.witnesses) {
      petition.witnesses.push(...updates.witnesses)
    }
    
    if (updates.justification) {
      petition.justification = updates.justification
    }

    petition.updatedAt = new Date()
    this.addTimelineEvent(petition, 'petition_updated', 'Additional information provided', petition.petitionerId)

    // If petition was pending verification, move it back to review
    if (petition.status === PetitionStatus.PENDING_VERIFICATION) {
      petition.status = PetitionStatus.UNDER_REVIEW
      await this.addToReviewQueue(petition)
    }
  }

  /**
   * Get petitions for a user (as petitioner)
   */
  getUserPetitions(userId: string): BeneficiaryPetition[] {
    return this.petitionHistory.get(userId) || []
  }

  /**
   * Get petition by ID
   */
  getPetition(petitionId: string): BeneficiaryPetition | undefined {
    return this.petitions.get(petitionId)
  }

  /**
   * Get petitions in review queue
   */
  getReviewQueue(queueType: string = 'general'): BeneficiaryPetition[] {
    return this.reviewQueue.get(queueType) || []
  }

  /**
   * Simulate beneficiary petition for testing
   */
  async simulatePetition(
    userId: string,
    petitionType: PetitionType,
    urgency: PetitionUrgency = PetitionUrgency.MEDIUM,
    customData?: Partial<BeneficiaryPetition>
  ): Promise<string> {
    const simulatedPetition: Omit<BeneficiaryPetition, 'id' | 'createdAt' | 'updatedAt' | 'timeline'> = {
      userId: 'target-user',
      petitionerId: userId,
      type: petitionType,
      status: PetitionStatus.DRAFT,
      urgency,
      title: `Simulated ${petitionType.replace('_', ' ')} Petition`,
      description: `This is a simulated petition for testing purposes`,
      justification: this.getDefaultJustification(petitionType),
      requestedAccess: this.getDefaultAccessRequests(petitionType),
      evidence: [],
      supportingDocuments: [],
      witnesses: [],
      verification: [],
      reviewers: [],
      ...customData
    }

    const petitionId = await this.createPetition(simulatedPetition)
    
    // Auto-submit for simulation
    setTimeout(async () => {
      await this.submitPetition(petitionId)
    }, 1000)

    return petitionId
  }

  /**
   * Private helper methods
   */
  private async assessPetition(petition: BeneficiaryPetition): Promise<EnhancedPetitionData> {
    const riskAssessment = await this.performRiskAssessment(petition)
    const autoApprovalEligible = await this.checkAutoApprovalEligibility(petition, riskAssessment)

    return {
      petition,
      riskAssessment,
      autoApprovalEligible,
      requiredApprovals: this.calculateRequiredApprovals(petition, riskAssessment),
      estimatedProcessingTime: this.estimateProcessingTime(petition, riskAssessment),
      priority: this.calculatePriority(petition),
      triggerActions: this.determineTriggerActions(petition),
      notificationTargets: this.getNotificationTargets(petition)
    }
  }

  private async performRiskAssessment(petition: BeneficiaryPetition): Promise<RiskAssessment> {
    const riskFactors: string[] = []
    let riskScore = 0

    // Assess petition type risk
    const highRiskTypes = [PetitionType.FULL_ACCESS, PetitionType.ASSET_ACCESS, PetitionType.ACCOUNT_RECOVERY]
    if (highRiskTypes.includes(petition.type)) {
      riskFactors.push('high_risk_access_type')
      riskScore += 30
    }

    // Assess urgency risk
    if (petition.urgency === PetitionUrgency.EMERGENCY || petition.urgency === PetitionUrgency.CRITICAL) {
      riskFactors.push('high_urgency')
      riskScore += 20
    }

    // Assess evidence completeness
    if (petition.evidence.length === 0) {
      riskFactors.push('insufficient_evidence')
      riskScore += 25
    }

    // Assess witness verification
    const verifiedWitnesses = petition.witnesses.filter(w => w.verificationStatus === 'verified')
    if (verifiedWitnesses.length === 0 && petition.witnesses.length > 0) {
      riskFactors.push('unverified_witnesses')
      riskScore += 15
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical'
    if (riskScore <= 20) riskLevel = 'low'
    else if (riskScore <= 40) riskLevel = 'medium'
    else if (riskScore <= 70) riskLevel = 'high'
    else riskLevel = 'critical'

    return {
      riskLevel,
      riskFactors,
      mitigationRequirements: this.getMitigationRequirements(riskFactors),
      additionalVerificationNeeded: riskScore > 40,
      legalReviewRequired: riskScore > 60,
      escalationRequired: riskScore > 80
    }
  }

  private async checkAutoApprovalEligibility(
    petition: BeneficiaryPetition, 
    riskAssessment: RiskAssessment
  ): Promise<boolean> {
    // Auto-approval criteria
    const lowRiskTypes = [PetitionType.DOCUMENT_ACCESS, PetitionType.BENEFICIARY_VERIFICATION]
    const hasVerifiedEvidence = petition.evidence.some(e => e.verificationStatus === 'verified')
    const isLowRisk = riskAssessment.riskLevel === 'low'
    
    return lowRiskTypes.includes(petition.type) && hasVerifiedEvidence && isLowRisk
  }

  private async processAutoApproval(petition: BeneficiaryPetition, enhancedData: EnhancedPetitionData): Promise<void> {
    petition.status = PetitionStatus.APPROVED
    petition.approvedAt = new Date()
    petition.approvedBy = 'system_auto_approval'
    
    this.addTimelineEvent(petition, 'petition_auto_approved', 'Petition automatically approved', 'system')
    
    await this.executeApprovedAccess(petition)
  }

  private async assignReviewers(petition: BeneficiaryPetition, enhancedData: EnhancedPetitionData): Promise<void> {
    const reviewers: Reviewer[] = []

    // Assign primary reviewer
    reviewers.push({
      id: 'primary_reviewer',
      reviewerId: 'system_primary_reviewer',
      role: 'primary',
      assignedAt: new Date(),
      status: 'assigned'
    })

    // Assign additional reviewers based on risk
    if (enhancedData.riskAssessment.legalReviewRequired) {
      reviewers.push({
        id: 'legal_reviewer',
        reviewerId: 'system_legal_reviewer',
        role: 'legal',
        assignedAt: new Date(),
        status: 'assigned'
      })
    }

    if (enhancedData.riskAssessment.riskLevel === 'critical') {
      reviewers.push({
        id: 'specialist_reviewer',
        reviewerId: 'system_specialist_reviewer',
        role: 'specialist',
        assignedAt: new Date(),
        status: 'assigned'
      })
    }

    petition.reviewers = reviewers
    petition.status = PetitionStatus.UNDER_REVIEW
  }

  private async addToReviewQueue(petition: BeneficiaryPetition): Promise<void> {
    const queueType = petition.urgency === PetitionUrgency.EMERGENCY ? 'emergency' : 'general'
    const queue = this.reviewQueue.get(queueType) || []
    
    // Insert based on priority
    const priority = this.calculatePriority(petition)
    let insertIndex = queue.findIndex(p => this.calculatePriority(p) < priority)
    if (insertIndex === -1) insertIndex = queue.length
    
    queue.splice(insertIndex, 0, petition)
    this.reviewQueue.set(queueType, queue)
  }

  private async executeApprovedAccess(petition: BeneficiaryPetition): Promise<void> {
    // Process each access request
    for (const accessRequest of petition.requestedAccess) {
      console.log(`Granting ${accessRequest.accessLevel} access to ${accessRequest.resource}`)
      
      // In a real implementation, this would:
      // 1. Create access permissions in the system
      // 2. Notify the beneficiary
      // 3. Set up access logging and monitoring
      // 4. Apply any conditions or limitations
    }

    // Process trigger actions
    const enhancedData = await this.assessPetition(petition)
    await triggerConditionsService.processBeneficiaryPetition({
      petitionId: petition.id,
      petitionType: petition.type,
      petitionerId: petition.petitionerId,
      userId: petition.userId,
      approvedAccess: petition.requestedAccess,
      conditions: petition.conditions || []
    })
  }

  private async createPetitionTrigger(petition: BeneficiaryPetition): Promise<void> {
    await triggerConditionsService.createTrigger({
      userId: petition.userId,
      type: TriggerType.BENEFICIARY_PETITION,
      name: `Beneficiary Petition - ${petition.type}`,
      description: `Automatically created trigger for beneficiary petition`,
      status: 'active' as any,
      priority: TriggerPriority.HIGH,
      isEnabled: true,
      parameters: {
        petitionType: petition.type,
        petitionerId: petition.petitionerId,
        urgency: petition.urgency,
        requestedAccess: petition.requestedAccess,
        autoProcessing: petition.urgency === PetitionUrgency.EMERGENCY
      },
      actions: [
        {
          id: 'petition_access_activation',
          action: 'activate_emergency_access' as any,
          parameters: { 
            petitionId: petition.id,
            accessRequests: petition.requestedAccess
          }
        },
        {
          id: 'notify_stakeholders',
          action: 'notify_beneficiaries' as any,
          parameters: {
            notificationType: 'beneficiary_petition_filed',
            urgency: petition.urgency
          }
        }
      ],
      conditions: [
        {
          field: 'status',
          operator: 'equals',
          value: PetitionStatus.APPROVED
        }
      ]
    })
  }

  private addTimelineEvent(
    petition: BeneficiaryPetition, 
    event: string, 
    description: string, 
    actor: string
  ): void {
    petition.timeline.push({
      id: `${event}_${Date.now()}`,
      timestamp: new Date(),
      event,
      description,
      actor
    })
  }

  private async sendPetitionStatusNotification(petition: BeneficiaryPetition): Promise<void> {
    // Send notification to petitioner about status change
    console.log(`Sending notification to ${petition.petitionerId} about petition ${petition.id} status: ${petition.status}`)
  }

  private calculateRequiredApprovals(petition: BeneficiaryPetition, riskAssessment: RiskAssessment): number {
    let required = 1 // Base requirement

    if (riskAssessment.riskLevel === 'high') required = 2
    if (riskAssessment.riskLevel === 'critical') required = 3
    if (petition.type === PetitionType.FULL_ACCESS) required = Math.max(required, 2)

    return required
  }

  private estimateProcessingTime(petition: BeneficiaryPetition, riskAssessment: RiskAssessment): number {
    let baseHours = 24

    if (petition.urgency === PetitionUrgency.EMERGENCY) baseHours = 2
    else if (petition.urgency === PetitionUrgency.CRITICAL) baseHours = 6
    else if (petition.urgency === PetitionUrgency.HIGH) baseHours = 12

    if (riskAssessment.riskLevel === 'high') baseHours *= 1.5
    if (riskAssessment.riskLevel === 'critical') baseHours *= 2
    if (riskAssessment.legalReviewRequired) baseHours *= 1.5

    return Math.ceil(baseHours)
  }

  private calculatePriority(petition: BeneficiaryPetition): number {
    let priority = 0

    // Urgency scoring
    const urgencyScores = {
      [PetitionUrgency.EMERGENCY]: 100,
      [PetitionUrgency.CRITICAL]: 80,
      [PetitionUrgency.HIGH]: 60,
      [PetitionUrgency.MEDIUM]: 40,
      [PetitionUrgency.LOW]: 20
    }
    priority += urgencyScores[petition.urgency]

    // Type scoring
    const typeScores = {
      [PetitionType.EMERGENCY_ACCESS]: 50,
      [PetitionType.FULL_ACCESS]: 40,
      [PetitionType.MEDICAL_RECORDS]: 30,
      [PetitionType.ASSET_ACCESS]: 30,
      [PetitionType.DOCUMENT_ACCESS]: 20,
      [PetitionType.BENEFICIARY_VERIFICATION]: 10
    }
    priority += typeScores[petition.type] || 15

    // Time-based boost
    const hoursOld = (Date.now() - petition.createdAt.getTime()) / (1000 * 60 * 60)
    if (hoursOld > 48) priority += 20
    else if (hoursOld > 24) priority += 10

    return priority
  }

  private determineTriggerActions(petition: BeneficiaryPetition): string[] {
    const actions: string[] = []

    switch (petition.type) {
      case PetitionType.EMERGENCY_ACCESS:
        actions.push('activate_emergency_access', 'notify_all_beneficiaries', 'start_emergency_protocols')
        break
      case PetitionType.FULL_ACCESS:
        actions.push('activate_full_access', 'transfer_control', 'notify_legal_contacts')
        break
      case PetitionType.MEDICAL_RECORDS:
        actions.push('grant_medical_access', 'notify_healthcare_contacts')
        break
      case PetitionType.ASSET_ACCESS:
        actions.push('grant_asset_access', 'notify_financial_contacts', 'start_asset_review')
        break
      default:
        actions.push('grant_requested_access', 'notify_relevant_parties')
    }

    return actions
  }

  private getNotificationTargets(petition: BeneficiaryPetition): string[] {
    const targets = [petition.petitionerId] // Always notify petitioner

    // Add other beneficiaries for certain petition types
    const sharedAccessTypes = [
      PetitionType.EMERGENCY_ACCESS,
      PetitionType.FULL_ACCESS,
      PetitionType.DISPUTE_RESOLUTION
    ]

    if (sharedAccessTypes.includes(petition.type)) {
      targets.push('all_beneficiaries')
    }

    return targets
  }

  private getMitigationRequirements(riskFactors: string[]): string[] {
    const requirements: string[] = []

    if (riskFactors.includes('insufficient_evidence')) {
      requirements.push('provide_additional_documentation')
    }
    
    if (riskFactors.includes('unverified_witnesses')) {
      requirements.push('complete_witness_verification')
    }
    
    if (riskFactors.includes('high_urgency')) {
      requirements.push('expedited_review_with_additional_oversight')
    }

    return requirements
  }

  private getDefaultJustification(petitionType: PetitionType): string {
    const justifications = {
      [PetitionType.EMERGENCY_ACCESS]: 'Emergency situation requires immediate access to critical information',
      [PetitionType.FULL_ACCESS]: 'Legal documentation supports full access rights as designated beneficiary',
      [PetitionType.MEDICAL_RECORDS]: 'Medical emergency requiring access to health information for treatment decisions',
      [PetitionType.ASSET_ACCESS]: 'Estate settlement requires access to financial and asset information',
      [PetitionType.DOCUMENT_ACCESS]: 'Need access to specific documents for legal proceedings',
      [PetitionType.BENEFICIARY_VERIFICATION]: 'Verification of beneficiary status and access rights'
    }

    return justifications[petitionType] || 'Access required for legitimate purposes as designated beneficiary'
  }

  private getDefaultAccessRequests(petitionType: PetitionType): AccessRequest[] {
    switch (petitionType) {
      case PetitionType.EMERGENCY_ACCESS:
        return [
          {
            id: 'emergency_all',
            resource: 'all_emergency_data',
            accessLevel: 'read',
            duration: 7,
            purpose: 'Emergency response and coordination'
          }
        ]
      case PetitionType.FULL_ACCESS:
        return [
          {
            id: 'full_system',
            resource: 'complete_system',
            accessLevel: 'full',
            purpose: 'Complete estate management and administration'
          }
        ]
      case PetitionType.MEDICAL_RECORDS:
        return [
          {
            id: 'medical_data',
            resource: 'medical_records',
            accessLevel: 'read',
            duration: 30,
            purpose: 'Medical care and treatment decisions'
          }
        ]
      default:
        return [
          {
            id: 'basic_access',
            resource: 'basic_information',
            accessLevel: 'read',
            duration: 14,
            purpose: 'Basic information access'
          }
        ]
    }
  }

  private initializeReviewQueues(): void {
    this.reviewQueue.set('emergency', [])
    this.reviewQueue.set('general', [])
    this.reviewQueue.set('legal', [])
  }
}

// Singleton instance
export const beneficiaryPetitionService = new BeneficiaryPetitionService()