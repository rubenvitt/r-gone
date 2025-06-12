import { DecryptedData } from '@/types/data'

export interface EncryptionError extends Error {
  code: string
  details?: Record<string, any>
}

export enum EncryptionErrorCode {
  INVALID_PASSPHRASE = 'INVALID_PASSPHRASE',
  CORRUPT_DATA = 'CORRUPT_DATA',
  DECRYPTION_FAILED = 'DECRYPTION_FAILED',
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  INVALID_FORMAT = 'INVALID_FORMAT',
  WEAK_PASSPHRASE = 'WEAK_PASSPHRASE',
  CONTENT_TOO_LARGE = 'CONTENT_TOO_LARGE',
  EMPTY_CONTENT = 'EMPTY_CONTENT',
  SCHEMA_VALIDATION_FAILED = 'SCHEMA_VALIDATION_FAILED'
}

export class EncryptionError extends Error {
  constructor(
    public code: EncryptionErrorCode,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message)
    this.name = 'EncryptionError'
  }
}

export interface IntegrityCheckResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  metadata?: {
    encryptionMethod: string
    dataSize: number
    estimatedCreationDate?: Date
  }
}

export interface SecurityAuditLog {
  timestamp: string
  action: 'encrypt' | 'decrypt' | 'validation_failed' | 'passphrase_changed'
  success: boolean
  errorCode?: string
  metadata?: Record<string, any>
}

export class EncryptionValidator {
  private static auditLogs: SecurityAuditLog[] = []
  
  /**
   * Validates encrypted data format and structure
   */
  static validateEncryptedData(encryptedData: string): IntegrityCheckResult {
    const errors: string[] = []
    const warnings: string[] = []
    let metadata: IntegrityCheckResult['metadata'] | undefined

    try {
      // Check if it's PGP armored format
      if (!encryptedData.includes('-----BEGIN PGP MESSAGE-----')) {
        errors.push('Missing PGP message header')
      }
      
      if (!encryptedData.includes('-----END PGP MESSAGE-----')) {
        errors.push('Missing PGP message footer')
      }

      // Check data integrity indicators
      const lines = encryptedData.split('\n')
      const contentLines = lines.filter(line => 
        !line.startsWith('-----') && 
        !line.startsWith('Version:') && 
        !line.startsWith('Comment:') &&
        line.trim() !== ''
      )

      if (contentLines.length === 0) {
        errors.push('No encrypted content found')
      }

      // Estimate data size and validate base64 content
      const base64Content = contentLines.join('')
      if (!/^[A-Za-z0-9+/=]*$/.test(base64Content)) {
        errors.push('Invalid base64 encoding detected')
      }

      metadata = {
        encryptionMethod: 'OpenPGP',
        dataSize: base64Content.length,
        estimatedCreationDate: undefined // PGP doesn't include this in the message
      }

      // Performance warnings
      if (base64Content.length > 100000) { // ~75KB original data
        warnings.push('Large encrypted data size may affect performance')
      }

      this.logSecurityEvent('validation', true, { dataSize: metadata.dataSize })

    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      this.logSecurityEvent('validation', false, { error: error instanceof Error ? error.message : 'Unknown error' })
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata
    }
  }

