'use client'

import { createHash, pbkdf2Sync, randomBytes } from 'crypto'

export interface BiometricCapabilities {
  touchId: boolean
  faceId: boolean
  fingerprint: boolean
  iris: boolean
  webAuthnBiometric: boolean
}

export interface BiometricEnrollment {
  id: string
  userId: string
  type: BiometricType
  enrolledAt: Date
  lastUsed?: Date
  templateHash: string // Hash of biometric template
  publicKey?: string
  status: 'active' | 'suspended' | 'revoked'
}

export interface BiometricAuthResult {
  success: boolean
  type: BiometricType
  confidence: number
  timestamp: Date
}

export enum BiometricType {
  TOUCH_ID = 'touch_id',
  FACE_ID = 'face_id', 
  FINGERPRINT = 'fingerprint',
  IRIS = 'iris',
  WEBAUTHN_BIOMETRIC = 'webauthn_biometric'
}

export interface BiometricKeyDerivation {
  key: Buffer
  salt: string
  iterations: number
  biometricHash: string
}

class BiometricService {
  private enrollments: Map<string, BiometricEnrollment> = new Map()

  /**
   * Check available biometric capabilities
   */
  async checkCapabilities(): Promise<BiometricCapabilities> {
    const capabilities: BiometricCapabilities = {
      touchId: false,
      faceId: false,
      fingerprint: false,
      iris: false,
      webAuthnBiometric: false
    }

    // Check WebAuthn biometric support
    if (typeof window !== 'undefined' && 'PublicKeyCredential' in window) {
      try {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        capabilities.webAuthnBiometric = available
        
        // Platform-specific detection
        const userAgent = navigator.userAgent.toLowerCase()
        if (available) {
          if (userAgent.includes('mac')) {
            capabilities.touchId = true
          } else if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
            // Could be either Touch ID or Face ID
            capabilities.touchId = true
            capabilities.faceId = true
          } else if (userAgent.includes('android')) {
            capabilities.fingerprint = true
          }
        }
      } catch (error) {
        console.error('Error checking biometric capabilities:', error)
      }
    }

