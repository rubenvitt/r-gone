import { 
  Beneficiary,
  BeneficiaryManagementSystem,
  BeneficiaryTrustLevel,
  BeneficiaryAccessLevel,
  BeneficiaryPermissions,
  BeneficiaryInvitation,
  BeneficiaryVerification,
  BeneficiaryFilter,
  BeneficiaryRelationship,
  BeneficiaryStatus,
  InvitationStatus,
  VerificationMethod,
  BeneficiaryGroup,
  DocumentCategory
} from '@/types/data'
import crypto from 'crypto'
import { auditLoggingService } from './audit-logging-service'

export interface BeneficiaryCreateOptions {
  email: string;
  name: string;
  relationship: BeneficiaryRelationship;
  trustLevel?: BeneficiaryTrustLevel;
  accessLevel?: BeneficiaryAccessLevel;
  phone?: string;
  alternateEmail?: string;
  notes?: string;
  customPermissions?: Partial<BeneficiaryPermissions>;
  priority?: number;
  sendInvitation?: boolean;
  invitationMessage?: string;
}

export class BeneficiaryManagementService {
  private static instance: BeneficiaryManagementService
  private dataDirectory: string

  constructor() {
    this.dataDirectory = process.cwd() + '/data/beneficiaries'
    this.ensureDataDirectory()
  }

  public static getInstance(): BeneficiaryManagementService {
    if (!BeneficiaryManagementService.instance) {
      BeneficiaryManagementService.instance = new BeneficiaryManagementService()
    }
    return BeneficiaryManagementService.instance
  }

  /**
   * Create a new empty beneficiary management system
   */
  createEmptySystem(): BeneficiaryManagementSystem {
    return {
      beneficiaries: [],
      groups: this.createDefaultGroups(),
      invitations: [],
      verifications: [],
      accessLogs: [],
      settings: {
        defaultTrustLevel: 'family',
        defaultAccessLevel: 'personal',
        invitationExpiryDays: 7,
        verificationExpiryHours: 24,
        maxInvitationAttempts: 3,
        maxVerificationAttempts: 5,
        requireEmailVerification: true,
        requirePhoneVerification: false,
        enableGeographicRestrictions: false,
        enableTemporalRestrictions: false,
        allowSelfInvitation: false,
        notificationSettings: {
          emailTemplates: {
            invitation: 'You have been invited to access emergency information.',
            verification: 'Please verify your identity to complete setup.',
            accessGranted: 'Your access has been granted.',
            accessRevoked: 'Your access has been revoked.'
          },
          enableAuditNotifications: true
        }
      },
      statistics: {
        totalBeneficiaries: 0,
        activeBeneficiaries: 0,
        pendingInvitations: 0,
        verifiedBeneficiaries: 0,
        beneficiariesByTrustLevel: {
          family: 0,
          legal: 0,
          business: 0,
          emergency: 0,
          limited: 0
        },
        beneficiariesByAccessLevel: {
          full: 0,
          financial: 0,
          medical: 0,
          personal: 0,
          emergency: 0,
          custom: 0
        },
        recentAccess: 0,
        lastAnalysis: new Date().toISOString()
      }
    }
  }

