'use client'

import { PasswordEntry, PasswordVault, PasswordCategory, PasswordStrength, PasswordHistoryEntry, CustomField } from '@/types/data'
import { encryptionService } from '@/services/encryption-service'

export interface PasswordGeneratorOptions {
  length: number
  includeUppercase: boolean
  includeLowercase: boolean
  includeNumbers: boolean
  includeSymbols: boolean
  excludeSimilar: boolean
  excludeAmbiguous: boolean
}

export interface PasswordAnalysisResult {
  strength: PasswordStrength
  isDuplicate: boolean
  isExpired: boolean
  recommendations: string[]
}

export class PasswordVaultService {
  private static instance: PasswordVaultService
  
  public static getInstance(): PasswordVaultService {
    if (!PasswordVaultService.instance) {
      PasswordVaultService.instance = new PasswordVaultService()
    }
    return PasswordVaultService.instance
  }

  /**
   * Create a new empty password vault
   */
  createEmptyVault(): PasswordVault {
    return {
      entries: [],
      categories: ['personal', 'business', 'financial', 'social', 'shopping', 'entertainment', 'utilities', 'healthcare', 'education', 'other'],
      settings: {
        passwordGenerator: {
          length: 16,
          includeUppercase: true,
          includeLowercase: true,
          includeNumbers: true,
          includeSymbols: true,
          excludeSimilar: false,
          excludeAmbiguous: true
        },
        security: {
          autoLockMinutes: 15,
          clearClipboardSeconds: 30,
          showPasswordsByDefault: false,
          requireMasterPasswordForView: true
        },
        import: {
          allowDuplicates: false,
          autoCategory: true
        }
      },
      statistics: {
        totalEntries: 0,
        weakPasswords: 0,
        duplicatePasswords: 0,
        expiredPasswords: 0,
        lastAnalysis: new Date().toISOString()
      }
    }
  }

  /**
   * Add a new password entry
   */
  addEntry(vault: PasswordVault, entry: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt' | 'strength'>): PasswordVault {
    const newEntry: PasswordEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      strength: this.analyzePasswordStrength(entry.password),
      history: []
    }

    const updatedVault = {
      ...vault,
      entries: [...vault.entries, newEntry]
    }

