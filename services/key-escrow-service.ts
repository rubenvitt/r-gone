'use client'

import { randomBytes, createHash } from 'crypto'
import { keyManagementService, KeyEscrowConfig, EscrowTrustee, EscrowCondition } from './key-management-service'

export interface EscrowRequest {
  id: string
  requesterId: string
  requesterEmail: string
  reason: string
  keyIds: string[]
  status: EscrowRequestStatus
  createdAt: Date
  approvals: EscrowApproval[]
  conditions: EscrowCondition[]
  timeDelayHours?: number
  expiresAt?: Date
}

export interface EscrowApproval {
  trusteeId: string
  approved: boolean
  approvedAt?: Date
  rejectedAt?: Date
  reason?: string
  shareProvided?: boolean
}

export enum EscrowRequestStatus {
  PENDING = 'pending',
  AWAITING_APPROVALS = 'awaiting_approvals',
  TIME_DELAY = 'time_delay',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  COMPLETED = 'completed'
}

export interface SecretShare {
  index: number
  share: string
  checksum: string
}

export interface ShamirSecretSharing {
  split(secret: string, totalShares: number, threshold: number): SecretShare[]
  combine(shares: SecretShare[], threshold: number): string
  validateShare(share: SecretShare): boolean
}

class KeyEscrowService {
  private escrowRequests: Map<string, EscrowRequest> = new Map()
  private trusteeShares: Map<string, Map<string, SecretShare>> = new Map() // trusteeId -> keyId -> share
  private shamir: ShamirSecretSharing

  constructor() {
    this.shamir = new SimpleShamirImplementation()
  }

  /**
   * Setup key escrow with trustees
   */
  async setupEscrow(config: KeyEscrowConfig, masterKeyId: string): Promise<void> {
    if (!config.enabled) {
      throw new Error('Key escrow is not enabled')
    }

    if (config.trustees.length < config.threshold) {
      throw new Error('Number of trustees must be >= threshold')
    }

    // Get the master key (encrypted)
    const masterKey = await this.getMasterKey(masterKeyId)
    
    // Split the key into shares
    const shares = this.shamir.split(
      masterKey,
      config.trustees.length,
      config.threshold
    )

    // Distribute shares to trustees
    config.trustees.forEach((trustee, index) => {
      this.assignShareToTrustee(trustee.id, masterKeyId, shares[index])
      
      // In a real implementation, encrypt the share with trustee's public key
      // and send it securely
      this.notifyTrustee(trustee, shares[index])
    })

    // Save escrow configuration
    await keyManagementService.setupKeyEscrow(config)
  }

  /**
   * Request key recovery through escrow
   */
  async requestKeyRecovery(
    requesterId: string,
    requesterEmail: string,
    keyIds: string[],
    reason: string,
    timeDelayHours: number = 24
  ): Promise<EscrowRequest> {
    const request: EscrowRequest = {
      id: randomBytes(16).toString('hex'),
      requesterId,
      requesterEmail,
      reason,
      keyIds,
      status: EscrowRequestStatus.PENDING,
      createdAt: new Date(),
      approvals: [],
      conditions: [],
      timeDelayHours,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    }

    // Add default conditions
    request.conditions.push({
      type: 'time_based',
      description: `Wait ${timeDelayHours} hours before key recovery`,
      met: false
    })

    request.conditions.push({
      type: 'approval_based',
      description: 'Receive required number of trustee approvals',
      met: false
    })

    this.escrowRequests.set(request.id, request)
    
    // Notify trustees
    await this.notifyTrusteesOfRequest(request)
    
    // Update status
    request.status = EscrowRequestStatus.AWAITING_APPROVALS

    return request
  }