  /**
   * Add a new beneficiary
   */
  async addBeneficiary(
    system: BeneficiaryManagementSystem, 
    options: BeneficiaryCreateOptions,
    createdBy: string = 'system'
  ): Promise<BeneficiaryManagementSystem> {
    // Check for duplicate email
    const existingBeneficiary = system.beneficiaries.find(b => b.email === options.email)
    if (existingBeneficiary) {
      throw new Error('Beneficiary with this email already exists')
    }

    const beneficiary: Beneficiary = {
      id: crypto.randomUUID(),
      email: options.email,
      name: options.name,
      relationship: options.relationship,
      trustLevel: options.trustLevel || system.settings.defaultTrustLevel,
      accessLevel: options.accessLevel || system.settings.defaultAccessLevel,
      permissions: options.customPermissions ? 
        this.mergePermissions(this.getDefaultPermissions(options.accessLevel || system.settings.defaultAccessLevel), options.customPermissions) :
        this.getDefaultPermissions(options.accessLevel || system.settings.defaultAccessLevel),
      status: 'inactive',
      phone: options.phone,
      alternateEmail: options.alternateEmail,
      invitationStatus: 'pending',
      priority: options.priority || this.getNextPriority(system),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy,
      notes: options.notes
    }

    const updatedSystem = {
      ...system,
      beneficiaries: [...system.beneficiaries, beneficiary]
    }

    // Send invitation if requested
    if (options.sendInvitation) {
      await this.createInvitation(updatedSystem, beneficiary.id, options.invitationMessage, createdBy)
    }

    // Log the action
    await auditLoggingService.logEvent({
      eventType: 'admin_action',
      action: 'add_beneficiary',
      resource: 'beneficiary',
      resourceId: beneficiary.id,
      result: 'success',
      details: {
        beneficiaryEmail: beneficiary.email,
        trustLevel: beneficiary.trustLevel,
        accessLevel: beneficiary.accessLevel,
        sendInvitation: options.sendInvitation
      },
      riskLevel: 'medium',
      userId: createdBy
    })

    return this.updateStatistics(updatedSystem)
  }

  /**
   * Update an existing beneficiary
   */
  async updateBeneficiary(
    system: BeneficiaryManagementSystem,
    beneficiaryId: string,
    updates: Partial<Beneficiary>,
    updatedBy: string = 'system'
  ): Promise<BeneficiaryManagementSystem> {
    const beneficiaryIndex = system.beneficiaries.findIndex(b => b.id === beneficiaryId)
    if (beneficiaryIndex === -1) {
      throw new Error('Beneficiary not found')
    }

    const currentBeneficiary = system.beneficiaries[beneficiaryIndex]
    const updatedBeneficiary: Beneficiary = {
      ...currentBeneficiary,
      ...updates,
      id: beneficiaryId,
      updatedAt: new Date().toISOString()
    }

    const updatedBeneficiaries = [...system.beneficiaries]
    updatedBeneficiaries[beneficiaryIndex] = updatedBeneficiary

    const updatedSystem = {
      ...system,
      beneficiaries: updatedBeneficiaries
    }

    // Log the action
    await auditLoggingService.logEvent({
      eventType: 'admin_action',
      action: 'update_beneficiary',
      resource: 'beneficiary',
      resourceId: beneficiaryId,
      result: 'success',
      details: {
        beneficiaryEmail: updatedBeneficiary.email,
        changes: this.getChanges(currentBeneficiary, updates)
      },
      riskLevel: 'medium',
      userId: updatedBy
    })

    return this.updateStatistics(updatedSystem)
  }

  /**
   * Remove a beneficiary
   */
  async removeBeneficiary(
    system: BeneficiaryManagementSystem,
    beneficiaryId: string,
    removedBy: string = 'system'
  ): Promise<BeneficiaryManagementSystem> {
    const beneficiary = system.beneficiaries.find(b => b.id === beneficiaryId)
    if (!beneficiary) {
      throw new Error('Beneficiary not found')
    }

    // Remove from all groups
    const updatedGroups = system.groups.map(group => ({
      ...group,
      beneficiaryIds: group.beneficiaryIds.filter(id => id !== beneficiaryId)
    }))

    // Remove related invitations and verifications
    const updatedSystem = {
      ...system,
      beneficiaries: system.beneficiaries.filter(b => b.id !== beneficiaryId),
      groups: updatedGroups,
      invitations: system.invitations.filter(i => i.beneficiaryId !== beneficiaryId),
      verifications: system.verifications.filter(v => v.beneficiaryId !== beneficiaryId)
    }

    // Log the action
    await auditLoggingService.logEvent({
      eventType: 'admin_action',
      action: 'remove_beneficiary',
      resource: 'beneficiary',
      resourceId: beneficiaryId,
      result: 'success',
      details: {
        beneficiaryEmail: beneficiary.email,
        trustLevel: beneficiary.trustLevel
      },
      riskLevel: 'high',
      userId: removedBy
    })

    return this.updateStatistics(updatedSystem)
  }

