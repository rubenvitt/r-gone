'use client'

import { randomBytes, createHash, createCipheriv, createDecipheriv } from 'crypto'

export interface HardwareTokenInfo {
  type: 'yubikey' | 'titan' | 'solokey' | 'nitrokey'
  serialNumber: string
  firmwareVersion: string
  supportedAlgorithms: string[]
  attestationCert?: string
  publicKey?: string
}

export interface TokenChallenge {
  challenge: string
  timestamp: Date
  expiresAt: Date
}

export interface TokenRegistration {
  id: string
  userId: string
  tokenInfo: HardwareTokenInfo
  nickname: string
  registeredAt: Date
  lastUsed?: Date
  status: 'active' | 'suspended' | 'revoked'
}

export interface WebAuthnCredential {
  credentialId: string
  publicKey: string
  signCount: number
  transports?: string[]
}

class HardwareTokenService {
  private registeredTokens: Map<string, TokenRegistration> = new Map()
  private activeChallenges: Map<string, TokenChallenge> = new Map()

  /**
   * Check if WebAuthn is supported
   */
  isWebAuthnSupported(): boolean {
    return typeof window !== 'undefined' && 
           'PublicKeyCredential' in window &&
           'credentials' in navigator
  }

  /**
   * Register a new hardware token
   */
  async registerToken(
    userId: string,
    nickname: string
  ): Promise<TokenRegistration> {
    if (!this.isWebAuthnSupported()) {
      throw new Error('WebAuthn is not supported in this browser')
    }

    try {
      // Generate challenge
      const challenge = randomBytes(32)
      
      // WebAuthn registration options
      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: "If I'm Gone",
          id: window.location.hostname
        },
        user: {
          id: Buffer.from(userId),
          name: userId,
          displayName: nickname
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },  // ES256
          { alg: -257, type: 'public-key' } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'cross-platform',
          userVerification: 'preferred',
          requireResidentKey: false
        },
        timeout: 60000,
        attestation: 'direct'
      }

      // Create credential
      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
      }) as PublicKeyCredential

      if (!credential) {
        throw new Error('Failed to create credential')
      }

      // Extract token information
      const response = credential.response as AuthenticatorAttestationResponse
      const clientDataJSON = new TextDecoder().decode(response.clientDataJSON)
      const attestationObject = response.attestationObject

      // Parse attestation and extract public key
      const tokenInfo = await this.parseAttestationObject(attestationObject)
      
      // Create registration
      const registration: TokenRegistration = {
        id: credential.id,
        userId,
        tokenInfo,
        nickname,
        registeredAt: new Date(),
        status: 'active'
      }

      // Store registration
      this.registeredTokens.set(registration.id, registration)

      return registration
    } catch (error) {
      console.error('Token registration failed:', error)
      throw new Error('Failed to register hardware token')
    }
  }

  /**
   * Authenticate with hardware token
   */
  async authenticateWithToken(
    userId: string,
    tokenId?: string
  ): Promise<boolean> {
    if (!this.isWebAuthnSupported()) {
      throw new Error('WebAuthn is not supported')
    }

    try {
      // Generate challenge
      const challenge = randomBytes(32)
      const challengeId = randomBytes(16).toString('hex')
      
      // Store challenge
      this.activeChallenges.set(challengeId, {
        challenge: challenge.toString('base64'),
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
      })

      // Get allowed credentials
      const allowCredentials = tokenId 
        ? [{ id: Buffer.from(tokenId, 'base64'), type: 'public-key' as const }]
        : Array.from(this.registeredTokens.values())
            .filter(reg => reg.userId === userId && reg.status === 'active')
            .map(reg => ({
              id: Buffer.from(reg.id, 'base64'),
              type: 'public-key' as const
            }))

      // WebAuthn authentication options
      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        allowCredentials,
        timeout: 60000,
        userVerification: 'preferred',
        rpId: window.location.hostname
      }

      // Get assertion
      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      }) as PublicKeyCredential

      if (!assertion) {
        throw new Error('Authentication cancelled')
      }

      // Verify assertion
      const verified = await this.verifyAssertion(
        assertion,
        challengeId,
        userId
      )

      // Update last used
      if (verified) {
        const registration = this.registeredTokens.get(assertion.id)
        if (registration) {
          registration.lastUsed = new Date()
        }
      }

      return verified
    } catch (error) {
      console.error('Token authentication failed:', error)
      return false
    }
  }

  /**
   * Generate key with hardware token
   */
  async generateKeyWithToken(
    tokenId: string,
    keyType: 'encryption' | 'signing' = 'encryption'
  ): Promise<string> {
    const registration = this.registeredTokens.get(tokenId)
    if (!registration || registration.status !== 'active') {
      throw new Error('Token not found or inactive')
    }

    // Authenticate first
    const authenticated = await this.authenticateWithToken(
      registration.userId,
      tokenId
    )

    if (!authenticated) {
      throw new Error('Authentication failed')
    }

    // Generate key material
    // In a real implementation, this would derive a key from the token
    const keyMaterial = randomBytes(32)
    
    // Encrypt key material with token's public key
    const encryptedKey = await this.encryptWithTokenKey(
      keyMaterial,
      registration.tokenInfo.publicKey!
    )

    return encryptedKey
  }

  /**
   * Sign data with hardware token
   */
  async signWithToken(
    tokenId: string,
    data: Buffer
  ): Promise<string> {
    if (!this.isWebAuthnSupported()) {
      throw new Error('WebAuthn is not supported')
    }

    const registration = this.registeredTokens.get(tokenId)
    if (!registration || registration.status !== 'active') {
      throw new Error('Token not found or inactive')
    }

    try {
      // Create signing challenge
      const challenge = createHash('sha256').update(data).digest()

      // WebAuthn signature options
      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        allowCredentials: [{
          id: Buffer.from(tokenId, 'base64'),
          type: 'public-key'
        }],
        timeout: 60000,
        userVerification: 'required'
      }

      // Get signature
      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      }) as PublicKeyCredential

      if (!assertion) {
        throw new Error('Signing cancelled')
      }

      const response = assertion.response as AuthenticatorAssertionResponse
      const signature = Buffer.from(response.signature)

      return signature.toString('base64')
    } catch (error) {
      console.error('Token signing failed:', error)
      throw new Error('Failed to sign with hardware token')
    }
  }

  /**
   * List registered tokens for user
   */
  listUserTokens(userId: string): TokenRegistration[] {
    return Array.from(this.registeredTokens.values())
      .filter(reg => reg.userId === userId)
      .sort((a, b) => b.registeredAt.getTime() - a.registeredAt.getTime())
  }

  /**
   * Suspend or revoke token
   */
  async updateTokenStatus(
    tokenId: string,
    status: 'active' | 'suspended' | 'revoked'
  ): Promise<void> {
    const registration = this.registeredTokens.get(tokenId)
    if (!registration) {
      throw new Error('Token not found')
    }

    registration.status = status
  }

  /**
   * Private helper methods
   */
  private async parseAttestationObject(
    attestationObject: ArrayBuffer
  ): Promise<HardwareTokenInfo> {
    // This would parse the CBOR-encoded attestation object
    // For now, return mock data
    return {
      type: 'yubikey',
      serialNumber: randomBytes(8).toString('hex'),
      firmwareVersion: '5.4.3',
      supportedAlgorithms: ['ES256', 'RS256'],
      publicKey: randomBytes(65).toString('base64')
    }
  }

  private async verifyAssertion(
    assertion: PublicKeyCredential,
    challengeId: string,
    userId: string
  ): Promise<boolean> {
    const challenge = this.activeChallenges.get(challengeId)
    if (!challenge || challenge.expiresAt < new Date()) {
      return false
    }

    const registration = this.registeredTokens.get(assertion.id)
    if (!registration || registration.userId !== userId) {
      return false
    }

    // In a real implementation, verify the signature
    // For now, assume valid
    this.activeChallenges.delete(challengeId)
    return true
  }

  private async encryptWithTokenKey(
    data: Buffer,
    publicKey: string
  ): Promise<string> {
    // In a real implementation, encrypt with the token's public key
    // For now, use symmetric encryption as placeholder
    const key = randomBytes(32)
    const iv = randomBytes(16)
    const cipher = createCipheriv('aes-256-gcm', key, iv)
    
    const encrypted = Buffer.concat([
      cipher.update(data),
      cipher.final()
    ])
    
    const authTag = cipher.getAuthTag()
    
    return Buffer.concat([iv, authTag, encrypted]).toString('base64')
  }

  /**
   * Check if specific token type is available
   */
  async detectTokenType(): Promise<'yubikey' | 'titan' | 'solokey' | null> {
    if (!this.isWebAuthnSupported()) {
      return null
    }

    // This would use vendor-specific extensions to detect token type
    // For now, return null (generic token)
    return null
  }

  /**
   * Export token registration for backup
   */
  exportTokenRegistration(tokenId: string): string {
    const registration = this.registeredTokens.get(tokenId)
    if (!registration) {
      throw new Error('Token not found')
    }

    // Remove sensitive data
    const exportData = {
      id: registration.id,
      nickname: registration.nickname,
      tokenInfo: {
        type: registration.tokenInfo.type,
        serialNumber: registration.tokenInfo.serialNumber
      },
      registeredAt: registration.registeredAt
    }

    return JSON.stringify(exportData)
  }
}

// Singleton instance
export const hardwareTokenService = new HardwareTokenService()