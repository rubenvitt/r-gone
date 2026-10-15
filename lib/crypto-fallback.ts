'use client'

import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto'

// Fallback encryption using Node.js crypto (AES-256-GCM)
// This is used when OpenPGP fails due to WebCrypto issues

const ALGORITHM = 'aes-256-gcm'
const SALT_LENGTH = 32
const IV_LENGTH = 16
const TAG_LENGTH = 16
const KEY_LENGTH = 32
const ITERATIONS = 100000

function deriveKey(passphrase: string, salt: Buffer): Buffer {
  // Use PBKDF2 to derive key from passphrase
  const key = createHash('sha256')
  for (let i = 0; i < ITERATIONS; i++) {
    key.update(passphrase + salt.toString('hex') + i)
  }
  return key.digest()
}

export function encryptWithFallback(data: string, passphrase: string): string {
  try {
    // Generate random salt and IV
    const salt = randomBytes(SALT_LENGTH)
    const iv = randomBytes(IV_LENGTH)
    
    // Derive key from passphrase
    const key = deriveKey(passphrase, salt)
    
    // Create cipher
    const cipher = createCipheriv(ALGORITHM, key, iv)
    
    // Encrypt data
    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final()
    ])
    
    // Get auth tag
    const tag = cipher.getAuthTag()
    
    // Combine all components
    const combined = Buffer.concat([
      Buffer.from('FALLBACK'), // 8 bytes marker
      salt,                    // 32 bytes
      iv,                      // 16 bytes
      tag,                     // 16 bytes
      encrypted                // variable length
    ])
    
    // Return base64 encoded
    return combined.toString('base64')
  } catch (error) {
    console.error('Fallback encryption error:', error)
    throw new Error('Encryption failed. Please check your passphrase.')
  }
}

export function decryptWithFallback(encryptedData: string, passphrase: string): string {
  try {
    // Decode from base64
    const combined = Buffer.from(encryptedData, 'base64')
    
    // Check marker
    const marker = combined.slice(0, 8).toString()
    if (marker !== 'FALLBACK') {
      throw new Error('Invalid encrypted data format')
    }
    
    // Extract components
    const salt = combined.slice(8, 8 + SALT_LENGTH)
    const iv = combined.slice(8 + SALT_LENGTH, 8 + SALT_LENGTH + IV_LENGTH)
    const tag = combined.slice(8 + SALT_LENGTH + IV_LENGTH, 8 + SALT_LENGTH + IV_LENGTH + TAG_LENGTH)
    const encrypted = combined.slice(8 + SALT_LENGTH + IV_LENGTH + TAG_LENGTH)
    
    // Derive key from passphrase
    const key = deriveKey(passphrase, salt)
    
    // Create decipher
    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)
    
    // Decrypt data
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ])
    
    return decrypted.toString('utf8')
  } catch (error) {
    console.error('Fallback decryption error:', error)
    throw new Error('Decryption failed. Please check your passphrase.')
  }
}

// Check if data was encrypted with fallback
export function isFallbackEncrypted(data: string): boolean {
  try {
    const decoded = Buffer.from(data, 'base64')
    return decoded.slice(0, 8).toString() === 'FALLBACK'
  } catch {
    return false
  }
}