  /**
   * Create an invitation for a beneficiary
   */
  async createInvitation(
    system: BeneficiaryManagementSystem,
    beneficiaryId: string,
    message?: string,
    createdBy: string = 'system'
  ): Promise<BeneficiaryInvitation> {
    const beneficiary = system.beneficiaries.find(b => b.id === beneficiaryId)
    if (!beneficiary) {
      throw new Error('Beneficiary not found')
    }

    // Check for existing pending invitation
    const existingInvitation = system.invitations.find(
      i => i.beneficiaryId === beneficiaryId && i.acceptedAt === undefined && i.declinedAt === undefined
    )
    
    if (existingInvitation && new Date(existingInvitation.expiresAt) > new Date()) {
      throw new Error('Active invitation already exists for this beneficiary')
    }

    const invitation: BeneficiaryInvitation = {
      id: crypto.randomUUID(),
      beneficiaryId,
      email: beneficiary.email,
      token: this.generateInvitationToken(),
      message,
      expiresAt: new Date(Date.now() + system.settings.invitationExpiryDays * 24 * 60 * 60 * 1000).toISOString(),
      sentAt: new Date().toISOString(),
      attempts: 0,
      maxAttempts: system.settings.maxInvitationAttempts,
      createdBy
    }

    // Update beneficiary status
    await this.updateBeneficiary(system, beneficiaryId, {
      invitationStatus: 'sent',
      invitationToken: invitation.token,
      invitationSentAt: invitation.sentAt
    }, createdBy)

    // In a real implementation, send email here
    console.log(`Invitation sent to ${beneficiary.email} with token: ${invitation.token}`)

    // Log the action
    await auditLoggingService.logEvent({
      eventType: 'admin_action',
      action: 'send_invitation',
      resource: 'beneficiary_invitation',
      resourceId: invitation.id,
      result: 'success',
      details: {
        beneficiaryId,
        beneficiaryEmail: beneficiary.email,
        expiresAt: invitation.expiresAt
      },
      riskLevel: 'low',
      userId: createdBy
    })

    return invitation
  }

  /**
   * Accept an invitation
   */
  async acceptInvitation(
    system: BeneficiaryManagementSystem,
    token: string
  ): Promise<{ beneficiary: Beneficiary; requiresVerification: boolean }> {
    const invitation = system.invitations.find(i => 
      i.token === token && 
      !i.acceptedAt && 
      !i.declinedAt &&
      new Date(i.expiresAt) > new Date()
    )

    if (!invitation) {
      throw new Error('Invalid or expired invitation token')
    }

    const beneficiary = system.beneficiaries.find(b => b.id === invitation.beneficiaryId)
    if (!beneficiary) {
      throw new Error('Beneficiary not found')
    }

    // Update invitation
    invitation.acceptedAt = new Date().toISOString()

    // Update beneficiary status
    const requiresVerification = system.settings.requireEmailVerification || system.settings.requirePhoneVerification
    const newStatus = requiresVerification ? 'inactive' : 'active'
    
    await this.updateBeneficiary(system, beneficiary.id, {
      invitationStatus: 'accepted',
      status: newStatus
    })

    // Log the action
    await auditLoggingService.logEvent({
      eventType: 'authorization',
      action: 'accept_invitation',
      resource: 'beneficiary_invitation',
      resourceId: invitation.id,
      result: 'success',
      details: {
        beneficiaryId: beneficiary.id,
        beneficiaryEmail: beneficiary.email,
        requiresVerification
      },
      riskLevel: 'medium'
    })

    return { beneficiary, requiresVerification }
  }