  /**
   * Validates decrypted data structure against schema
   */
  static validateDecryptedData(data: any): IntegrityCheckResult {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Type validation
      if (!data || typeof data !== 'object') {
        errors.push('Data must be an object')
        return { isValid: false, errors, warnings }
      }

      // Sections validation
      if (!Array.isArray(data.sections)) {
        errors.push('Sections must be an array')
      } else {
        data.sections.forEach((section: any, index: number) => {
          if (!section.id || typeof section.id !== 'string') {
            errors.push(`Section ${index}: Invalid or missing ID`)
          }
          if (!section.title || typeof section.title !== 'string') {
            errors.push(`Section ${index}: Invalid or missing title`)
          }
          if (!Array.isArray(section.content)) {
            errors.push(`Section ${index}: Content must be an array`)
          } else {
            section.content.forEach((item: any, contentIndex: number) => {
              if (typeof item !== 'string') {
                errors.push(`Section ${index}, content ${contentIndex}: Must be a string`)
              }
            })
          }
        })

        // Warnings for data quality
        if (data.sections.length === 0) {
          warnings.push('No sections found in data')
        }
        
        if (data.sections.length > 10) {
          warnings.push('Large number of sections may affect performance')
        }
      }

      // Metadata validation
      if (!data.metadata || typeof data.metadata !== 'object') {
        errors.push('Metadata is required')
      } else {
        if (!data.metadata.lastModified) {
          errors.push('Missing lastModified in metadata')
        } else {
          try {
            new Date(data.metadata.lastModified)
          } catch {
            errors.push('Invalid lastModified date format')
          }
        }
        
        if (!data.metadata.version) {
          warnings.push('Version information missing from metadata')
        }
      }

      this.logSecurityEvent('schema_validation', errors.length === 0, { 
        sectionsCount: data.sections?.length || 0 
      })

    } catch (error) {
      errors.push(`Schema validation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      this.logSecurityEvent('schema_validation', false, { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Comprehensive content verification
   */
  static async verifyContentIntegrity(
    originalContent: string,
    encryptedData: string,
    passphrase: string,
    decryptFunction: (encrypted: string, pass: string) => Promise<any>
  ): Promise<IntegrityCheckResult> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Validate encrypted format
      const encryptedValidation = this.validateEncryptedData(encryptedData)
      errors.push(...encryptedValidation.errors)
      warnings.push(...encryptedValidation.warnings)

      if (errors.length > 0) {
        return { isValid: false, errors, warnings }
      }

      // Attempt decryption
      const decryptResult = await decryptFunction(encryptedData, passphrase)
      
      if (!decryptResult.success) {
        errors.push('Decryption failed during integrity check')
        return { isValid: false, errors, warnings }
      }

      // Validate decrypted structure
      const structureValidation = this.validateDecryptedData(decryptResult.decryptedData)
      errors.push(...structureValidation.errors)
      warnings.push(...structureValidation.warnings)

      // Content comparison (if applicable)
      if (decryptResult.decryptedData?.sections?.[0]?.content?.[0]) {
        const decryptedContent = decryptResult.decryptedData.sections[0].content[0]
        
        // Simple length check (content may have minor formatting differences)
        const lengthDiff = Math.abs(originalContent.length - decryptedContent.length)
        const lengthDiffPercent = (lengthDiff / originalContent.length) * 100
        
        if (lengthDiffPercent > 10) {
          warnings.push('Significant content length difference detected')
        }
      }

      this.logSecurityEvent('integrity_check', errors.length === 0, {
        originalLength: originalContent.length,
        encryptedLength: encryptedData.length
      })

    } catch (error) {
      errors.push(`Integrity verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      this.logSecurityEvent('integrity_check', false, {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Security audit logging
   */
  private static logSecurityEvent(
    action: SecurityAuditLog['action'],
    success: boolean,
    metadata?: Record<string, any>
  ): void {
    const logEntry: SecurityAuditLog = {
      timestamp: new Date().toISOString(),
      action,
      success,
      metadata
    }

    this.auditLogs.push(logEntry)

    // Keep only last 100 entries to prevent memory issues
    if (this.auditLogs.length > 100) {
      this.auditLogs = this.auditLogs.slice(-100)
    }

    // In production, you might want to send this to a secure logging service
    if (!success) {
      console.warn('Security event logged:', logEntry)
    }
  }

  /**
   * Get security audit logs
   */
  static getAuditLogs(): SecurityAuditLog[] {
    return [...this.auditLogs] // Return copy to prevent modification
  }

  /**
   * Clear audit logs (useful for testing or privacy)
   */
  static clearAuditLogs(): void {
    this.auditLogs = []
  }

  /**
   * Generate security report
   */
  static generateSecurityReport(): {
    totalEvents: number
    successfulEvents: number
    failedEvents: number
    recentFailures: SecurityAuditLog[]
    recommendations: string[]
  } {
    const recommendations: string[] = []
    const failedEvents = this.auditLogs.filter(log => !log.success)
    const recentFailures = failedEvents.slice(-10) // Last 10 failures

    // Generate recommendations based on failure patterns
    const decryptionFailures = failedEvents.filter(log => log.action === 'decrypt').length
    const validationFailures = failedEvents.filter(log => log.action === 'validation_failed').length

    if (decryptionFailures > 5) {
      recommendations.push('High number of decryption failures detected. Consider passphrase recovery options.')
    }

    if (validationFailures > 3) {
      recommendations.push('Data integrity issues detected. Consider backup verification.')
    }

    if (this.auditLogs.length === 100) {
      recommendations.push('Audit log buffer is full. Consider implementing persistent logging.')
    }

    return {
      totalEvents: this.auditLogs.length,
      successfulEvents: this.auditLogs.filter(log => log.success).length,
      failedEvents: failedEvents.length,
      recentFailures,
      recommendations
    }
  }
}

/**
 * Utility functions for error handling
 */
export const EncryptionErrorHandler = {
  /**
   * Creates a user-friendly error message
   */
  getDisplayMessage(error: Error | EncryptionError): string {
    if (error instanceof EncryptionError) {
      switch (error.code) {
        case EncryptionErrorCode.INVALID_PASSPHRASE:
          return 'The passphrase you entered is incorrect. Please try again.'
        case EncryptionErrorCode.CORRUPT_DATA:
          return 'The encrypted data appears to be corrupted and cannot be decrypted.'
        case EncryptionErrorCode.WEAK_PASSPHRASE:
          return 'Your passphrase is too weak. Please choose a stronger passphrase.'
        case EncryptionErrorCode.CONTENT_TOO_LARGE:
          return 'The content is too large to encrypt. Please reduce the content size.'
        case EncryptionErrorCode.EMPTY_CONTENT:
          return 'Cannot encrypt empty content. Please add some text first.'
        default:
          return error.message || 'An encryption error occurred.'
      }
    }
    
    return error.message || 'An unexpected error occurred.'
  },

  /**
   * Determines if an error is recoverable
   */
  isRecoverable(error: Error | EncryptionError): boolean {
    if (error instanceof EncryptionError) {
      return [
        EncryptionErrorCode.INVALID_PASSPHRASE,
        EncryptionErrorCode.WEAK_PASSPHRASE,
        EncryptionErrorCode.CONTENT_TOO_LARGE,
        EncryptionErrorCode.EMPTY_CONTENT
      ].includes(error.code)
    }
    
    return false
  },

  /**
   * Suggests recovery actions
   */
  getRecoveryAction(error: Error | EncryptionError): string | null {
    if (error instanceof EncryptionError) {
      switch (error.code) {
        case EncryptionErrorCode.INVALID_PASSPHRASE:
          return 'double-check your passphrase or try passphrase recovery'
        case EncryptionErrorCode.WEAK_PASSPHRASE:
          return 'use the generate button to create a stronger passphrase'
        case EncryptionErrorCode.CONTENT_TOO_LARGE:
          return 'split your content into smaller sections'
        case EncryptionErrorCode.EMPTY_CONTENT:
          return 'add some content before encrypting'
        case EncryptionErrorCode.CORRUPT_DATA:
          return 'restore from a backup if available'
        default:
          return null
      }
    }
    
    return null
  }
}