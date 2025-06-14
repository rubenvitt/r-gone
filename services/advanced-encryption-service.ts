'use client'

import { EncryptionService } from './encryption-service'
import { 
  keyManagementService, 
  ContentType, 
  KeyMetadata,
  EncryptionAlgorithm
} from './key-management-service'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

export interface AdvancedEncryptionOptions {
  contentType: ContentType
  algorithm?: EncryptionAlgorithm
  metadata?: Record<string, any>
}

export interface EncryptedPackage {
  id: string
  contentType: ContentType
  keyId: string
  algorithm: EncryptionAlgorithm
  encryptedData: string
  iv: string
  authTag?: string
  metadata?: Record<string, any>
  timestamp: Date
}

export class AdvancedEncryptionService extends EncryptionService {
  private initialized: boolean = false

  /**
   * Initialize the advanced encryption service
   */
  async initialize(masterPassphrase: string): Promise<void> {
    await keyManagementService.initialize(masterPassphrase)
    this.initialized = true
  }

  /**
   * Encrypt content with content-type specific key
   */
  async encryptWithTypeKey(
    content: string,
    options: AdvancedEncryptionOptions
  ): Promise<EncryptedPackage> {
    if (!this.initialized) {
      throw new Error('Advanced encryption service not initialized')
    }

    // Get or generate key for content type
    let key = await keyManagementService.getKeyForType(options.contentType)
    if (!key) {
      key = await keyManagementService.generateKeyForType(
        options.contentType,
        options.algorithm || EncryptionAlgorithm.AES_256_GCM
      )
    }

    // Encrypt based on algorithm
    let encryptedPackage: EncryptedPackage

    switch (key.algorithm) {
      case EncryptionAlgorithm.AES_256_GCM:
        encryptedPackage = await this.encryptWithAES256GCM(content, key, options)
        break
      case EncryptionAlgorithm.RSA_4096:
        encryptedPackage = await this.encryptWithRSA(content, key, options)
        break
      case EncryptionAlgorithm.CHACHA20_POLY1305:
        encryptedPackage = await this.encryptWithChaCha20(content, key, options)
        break
      default:
        throw new Error(`Unsupported algorithm: ${key.algorithm}`)
    }

    return encryptedPackage
  }

  /**
   * Decrypt content with type-specific key
   */
  async decryptWithTypeKey(encryptedPackage: EncryptedPackage): Promise<string> {
    if (!this.initialized) {
      throw new Error('Advanced encryption service not initialized')
    }

    // Get key by ID (includes expired keys for decryption)
    const key = await this.getKeyById(encryptedPackage.keyId)
    if (!key) {
      throw new Error(`Key not found: ${encryptedPackage.keyId}`)
    }

    // Decrypt based on algorithm
    let decryptedContent: string

    switch (encryptedPackage.algorithm) {
      case EncryptionAlgorithm.AES_256_GCM:
        decryptedContent = await this.decryptWithAES256GCM(encryptedPackage, key)
        break
      case EncryptionAlgorithm.RSA_4096:
        decryptedContent = await this.decryptWithRSA(encryptedPackage, key)
        break
      case EncryptionAlgorithm.CHACHA20_POLY1305:
        decryptedContent = await this.decryptWithChaCha20(encryptedPackage, key)
        break
      default:
        throw new Error(`Unsupported algorithm: ${encryptedPackage.algorithm}`)
    }

    return decryptedContent
  }

  /**
   * Rotate keys for specific content type
   */
  async rotateKeysForType(contentType: ContentType): Promise<void> {
    await keyManagementService.rotateKey(contentType)
    // Re-encryption of existing content would be handled by a background job
  }

  /**
   * Encrypt with AES-256-GCM
   */
  private async encryptWithAES256GCM(
    content: string,
    key: KeyMetadata,
    options: AdvancedEncryptionOptions
  ): Promise<EncryptedPackage> {
    const iv = randomBytes(16)
    const keyBuffer = await this.getDecryptedKey(key)
    
    const cipher = createCipheriv('aes-256-gcm', keyBuffer, iv)
    
    const encrypted = Buffer.concat([
      cipher.update(content, 'utf8'),
      cipher.final()
    ])
    
    const authTag = cipher.getAuthTag()

    return {
      id: randomBytes(16).toString('hex'),
      contentType: options.contentType,
      keyId: key.id,
      algorithm: EncryptionAlgorithm.AES_256_GCM,
      encryptedData: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      metadata: options.metadata,
      timestamp: new Date()
    }
  }