  /**
   * Trustee approves or rejects recovery request
   */
  async processTrusteeDecision(
    requestId: string,
    trusteeId: string,
    approved: boolean,
    reason?: string
  ): Promise<void> {
    const request = this.escrowRequests.get(requestId)
    if (!request) {
      throw new Error('Request not found')
    }

    if (request.status !== EscrowRequestStatus.AWAITING_APPROVALS) {
      throw new Error('Request is not awaiting approvals')
    }

    // Find or create approval record
    let approval = request.approvals.find(a => a.trusteeId === trusteeId)
    if (!approval) {
      approval = {
        trusteeId,
        approved: false,
        shareProvided: false
      }
      request.approvals.push(approval)
    }

    // Update approval
    approval.approved = approved
    approval.reason = reason
    if (approved) {
      approval.approvedAt = new Date()
    } else {
      approval.rejectedAt = new Date()
    }

    // Check if we have enough approvals
    await this.checkApprovalThreshold(request)
  }

  /**
   * Provide key share for approved request
   */
  async provideTrusteeShare(
    requestId: string,
    trusteeId: string,
    keyId: string,
    encryptedShare: string
  ): Promise<void> {
    const request = this.escrowRequests.get(requestId)
    if (!request) {
      throw new Error('Request not found')
    }

    const approval = request.approvals.find(a => a.trusteeId === trusteeId)
    if (!approval || !approval.approved) {
      throw new Error('Trustee has not approved this request')
    }

    // Decrypt and validate share
    const share = await this.decryptTrusteeShare(encryptedShare, trusteeId)
    if (!this.shamir.validateShare(share)) {
      throw new Error('Invalid share provided')
    }

    // Store share for reconstruction
    this.storeTrusteeShare(requestId, trusteeId, keyId, share)
    approval.shareProvided = true

    // Check if we can reconstruct the key
    await this.attemptKeyReconstruction(request, keyId)
  }

  /**
   * Check if time delay has passed
   */
  async checkTimeDelay(requestId: string): Promise<boolean> {
    const request = this.escrowRequests.get(requestId)
    if (!request) {
      throw new Error('Request not found')
    }

    const timeDelayCondition = request.conditions.find(c => c.type === 'time_based')
    if (!timeDelayCondition) {
      return true
    }

    const elapsed = Date.now() - request.createdAt.getTime()
    const delayMs = (request.timeDelayHours || 24) * 60 * 60 * 1000

    if (elapsed >= delayMs) {
      timeDelayCondition.met = true
      return true
    }

    return false
  }

  /**
   * Get recovery request status
   */
  getRequestStatus(requestId: string): EscrowRequest | null {
    return this.escrowRequests.get(requestId) || null
  }

  /**
   * List all recovery requests
   */
  listRequests(filters?: {
    status?: EscrowRequestStatus
    requesterId?: string
    trusteeId?: string
  }): EscrowRequest[] {
    let requests = Array.from(this.escrowRequests.values())

    if (filters) {
      if (filters.status) {
        requests = requests.filter(r => r.status === filters.status)
      }
      if (filters.requesterId) {
        requests = requests.filter(r => r.requesterId === filters.requesterId)
      }
      if (filters.trusteeId) {
        requests = requests.filter(r => 
          r.approvals.some(a => a.trusteeId === filters.trusteeId)
        )
      }
    }

    return requests
  }

  /**
   * Private helper methods
   */
  private async getMasterKey(keyId: string): Promise<string> {
    // In real implementation, this would fetch from secure storage
    return 'encrypted-master-key-placeholder'
  }

  private assignShareToTrustee(
    trusteeId: string, 
    keyId: string, 
    share: SecretShare
  ): void {
    if (!this.trusteeShares.has(trusteeId)) {
      this.trusteeShares.set(trusteeId, new Map())
    }
    this.trusteeShares.get(trusteeId)!.set(keyId, share)
  }

  private async notifyTrustee(trustee: EscrowTrustee, share: SecretShare): Promise<void> {
    // Send secure notification to trustee
    console.log(`Notifying trustee ${trustee.email} of their key share assignment`)
  }

  private async notifyTrusteesOfRequest(request: EscrowRequest): Promise<void> {
    // Notify all trustees of the recovery request
    console.log(`Notifying trustees of recovery request ${request.id}`)
  }

