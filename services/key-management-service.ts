'use client'

import { randomBytes, generateKeyPair, publicEncrypt, privateDecrypt, createCipheriv, createDecipheriv } from 'crypto'
import { promisify } from 'util'

const generateKeyPairAsync = promisify(generateKeyPair)

export interface KeyMetadata {
  id: string
  type: ContentType
  algorithm: EncryptionAlgorithm
  createdAt: Date
  lastUsed: Date
  rotationDue?: Date
  status: KeyStatus
  version: number
  publicKey?: string
  encryptedPrivateKey?: string
  keyDerivationMethod?: KeyDerivationMethod
}

export interface MasterKey {
  id: string
  encryptedKey: string
  salt: string
  iterations: number
  algorithm: string
}

export interface KeyUsageLog {
  id: string
  keyId: string
  action: KeyAction
  timestamp: Date
  userId?: string
  contentId?: string
  success: boolean
  details?: string
}

export enum ContentType {
  PASSWORD = 'password',
  DOCUMENT = 'document',
  MESSAGE = 'message',
  CONTACT = 'contact',
  ASSET = 'asset',
  BACKUP = 'backup',
  EMERGENCY = 'emergency',
  SYSTEM = 'system'
}

export enum EncryptionAlgorithm {
  AES_256_GCM = 'aes-256-gcm',
  RSA_4096 = 'rsa-4096',
  CHACHA20_POLY1305 = 'chacha20-poly1305',
  // Quantum-resistant algorithms
  CRYSTALS_KYBER = 'crystals-kyber',
  CRYSTALS_DILITHIUM = 'crystals-dilithium'
}

export enum KeyStatus {
  ACTIVE = 'active',
  ROTATING = 'rotating',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
  BACKED_UP = 'backed_up'
}

export enum KeyAction {
  GENERATED = 'generated',
  USED = 'used',
  ROTATED = 'rotated',
  BACKED_UP = 'backed_up',
  RESTORED = 'restored',
  REVOKED = 'revoked',
  ACCESSED = 'accessed'
}

export enum KeyDerivationMethod {
  PBKDF2 = 'pbkdf2',
  ARGON2 = 'argon2',
  SCRYPT = 'scrypt',
  BIOMETRIC = 'biometric',
  HARDWARE_TOKEN = 'hardware_token'
}

export interface KeyEscrowConfig {
  enabled: boolean
  trustees: EscrowTrustee[]
  threshold: number // Number of trustees required to recover
  timeDelay?: number // Hours before key can be recovered
  conditions?: EscrowCondition[]
}

export interface EscrowTrustee {
  id: string
  name: string
  email: string
  publicKey: string
  share?: string // Encrypted key share
  approved?: boolean
  approvedAt?: Date
}

export interface EscrowCondition {
  type: 'time_based' | 'event_based' | 'approval_based'
  description: string
  met: boolean
}

export interface HardwareTokenConfig {
  enabled: boolean
  type: 'yubikey' | 'titan' | 'solokey'
  serialNumber?: string
  attestationCert?: string
}

export interface BiometricConfig {
  enabled: boolean
  types: BiometricType[]
  fallbackMethod: KeyDerivationMethod
}

export enum BiometricType {
  FINGERPRINT = 'fingerprint',
  FACE_ID = 'face_id',
  IRIS = 'iris',
  VOICE = 'voice'
}

class KeyManagementService {
  private keys: Map<string, KeyMetadata> = new Map()
  private masterKey: MasterKey | null = null
  private keyUsageLogs: KeyUsageLog[] = []
  private escrowConfig: KeyEscrowConfig | null = null

  /**
   * Initialize the key management service
   */
  async initialize(masterPassphrase: string): Promise<void> {
    // Generate or load master key
    this.masterKey = await this.generateMasterKey(masterPassphrase)
    
    // Load existing keys from secure storage
    await this.loadKeys()
    
    // Initialize default keys for each content type
    await this.initializeDefaultKeys()
  }

  /**
   * Generate a master key from passphrase
   */
  private async generateMasterKey(passphrase: string): Promise<MasterKey> {
    const salt = randomBytes(32).toString('hex')
    const iterations = 100000
    
    // Derive key using PBKDF2
    const crypto = require('crypto')
    const derivedKey = crypto.pbkdf2Sync(passphrase, salt, iterations, 32, 'sha256')
    
    return {
      id: randomBytes(16).toString('hex'),
      encryptedKey: derivedKey.toString('hex'),
      salt,
      iterations,
      algorithm: 'pbkdf2-sha256'
    }
  }

