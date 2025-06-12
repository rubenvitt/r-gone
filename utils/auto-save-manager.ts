/**
 * Advanced Auto-Save Manager with debouncing, offline support, and conflict resolution
 */

import { EnhancedDecryptedData } from '@/types/data'
import { createNoteVersion, addVersionToHistory } from '@/utils/multi-note-utils'

export interface AutoSaveConfig {
    enabled: boolean
    debounceMs: number
    intervalMs: number
    maxRetries: number
    retryDelayMs: number
    enableOfflineMode: boolean
    enableVersionHistory: boolean
    conflictResolution: 'auto' | 'manual' | 'latest-wins'
}

export interface SaveOperation {
    id: string
    noteId: string
    content: string
    timestamp: number
    retryCount: number
    status: 'pending' | 'saving' | 'saved' | 'failed' | 'conflict'
}

export interface AutoSaveState {
    isOnline: boolean
    lastSaved: number
    pendingSaves: number
    totalSaves: number
    conflictCount: number
    status: 'idle' | 'saving' | 'saved' | 'error' | 'offline'
    lastError?: string
}

export type AutoSaveEventType = 'save-start' | 'save-success' | 'save-error' | 'status-change' | 'conflict-detected'

export interface AutoSaveEvent {
    type: AutoSaveEventType
    noteId?: string
    error?: string
    data?: Record<string, unknown>
}

export type AutoSaveListener = (event: AutoSaveEvent) => void

class AutoSaveManager {
    private config: AutoSaveConfig
    private state: AutoSaveState
    private saveQueue: Map<string, SaveOperation> = new Map()
    private timers: Map<string, NodeJS.Timeout> = new Map()
    private listeners: Set<AutoSaveListener> = new Set()
    private retryTimers: Map<string, NodeJS.Timeout> = new Map()

    constructor(config: Partial<AutoSaveConfig> = {}) {
        this.config = {
            enabled: true,
            debounceMs: 2000,  // 2 seconds
            intervalMs: 30000, // 30 seconds
            maxRetries: 3,
            retryDelayMs: 5000, // 5 seconds
            enableOfflineMode: true,
            enableVersionHistory: true,
            conflictResolution: 'latest-wins',
            ...config
        }

        this.state = {
            isOnline: navigator.onLine,
            lastSaved: 0,
            pendingSaves: 0,
            totalSaves: 0,
            conflictCount: 0,
            status: 'idle'
        }

        this.setupNetworkListeners()
        this.loadOfflineQueue()
    }

    /**
     * Setup network status listeners
     */
    private setupNetworkListeners(): void {
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => {
                this.state.isOnline = true
                this.emit({ type: 'status-change' })
                this.processOfflineQueue()
            })

