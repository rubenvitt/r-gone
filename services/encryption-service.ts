'use client'

import { encryptData, decryptData } from '@/lib/pgp'
import { Section, DecryptedData } from '@/types/data'

export interface EncryptionResult {
  success: boolean
  encryptedData?: string
  error?: string
}

export interface DecryptionResult {
  success: boolean
  decryptedData?: DecryptedData
  error?: string
}

export interface ContentValidationResult {
  isValid: boolean
  errors: string[]
}

export class EncryptionService {
  /**
   * Encrypts rich text editor content with a passphrase
   */
  async encryptContent(
    content: string, 
    passphrase: string,
    title: string = 'Emergency Information'
  ): Promise<EncryptionResult> {
    try {
      if (!content || content.trim().length === 0) {
        return {
          success: false,
          error: 'Content cannot be empty'
        }
      }

      if (!passphrase || passphrase.length < 8) {
        return {
          success: false,
          error: 'Passphrase must be at least 8 characters long'
        }
      }

      // Create data structure that matches the schema
      const dataToEncrypt: DecryptedData = {
        sections: [
          {
            id: crypto.randomUUID(),
            title,
            content: [content] // Rich text content as single item
          }
        ],
        metadata: {
          lastModified: new Date().toISOString(),
          version: '1.0'
        }
      }

      const jsonString = JSON.stringify(dataToEncrypt)
      const encryptedData = await encryptData(jsonString, passphrase)

      return {
        success: true,
        encryptedData: encryptedData as string
      }
    } catch (error) {
      console.error('Encryption failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Encryption failed'
      }
    }
  }

  /**
   * Decrypts content with a passphrase
   */
  async decryptContent(encryptedData: string, passphrase: string): Promise<DecryptionResult> {
    try {
      if (!encryptedData || !passphrase) {
        return {
          success: false,
          error: 'Encrypted data and passphrase are required'
        }
      }

      const decryptedString = await decryptData(encryptedData, passphrase)
      const parsedData = JSON.parse(decryptedString as string) as DecryptedData

      // Validate the decrypted data structure
      const validation = this.validateDecryptedData(parsedData)
      if (!validation.isValid) {
        return {
          success: false,
          error: `Invalid data structure: ${validation.errors.join(', ')}`
        }
      }

      return {
        success: true,
        decryptedData: parsedData
      }
    } catch (error) {
      console.error('Decryption failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Decryption failed - check your passphrase'
      }
    }
  }

  /**
   * Validates decrypted data structure
   */
  private validateDecryptedData(data: any): ContentValidationResult {
    const errors: string[] = []

    if (!data || typeof data !== 'object') {
      errors.push('Data must be an object')
      return { isValid: false, errors }
    }

    if (!Array.isArray(data.sections)) {
      errors.push('Sections must be an array')
    } else {
      data.sections.forEach((section: any, index: number) => {
        if (!section.id || typeof section.id !== 'string') {
          errors.push(`Section ${index}: id is required and must be a string`)
        }
        if (!section.title || typeof section.title !== 'string') {
          errors.push(`Section ${index}: title is required and must be a string`)
        }
        if (!Array.isArray(section.content)) {
          errors.push(`Section ${index}: content must be an array`)
        }
      })
    }

    if (!data.metadata || typeof data.metadata !== 'object') {
      errors.push('Metadata is required')
    } else {
      if (!data.metadata.lastModified) {
        errors.push('Metadata must include lastModified')
      }
      if (!data.metadata.version) {
        errors.push('Metadata must include version')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Extracts rich text content from decrypted data
   * Supports both legacy sections format and new multi-note format
   */
  extractRichTextContent(decryptedData: DecryptedData | string): string {
    // If it's a string, try to parse it as JSON first
    if (typeof decryptedData === 'string') {
      try {
        const parsed = JSON.parse(decryptedData)
        return this.extractRichTextContent(parsed)
      } catch {
        // If parsing fails, return the string as-is (legacy plain text)
        return decryptedData
      }
    }

    // Handle new multi-note format
    if (decryptedData.metadata?.dataFormat === 'multi-note' && decryptedData.notes) {
      if (decryptedData.notes.length === 0) {
        return ''
      }
      
      // Return the active note's content, or the first note's content
      const activeNote = decryptedData.metadata.activeNoteId 
        ? decryptedData.notes.find(note => note.id === decryptedData.metadata.activeNoteId)
        : null
      
      const targetNote = activeNote || decryptedData.notes[0]
      return targetNote.content || ''
    }

    // Handle corrupted/nested multi-note data in sections
    if (decryptedData.sections && decryptedData.sections.length > 0) {
      const firstSection = decryptedData.sections[0]
      const content = firstSection.content.length > 0 ? firstSection.content[0] : ''
      
      // Check if the section content contains nested JSON data
      if (typeof content === 'string' && content.trim().startsWith('{')) {
        try {
          const nestedData = JSON.parse(content)
          // If it's nested multi-note data, extract from it
          if (nestedData.metadata?.dataFormat === 'multi-note' && nestedData.notes) {
            console.warn('Found nested multi-note data in section content, extracting...')
            return this.extractRichTextContent(nestedData)
          }
        } catch (error) {
          console.warn('Failed to parse nested JSON in section content:', error)
        }
      }
      
      return content
    }

    return ''
  }

  /**
   * Checks if content appears to be encrypted (OpenPGP armored format)
   */
  isContentEncrypted(content: string): boolean {
    return content.includes('-----BEGIN PGP MESSAGE-----') && 
           content.includes('-----END PGP MESSAGE-----')
  }

  /**
   * Validates passphrase strength
   */
  validatePassphrase(passphrase: string): ContentValidationResult {
    const errors: string[] = []

    if (!passphrase) {
      errors.push('Passphrase is required')
    } else {
      if (passphrase.length < 8) {
        errors.push('Passphrase must be at least 8 characters long')
      }
      if (passphrase.length > 256) {
        errors.push('Passphrase must not exceed 256 characters')
      }
      if (!/[A-Z]/.test(passphrase)) {
        errors.push('Passphrase should contain at least one uppercase letter')
      }
      if (!/[a-z]/.test(passphrase)) {
        errors.push('Passphrase should contain at least one lowercase letter')
      }
      if (!/[0-9]/.test(passphrase)) {
        errors.push('Passphrase should contain at least one number')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Generates a secure random passphrase
   */
  generateSecurePassphrase(length: number = 16): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let passphrase = ''
    
    for (let i = 0; i < length; i++) {
      passphrase += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    
    return passphrase
  }
}

// Singleton instance
export const encryptionService = new EncryptionService()