  /**
   * Initialize default keys for each content type
   */
  private async initializeDefaultKeys(): Promise<void> {
    for (const contentType of Object.values(ContentType)) {
      if (!this.hasKeyForType(contentType as ContentType)) {
        await this.generateKeyForType(contentType as ContentType)
      }
    }
  }

  /**
   * Generate a new key for a specific content type
   */
  async generateKeyForType(
    type: ContentType, 
    algorithm: EncryptionAlgorithm = EncryptionAlgorithm.AES_256_GCM
  ): Promise<KeyMetadata> {
    let keyMetadata: KeyMetadata

    switch (algorithm) {
      case EncryptionAlgorithm.RSA_4096:
        keyMetadata = await this.generateRSAKey(type)
        break
      case EncryptionAlgorithm.AES_256_GCM:
      case EncryptionAlgorithm.CHACHA20_POLY1305:
        keyMetadata = await this.generateSymmetricKey(type, algorithm)
        break
      case EncryptionAlgorithm.CRYSTALS_KYBER:
      case EncryptionAlgorithm.CRYSTALS_DILITHIUM:
        keyMetadata = await this.generateQuantumResistantKey(type, algorithm)
        break
      default:
        throw new Error(`Unsupported algorithm: ${algorithm}`)
    }

    // Store key metadata
    this.keys.set(keyMetadata.id, keyMetadata)
    
    // Log key generation
    this.logKeyAction(keyMetadata.id, KeyAction.GENERATED)
    
    return keyMetadata
  }

