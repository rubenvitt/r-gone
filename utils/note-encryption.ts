/**
 * Note-level encryption utilities for password-protected notes
 * Uses Web Crypto API for secure client-side encryption
 */

import { Note } from '@/types/data'

export interface NoteEncryptionResult {
    success: boolean
    encryptedNote?: Note
    error?: string
}

export interface NoteDecryptionResult {
    success: boolean
    decryptedNote?: Note
    error?: string
}

export interface PasswordValidationResult {
    isValid: boolean
    score: number  // 0-4 (weak to very strong)
    feedback: string[]
}

class NoteEncryptionService {
    private readonly ALGORITHM = 'AES-GCM'
    private readonly KEY_DERIVATION = 'PBKDF2'
    private readonly DEFAULT_ITERATIONS = 100000
    private readonly KEY_LENGTH = 256
    private readonly IV_LENGTH = 12  // 96 bits for AES-GCM

    /**
     * Generate cryptographically secure random bytes
     */
    private generateRandomBytes(length: number): Uint8Array {
        return crypto.getRandomValues(new Uint8Array(length))
    }

    /**
     * Convert ArrayBuffer to base64 string
     */
    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer)
        let binary = ''
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i])
        }
        return btoa(binary)
    }

    /**
     * Convert base64 string to ArrayBuffer
     */
    private base64ToArrayBuffer(base64: string): ArrayBuffer {
        const binary = atob(base64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i)
        }
        return bytes.buffer
    }

    /**
     * Derive encryption key from password using PBKDF2
     */
    private async deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
        const encoder = new TextEncoder()
        const passwordBuffer = encoder.encode(password)
        
        // Import password as key material
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            passwordBuffer,
            'PBKDF2',
            false,
            ['deriveKey']
        )

        // Derive AES key
        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: iterations,
                hash: 'SHA-256'
            },
            keyMaterial,
            {
                name: this.ALGORITHM,
                length: this.KEY_LENGTH
            },
            false,
            ['encrypt', 'decrypt']
        )
    }

    /**
     * Validate password strength
     */
    validatePassword(password: string): PasswordValidationResult {
        const feedback: string[] = []
        let score = 0

        if (password.length < 8) {
            feedback.push('Password should be at least 8 characters long')
        } else if (password.length >= 12) {
            score++
        }

        if (!/[a-z]/.test(password)) {
            feedback.push('Add lowercase letters')
        } else {
            score++
        }

        if (!/[A-Z]/.test(password)) {
            feedback.push('Add uppercase letters')
        } else {
            score++
        }

        if (!/[0-9]/.test(password)) {
            feedback.push('Add numbers')
        } else {
            score++
        }

        if (!/[^a-zA-Z0-9]/.test(password)) {
            feedback.push('Add special characters (!@#$%^&*)')
        } else {
            score++
        }

        // Additional checks
        if (password.length >= 16) {
            score = Math.min(score + 1, 4)
        }

        // Common patterns that reduce security
        if (/(.)\1{2,}/.test(password)) {
            feedback.push('Avoid repeating characters')
            score = Math.max(score - 1, 0)
        }

        if (/123|abc|qwe|password|admin/i.test(password)) {
            feedback.push('Avoid common patterns and words')
            score = Math.max(score - 1, 0)
        }

        return {
            isValid: score >= 2 && password.length >= 8,
            score: Math.max(score, 0),
            feedback
        }
    }

    /**
     * Generate a secure password suggestion
     */
    generateSecurePassword(length: number = 16): string {
        const lowercase = 'abcdefghijklmnopqrstuvwxyz'
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        const numbers = '0123456789'
        const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?'
        
        const allChars = lowercase + uppercase + numbers + symbols
        let password = ''
        
        // Ensure at least one character from each category
        password += lowercase[Math.floor(Math.random() * lowercase.length)]
        password += uppercase[Math.floor(Math.random() * uppercase.length)]
        password += numbers[Math.floor(Math.random() * numbers.length)]
        password += symbols[Math.floor(Math.random() * symbols.length)]
        
        // Fill remaining length with random characters
        for (let i = 4; i < length; i++) {
            password += allChars[Math.floor(Math.random() * allChars.length)]
        }
        
        // Shuffle the password
        return password.split('').sort(() => Math.random() - 0.5).join('')
    }

    /**
     * Encrypt note content with password
     */
    async encryptNote(note: Note, password: string, hint?: string): Promise<NoteEncryptionResult> {
        try {
            // Validate password
            const validation = this.validatePassword(password)
            if (!validation.isValid) {
                return {
                    success: false,
                    error: `Weak password: ${validation.feedback.join(', ')}`
                }
            }

            // Generate salt and IV
            const salt = this.generateRandomBytes(32)  // 256 bits
            const iv = this.generateRandomBytes(this.IV_LENGTH)
            const iterations = this.DEFAULT_ITERATIONS

            // Derive encryption key
            const key = await this.deriveKey(password, salt, iterations)

            // Encrypt content
            const encoder = new TextEncoder()
            const contentBuffer = encoder.encode(note.content)
            
            const encryptedContent = await crypto.subtle.encrypt(
                {
                    name: this.ALGORITHM,
                    iv: iv
                },
                key,
                contentBuffer
            )

            // Create encrypted note
            const encryptedNote: Note = {
                ...note,
                content: this.arrayBufferToBase64(encryptedContent),
                passwordProtected: true,
                encryptionData: {
                    iv: this.arrayBufferToBase64(iv),
                    salt: this.arrayBufferToBase64(salt),
                    algorithm: this.ALGORITHM,
                    keyDerivation: this.KEY_DERIVATION,
                    iterations
                },
                passwordHint: hint,
                updatedAt: new Date().toISOString()
            }

            return {
                success: true,
                encryptedNote
            }
        } catch (error) {
            console.error('Note encryption failed:', error)
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Encryption failed'
            }
        }
    }

    /**
     * Decrypt note content with password
     */
    async decryptNote(encryptedNote: Note, password: string): Promise<NoteDecryptionResult> {
        try {
            if (!encryptedNote.passwordProtected || !encryptedNote.encryptionData) {
                return {
                    success: false,
                    error: 'Note is not password protected'
                }
            }

            const { iv, salt, iterations } = encryptedNote.encryptionData

            // Convert base64 to ArrayBuffer
            const ivBuffer = this.base64ToArrayBuffer(iv)
            const saltBuffer = new Uint8Array(this.base64ToArrayBuffer(salt))
            const encryptedContent = this.base64ToArrayBuffer(encryptedNote.content)

            // Derive decryption key
            const key = await this.deriveKey(password, saltBuffer, iterations)

            // Decrypt content
            const decryptedContent = await crypto.subtle.decrypt(
                {
                    name: this.ALGORITHM,
                    iv: ivBuffer
                },
                key,
                encryptedContent
            )

            // Convert back to string
            const decoder = new TextDecoder()
            const content = decoder.decode(decryptedContent)

            // Create decrypted note
            const decryptedNote: Note = {
                ...encryptedNote,
                content,
                // Keep password protection metadata but note is temporarily unlocked
            }

            return {
                success: true,
                decryptedNote
            }
        } catch (error) {
            console.error('Note decryption failed:', error)
            return {
                success: false,
                error: 'Decryption failed - incorrect password or corrupted data'
            }
        }
    }

    /**
     * Change password for a protected note
     */
    async changeNotePassword(
        note: Note, 
        currentPassword: string, 
        newPassword: string, 
        newHint?: string
    ): Promise<NoteEncryptionResult> {
        try {
            // First decrypt with current password
            const decryptResult = await this.decryptNote(note, currentPassword)
            if (!decryptResult.success || !decryptResult.decryptedNote) {
                return {
                    success: false,
                    error: 'Current password is incorrect'
                }
            }

            // Re-encrypt with new password
            return this.encryptNote(decryptResult.decryptedNote, newPassword, newHint)
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Password change failed'
            }
        }
    }

    /**
     * Remove password protection from a note
     */
    async removePasswordProtection(note: Note, password: string): Promise<NoteDecryptionResult> {
        try {
            const decryptResult = await this.decryptNote(note, password)
            if (!decryptResult.success || !decryptResult.decryptedNote) {
                return decryptResult
            }

            // Remove encryption metadata
            const unprotectedNote: Note = {
                ...decryptResult.decryptedNote,
                passwordProtected: false,
                encryptionData: undefined,
                passwordHint: undefined,
                updatedAt: new Date().toISOString()
            }

            return {
                success: true,
                decryptedNote: unprotectedNote
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to remove password protection'
            }
        }
    }

    /**
     * Check if Web Crypto API is available
     */
    isSupported(): boolean {
        return typeof crypto !== 'undefined' && 
               typeof crypto.subtle !== 'undefined' &&
               typeof crypto.getRandomValues !== 'undefined'
    }
}

// Export singleton instance
export const noteEncryptionService = new NoteEncryptionService()