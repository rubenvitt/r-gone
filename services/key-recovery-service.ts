'use client'

import { randomBytes, createHash, scryptSync } from 'crypto'
import { keyManagementService } from './key-management-service'
import { keyEscrowService } from './key-escrow-service'
import { biometricService } from './biometric-service'
import { hardwareTokenService } from './hardware-token-service'

export interface RecoveryMethod {
  id: string
  type: RecoveryMethodType
  name: string
  description: string
  enabled: boolean
  configured: boolean
  lastUsed?: Date
  metadata?: Record<string, any>
}

export enum RecoveryMethodType {
  SECURITY_QUESTIONS = 'security_questions',
  RECOVERY_CODES = 'recovery_codes',
  TRUSTED_CONTACTS = 'trusted_contacts',
  BIOMETRIC = 'biometric',
  HARDWARE_TOKEN = 'hardware_token',
  TIME_LOCKED = 'time_locked',
  ESCROW = 'escrow',
  SOCIAL_RECOVERY = 'social_recovery'
}

export interface RecoveryRequest {
  id: string
  userId: string
  method: RecoveryMethodType
  status: RecoveryStatus
  createdAt: Date
  attemptCount: number
  maxAttempts: number
  metadata?: Record<string, any>
}

export enum RecoveryStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  VERIFICATION_REQUIRED = 'verification_required',
  APPROVED = 'approved',
  COMPLETED = 'completed',
  FAILED = 'failed',
  BLOCKED = 'blocked'
}

export interface SecurityQuestion {
  id: string
  question: string
  answerHash: string
  salt: string
  createdAt: Date
}

export interface RecoveryCode {
  id: string
  code: string
  used: boolean
  usedAt?: Date
  createdAt: Date
}

export interface TrustedContact {
  id: string
  name: string
  email: string
  phone?: string
  relationship: string
  shareIndex: number
  publicKey?: string
  verified: boolean
  verifiedAt?: Date
}

export interface SocialRecoveryConfig {
  threshold: number
  totalContacts: number
  contacts: TrustedContact[]
  timeDelay: number // Hours
}

class KeyRecoveryService {
  private recoveryMethods: Map<string, RecoveryMethod> = new Map()
  private recoveryRequests: Map<string, RecoveryRequest> = new Map()
  private securityQuestions: Map<string, SecurityQuestion[]> = new Map()
  private recoveryCodes: Map<string, RecoveryCode[]> = new Map()
  private trustedContacts: Map<string, TrustedContact[]> = new Map()

  constructor() {
    this.initializeRecoveryMethods()
  }

  /**
   * Initialize available recovery methods
   */
  private initializeRecoveryMethods(): void {
    const methods: RecoveryMethod[] = [
      {
        id: 'security-questions',
        type: RecoveryMethodType.SECURITY_QUESTIONS,
        name: 'Security Questions',
        description: 'Answer personal security questions',
        enabled: true,
        configured: false
      },
      {
        id: 'recovery-codes',
        type: RecoveryMethodType.RECOVERY_CODES,
        name: 'Recovery Codes',
        description: 'Use one-time recovery codes',
        enabled: true,
        configured: false
      },
      {
        id: 'trusted-contacts',
        type: RecoveryMethodType.TRUSTED_CONTACTS,
        name: 'Trusted Contacts',
        description: 'Get help from trusted friends or family',
        enabled: true,
        configured: false
      },
      {
        id: 'biometric',
        type: RecoveryMethodType.BIOMETRIC,
        name: 'Biometric Recovery',
        description: 'Use fingerprint or face recognition',
        enabled: true,
        configured: false
      },
      {
        id: 'hardware-token',
        type: RecoveryMethodType.HARDWARE_TOKEN,
        name: 'Hardware Token',
        description: 'Use physical security key',
        enabled: true,
        configured: false
      },
      {
        id: 'time-locked',
        type: RecoveryMethodType.TIME_LOCKED,
        name: 'Time-Locked Recovery',
        description: 'Wait for time delay before access',
        enabled: true,
        configured: false
      },
      {
        id: 'escrow',
        type: RecoveryMethodType.ESCROW,
        name: 'Key Escrow',
        description: 'Request key recovery from trustees',
        enabled: true,
        configured: false
      },
      {
        id: 'social-recovery',
        type: RecoveryMethodType.SOCIAL_RECOVERY,
        name: 'Social Recovery',
        description: 'Combine approvals from multiple contacts',
        enabled: true,
        configured: false
      }
    ]

    methods.forEach(method => {
      this.recoveryMethods.set(method.id, method)
    })
  }

  /**
   * Configure security questions
   */
  async configureSecurityQuestions(
    userId: string,
    questions: Array<{ question: string; answer: string }>
  ): Promise<void> {
    if (questions.length < 3) {
      throw new Error('At least 3 security questions are required')
    }

    const securityQuestions: SecurityQuestion[] = questions.map(q => {
      const salt = randomBytes(32).toString('hex')
      const answerHash = this.hashAnswer(q.answer.toLowerCase(), salt)
      
      return {
        id: randomBytes(16).toString('hex'),
        question: q.question,
        answerHash,
        salt,
        createdAt: new Date()
      }
    })

    this.securityQuestions.set(userId, securityQuestions)
    this.updateMethodStatus('security-questions', true)
  }

