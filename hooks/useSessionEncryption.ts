'use client'

import { useState, useCallback, useEffect } from 'react'
import { sessionPassphraseService } from '@/services/session-passphrase-service'
import { useEncryption } from '@/hooks/useEncryption'
import { EncryptionResult, DecryptionResult } from '@/services/encryption-service'
import { DecryptedData } from '@/types/data'

export interface UseSessionEncryptionReturn {
  // State
  hasSessionPassphrase: boolean
  isAuthenticated: boolean
  
  // Encryption methods that use the session passphrase
  encryptWithSession: (content: string, title?: string) => Promise<EncryptionResult>
  decryptWithSession: (encryptedData: string) => Promise<DecryptionResult>
  
  // Fallback methods with custom passphrase
  encryptWithCustom: (content: string, passphrase: string, title?: string) => Promise<EncryptionResult>
  decryptWithCustom: (encryptedData: string, passphrase: string) => Promise<DecryptionResult>
  
  // Utility methods from useEncryption
  validatePassphrase: (passphrase: string) => { isValid: boolean; errors: string[] }
  generatePassphrase: (length?: number) => string
  isContentEncrypted: (content: string) => boolean
  extractRichTextContent: (decryptedData: DecryptedData) => string
  
  // State from useEncryption
  state: {
    isEncrypting: boolean
    isDecrypting: boolean
    lastError: string | null
    isEncrypted: boolean
  }
  clearError: () => void
}

export function useSessionEncryption(): UseSessionEncryptionReturn {
  const [hasSessionPassphrase, setHasSessionPassphrase] = useState(false)
  const encryption = useEncryption()
  
  // Check for session passphrase on mount and when it changes
  useEffect(() => {
    const checkSession = () => {
      setHasSessionPassphrase(sessionPassphraseService.hasPassphrase())
    }
    
    checkSession()
    
    // Check periodically in case the session changes
    const interval = setInterval(checkSession, 1000)
    
    return () => clearInterval(interval)
  }, [])
  
  // Encrypt using the session passphrase
  const encryptWithSession = useCallback(async (
    content: string, 
    title?: string
  ): Promise<EncryptionResult> => {
    const passphrase = sessionPassphraseService.getPassphrase()
    console.log('encryptWithSession - passphrase available:', !!passphrase)
    console.log('encryptWithSession - passphrase length:', passphrase?.length)
    console.log('encryptWithSession - has session passphrase:', sessionPassphraseService.hasPassphrase())
    
    if (!passphrase) {
      console.error('No session passphrase available')
      return {
        success: false,
        error: 'No session passphrase available. Please log in first.'
      }
    }
    
    console.log('Encrypting with session passphrase...', passphrase.substring(0, 10) + '...')
    const result = await encryption.encryptContent(content, passphrase, title)
    console.log('Encryption result:', result)
    return result
  }, [encryption])
  
  // Decrypt using the session passphrase
  const decryptWithSession = useCallback(async (
    encryptedData: string
  ): Promise<DecryptionResult> => {
    const passphrase = sessionPassphraseService.getPassphrase()
    
    if (!passphrase) {
      return {
        success: false,
        error: 'No session passphrase available. Please log in first.'
      }
    }
    
    return encryption.decryptContent(encryptedData, passphrase)
  }, [encryption])
  
  // Encrypt with a custom passphrase (fallback)
  const encryptWithCustom = useCallback(async (
    content: string,
    passphrase: string,
    title?: string
  ): Promise<EncryptionResult> => {
    return encryption.encryptContent(content, passphrase, title)
  }, [encryption])
  
  // Decrypt with a custom passphrase (fallback)
  const decryptWithCustom = useCallback(async (
    encryptedData: string,
    passphrase: string
  ): Promise<DecryptionResult> => {
    return encryption.decryptContent(encryptedData, passphrase)
  }, [encryption])
  
  return {
    // State
    hasSessionPassphrase,
    isAuthenticated: hasSessionPassphrase,
    
    // Session-based methods
    encryptWithSession,
    decryptWithSession,
    
    // Custom passphrase methods
    encryptWithCustom,
    decryptWithCustom,
    
    // Utility methods
    validatePassphrase: encryption.validatePassphrase,
    generatePassphrase: encryption.generatePassphrase,
    isContentEncrypted: encryption.isContentEncrypted,
    extractRichTextContent: encryption.extractRichTextContent,
    
    // State
    state: encryption.state,
    clearError: encryption.clearError
  }
}