    return this.updateStatistics(updatedVault)
  }

  /**
   * Update an existing password entry
   */
  updateEntry(vault: PasswordVault, entryId: string, updates: Partial<PasswordEntry>): PasswordVault {
    const entryIndex = vault.entries.findIndex(e => e.id === entryId)
    if (entryIndex === -1) {
      throw new Error('Password entry not found')
    }

    const currentEntry = vault.entries[entryIndex]
    const isPasswordChanged = updates.password && updates.password !== currentEntry.password

    // If password changed, add to history
    let updatedHistory = currentEntry.history || []
    if (isPasswordChanged && currentEntry.password) {
      const historyEntry: PasswordHistoryEntry = {
        id: crypto.randomUUID(),
        password: currentEntry.password,
        changedAt: new Date().toISOString(),
        reason: 'Manual update'
      }
      updatedHistory = [...updatedHistory, historyEntry]
      
      // Keep only last 10 password history entries
      if (updatedHistory.length > 10) {
        updatedHistory = updatedHistory.slice(-10)
      }
    }

    const updatedEntry: PasswordEntry = {
      ...currentEntry,
      ...updates,
      id: entryId, // Ensure ID doesn't change
      updatedAt: new Date().toISOString(),
      history: updatedHistory,
      strength: updates.password ? this.analyzePasswordStrength(updates.password) : currentEntry.strength
    }

    const updatedEntries = [...vault.entries]
    updatedEntries[entryIndex] = updatedEntry

    const updatedVault = {
      ...vault,
      entries: updatedEntries
    }

    return this.updateStatistics(updatedVault)
  }

  /**
   * Delete a password entry
   */
  deleteEntry(vault: PasswordVault, entryId: string): PasswordVault {
    const updatedVault = {
      ...vault,
      entries: vault.entries.filter(e => e.id !== entryId)
    }

    return this.updateStatistics(updatedVault)
  }

  /**
   * Search password entries
   */
  searchEntries(vault: PasswordVault, query: string): PasswordEntry[] {
    if (!query.trim()) {
      return vault.entries
    }

    const searchTerm = query.toLowerCase()
    return vault.entries.filter(entry => 
      entry.serviceName.toLowerCase().includes(searchTerm) ||
      entry.username.toLowerCase().includes(searchTerm) ||
      entry.email?.toLowerCase().includes(searchTerm) ||
      entry.url?.toLowerCase().includes(searchTerm) ||
      entry.notes?.toLowerCase().includes(searchTerm) ||
      entry.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
    )
  }

  /**
   * Filter entries by category
   */
  filterByCategory(vault: PasswordVault, category: PasswordCategory | 'all'): PasswordEntry[] {
    if (category === 'all') {
      return vault.entries
    }
    return vault.entries.filter(entry => entry.category === category)
  }

  /**
   * Get entries by strength score
   */
  getEntriesByStrength(vault: PasswordVault, minScore: number = 0, maxScore: number = 4): PasswordEntry[] {
    return vault.entries.filter(entry => {
      const score = entry.strength?.score ?? 0
      return score >= minScore && score <= maxScore
    })
  }

  /**
   * Find duplicate passwords
   */
  findDuplicatePasswords(vault: PasswordVault): PasswordEntry[][] {
    const passwordGroups = new Map<string, PasswordEntry[]>()
    
    vault.entries.forEach(entry => {
      const password = entry.password
      if (!passwordGroups.has(password)) {
        passwordGroups.set(password, [])
      }
      passwordGroups.get(password)!.push(entry)
    })

    return Array.from(passwordGroups.values()).filter(group => group.length > 1)
  }

  /**
   * Get expired passwords
   */
  getExpiredPasswords(vault: PasswordVault): PasswordEntry[] {
    const now = new Date()
    return vault.entries.filter(entry => {
      return entry.expiresAt && new Date(entry.expiresAt) < now
    })
  }

  /**
   * Generate a secure password
   */
  generatePassword(options: PasswordGeneratorOptions): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const numbers = '0123456789'
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?'
    const similar = 'il1Lo0O'
    const ambiguous = '{}[]()/\\\'"`~,;.<>'

    let charset = ''
    
    if (options.includeUppercase) charset += uppercase
    if (options.includeLowercase) charset += lowercase
    if (options.includeNumbers) charset += numbers
    if (options.includeSymbols) charset += symbols

    if (options.excludeSimilar) {
      charset = charset.split('').filter(char => !similar.includes(char)).join('')
    }

    if (options.excludeAmbiguous) {
      charset = charset.split('').filter(char => !ambiguous.includes(char)).join('')
    }

    if (charset.length === 0) {
      throw new Error('No characters available for password generation')
    }

    let password = ''
    const array = new Uint32Array(options.length)
    crypto.getRandomValues(array)

    for (let i = 0; i < options.length; i++) {
      password += charset[array[i] % charset.length]
    }

    // Ensure password meets minimum requirements
    if (options.includeUppercase && !/[A-Z]/.test(password)) {
      const randomIndex = Math.floor(Math.random() * password.length)
      const randomUpper = uppercase[Math.floor(Math.random() * uppercase.length)]
      password = password.substring(0, randomIndex) + randomUpper + password.substring(randomIndex + 1)
    }

    if (options.includeLowercase && !/[a-z]/.test(password)) {
      const randomIndex = Math.floor(Math.random() * password.length)
      const randomLower = lowercase[Math.floor(Math.random() * lowercase.length)]
      password = password.substring(0, randomIndex) + randomLower + password.substring(randomIndex + 1)
    }

    if (options.includeNumbers && !/[0-9]/.test(password)) {
      const randomIndex = Math.floor(Math.random() * password.length)
      const randomNumber = numbers[Math.floor(Math.random() * numbers.length)]
      password = password.substring(0, randomIndex) + randomNumber + password.substring(randomIndex + 1)
    }

    if (options.includeSymbols && !/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
      const randomIndex = Math.floor(Math.random() * password.length)
      const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)]
      password = password.substring(0, randomIndex) + randomSymbol + password.substring(randomIndex + 1)
    }

    return password
  }

  /**
   * Analyze password strength
   */
  analyzePasswordStrength(password: string): PasswordStrength {
    // Simple password strength analysis
    // In a real implementation, you would use a library like zxcvbn
    let score = 0
    const feedback: string[] = []
    let warning = ''

    if (password.length < 8) {
      feedback.push('Use at least 8 characters')
    } else if (password.length < 12) {
      score += 1
      feedback.push('Consider using more characters')
    } else {
      score += 2
    }

    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
      score += 1
    } else {
      feedback.push('Use both uppercase and lowercase letters')
    }

    if (/[0-9]/.test(password)) {
      score += 1
    } else {
      feedback.push('Include numbers')
    }

    if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
      score += 1
    } else {
      feedback.push('Include special characters')
    }

    // Check for common patterns
    if (/(.)\1{2,}/.test(password)) {
      score = Math.max(0, score - 1)
      warning = 'Avoid repeated characters'
    }

    if (/123|abc|password|qwerty/i.test(password)) {
      score = Math.max(0, score - 2)
      warning = 'Avoid common words and patterns'
    }

    const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong']
    const crackTimes = ['< 1 second', '< 1 minute', '< 1 hour', '< 1 day', '> 1 year']

    return {
      score: Math.min(4, score),
      feedback,
      warning,
      guessesLog10: score * 2, // Simplified calculation
      crackTimeDisplay: crackTimes[Math.min(4, score)]
    }
  }

  /**
   * Analyze password entry
   */
  analyzeEntry(vault: PasswordVault, entry: PasswordEntry): PasswordAnalysisResult {
    const strength = this.analyzePasswordStrength(entry.password)
    const isDuplicate = vault.entries.some(e => e.id !== entry.id && e.password === entry.password)
    const isExpired = entry.expiresAt ? new Date(entry.expiresAt) < new Date() : false

    const recommendations: string[] = []
    
    if (strength.score < 3) {
      recommendations.push('Consider using a stronger password')
    }
    
    if (isDuplicate) {
      recommendations.push('This password is used for other accounts')
    }
    
    if (isExpired) {
      recommendations.push('This password has expired')
    }

    // Check password age
    const passwordAge = Date.now() - new Date(entry.updatedAt).getTime()
    const daysSinceUpdate = passwordAge / (1000 * 60 * 60 * 24)
    
    if (daysSinceUpdate > 365) {
      recommendations.push('Consider updating this password (over 1 year old)')
    } else if (daysSinceUpdate > 90) {
      recommendations.push('Consider updating this password (over 3 months old)')
    }

    return {
      strength,
      isDuplicate,
      isExpired,
      recommendations
    }
  }

  /**
   * Update vault statistics
   */
  private updateStatistics(vault: PasswordVault): PasswordVault {
    const weakPasswords = vault.entries.filter(e => (e.strength?.score ?? 0) < 3).length
    const duplicateGroups = this.findDuplicatePasswords(vault)
    const duplicatePasswords = duplicateGroups.reduce((sum, group) => sum + group.length, 0)
    const expiredPasswords = this.getExpiredPasswords(vault).length

    return {
      ...vault,
      statistics: {
        totalEntries: vault.entries.length,
        weakPasswords,
        duplicatePasswords,
        expiredPasswords,
        lastAnalysis: new Date().toISOString()
      }
    }
  }

  /**
   * Copy password to clipboard with auto-clear
   */
  async copyToClipboard(password: string, clearAfterSeconds: number = 30): Promise<void> {
    try {
      await navigator.clipboard.writeText(password)
      
      // Auto-clear clipboard after specified time
      setTimeout(async () => {
        try {
          const clipboardText = await navigator.clipboard.readText()
          if (clipboardText === password) {
            await navigator.clipboard.writeText('')
          }
        } catch (error) {
          // Ignore errors - user might have copied something else
        }
      }, clearAfterSeconds * 1000)
    } catch (error) {
      throw new Error('Failed to copy to clipboard')
    }
  }

  /**
   * Import passwords from various formats
   */
  importFromCSV(vault: PasswordVault, csvData: string): PasswordVault {
    const lines = csvData.split('\n').filter(line => line.trim())
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    
    const requiredFields = ['service', 'username', 'password']
    const missingFields = requiredFields.filter(field => 
      !headers.some(h => h.includes(field) || h.includes(field.replace('service', 'name')))
    )
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`)
    }

    let updatedVault = { ...vault }
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      
      if (values.length !== headers.length) continue

      const entry: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt' | 'strength'> = {
        serviceName: this.getFieldValue(headers, values, ['service', 'name', 'title']) || `Imported Service ${i}`,
        username: this.getFieldValue(headers, values, ['username', 'user', 'login']) || '',
        email: this.getFieldValue(headers, values, ['email', 'mail']),
        password: this.getFieldValue(headers, values, ['password', 'pass']) || '',
        url: this.getFieldValue(headers, values, ['url', 'website', 'site']),
        notes: this.getFieldValue(headers, values, ['notes', 'note', 'comments']),
        category: this.getCategoryFromService(this.getFieldValue(headers, values, ['service', 'name', 'title']) || ''),
        tags: []
      }

      if (entry.password) {
        updatedVault = this.addEntry(updatedVault, entry)
      }
    }

    return updatedVault
  }

  private getFieldValue(headers: string[], values: string[], fieldNames: string[]): string | undefined {
    for (const fieldName of fieldNames) {
      const index = headers.findIndex(h => h.includes(fieldName))
      if (index !== -1 && index < values.length) {
        return values[index] || undefined
      }
    }
    return undefined
  }

  private getCategoryFromService(serviceName: string): PasswordCategory {
    const service = serviceName.toLowerCase()
    
    if (service.includes('bank') || service.includes('credit') || service.includes('paypal') || service.includes('stripe')) {
      return 'financial'
    }
    if (service.includes('work') || service.includes('office') || service.includes('slack') || service.includes('teams')) {
      return 'business'
    }
    if (service.includes('facebook') || service.includes('twitter') || service.includes('instagram') || service.includes('linkedin')) {
      return 'social'
    }
    if (service.includes('amazon') || service.includes('shop') || service.includes('store') || service.includes('ebay')) {
      return 'shopping'
    }
    if (service.includes('netflix') || service.includes('youtube') || service.includes('spotify') || service.includes('game')) {
      return 'entertainment'
    }
    if (service.includes('electric') || service.includes('gas') || service.includes('water') || service.includes('internet')) {
      return 'utilities'
    }
    if (service.includes('health') || service.includes('medical') || service.includes('doctor') || service.includes('hospital')) {
      return 'healthcare'
    }
    if (service.includes('school') || service.includes('university') || service.includes('college') || service.includes('course')) {
      return 'education'
    }
    
    return 'personal'
  }
}

// Export singleton instance
export const passwordVaultService = PasswordVaultService.getInstance()