  /**
   * Decrypt with AES-256-GCM
   */
  private async decryptWithAES256GCM(
    encryptedPackage: EncryptedPackage,
    key: KeyMetadata
  ): Promise<string> {
    const keyBuffer = await this.getDecryptedKey(key)
    const iv = Buffer.from(encryptedPackage.iv, 'base64')
    const authTag = Buffer.from(encryptedPackage.authTag!, 'base64')
    const encrypted = Buffer.from(encryptedPackage.encryptedData, 'base64')
    
    const decipher = createDecipheriv('aes-256-gcm', keyBuffer, iv)
    decipher.setAuthTag(authTag)
    
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ])
    
    return decrypted.toString('utf8')
  }

  /**
   * Encrypt with RSA (for smaller content or key wrapping)
   */
  private async encryptWithRSA(
    content: string,
    key: KeyMetadata,
    options: AdvancedEncryptionOptions
  ): Promise<EncryptedPackage> {
    // For large content, use hybrid encryption
    if (content.length > 245) { // RSA-4096 with OAEP padding limit
      return this.hybridEncrypt(content, key, options)
    }

    const publicKey = key.publicKey!
    const buffer = Buffer.from(content, 'utf8')
    
    const crypto = require('crypto')
    const encrypted = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      buffer
    )

    return {
      id: randomBytes(16).toString('hex'),
      contentType: options.contentType,
      keyId: key.id,
      algorithm: EncryptionAlgorithm.RSA_4096,
      encryptedData: encrypted.toString('base64'),
      iv: '', // Not used for RSA
      metadata: options.metadata,
      timestamp: new Date()
    }
  }

  /**
   * Decrypt with RSA
   */
  private async decryptWithRSA(
    encryptedPackage: EncryptedPackage,
    key: KeyMetadata
  ): Promise<string> {
    const privateKey = await this.getDecryptedPrivateKey(key)
    const encrypted = Buffer.from(encryptedPackage.encryptedData, 'base64')
    
    const crypto = require('crypto')
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      encrypted
    )

    return decrypted.toString('utf8')
  }

  /**
   * Hybrid encryption for large content with RSA
   */
  private async hybridEncrypt(
    content: string,
    rsaKey: KeyMetadata,
    options: AdvancedEncryptionOptions
  ): Promise<EncryptedPackage> {
    // Generate ephemeral AES key
    const aesKey = randomBytes(32)
    
    // Encrypt content with AES
    const iv = randomBytes(16)
    const cipher = createCipheriv('aes-256-gcm', aesKey, iv)
    
    const encrypted = Buffer.concat([
      cipher.update(content, 'utf8'),
      cipher.final()
    ])
    
    const authTag = cipher.getAuthTag()
    
    // Encrypt AES key with RSA
    const crypto = require('crypto')
    const encryptedKey = crypto.publicEncrypt(
      {
        key: rsaKey.publicKey!,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      aesKey
    )

    // Package everything together
    const hybridPackage = {
      encryptedKey: encryptedKey.toString('base64'),
      encryptedData: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64')
    }

    return {
      id: randomBytes(16).toString('hex'),
      contentType: options.contentType,
      keyId: rsaKey.id,
      algorithm: EncryptionAlgorithm.RSA_4096,
      encryptedData: JSON.stringify(hybridPackage),
      iv: '', // Included in package
      metadata: { ...options.metadata, hybrid: true },
      timestamp: new Date()
    }
  }

  /**
   * Encrypt with ChaCha20-Poly1305 (placeholder)
   */
  private async encryptWithChaCha20(
    content: string,
    key: KeyMetadata,
    options: AdvancedEncryptionOptions
  ): Promise<EncryptedPackage> {
    // ChaCha20-Poly1305 implementation would go here
    // For now, fallback to AES-256-GCM
    console.warn('ChaCha20-Poly1305 not yet implemented, using AES-256-GCM')
    return this.encryptWithAES256GCM(content, key, options)
  }

  /**
   * Decrypt with ChaCha20-Poly1305 (placeholder)
   */
  private async decryptWithChaCha20(
    encryptedPackage: EncryptedPackage,
    key: KeyMetadata
  ): Promise<string> {
    // ChaCha20-Poly1305 implementation would go here
    // For now, fallback to AES-256-GCM
    console.warn('ChaCha20-Poly1305 not yet implemented, using AES-256-GCM')
    return this.decryptWithAES256GCM(encryptedPackage, key)
  }

  /**
   * Helper methods
   */
  private async getKeyById(keyId: string): Promise<KeyMetadata | null> {
    // This would query the key management service
    // Placeholder implementation
    return null
  }

  private async getDecryptedKey(key: KeyMetadata): Promise<Buffer> {
    // Decrypt the key using master key
    // Placeholder implementation
    return randomBytes(32)
  }

  private async getDecryptedPrivateKey(key: KeyMetadata): Promise<string> {
    // Decrypt the private key using master key
    // Placeholder implementation
    return key.encryptedPrivateKey || ''
  }
}

// Singleton instance
export const advancedEncryptionService = new AdvancedEncryptionService()