    return capabilities
  }

  /**
   * Enroll biometric for key derivation
   */
  async enrollBiometric(
    userId: string,
    type: BiometricType
  ): Promise<BiometricEnrollment> {
    const capabilities = await this.checkCapabilities()
    
    // Check if biometric type is available
    if (!this.isBiometricAvailable(type, capabilities)) {
      throw new Error(`Biometric type ${type} is not available`)
    }

    try {
      // For WebAuthn-based biometrics
      if (type === BiometricType.WEBAUTHN_BIOMETRIC ||
          type === BiometricType.TOUCH_ID ||
          type === BiometricType.FACE_ID) {
        return await this.enrollWebAuthnBiometric(userId, type)
      }

      // For other biometric types (would require native APIs)
      throw new Error(`Biometric type ${type} not yet implemented`)
    } catch (error) {
      console.error('Biometric enrollment failed:', error)
      throw new Error('Failed to enroll biometric')
    }
  }

  /**
   * Derive encryption key from biometric
   */
  async deriveKeyFromBiometric(
    enrollmentId: string,
    additionalEntropy?: string
  ): Promise<BiometricKeyDerivation> {
    const enrollment = this.enrollments.get(enrollmentId)
    if (!enrollment || enrollment.status !== 'active') {
      throw new Error('Biometric enrollment not found or inactive')
    }

    // Authenticate with biometric
    const authResult = await this.authenticateBiometric(enrollment)
    if (!authResult.success) {
      throw new Error('Biometric authentication failed')
    }

    // Generate key derivation parameters
    const salt = randomBytes(32).toString('hex')
    const iterations = 100000

    // Combine biometric template hash with additional entropy
    const baseKey = enrollment.templateHash + (additionalEntropy || '')
    
    // Derive key using PBKDF2
    const derivedKey = pbkdf2Sync(
      baseKey,
      salt,
      iterations,
      32, // 256 bits
      'sha256'
    )

    // Update last used
    enrollment.lastUsed = new Date()

    return {
      key: derivedKey,
      salt,
      iterations,
      biometricHash: enrollment.templateHash
    }
  }

  /**
   * Authenticate with enrolled biometric
   */
  private async authenticateBiometric(
    enrollment: BiometricEnrollment
  ): Promise<BiometricAuthResult> {
    if (enrollment.type === BiometricType.WEBAUTHN_BIOMETRIC ||
        enrollment.type === BiometricType.TOUCH_ID ||
        enrollment.type === BiometricType.FACE_ID) {
      return await this.authenticateWebAuthnBiometric(enrollment)
    }

    throw new Error(`Biometric type ${enrollment.type} not yet implemented`)
  }

  /**
   * Enroll WebAuthn biometric
   */
  private async enrollWebAuthnBiometric(
    userId: string,
    type: BiometricType
  ): Promise<BiometricEnrollment> {
    // Generate challenge
    const challenge = randomBytes(32)

    // WebAuthn creation options with platform authenticator
    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: "If I'm Gone",
        id: window.location.hostname
      },
      user: {
        id: Buffer.from(userId),
        name: userId,
        displayName: 'Biometric Key'
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },  // ES256
        { alg: -257, type: 'public-key' } // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Platform authenticator for biometrics
        userVerification: 'required', // Require biometric
        requireResidentKey: true
      },
      timeout: 60000,
      attestation: 'direct'
    }

    // Create credential
    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions
    }) as PublicKeyCredential

    if (!credential) {
      throw new Error('Failed to create biometric credential')
    }

    // Create template hash from credential ID and response
    const response = credential.response as AuthenticatorAttestationResponse
    const templateData = new Uint8Array(response.clientDataJSON)
    const templateHash = createHash('sha256')
      .update(Buffer.from(templateData))
      .digest('hex')

    // Create enrollment
    const enrollment: BiometricEnrollment = {
      id: credential.id,
      userId,
      type,
      enrolledAt: new Date(),
      templateHash,
      publicKey: this.extractPublicKey(response.publicKey),
      status: 'active'
    }

    // Store enrollment
    this.enrollments.set(enrollment.id, enrollment)

    return enrollment
  }

  /**
   * Authenticate with WebAuthn biometric
   */
  private async authenticateWebAuthnBiometric(
    enrollment: BiometricEnrollment
  ): Promise<BiometricAuthResult> {
    // Generate challenge
    const challenge = randomBytes(32)

    // WebAuthn request options
    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      allowCredentials: [{
        id: Buffer.from(enrollment.id, 'base64'),
        type: 'public-key'
      }],
      timeout: 60000,
      userVerification: 'required' // Require biometric
    }

    try {
      // Get assertion
      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      }) as PublicKeyCredential

      if (!assertion || assertion.id !== enrollment.id) {
        throw new Error('Invalid credential')
      }

      return {
        success: true,
        type: enrollment.type,
        confidence: 0.99, // WebAuthn provides high confidence
        timestamp: new Date()
      }
    } catch (error) {
      return {
        success: false,
        type: enrollment.type,
        confidence: 0,
        timestamp: new Date()
      }
    }
  }

  /**
   * List user's biometric enrollments
   */
  listUserEnrollments(userId: string): BiometricEnrollment[] {
    return Array.from(this.enrollments.values())
      .filter(enrollment => enrollment.userId === userId)
      .sort((a, b) => b.enrolledAt.getTime() - a.enrolledAt.getTime())
  }

  /**
   * Revoke biometric enrollment
   */
  revokeBiometric(enrollmentId: string): void {
    const enrollment = this.enrollments.get(enrollmentId)
    if (enrollment) {
      enrollment.status = 'revoked'
    }
  }

  /**
   * Generate recovery key from biometric
   */
  async generateRecoveryKey(
    enrollmentId: string
  ): Promise<{ recoveryKey: string; verificationCode: string }> {
    const keyDerivation = await this.deriveKeyFromBiometric(enrollmentId)
    
    // Generate recovery key
    const recoveryKey = randomBytes(32).toString('hex')
    
    // Create verification code by hashing recovery key with biometric hash
    const verificationCode = createHash('sha256')
      .update(recoveryKey + keyDerivation.biometricHash)
      .digest('hex')
      .substring(0, 8)
      .toUpperCase()

    return {
      recoveryKey,
      verificationCode
    }
  }

  /**
   * Private helper methods
   */
  private isBiometricAvailable(
    type: BiometricType,
    capabilities: BiometricCapabilities
  ): boolean {
    switch (type) {
      case BiometricType.TOUCH_ID:
        return capabilities.touchId
      case BiometricType.FACE_ID:
        return capabilities.faceId
      case BiometricType.FINGERPRINT:
        return capabilities.fingerprint
      case BiometricType.IRIS:
        return capabilities.iris
      case BiometricType.WEBAUTHN_BIOMETRIC:
        return capabilities.webAuthnBiometric
      default:
        return false
    }
  }

  private extractPublicKey(publicKeyBuffer: ArrayBuffer | null): string {
    if (!publicKeyBuffer) {
      return ''
    }
    // Extract public key from attestation object
    // This would parse the COSE key format
    // For now, return base64 encoded buffer
    return Buffer.from(publicKeyBuffer).toString('base64')
  }

  /**
   * Export biometric template (for backup)
   */
  exportBiometricTemplate(enrollmentId: string): string {
    const enrollment = this.enrollments.get(enrollmentId)
    if (!enrollment) {
      throw new Error('Enrollment not found')
    }

    // Only export non-sensitive data
    const exportData = {
      type: enrollment.type,
      enrolledAt: enrollment.enrolledAt,
      templateHash: enrollment.templateHash
    }

    return JSON.stringify(exportData)
  }
}

// Singleton instance
export const biometricService = new BiometricService()