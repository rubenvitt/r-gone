import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export interface PassphraseConfig {
  id: string
  hashedPassphrase: string
  salt: string
  createdAt: string
  lastUsed?: string
  recoveryHint?: string
  failedAttempts: number
  lockedUntil?: string
}

export interface SessionData {
  id: string
  userId: string
  createdAt: string
  lastActivity: string
  expiresAt: string
  ipAddress?: string
  userAgent?: string
}

export interface AuthResult {
  success: boolean
  sessionId?: string
  error?: string
  remainingAttempts?: number
  lockedUntil?: string
}

export interface RateLimitInfo {
  attempts: number
  resetTime: number
  isLocked: boolean
  lockDuration: number
}

export class AuthServiceError extends Error {
  constructor(message: string, public code: string, public statusCode: number) {
    super(message)
    this.name = 'AuthServiceError'
  }
}

export class AuthService {
  private static readonly SALT_ROUNDS = 12
  private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours
  private static readonly IDLE_TIMEOUT = 2 * 60 * 60 * 1000 // 2 hours
  private static readonly MAX_FAILED_ATTEMPTS = 5
  private static readonly LOCKOUT_DURATION = 30 * 60 * 1000 // 30 minutes
  private static readonly PROGRESSIVE_DELAYS = [1000, 2000, 5000, 10000, 30000] // ms

  private configDir: string
  private sessionsDir: string

  constructor() {
    this.configDir = process.cwd() + '/data/auth'
    this.sessionsDir = process.cwd() + '/data/sessions'
  }

  private async ensureDirectories(): Promise<void> {
    const fs = await import('fs/promises')
    await Promise.all([
      fs.mkdir(this.configDir, { recursive: true }),
      fs.mkdir(this.sessionsDir, { recursive: true })
    ])
  }

  private getConfigPath(userId: string = 'default'): string {
    return `${this.configDir}/${userId}.auth.json`
  }

  private getSessionPath(sessionId: string): string {
    return `${this.sessionsDir}/${sessionId}.session.json`
  }

  /**
   * Hash a passphrase securely using bcrypt
   */
  private async hashPassphrase(passphrase: string): Promise<{ hash: string; salt: string }> {
    const salt = await bcrypt.genSalt(AuthService.SALT_ROUNDS)
    const hash = await bcrypt.hash(passphrase, salt)
    return { hash, salt }
  }

  /**
   * Verify a passphrase against a hash with timing attack protection
   */
  private async verifyPassphrase(passphrase: string, hashedPassphrase: string): Promise<boolean> {
    try {
      // Use bcrypt.compare which includes timing attack protection
      return await bcrypt.compare(passphrase, hashedPassphrase)
    } catch (error) {
      console.error('Passphrase verification error:', error)
      return false
    }
  }