  /**
   * Create verification for a beneficiary
   */
  async createVerification(
    system: BeneficiaryManagementSystem,
    beneficiaryId: string,
    method: VerificationMethod
  ): Promise<BeneficiaryVerification> {
    const beneficiary = system.beneficiaries.find(b => b.id === beneficiaryId)
    if (!beneficiary) {
      throw new Error('Beneficiary not found')
    }

    const verification: BeneficiaryVerification = {
      beneficiaryId,
      method,
      token: this.generateVerificationToken(),
      expiresAt: new Date(Date.now() + system.settings.verificationExpiryHours * 60 * 60 * 1000).toISOString(),
      attempts: 0,
      maxAttempts: system.settings.maxVerificationAttempts,
      createdAt: new Date().toISOString()
    }

    // In a real implementation, send verification based on method
    console.log(`Verification sent to ${beneficiary.email} via ${method} with token: ${verification.token}`)

    return verification
  }

  /**
   * Verify a beneficiary
   */
  async verifyBeneficiary(
    system: BeneficiaryManagementSystem,
    beneficiaryId: string,
    token: string
  ): Promise<Beneficiary> {
    const verification = system.verifications.find(v => 
      v.beneficiaryId === beneficiaryId &&
      v.token === token &&
      !v.verifiedAt &&
      new Date(v.expiresAt) > new Date()
    )

    if (!verification) {
      throw new Error('Invalid or expired verification token')
    }

    const beneficiary = system.beneficiaries.find(b => b.id === beneficiaryId)
    if (!beneficiary) {
      throw new Error('Beneficiary not found')
    }

    // Update verification
    verification.verifiedAt = new Date().toISOString()

    // Update beneficiary
    const updatedBeneficiary = await this.updateBeneficiary(system, beneficiaryId, {
      status: 'active',
      verifiedAt: verification.verifiedAt
    })

    // Log the action
    await auditLoggingService.logEvent({
      eventType: 'authorization',
      action: 'verify_beneficiary',
      resource: 'beneficiary_verification',
      resourceId: verification.beneficiaryId,
      result: 'success',
      details: {
        beneficiaryId,
        beneficiaryEmail: beneficiary.email,
        verificationMethod: verification.method
      },
      riskLevel: 'medium'
    })

    return updatedBeneficiary.beneficiaries.find(b => b.id === beneficiaryId)!
  }

  /**
   * Filter beneficiaries
   */
  filterBeneficiaries(system: BeneficiaryManagementSystem, filter: BeneficiaryFilter): Beneficiary[] {
    let beneficiaries = system.beneficiaries

    if (filter.trustLevel) {
      beneficiaries = beneficiaries.filter(b => b.trustLevel === filter.trustLevel)
    }

    if (filter.accessLevel) {
      beneficiaries = beneficiaries.filter(b => b.accessLevel === filter.accessLevel)
    }

    if (filter.status) {
      beneficiaries = beneficiaries.filter(b => b.status === filter.status)
    }

    if (filter.relationship) {
      beneficiaries = beneficiaries.filter(b => b.relationship === filter.relationship)
    }

    if (filter.invitationStatus) {
      beneficiaries = beneficiaries.filter(b => b.invitationStatus === filter.invitationStatus)
    }

    if (filter.hasRecentAccess !== undefined) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      beneficiaries = beneficiaries.filter(b => {
        const hasRecent = b.lastAccessAt && new Date(b.lastAccessAt) > thirtyDaysAgo
        return filter.hasRecentAccess ? hasRecent : !hasRecent
      })
    }

    if (filter.search) {
      const searchTerm = filter.search.toLowerCase()
      beneficiaries = beneficiaries.filter(b =>
        b.name.toLowerCase().includes(searchTerm) ||
        b.email.toLowerCase().includes(searchTerm) ||
        b.relationship.toLowerCase().includes(searchTerm)
      )
    }