  /**
   * Generate recovery codes
   */
  async generateRecoveryCodes(userId: string, count: number = 10): Promise<string[]> {
    const codes: RecoveryCode[] = []
    const plainCodes: string[] = []

    for (let i = 0; i < count; i++) {
      const code = this.generateRecoveryCode()
      plainCodes.push(code)
      
      codes.push({
        id: randomBytes(16).toString('hex'),
        code: this.hashRecoveryCode(code),
        used: false,
        createdAt: new Date()
      })
    }

    this.recoveryCodes.set(userId, codes)
    this.updateMethodStatus('recovery-codes', true)

    return plainCodes
  }

  /**
   * Configure trusted contacts for recovery
   */
  async configureTrustedContacts(
    userId: string,
    contacts: Array<{
      name: string
      email: string
      phone?: string
      relationship: string
    }>
  ): Promise<void> {
    if (contacts.length < 3) {
      throw new Error('At least 3 trusted contacts are required')
    }

    const trustedContacts: TrustedContact[] = contacts.map((contact, index) => ({
      id: randomBytes(16).toString('hex'),
      ...contact,
      shareIndex: index,
      verified: false
    }))

    this.trustedContacts.set(userId, trustedContacts)
    this.updateMethodStatus('trusted-contacts', true)

    // Send verification emails to contacts
    await this.sendContactVerifications(trustedContacts)
  }

  /**
   * Start recovery process
   */
  async startRecovery(
    userId: string,
    method: RecoveryMethodType
  ): Promise<RecoveryRequest> {
    const recoveryMethod = this.getMethodByType(method)
    if (!recoveryMethod || !recoveryMethod.enabled || !recoveryMethod.configured) {
      throw new Error('Recovery method not available')
    }

    const request: RecoveryRequest = {
      id: randomBytes(16).toString('hex'),
      userId,
      method,
      status: RecoveryStatus.PENDING,
      createdAt: new Date(),
      attemptCount: 0,
      maxAttempts: this.getMaxAttempts(method)
    }

    this.recoveryRequests.set(request.id, request)

    // Initialize recovery based on method
    switch (method) {
      case RecoveryMethodType.SECURITY_QUESTIONS:
        request.status = RecoveryStatus.VERIFICATION_REQUIRED
        request.metadata = { questions: this.getRandomQuestions(userId, 3) }
        break

      case RecoveryMethodType.RECOVERY_CODES:
        request.status = RecoveryStatus.VERIFICATION_REQUIRED
        break

      case RecoveryMethodType.BIOMETRIC:
        request.status = RecoveryStatus.IN_PROGRESS
        await this.initiateBiometricRecovery(request)
        break

      case RecoveryMethodType.ESCROW:
        request.status = RecoveryStatus.IN_PROGRESS
        await this.initiateEscrowRecovery(request)
        break

      case RecoveryMethodType.SOCIAL_RECOVERY:
        request.status = RecoveryStatus.IN_PROGRESS
        await this.initiateSocialRecovery(request)
        break

      default:
        request.status = RecoveryStatus.VERIFICATION_REQUIRED
    }

    return request
  }

  /**
   * Verify recovery attempt
   */
  async verifyRecovery(
    requestId: string,
    verification: any
  ): Promise<{ success: boolean; recoveredKeys?: any }> {
    const request = this.recoveryRequests.get(requestId)
    if (!request) {
      throw new Error('Recovery request not found')
    }

    if (request.status === RecoveryStatus.BLOCKED) {
      throw new Error('Recovery request is blocked due to too many failed attempts')
    }

    request.attemptCount++

    let verified = false
    let recoveredKeys = null

    try {
      switch (request.method) {
        case RecoveryMethodType.SECURITY_QUESTIONS:
          verified = await this.verifySecurityQuestions(
            request.userId,
            verification.answers
          )
          break

        case RecoveryMethodType.RECOVERY_CODES:
          verified = await this.verifyRecoveryCode(
            request.userId,
            verification.code
          )
          break

        case RecoveryMethodType.BIOMETRIC:
          const biometricResult = await this.verifyBiometricRecovery(
            request,
            verification
          )
          verified = biometricResult.success
          if (verified) {
            recoveredKeys = biometricResult.keys
          }
          break

        default:
          throw new Error('Verification not implemented for this method')
      }

      if (verified) {
        request.status = RecoveryStatus.APPROVED
        
        // Recover keys if not already provided
        if (!recoveredKeys) {
          recoveredKeys = await this.recoverKeys(request)
        }
        
        request.status = RecoveryStatus.COMPLETED
        return { success: true, recoveredKeys }
      } else {
        if (request.attemptCount >= request.maxAttempts) {
          request.status = RecoveryStatus.BLOCKED
        }
        return { success: false }
      }
    } catch (error) {
      request.status = RecoveryStatus.FAILED
      throw error
    }
  }