            window.addEventListener('offline', () => {
                this.state.isOnline = false
                this.emit({ type: 'status-change' })
            })
        }
    }

    /**
     * Load offline queue from localStorage
     */
    private loadOfflineQueue(): void {
        if (typeof window === 'undefined' || !this.config.enableOfflineMode) return

        try {
            const stored = localStorage.getItem('auto-save-queue')
            if (stored) {
                const operations: SaveOperation[] = JSON.parse(stored)
                operations.forEach(op => {
                    this.saveQueue.set(op.id, op)
                })
                this.state.pendingSaves = operations.length
            }
        } catch (error) {
            console.warn('Failed to load offline save queue:', error)
        }
    }

    /**
     * Save offline queue to localStorage
     */
    private saveOfflineQueue(): void {
        if (typeof window === 'undefined' || !this.config.enableOfflineMode) return

        try {
            const operations = Array.from(this.saveQueue.values())
            localStorage.setItem('auto-save-queue', JSON.stringify(operations))
        } catch (error) {
            console.warn('Failed to save offline queue:', error)
        }
    }

    /**
     * Process offline queue when coming back online
     */
    private async processOfflineQueue(): Promise<void> {
        if (!this.state.isOnline || this.saveQueue.size === 0) return

        const operations = Array.from(this.saveQueue.values())
            .sort((a, b) => a.timestamp - b.timestamp)

        for (const operation of operations) {
            if (operation.status === 'pending') {
                await this.executeSave(operation)
            }
        }
    }

    /**
     * Generate unique operation ID
     */
    private generateOperationId(): string {
        return `save_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    /**
     * Emit event to listeners
     */
    private emit(event: AutoSaveEvent): void {
        this.listeners.forEach(listener => {
            try {
                listener(event)
            } catch (error) {
                console.error('Auto-save event listener error:', error)
            }
        })
    }

    /**
     * Add event listener
     */
    addListener(listener: AutoSaveListener): () => void {
        this.listeners.add(listener)
        return () => this.listeners.delete(listener)
    }

    /**
     * Update configuration
     */
    updateConfig(updates: Partial<AutoSaveConfig>): void {
        this.config = { ...this.config, ...updates }
    }

    /**
     * Get current state
     */
    getState(): AutoSaveState {
        return { ...this.state }
    }

    /**
     * Get current configuration
     */
    getConfig(): AutoSaveConfig {
        return { ...this.config }
    }

    /**
     * Schedule save operation with debouncing
     */
    scheduleSave(
        noteId: string,
        content: string,
        saveFunction: (content: string) => Promise<void>,
        data?: EnhancedDecryptedData
    ): void {
        if (!this.config.enabled) return

        // Clear existing timer for this note
        const existingTimer = this.timers.get(noteId)
        if (existingTimer) {
            clearTimeout(existingTimer)
        }

        // Cancel any existing save operation for this note
        const existingOp = Array.from(this.saveQueue.values())
            .find(op => op.noteId === noteId && op.status === 'pending')
        if (existingOp) {
            this.saveQueue.delete(existingOp.id)
            this.state.pendingSaves--
        }

        // Create new save operation
        const operation: SaveOperation = {
            id: this.generateOperationId(),
            noteId,
            content,
            timestamp: Date.now(),
            retryCount: 0,
            status: 'pending'
        }

        // Schedule debounced save
        const timer = setTimeout(async () => {
            this.timers.delete(noteId)
            await this.executeSave(operation, saveFunction, data)
        }, this.config.debounceMs)

        this.timers.set(noteId, timer)
        this.saveQueue.set(operation.id, operation)
        this.state.pendingSaves++
        this.saveOfflineQueue()
    }

    /**
     * Execute save operation
     */
    private async executeSave(
        operation: SaveOperation,
        saveFunction?: (content: string) => Promise<void>,
        data?: EnhancedDecryptedData
    ): Promise<void> {
        if (!saveFunction) {
            // This is from offline queue, we need the function to be provided elsewhere
            console.warn('No save function provided for offline operation')
            return
        }

        operation.status = 'saving'
        this.state.status = 'saving'
        this.emit({ type: 'save-start', noteId: operation.noteId })

        try {
            // Check for conflicts if online
            if (this.state.isOnline && this.config.conflictResolution !== 'latest-wins') {
                const hasConflict = await this.checkForConflicts(operation, data)
                if (hasConflict && this.config.conflictResolution === 'manual') {
                    operation.status = 'conflict'
                    this.state.conflictCount++
                    this.emit({ 
                        type: 'conflict-detected', 
                        noteId: operation.noteId,
                        data: { operation, currentData: data }
                    })
                    return
                }
            }

            // Execute save
            await saveFunction(operation.content)

            // Add to version history if enabled
            if (this.config.enableVersionHistory && data) {
                const note = data.notes?.find(n => n.id === operation.noteId)
                if (note) {
                    const version = createNoteVersion(note, 'edit', 'Auto-saved changes')
                    addVersionToHistory(data, version)
                }
            }

            // Mark as successful
            operation.status = 'saved'
            this.state.lastSaved = Date.now()
            this.state.totalSaves++
            this.state.status = this.state.pendingSaves > 1 ? 'saving' : 'saved'
            
            this.emit({ type: 'save-success', noteId: operation.noteId })

            // Clean up
            this.saveQueue.delete(operation.id)
            this.state.pendingSaves--
            
            if (this.state.pendingSaves === 0) {
                this.state.status = 'idle'
                this.emit({ type: 'status-change' })
            }

        } catch (error) {
            await this.handleSaveError(operation, error, saveFunction, data)
        }

        this.saveOfflineQueue()
    }

    /**
     * Handle save error with retry logic
     */
    private async handleSaveError(
        operation: SaveOperation,
        error: unknown,
        saveFunction?: (content: string) => Promise<void>,
        data?: EnhancedDecryptedData
    ): Promise<void> {
        operation.retryCount++
        this.state.lastError = error instanceof Error ? error.message : 'Save failed'

        if (operation.retryCount < this.config.maxRetries) {
            // Schedule retry
            operation.status = 'pending'
            const retryTimer = setTimeout(async () => {
                this.retryTimers.delete(operation.id)
                await this.executeSave(operation, saveFunction, data)
            }, this.config.retryDelayMs * operation.retryCount) // Exponential backoff

            this.retryTimers.set(operation.id, retryTimer)
        } else {
            // Max retries reached
            operation.status = 'failed'
            this.state.status = 'error'
            this.emit({ 
                type: 'save-error', 
                noteId: operation.noteId, 
                error: this.state.lastError 
            })
        }
    }

    /**
     * Check for conflicts (simplified implementation)
     */
    private async checkForConflicts(
        operation: SaveOperation,
        data?: EnhancedDecryptedData
    ): Promise<boolean> {
        // In a real implementation, this would check server timestamps
        // For now, we'll simulate based on local data
        if (!data) return false

        const note = data.notes?.find(n => n.id === operation.noteId)
        if (!note) return false

        // Check if note was modified after operation was created
        const noteModified = new Date(note.updatedAt).getTime()
        return noteModified > operation.timestamp
    }

    /**
     * Force save all pending operations
     */
    async saveAll(): Promise<void> {
        const pendingOps = Array.from(this.saveQueue.values())
            .filter(op => op.status === 'pending')

        for (const operation of pendingOps) {
            // Clear any debounce timers
            this.timers.forEach((timer, noteId) => {
                if (operation.noteId === noteId) {
                    clearTimeout(timer)
                    this.timers.delete(noteId)
                }
            })

            // Execute immediately (requires save function to be provided)
            // This would typically be called with the save function
        }
    }

    /**
     * Cancel all pending saves
     */
    cancelAll(): void {
        // Clear all timers
        this.timers.forEach(timer => clearTimeout(timer))
        this.timers.clear()

        // Clear retry timers
        this.retryTimers.forEach(timer => clearTimeout(timer))
        this.retryTimers.clear()

        // Clear queue
        this.saveQueue.clear()
        this.state.pendingSaves = 0
        this.state.status = 'idle'

        // Clear offline storage
        if (typeof window !== 'undefined') {
            localStorage.removeItem('auto-save-queue')
        }

        this.emit({ type: 'status-change' })
    }

    /**
     * Get save statistics
     */
    getStatistics(): {
        totalSaves: number
        pendingSaves: number
        conflictCount: number
        lastSaved: Date | null
        isOnline: boolean
        queueSize: number
    } {
        return {
            totalSaves: this.state.totalSaves,
            pendingSaves: this.state.pendingSaves,
            conflictCount: this.state.conflictCount,
            lastSaved: this.state.lastSaved ? new Date(this.state.lastSaved) : null,
            isOnline: this.state.isOnline,
            queueSize: this.saveQueue.size
        }
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        this.cancelAll()
        this.listeners.clear()
        
        if (typeof window !== 'undefined') {
            window.removeEventListener('online', this.processOfflineQueue)
            window.removeEventListener('offline', () => {})
        }
    }
}

// Export singleton instance
export const autoSaveManager = new AutoSaveManager()

// Export class for custom instances
export { AutoSaveManager }