  /**
   * Generate a secure session ID
   */
  private generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * Create or update passphrase configuration
   */
  async setPassphrase(
    passphrase: string, 
    userId: string = 'default',
    recoveryHint?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.ensureDirectories()

      // Validate passphrase strength
      if (passphrase.length < 8) {
        return { success: false, error: 'Passphrase must be at least 8 characters long' }
      }

      const { hash, salt } = await this.hashPassphrase(passphrase)
      
      const config: PassphraseConfig = {
        id: userId,
        hashedPassphrase: hash,
        salt,
        createdAt: new Date().toISOString(),
        recoveryHint,
        failedAttempts: 0
      }

      const fs = await import('fs/promises')
      await fs.writeFile(this.getConfigPath(userId), JSON.stringify(config, null, 2))

      return { success: true }
    } catch (error) {
      console.error('Failed to set passphrase:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to set passphrase'
      }
    }
  }

  /**
   * Get passphrase configuration
   */
  private async getPassphraseConfig(userId: string = 'default'): Promise<PassphraseConfig | null> {
    try {
      const fs = await import('fs/promises')
      const data = await fs.readFile(this.getConfigPath(userId), 'utf-8')
      return JSON.parse(data) as PassphraseConfig
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null
      }
      throw error
    }
  }

  /**
   * Update passphrase configuration
   */
  private async updatePassphraseConfig(config: PassphraseConfig): Promise<void> {
    const fs = await import('fs/promises')
    await fs.writeFile(this.getConfigPath(config.id), JSON.stringify(config, null, 2))
  }

  /**
   * Check if user is currently locked out
   */
  private isLockedOut(config: PassphraseConfig): boolean {
    if (!config.lockedUntil) return false
    return new Date(config.lockedUntil) > new Date()
  }

  /**
   * Calculate progressive delay based on failed attempts
   */
  private getProgressiveDelay(attempts: number): number {
    const index = Math.min(attempts - 1, AuthService.PROGRESSIVE_DELAYS.length - 1)
    return AuthService.PROGRESSIVE_DELAYS[index] || AuthService.PROGRESSIVE_DELAYS[AuthService.PROGRESSIVE_DELAYS.length - 1]
  }

  /**
   * Apply rate limiting and lockout logic
   */
  private async applyRateLimit(config: PassphraseConfig, success: boolean): Promise<PassphraseConfig> {
    const now = new Date()
    
    if (success) {
      // Reset on successful authentication
      config.failedAttempts = 0
      config.lockedUntil = undefined
      config.lastUsed = now.toISOString()
    } else {
      config.failedAttempts += 1
      
      if (config.failedAttempts >= AuthService.MAX_FAILED_ATTEMPTS) {
        // Lock the account
        const lockUntil = new Date(now.getTime() + AuthService.LOCKOUT_DURATION)
        config.lockedUntil = lockUntil.toISOString()
      }
    }

    await this.updatePassphraseConfig(config)
    return config
  }

  /**
   * Authenticate with passphrase
   */
  async authenticate(
    passphrase: string, 
    userId: string = 'default',
    clientInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<AuthResult> {
    try {
      await this.ensureDirectories()

      const config = await this.getPassphraseConfig(userId)
      if (!config) {
        return { 
          success: false, 
          error: 'No passphrase configured. Please set up a passphrase first.' 
        }
      }

      // Check if account is locked
      if (this.isLockedOut(config)) {
        return {
          success: false,
          error: 'Account is temporarily locked due to too many failed attempts',
          lockedUntil: config.lockedUntil
        }
      }

      // Add progressive delay for failed attempts
      if (config.failedAttempts > 0) {
        const delay = this.getProgressiveDelay(config.failedAttempts)
        await new Promise(resolve => setTimeout(resolve, delay))
      }

      // Verify passphrase
      const isValid = await this.verifyPassphrase(passphrase, config.hashedPassphrase)
      
      // Apply rate limiting
      const updatedConfig = await this.applyRateLimit(config, isValid)

      if (!isValid) {
        const remainingAttempts = Math.max(0, AuthService.MAX_FAILED_ATTEMPTS - updatedConfig.failedAttempts)
        return {
          success: false,
          error: 'Invalid passphrase',
          remainingAttempts,
          lockedUntil: updatedConfig.lockedUntil
        }
      }

      // Create session
      const sessionId = this.generateSessionId()
      const now = new Date()
      const session: SessionData = {
        id: sessionId,
        userId,
        createdAt: now.toISOString(),
        lastActivity: now.toISOString(),
        expiresAt: new Date(now.getTime() + AuthService.SESSION_DURATION).toISOString(),
        ipAddress: clientInfo?.ipAddress,
        userAgent: clientInfo?.userAgent
      }

      const fs = await import('fs/promises')
      await fs.writeFile(this.getSessionPath(sessionId), JSON.stringify(session, null, 2))

      return {
        success: true,
        sessionId
      }
    } catch (error) {
      console.error('Authentication error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      }
    }
  }

  /**
   * Validate a session
   */
  async validateSession(sessionId: string): Promise<{ valid: boolean; userId?: string; error?: string }> {
    try {
      const fs = await import('fs/promises')
      const sessionData = await fs.readFile(this.getSessionPath(sessionId), 'utf-8')
      const session = JSON.parse(sessionData) as SessionData

      const now = new Date()
      const expiresAt = new Date(session.expiresAt)
      const lastActivity = new Date(session.lastActivity)

      // Check absolute expiration
      if (now > expiresAt) {
        await this.destroySession(sessionId)
        return { valid: false, error: 'Session expired' }
      }

      // Check idle timeout
      if (now.getTime() - lastActivity.getTime() > AuthService.IDLE_TIMEOUT) {
        await this.destroySession(sessionId)
        return { valid: false, error: 'Session timed out due to inactivity' }
      }

      // Update last activity
      session.lastActivity = now.toISOString()
      await fs.writeFile(this.getSessionPath(sessionId), JSON.stringify(session, null, 2))

      return { valid: true, userId: session.userId }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { valid: false, error: 'Session not found' }
      }
      console.error('Session validation error:', error)
      return { valid: false, error: 'Session validation failed' }
    }
  }

  /**
   * Destroy a session
   */
  async destroySession(sessionId: string): Promise<boolean> {
    try {
      const fs = await import('fs/promises')
      await fs.unlink(this.getSessionPath(sessionId))
      return true
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return true // Session already doesn't exist
      }
      console.error('Failed to destroy session:', error)
      return false
    }
  }

  /**
   * Change passphrase (requires current passphrase)
   */
  async changePassphrase(
    currentPassphrase: string,
    newPassphrase: string,
    userId: string = 'default'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const config = await this.getPassphraseConfig(userId)
      if (!config) {
        return { success: false, error: 'No passphrase configured' }
      }

      // Verify current passphrase
      const isCurrentValid = await this.verifyPassphrase(currentPassphrase, config.hashedPassphrase)
      if (!isCurrentValid) {
        return { success: false, error: 'Current passphrase is incorrect' }
      }

      // Set new passphrase
      const result = await this.setPassphrase(newPassphrase, userId, config.recoveryHint)
      return result
    } catch (error) {
      console.error('Failed to change passphrase:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to change passphrase'
      }
    }
  }

  /**
   * Get rate limiting information
   */
  async getRateLimitInfo(userId: string = 'default'): Promise<RateLimitInfo> {
    const config = await this.getPassphraseConfig(userId)
    
    if (!config) {
      return {
        attempts: 0,
        resetTime: 0,
        isLocked: false,
        lockDuration: 0
      }
    }

    const isLocked = this.isLockedOut(config)
    const resetTime = config.lockedUntil ? new Date(config.lockedUntil).getTime() : 0

    return {
      attempts: config.failedAttempts,
      resetTime,
      isLocked,
      lockDuration: isLocked ? resetTime - Date.now() : 0
    }
  }

  /**
   * Check if passphrase is configured
   */
  async hasPassphrase(userId: string = 'default'): Promise<boolean> {
    const config = await this.getPassphraseConfig(userId)
    return config !== null
  }

  /**
   * Get recovery hint (if configured)
   */
  async getRecoveryHint(userId: string = 'default'): Promise<string | null> {
    const config = await this.getPassphraseConfig(userId)
    return config?.recoveryHint || null
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const fs = await import('fs/promises')
      const sessionFiles = await fs.readdir(this.sessionsDir)
      const now = new Date()
      let cleanedCount = 0

      for (const file of sessionFiles) {
        if (!file.endsWith('.session.json')) continue

        try {
          const sessionData = await fs.readFile(`${this.sessionsDir}/${file}`, 'utf-8')
          const session = JSON.parse(sessionData) as SessionData
          
          const expiresAt = new Date(session.expiresAt)
          const lastActivity = new Date(session.lastActivity)
          
          if (now > expiresAt || (now.getTime() - lastActivity.getTime() > AuthService.IDLE_TIMEOUT)) {
            await fs.unlink(`${this.sessionsDir}/${file}`)
            cleanedCount++
          }
        } catch (error) {
          console.warn(`Failed to process session file ${file}:`, error)
        }
      }

      return cleanedCount
    } catch (error) {
      console.error('Failed to cleanup expired sessions:', error)
      return 0
    }
  }
}

// Singleton instance
export const authService = new AuthService()