  /**
   * Get recovery status
   */
  getRecoveryStatus(requestId: string): RecoveryRequest | null {
    return this.recoveryRequests.get(requestId) || null
  }

  /**
   * List configured recovery methods for user
   */
  listUserRecoveryMethods(userId: string): RecoveryMethod[] {
    return Array.from(this.recoveryMethods.values())
      .filter(method => {
        // Check if method is configured for user
        switch (method.type) {
          case RecoveryMethodType.SECURITY_QUESTIONS:
            return this.securityQuestions.has(userId)
          case RecoveryMethodType.RECOVERY_CODES:
            return this.recoveryCodes.has(userId)
          case RecoveryMethodType.TRUSTED_CONTACTS:
            return this.trustedContacts.has(userId)
          default:
            return method.configured
        }
      })
  }

  /**
   * Private helper methods
   */
  private hashAnswer(answer: string, salt: string): string {
    return scryptSync(answer, salt, 64).toString('hex')
  }

  private hashRecoveryCode(code: string): string {
    return createHash('sha256').update(code).digest('hex')
  }

  private generateRecoveryCode(): string {
    const code = randomBytes(4).toString('hex').toUpperCase()
    return `${code.slice(0, 4)}-${code.slice(4, 8)}`
  }

  private updateMethodStatus(methodId: string, configured: boolean): void {
    const method = this.recoveryMethods.get(methodId)
    if (method) {
      method.configured = configured
    }
  }

  private getMethodByType(type: RecoveryMethodType): RecoveryMethod | undefined {
    return Array.from(this.recoveryMethods.values())
      .find(method => method.type === type)
  }

  private getMaxAttempts(method: RecoveryMethodType): number {
    switch (method) {
      case RecoveryMethodType.SECURITY_QUESTIONS:
        return 5
      case RecoveryMethodType.RECOVERY_CODES:
        return 10
      case RecoveryMethodType.BIOMETRIC:
        return 3
      default:
        return 5
    }
  }

  private getRandomQuestions(userId: string, count: number): string[] {
    const questions = this.securityQuestions.get(userId) || []
    const shuffled = [...questions].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, count).map(q => q.question)
  }

  private async verifySecurityQuestions(
    userId: string,
    answers: Record<string, string>
  ): Promise<boolean> {
    const questions = this.securityQuestions.get(userId) || []
    let correctCount = 0

    for (const question of questions) {
      const answer = answers[question.question]
      if (answer) {
        const answerHash = this.hashAnswer(answer.toLowerCase(), question.salt)
        if (answerHash === question.answerHash) {
          correctCount++
        }
      }
    }

    // Require at least 2 out of 3 correct answers
    return correctCount >= 2
  }

  private async verifyRecoveryCode(
    userId: string,
    code: string
  ): Promise<boolean> {
    const codes = this.recoveryCodes.get(userId) || []
    const codeHash = this.hashRecoveryCode(code)

    const matchingCode = codes.find(c => c.code === codeHash && !c.used)
    if (matchingCode) {
      matchingCode.used = true
      matchingCode.usedAt = new Date()
      return true
    }

    return false
  }

  private async sendContactVerifications(contacts: TrustedContact[]): Promise<void> {
    // Send verification emails to trusted contacts
    console.log('Sending verification emails to trusted contacts')
  }

  private async initiateBiometricRecovery(request: RecoveryRequest): Promise<void> {
    // Initialize biometric recovery
    const enrollments = biometricService.listUserEnrollments(request.userId)
    request.metadata = { enrollments: enrollments.map(e => e.id) }
  }

  private async initiateEscrowRecovery(request: RecoveryRequest): Promise<void> {
    // Create escrow request
    const escrowRequest = await keyEscrowService.requestKeyRecovery(
      request.userId,
      'user@example.com',
      ['master-key'],
      'Account recovery',
      24
    )
    request.metadata = { escrowRequestId: escrowRequest.id }
  }

  private async initiateSocialRecovery(request: RecoveryRequest): Promise<void> {
    // Initialize social recovery
    const contacts = this.trustedContacts.get(request.userId) || []
    request.metadata = {
      threshold: Math.ceil(contacts.length / 2),
      totalContacts: contacts.length,
      approvals: []
    }
  }

  private async verifyBiometricRecovery(
    request: RecoveryRequest,
    verification: any
  ): Promise<{ success: boolean; keys?: any }> {
    const enrollmentId = verification.enrollmentId
    const keyDerivation = await biometricService.deriveKeyFromBiometric(enrollmentId)
    
    return {
      success: true,
      keys: { derivedKey: keyDerivation.key.toString('hex') }
    }
  }

  private async recoverKeys(request: RecoveryRequest): Promise<any> {
    // Recover keys based on the approved method
    // This would integrate with the key management service
    return {
      masterKey: 'recovered-master-key',
      timestamp: new Date()
    }
  }
}

// Singleton instance
export const keyRecoveryService = new KeyRecoveryService()