  private async checkApprovalThreshold(request: EscrowRequest): Promise<void> {
    const config = await this.getEscrowConfig()
    const approvedCount = request.approvals.filter(a => a.approved).length
    
    if (approvedCount >= config.threshold) {
      const approvalCondition = request.conditions.find(c => c.type === 'approval_based')
      if (approvalCondition) {
        approvalCondition.met = true
      }

      // Check if all conditions are met
      if (request.conditions.every(c => c.met)) {
        request.status = EscrowRequestStatus.APPROVED
      } else {
        request.status = EscrowRequestStatus.TIME_DELAY
      }
    }
  }

  private async decryptTrusteeShare(
    encryptedShare: string, 
    trusteeId: string
  ): Promise<SecretShare> {
    // Decrypt share using trustee's key
    // Placeholder implementation
    return {
      index: 0,
      share: encryptedShare,
      checksum: createHash('sha256').update(encryptedShare).digest('hex')
    }
  }

  private storeTrusteeShare(
    requestId: string,
    trusteeId: string,
    keyId: string,
    share: SecretShare
  ): void {
    // Store share for later reconstruction
    const key = `${requestId}-${keyId}`
    if (!this.trusteeShares.has(key)) {
      this.trusteeShares.set(key, new Map())
    }
    this.trusteeShares.get(key)!.set(trusteeId, share)
  }

  private async attemptKeyReconstruction(
    request: EscrowRequest,
    keyId: string
  ): Promise<void> {
    const config = await this.getEscrowConfig()
    const key = `${request.id}-${keyId}`
    const shares = this.trusteeShares.get(key)
    
    if (!shares || shares.size < config.threshold) {
      return // Not enough shares yet
    }

    // Check if time delay has passed
    const timeDelayMet = await this.checkTimeDelay(request.id)
    if (!timeDelayMet) {
      return // Still waiting for time delay
    }

    // Reconstruct the key
    const shareArray = Array.from(shares.values())
    const reconstructedKey = this.shamir.combine(shareArray, config.threshold)
    
    // Store recovered key securely for requester
    await this.storeRecoveredKey(request.id, keyId, reconstructedKey)
    
    // Update request status
    request.status = EscrowRequestStatus.COMPLETED
  }

  private async getEscrowConfig(): Promise<KeyEscrowConfig> {
    // Get current escrow configuration
    return {
      enabled: true,
      trustees: [],
      threshold: 3,
      timeDelay: 24
    }
  }

  private async storeRecoveredKey(
    requestId: string,
    keyId: string,
    key: string
  ): Promise<void> {
    // Store recovered key for requester access
    console.log(`Key ${keyId} recovered for request ${requestId}`)
  }
}

/**
 * Simple Shamir's Secret Sharing implementation
 * In production, use a well-tested library
 */
class SimpleShamirImplementation implements ShamirSecretSharing {
  split(secret: string, totalShares: number, threshold: number): SecretShare[] {
    // This is a placeholder - real implementation would use polynomial interpolation
    const shares: SecretShare[] = []
    
    for (let i = 0; i < totalShares; i++) {
      const share = {
        index: i + 1,
        share: `${secret}-share-${i + 1}`,
        checksum: createHash('sha256').update(`${secret}-share-${i + 1}`).digest('hex')
      }
      shares.push(share)
    }
    
    return shares
  }

  combine(shares: SecretShare[], threshold: number): string {
    // Placeholder - real implementation would use Lagrange interpolation
    if (shares.length < threshold) {
      throw new Error('Not enough shares to reconstruct secret')
    }
    
    // Extract original secret from share format
    const firstShare = shares[0].share
    const secret = firstShare.split('-share-')[0]
    
    return secret
  }

  validateShare(share: SecretShare): boolean {
    const expectedChecksum = createHash('sha256').update(share.share).digest('hex')
    return share.checksum === expectedChecksum
  }
}

// Singleton instance
export const keyEscrowService = new KeyEscrowService()