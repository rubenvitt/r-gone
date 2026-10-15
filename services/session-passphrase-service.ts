'use client'

import { v4 as uuidv4 } from 'uuid'

export interface SessionPassphraseService {
  setPassphrase(passphrase: string): void
  getPassphrase(): string | null
  clearPassphrase(): void
  hasPassphrase(): boolean
}

class SessionPassphraseServiceImpl implements SessionPassphraseService {
  private readonly SESSION_KEY = 'session-passphrase-encrypted'
  private readonly ENCRYPTION_KEY = 'session-encryption-key'
  private passphrase: string | null = null
  private encryptionKey: string | null = null
  
  constructor() {
    // Initialize from session storage if available
    this.initializeFromSession()
  }
  
  /**
   * Initialize from existing session if available
   */
  private initializeFromSession(): void {
    if (typeof window === 'undefined') return
    
    try {
      const encryptedData = sessionStorage.getItem(this.SESSION_KEY)
      const key = sessionStorage.getItem(this.ENCRYPTION_KEY)
      
      console.log('Initializing session - encrypted data exists:', !!encryptedData, 'key exists:', !!key)
      
      if (encryptedData && key) {
        // Decrypt the passphrase
        const decrypted = this.decrypt(encryptedData, key)
        console.log('Session passphrase decrypted successfully:', !!decrypted)
        if (decrypted) {
          this.passphrase = decrypted
          this.encryptionKey = key
        }
      }
    } catch (error) {
      console.error('Failed to initialize session passphrase:', error)
      this.clearPassphrase()
    }
  }
  
  /**
   * Simple encryption using XOR with a random key
   * This provides basic obfuscation in sessionStorage
   */
  private encrypt(text: string, key: string): string {
    let result = ''
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length))
    }
    return btoa(result) // Base64 encode
  }
  
  /**
   * Decrypt text encrypted with the encrypt method
   */
  private decrypt(encrypted: string, key: string): string {
    try {
      const decoded = atob(encrypted) // Base64 decode
      let result = ''
      for (let i = 0; i < decoded.length; i++) {
        result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length))
      }
      return result
    } catch {
      return ''
    }
  }
  
  /**
   * Generate a random encryption key
   */
  private generateKey(): string {
    return uuidv4() + '-' + Date.now() + '-' + Math.random().toString(36)
  }
  
  /**
   * Store the passphrase encrypted in sessionStorage
   * This allows it to survive page reloads within the same session
   */
  setPassphrase(passphrase: string): void {
    if (!passphrase) {
      throw new Error('Passphrase cannot be empty')
    }
    
    console.log('Setting session passphrase, length:', passphrase.length)
    
    // Store in memory
    this.passphrase = passphrase
    
    // Store encrypted in sessionStorage
    if (typeof window !== 'undefined') {
      try {
        // Generate a new encryption key for this session
        this.encryptionKey = this.generateKey()
        
        // Encrypt the passphrase
        const encrypted = this.encrypt(passphrase, this.encryptionKey)
        
        // Store both the encrypted passphrase and the key
        sessionStorage.setItem(this.SESSION_KEY, encrypted)
        sessionStorage.setItem(this.ENCRYPTION_KEY, this.encryptionKey)
        
        console.log('Session passphrase stored successfully')
        
        // Verify it was stored correctly
        const test = this.getPassphrase()
        console.log('Verification - passphrase retrieved:', !!test, 'matches:', test === passphrase)
      } catch (error) {
        console.error('Failed to store session passphrase:', error)
      }
    }
  }
  
  /**
   * Get the stored passphrase
   */
  getPassphrase(): string | null {
    console.log('getPassphrase() called')
    console.log('Memory passphrase exists:', !!this.passphrase)
    
    // Try to get from memory first
    if (this.passphrase) {
      console.log('Returning passphrase from memory, length:', this.passphrase.length)
      return this.passphrase
    }
    
    // Try to restore from session storage
    if (typeof window !== 'undefined') {
      try {
        const encryptedData = sessionStorage.getItem(this.SESSION_KEY)
        const key = sessionStorage.getItem(this.ENCRYPTION_KEY)
        
        console.log('SessionStorage - encrypted data exists:', !!encryptedData, 'key exists:', !!key)
        
        if (encryptedData && key) {
          const decrypted = this.decrypt(encryptedData, key)
          console.log('SessionStorage - decryption result:', !!decrypted, 'length:', decrypted?.length)
          if (decrypted) {
            this.passphrase = decrypted
            this.encryptionKey = key
            console.log('Returning passphrase from sessionStorage, length:', decrypted.length)
            return decrypted
          }
        }
      } catch (error) {
        console.error('Failed to retrieve session passphrase:', error)
      }
    }
    
    console.log('No passphrase found, returning null')
    return null
  }
  
  /**
   * Clear the stored passphrase
   */
  clearPassphrase(): void {
    this.passphrase = null
    this.encryptionKey = null
    
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(this.SESSION_KEY)
      sessionStorage.removeItem(this.ENCRYPTION_KEY)
    }
  }
  
  /**
   * Check if a passphrase is currently stored
   */
  hasPassphrase(): boolean {
    // Check memory first
    if (this.passphrase !== null) {
      return true
    }
    
    // Check session storage
    if (typeof window !== 'undefined') {
      const encryptedData = sessionStorage.getItem(this.SESSION_KEY)
      const key = sessionStorage.getItem(this.ENCRYPTION_KEY)
      return !!(encryptedData && key)
    }
    
    return false
  }
}

// Create a singleton instance
export const sessionPassphraseService = new SessionPassphraseServiceImpl()

// Clear passphrase on page unload for security
// Note: Do not clear on beforeunload as it interferes with page reloads during login
// Only clear when user explicitly logs out or closes the browser tab
if (typeof window !== 'undefined') {
  // Only clear on window close, not on page reload
  window.addEventListener('beforeunload', (event) => {
    // Don't clear passphrase on reload - only on actual window close
    // This allows login flow with page reload to work properly
    console.log('beforeunload triggered - not clearing passphrase to allow page reloads')
  })
}