    return beneficiaries
  }

  /**
   * Check if beneficiary has permission for a specific action
   */
  hasPermission(beneficiary: Beneficiary, permission: keyof BeneficiaryPermissions): boolean {
    return beneficiary.permissions[permission] === true
  }

  /**
   * Check access restrictions for a beneficiary
   */
  checkAccessRestrictions(beneficiary: Beneficiary, context: {
    ipAddress?: string;
    country?: string;
    timestamp?: Date;
  }): { allowed: boolean; reason?: string } {
    if (!beneficiary.accessRestrictions) {
      return { allowed: true }
    }

    const { geographic, temporal } = beneficiary.accessRestrictions
    const now = context.timestamp || new Date()

    // Check geographic restrictions
    if (geographic && context.country) {
      if (geographic.allowedCountries && !geographic.allowedCountries.includes(context.country)) {
        return { allowed: false, reason: 'Geographic restriction: country not allowed' }
      }
      
      if (geographic.blockedCountries && geographic.blockedCountries.includes(context.country)) {
        return { allowed: false, reason: 'Geographic restriction: country blocked' }
      }
    }

    // Check temporal restrictions
    if (temporal) {
      if (temporal.validFrom && now < new Date(temporal.validFrom)) {
        return { allowed: false, reason: 'Access not yet valid' }
      }
      
      if (temporal.validUntil && now > new Date(temporal.validUntil)) {
        return { allowed: false, reason: 'Access expired' }
      }

      if (temporal.allowedHours) {
        const currentHour = now.getHours()
        const startHour = parseInt(temporal.allowedHours.start.split(':')[0])
        const endHour = parseInt(temporal.allowedHours.end.split(':')[0])
        
        if (currentHour < startHour || currentHour > endHour) {
          return { allowed: false, reason: 'Outside allowed time window' }
        }
      }

      if (temporal.allowedDays) {
        const currentDay = now.getDay()
        if (!temporal.allowedDays.includes(currentDay)) {
          return { allowed: false, reason: 'Not an allowed day' }
        }
      }
    }

    return { allowed: true }
  }

  // Private helper methods

  private createDefaultGroups(): BeneficiaryGroup[] {
    const defaultPermissions = this.getDefaultPermissions('personal')
    
    return [
      {
        id: 'family',
        name: 'Family',
        description: 'Immediate family members',
        beneficiaryIds: [],
        permissions: {
          ...defaultPermissions,
          canAccessNotes: true,
          canAccessContacts: true,
          canDownloadFiles: true
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isSystem: true
      },
      {
        id: 'legal',
        name: 'Legal Team',
        description: 'Lawyers, executors, trustees',
        beneficiaryIds: [],
        permissions: {
          ...this.getDefaultPermissions('full'),
          canManageBeneficiaries: false,
          canModifySystemSettings: false
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isSystem: true
      },
      {
        id: 'emergency',
        name: 'Emergency Contacts',
        description: 'Emergency contacts and caregivers',
        beneficiaryIds: [],
        permissions: {
          ...this.getDefaultPermissions('emergency'),
          canContactEmergencyServices: true,
          canTriggerEmergencyAccess: true
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isSystem: true
      }
    ]
  }

  private getDefaultPermissions(accessLevel: BeneficiaryAccessLevel): BeneficiaryPermissions {
    const basePermissions: BeneficiaryPermissions = {
      canAccessNotes: false,
      canAccessPasswords: false,
      canAccessDocuments: false,
      canAccessContacts: false,
      canAccessFinancialInfo: false,
      canAccessMedicalInfo: false,
      canAccessLegalInfo: false,
      canDownloadFiles: false,
      canViewAuditLogs: false,
      canInviteOthers: false,
      canModifyOwnAccess: false,
      canTriggerEmergencyAccess: false,
      canRevokeOtherAccess: false,
      canContactEmergencyServices: false,
      canManageBeneficiaries: false,
      canModifySystemSettings: false,
      canExportAllData: false
    }

    switch (accessLevel) {
      case 'full':
        return {
          ...basePermissions,
          canAccessNotes: true,
          canAccessPasswords: true,
          canAccessDocuments: true,
          canAccessContacts: true,
          canAccessFinancialInfo: true,
          canAccessMedicalInfo: true,
          canAccessLegalInfo: true,
          canDownloadFiles: true,
          canViewAuditLogs: true,
          canExportAllData: true
        }
      
      case 'financial':
        return {
          ...basePermissions,
          canAccessNotes: true,
          canAccessPasswords: true,
          canAccessDocuments: true,
          canAccessFinancialInfo: true,
          canDownloadFiles: true,
          documentCategories: ['financial', 'tax', 'business']
        }
      
      case 'medical':
        return {
          ...basePermissions,
          canAccessNotes: true,
          canAccessDocuments: true,
          canAccessMedicalInfo: true,
          canAccessContacts: true,
          canDownloadFiles: true,
          documentCategories: ['medical']
        }
      
      case 'personal':
        return {
          ...basePermissions,
          canAccessNotes: true,
          canAccessContacts: true,
          canDownloadFiles: true,
          documentCategories: ['personal']
        }
      
      case 'emergency':
        return {
          ...basePermissions,
          canAccessNotes: true,
          canAccessContacts: true,
          canAccessMedicalInfo: true,
          canTriggerEmergencyAccess: true,
          canContactEmergencyServices: true,
          documentCategories: ['medical', 'emergency']
        }
      
      default:
        return basePermissions
    }
  }

  private mergePermissions(base: BeneficiaryPermissions, custom: Partial<BeneficiaryPermissions>): BeneficiaryPermissions {
    return { ...base, ...custom }
  }

  private getNextPriority(system: BeneficiaryManagementSystem): number {
    if (system.beneficiaries.length === 0) return 1
    return Math.max(...system.beneficiaries.map(b => b.priority)) + 1
  }

  private generateInvitationToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  private generateVerificationToken(): string {
    return crypto.randomBytes(6).toString('hex').toUpperCase()
  }

  private getChanges(original: Beneficiary, updates: Partial<Beneficiary>): Record<string, any> {
    const changes: Record<string, any> = {}
    
    Object.keys(updates).forEach(key => {
      const originalValue = (original as any)[key]
      const newValue = (updates as any)[key]
      
      if (JSON.stringify(originalValue) !== JSON.stringify(newValue)) {
        changes[key] = { from: originalValue, to: newValue }
      }
    })
    
    return changes
  }

  private updateStatistics(system: BeneficiaryManagementSystem): BeneficiaryManagementSystem {
    const stats = {
      totalBeneficiaries: system.beneficiaries.length,
      activeBeneficiaries: system.beneficiaries.filter(b => b.status === 'active').length,
      pendingInvitations: system.invitations.filter(i => !i.acceptedAt && !i.declinedAt && new Date(i.expiresAt) > new Date()).length,
      verifiedBeneficiaries: system.beneficiaries.filter(b => b.verifiedAt).length,
      beneficiariesByTrustLevel: {
        family: 0,
        legal: 0,
        business: 0,
        emergency: 0,
        limited: 0
      } as Record<BeneficiaryTrustLevel, number>,
      beneficiariesByAccessLevel: {
        full: 0,
        financial: 0,
        medical: 0,
        personal: 0,
        emergency: 0,
        custom: 0
      } as Record<BeneficiaryAccessLevel, number>,
      recentAccess: 0,
      lastAnalysis: new Date().toISOString()
    }

    // Count by trust level
    system.beneficiaries.forEach(b => {
      stats.beneficiariesByTrustLevel[b.trustLevel]++
      stats.beneficiariesByAccessLevel[b.accessLevel]++
    })

    // Count recent access (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    stats.recentAccess = system.beneficiaries.filter(b => 
      b.lastAccessAt && new Date(b.lastAccessAt) > thirtyDaysAgo
    ).length

    return {
      ...system,
      statistics: stats
    }
  }

  private async ensureDataDirectory(): Promise<void> {
    if (typeof window !== 'undefined') {
      // Running in browser, skip file operations
      return
    }
    
    try {
      const { access, mkdir } = await import('fs/promises')
      await access(this.dataDirectory)
    } catch {
      const { mkdir } = await import('fs/promises')
      await mkdir(this.dataDirectory, { recursive: true })
    }
  }
}

// Export singleton instance
export const beneficiaryManagementService = BeneficiaryManagementService.getInstance()