  /**
   * Generate RSA key pair
   */
  private async generateRSAKey(type: ContentType): Promise<KeyMetadata> {
    const { publicKey, privateKey } = await generateKeyPairAsync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    })

    // Encrypt private key with master key
    const encryptedPrivateKey = await this.encryptWithMasterKey(privateKey)

    return {
      id: randomBytes(16).toString('hex'),
      type,
      algorithm: EncryptionAlgorithm.RSA_4096,
      createdAt: new Date(),
      lastUsed: new Date(),
      status: KeyStatus.ACTIVE,
      version: 1,
      publicKey,
      encryptedPrivateKey
    }
  }

  /**
   * Generate symmetric key
   */
  private async generateSymmetricKey(
    type: ContentType, 
    algorithm: EncryptionAlgorithm
  ): Promise<KeyMetadata> {
    const key = randomBytes(32) // 256 bits
    const encryptedKey = await this.encryptWithMasterKey(key.toString('hex'))

    return {
      id: randomBytes(16).toString('hex'),
      type,
      algorithm,
      createdAt: new Date(),
      lastUsed: new Date(),
      status: KeyStatus.ACTIVE,
      version: 1,
      encryptedPrivateKey: encryptedKey
    }
  }

  /**
   * Generate quantum-resistant key (placeholder for future implementation)
   */
  private async generateQuantumResistantKey(
    type: ContentType,
    algorithm: EncryptionAlgorithm
  ): Promise<KeyMetadata> {
    // This would integrate with quantum-resistant libraries
    // For now, we'll use a strong symmetric key as placeholder
    console.warn('Quantum-resistant algorithms not yet implemented, using AES-256 as fallback')
    return this.generateSymmetricKey(type, EncryptionAlgorithm.AES_256_GCM)
  }

  /**
   * Get key for specific content type
   */
  async getKeyForType(type: ContentType): Promise<KeyMetadata | null> {
    for (const [_, key] of this.keys) {
      if (key.type === type && key.status === KeyStatus.ACTIVE) {
        // Update last used timestamp
        key.lastUsed = new Date()
        this.logKeyAction(key.id, KeyAction.USED)
        return key
      }
    }
    return null
  }

  /**
   * Rotate key for specific content type
   */
  async rotateKey(type: ContentType): Promise<KeyMetadata> {
    const oldKey = await this.getKeyForType(type)
    if (!oldKey) {
      throw new Error(`No active key found for type: ${type}`)
    }

    // Mark old key as rotating
    oldKey.status = KeyStatus.ROTATING

    // Generate new key
    const newKey = await this.generateKeyForType(type, oldKey.algorithm)
    
    // Log rotation
    this.logKeyAction(oldKey.id, KeyAction.ROTATED, { newKeyId: newKey.id })
    
    // Schedule old key for expiration after re-encryption is complete
    setTimeout(() => {
      oldKey.status = KeyStatus.EXPIRED
    }, 24 * 60 * 60 * 1000) // 24 hours

    return newKey
  }

  /**
   * Backup key
   */
  async backupKey(keyId: string): Promise<string> {
    const key = this.keys.get(keyId)
    if (!key) {
      throw new Error(`Key not found: ${keyId}`)
    }

    // Create backup package
    const backup = {
      key,
      timestamp: new Date(),
      version: '1.0'
    }

    // Encrypt backup with additional passphrase
    const backupData = JSON.stringify(backup)
    const encryptedBackup = await this.encryptWithMasterKey(backupData)
    
    // Log backup
    this.logKeyAction(keyId, KeyAction.BACKED_UP)
    
    return encryptedBackup
  }

  /**
   * Setup key escrow
   */
  async setupKeyEscrow(config: KeyEscrowConfig): Promise<void> {
    this.escrowConfig = config
    
    // Split master key into shares using Shamir's Secret Sharing
    if (config.enabled && this.masterKey) {
      const shares = await this.splitKeyIntoShares(
        this.masterKey.encryptedKey,
        config.trustees.length,
        config.threshold
      )
      
      // Distribute shares to trustees
      config.trustees.forEach((trustee, index) => {
        trustee.share = shares[index]
      })
    }
  }

  /**
   * Add hardware token support
   */
  async addHardwareToken(config: HardwareTokenConfig): Promise<void> {
    if (!config.enabled) return

    // This would integrate with hardware token APIs
    // Placeholder for actual implementation
    console.log('Hardware token support added:', config.type)
  }

  /**
   * Add biometric key derivation
   */
  async addBiometricDerivation(config: BiometricConfig): Promise<void> {
    if (!config.enabled) return

    // This would integrate with biometric APIs
    // Placeholder for actual implementation
    console.log('Biometric derivation added:', config.types)
  }

  /**
   * Log key usage
   */
  private logKeyAction(
    keyId: string, 
    action: KeyAction, 
    details?: any
  ): void {
    const log: KeyUsageLog = {
      id: randomBytes(16).toString('hex'),
      keyId,
      action,
      timestamp: new Date(),
      success: true,
      details: details ? JSON.stringify(details) : undefined
    }
    
    this.keyUsageLogs.push(log)
    
    // Trim logs if too many
    if (this.keyUsageLogs.length > 10000) {
      this.keyUsageLogs = this.keyUsageLogs.slice(-5000)
    }
  }

  /**
   * Get key usage logs
   */
  getKeyUsageLogs(
    keyId?: string, 
    limit: number = 100
  ): KeyUsageLog[] {
    let logs = this.keyUsageLogs
    
    if (keyId) {
      logs = logs.filter(log => log.keyId === keyId)
    }
    
    return logs.slice(-limit)
  }

  /**
   * Helper methods
   */
  private hasKeyForType(type: ContentType): boolean {
    for (const [_, key] of this.keys) {
      if (key.type === type && key.status === KeyStatus.ACTIVE) {
        return true
      }
    }
    return false
  }

  private async encryptWithMasterKey(data: string): Promise<string> {
    if (!this.masterKey) {
      throw new Error('Master key not initialized')
    }
    
    const iv = randomBytes(16)
    const cipher = createCipheriv(
      'aes-256-gcm',
      Buffer.from(this.masterKey.encryptedKey, 'hex'),
      iv
    )
    
    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final()
    ])
    
    const authTag = cipher.getAuthTag()
    
    return Buffer.concat([iv, authTag, encrypted]).toString('base64')
  }

  private async decryptWithMasterKey(encryptedData: string): Promise<string> {
    if (!this.masterKey) {
      throw new Error('Master key not initialized')
    }
    
    const buffer = Buffer.from(encryptedData, 'base64')
    const iv = buffer.slice(0, 16)
    const authTag = buffer.slice(16, 32)
    const encrypted = buffer.slice(32)
    
    const decipher = createDecipheriv(
      'aes-256-gcm',
      Buffer.from(this.masterKey.encryptedKey, 'hex'),
      iv
    )
    
    decipher.setAuthTag(authTag)
    
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ])
    
    return decrypted.toString('utf8')
  }

  private async splitKeyIntoShares(
    key: string, 
    totalShares: number, 
    threshold: number
  ): Promise<string[]> {
    // This would use Shamir's Secret Sharing algorithm
    // Placeholder implementation
    const shares: string[] = []
    for (let i = 0; i < totalShares; i++) {
      shares.push(`share-${i}-${randomBytes(32).toString('hex')}`)
    }
    return shares
  }

  private async loadKeys(): Promise<void> {
    // Load keys from secure storage
    // Placeholder for actual implementation
  }
}

// Singleton instance
export const keyManagementService = new KeyManagementService()