'use client'

import { useState, useCallback } from 'react'
import { encryptionService, EncryptionResult, DecryptionResult } from '@/services/encryption-service'
import { DecryptedData } from '@/types/data'

export interface EncryptionState {
  isEncrypting: boolean
  isDecrypting: boolean
  lastError: string | null
  isEncrypted: boolean
}

export interface UseEncryptionReturn {
  state: EncryptionState
  encryptContent: (content: string, passphrase: string, title?: string) => Promise<EncryptionResult>
  decryptContent: (encryptedData: string, passphrase: string) => Promise<DecryptionResult>
  validatePassphrase: (passphrase: string) => { isValid: boolean; errors: string[] }
  generatePassphrase: (length?: number) => string
  isContentEncrypted: (content: string) => boolean
  extractRichTextContent: (decryptedData: DecryptedData) => string
  clearError: () => void
}

export function useEncryption(): UseEncryptionReturn {
  const [state, setState] = useState<EncryptionState>({
    isEncrypting: false,
    isDecrypting: false,
    lastError: null,
    isEncrypted: false
  })

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, lastError: null }))
  }, [])

  const encryptContent = useCallback(async (
    content: string, 
    passphrase: string, 
    title?: string
  ): Promise<EncryptionResult> => {
    setState(prev => ({ ...prev, isEncrypting: true, lastError: null }))
    
    try {
      const result = await encryptionService.encryptContent(content, passphrase, title)
      
      setState(prev => ({
        ...prev,
        isEncrypting: false,
        lastError: result.success ? null : result.error || 'Encryption failed',
        isEncrypted: result.success
      }))
      
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Encryption failed'
      setState(prev => ({
        ...prev,
        isEncrypting: false,
        lastError: errorMessage,
        isEncrypted: false
      }))
      
      return {
        success: false,
        error: errorMessage
      }
    }
  }, [])

  const decryptContent = useCallback(async (
    encryptedData: string, 
    passphrase: string
  ): Promise<DecryptionResult> => {
    setState(prev => ({ ...prev, isDecrypting: true, lastError: null }))
    
    try {
      const result = await encryptionService.decryptContent(encryptedData, passphrase)
      
      setState(prev => ({
        ...prev,
        isDecrypting: false,
        lastError: result.success ? null : result.error || 'Decryption failed'
      }))
      
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Decryption failed'
      setState(prev => ({
        ...prev,
        isDecrypting: false,
        lastError: errorMessage
      }))
      
      return {
        success: false,
        error: errorMessage
      }
    }
  }, [])

  const validatePassphrase = useCallback((passphrase: string) => {
    return encryptionService.validatePassphrase(passphrase)
  }, [])

  const generatePassphrase = useCallback((length?: number) => {
    return encryptionService.generateSecurePassphrase(length)
  }, [])

  const isContentEncrypted = useCallback((content: string) => {
    return encryptionService.isContentEncrypted(content)
  }, [])

  const extractRichTextContent = useCallback((decryptedData: DecryptedData) => {
    return encryptionService.extractRichTextContent(decryptedData)
  }, [])

  return {
    state,
    encryptContent,
    decryptContent,
    validatePassphrase,
    generatePassphrase,
    isContentEncrypted,
    extractRichTextContent,
    clearError
  }
}