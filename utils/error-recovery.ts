/**
 * Error Recovery System for protecting user data and providing recovery mechanisms
 */

import { EnhancedDecryptedData, Note } from '@/types/data'

export interface RecoverySnapshot {
    id: string
    timestamp: number
    noteId: string
    content: string
    noteTitle: string
    type: 'manual' | 'auto' | 'crash' | 'conflict'
    metadata: {
        userAgent?: string
        url?: string
        sessionId?: string
        errorContext?: string
    }
}

export interface ErrorEvent {
    id: string
    timestamp: number
    type: 'save_failure' | 'network_error' | 'encryption_error' | 'storage_error' | 'unknown'
    message: string
    stack?: string
    noteId?: string
    recoverable: boolean
    context: Record<string, unknown>
}

export interface RecoverySession {
    id: string
    timestamp: number
    snapshots: RecoverySnapshot[]
    errors: ErrorEvent[]
    resolved: boolean
}

export type RecoveryMode = 'aggressive' | 'conservative' | 'manual'

export interface RecoveryConfig {
    enabled: boolean
    maxSnapshots: number
    snapshotInterval: number // ms
    maxRecoverySessions: number
    recoveryMode: RecoveryMode
    enableCrashDetection: boolean
    enableConflictResolution: boolean
}

class ErrorRecoveryManager {
    private config: RecoveryConfig
    private currentSession: RecoverySession | null = null
    private snapshots: Map<string, RecoverySnapshot[]> = new Map()
    private errorLog: ErrorEvent[] = []
    private lastSnapshot: Map<string, number> = new Map()
    private beforeUnloadHandlerRegistered = false

    constructor(config: Partial<RecoveryConfig> = {}) {
        this.config = {
            enabled: true,
            maxSnapshots: 50,
            snapshotInterval: 30000, // 30 seconds
            maxRecoverySessions: 10,
            recoveryMode: 'conservative',
            enableCrashDetection: true,
            enableConflictResolution: true,
            ...config
        }

        this.initialize()
    }

    /**
     * Initialize the recovery system
     */
    private initialize(): void {
        if (!this.config.enabled) return

        this.loadPersistedData()
        this.setupCrashDetection()
        this.cleanupOldData()
    }

    /**
     * Setup crash detection using browser events
     */
    private setupCrashDetection(): void {
        if (!this.config.enableCrashDetection || typeof window === 'undefined') return

        // Detect abnormal session termination
        const sessionId = this.generateSessionId()
        sessionStorage.setItem('recovery_session_active', sessionId)

        // Setup beforeunload handler
        if (!this.beforeUnloadHandlerRegistered) {
            window.addEventListener('beforeunload', () => {
                sessionStorage.removeItem('recovery_session_active')
                this.persistCurrentState()
            })
            this.beforeUnloadHandlerRegistered = true
        }

        // Check for crashed sessions on startup
        setTimeout(() => {
            this.checkForCrashedSession()
        }, 1000)
    }

    /**
     * Check if previous session crashed
     */
    private checkForCrashedSession(): void {
        const activeSession = sessionStorage.getItem('recovery_session_active')
        if (activeSession) {
            // Previous session didn't close properly
            this.handleCrashRecovery()
            sessionStorage.removeItem('recovery_session_active')
        }
    }

    /**
     * Handle crash recovery
     */
    private handleCrashRecovery(): void {
        const crashSnapshots = this.loadCrashSnapshots()
        if (crashSnapshots.length > 0) {
            const recoverySession: RecoverySession = {
                id: this.generateSessionId(),
                timestamp: Date.now(),
                snapshots: crashSnapshots,
                errors: [{
                    id: this.generateEventId(),
                    timestamp: Date.now(),
                    type: 'unknown',
                    message: 'Browser crashed or closed unexpectedly',
                    recoverable: true,
                    context: {
                        snapshotCount: crashSnapshots.length,
                        detectionMethod: 'beforeunload'
                    }
                }],
                resolved: false
            }

            this.saveRecoverySession(recoverySession)
            this.currentSession = recoverySession
        }
    }

    /**
     * Create a recovery snapshot
     */
    createSnapshot(
        noteId: string,
        content: string,
        noteTitle: string,
        type: RecoverySnapshot['type'] = 'auto',
        errorContext?: string
    ): void {
        if (!this.config.enabled) return

        const now = Date.now()
        const lastSnapshotTime = this.lastSnapshot.get(noteId) || 0

        // Throttle snapshots
        if (type === 'auto' && now - lastSnapshotTime < this.config.snapshotInterval) {
            return
        }

        const snapshot: RecoverySnapshot = {
            id: this.generateSnapshotId(),
            timestamp: now,
            noteId,
            content,
            noteTitle,
            type,
            metadata: {
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
                url: typeof window !== 'undefined' ? window.location.href : undefined,
                sessionId: this.getCurrentSessionId(),
                errorContext
            }
        }

        // Add to memory store
        const noteSnapshots = this.snapshots.get(noteId) || []
        noteSnapshots.push(snapshot)

        // Limit snapshots per note
        if (noteSnapshots.length > this.config.maxSnapshots) {
            noteSnapshots.shift()
        }

        this.snapshots.set(noteId, noteSnapshots)
        this.lastSnapshot.set(noteId, now)

        // Persist to local storage
        this.persistSnapshot(snapshot)
    }

    /**
     * Log an error event
     */
    logError(
        type: ErrorEvent['type'],
        message: string,
        error?: Error,
        noteId?: string,
        context: Record<string, unknown> = {}
    ): string {
        const errorEvent: ErrorEvent = {
            id: this.generateEventId(),
            timestamp: Date.now(),
            type,
            message,
            stack: error?.stack,
            noteId,
            recoverable: this.isRecoverable(type, error),
            context: {
                ...context,
                sessionId: this.getCurrentSessionId()
            }
        }

        this.errorLog.push(errorEvent)
        this.persistError(errorEvent)

        // Create snapshot if error is related to a note
        if (noteId && errorEvent.recoverable) {
            // Try to get current content for emergency snapshot
            this.createEmergencySnapshot(noteId, message)
        }

        return errorEvent.id
    }

    /**
     * Create emergency snapshot when error occurs
     */
    private createEmergencySnapshot(noteId: string, errorContext: string): void {
        try {
            // Try to get content from active editor or last known state
            const editorElement = document.querySelector(`[data-note-id="${noteId}"]`)
            let content = ''
            let title = 'Emergency Recovery'

            if (editorElement) {
                const textContent = editorElement.textContent || ''
                content = textContent
                title = `Emergency Recovery - ${new Date().toLocaleString()}`
            }

            this.createSnapshot(noteId, content, title, 'crash', errorContext)
        } catch (err) {
            console.warn('Failed to create emergency snapshot:', err)
        }
    }

    /**
     * Determine if an error type is recoverable
     */
    private isRecoverable(type: ErrorEvent['type'], error?: Error): boolean {
        switch (type) {
            case 'save_failure':
            case 'network_error':
                return true
            case 'encryption_error':
            case 'storage_error':
                return false
            case 'unknown':
                return error ? !error.message.includes('quota') : true
            default:
                return false
        }
    }

    /**
     * Get recovery snapshots for a note
     */
    getRecoverySnapshots(noteId: string): RecoverySnapshot[] {
        const snapshots = this.snapshots.get(noteId) || []
        const persistedSnapshots = this.loadPersistedSnapshots(noteId)
        
        // Merge and deduplicate
        const allSnapshots = [...snapshots, ...persistedSnapshots]
        const uniqueSnapshots = allSnapshots.filter((snapshot, index, array) => 
            array.findIndex(s => s.id === snapshot.id) === index
        )

        return uniqueSnapshots.sort((a, b) => b.timestamp - a.timestamp)
    }

    /**
     * Get all recovery sessions
     */
    getRecoverySessions(): RecoverySession[] {
        return this.loadRecoverySessions()
    }

    /**
     * Get error log
     */
    getErrorLog(): ErrorEvent[] {
        return [...this.errorLog, ...this.loadPersistedErrors()]
    }

    /**
     * Restore content from snapshot
     */
    restoreFromSnapshot(snapshotId: string): { success: boolean; snapshot?: RecoverySnapshot; error?: string } {
        try {
            // Find snapshot in memory or storage
            for (const noteSnapshots of this.snapshots.values()) {
                const snapshot = noteSnapshots.find(s => s.id === snapshotId)
                if (snapshot) {
                    return { success: true, snapshot }
                }
            }

            // Search in persisted snapshots
            const persistedSnapshot = this.loadSnapshotById(snapshotId)
            if (persistedSnapshot) {
                return { success: true, snapshot: persistedSnapshot }
            }

            return { success: false, error: 'Snapshot not found' }
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            }
        }
    }

    /**
     * Clear recovery data for a note
     */
    clearRecoveryData(noteId: string): void {
        this.snapshots.delete(noteId)
        this.lastSnapshot.delete(noteId)
        this.removePersistedSnapshots(noteId)
    }

    /**
     * Mark recovery session as resolved
     */
    markSessionResolved(sessionId: string): void {
        const sessions = this.loadRecoverySessions()
        const session = sessions.find(s => s.id === sessionId)
        if (session) {
            session.resolved = true
            this.saveRecoverySession(session)
        }
    }

    // Storage methods
    private persistSnapshot(snapshot: RecoverySnapshot): void {
        if (typeof localStorage === 'undefined') return

        try {
            const key = `recovery_snapshot_${snapshot.noteId}_${snapshot.id}`
            localStorage.setItem(key, JSON.stringify(snapshot))
        } catch (error) {
            console.warn('Failed to persist recovery snapshot:', error)
        }
    }

    private persistError(error: ErrorEvent): void {
        if (typeof localStorage === 'undefined') return

        try {
            const key = `recovery_error_${error.id}`
            localStorage.setItem(key, JSON.stringify(error))
        } catch (err) {
            console.warn('Failed to persist error event:', err)
        }
    }

    private loadPersistedSnapshots(noteId: string): RecoverySnapshot[] {
        if (typeof localStorage === 'undefined') return []

        const snapshots: RecoverySnapshot[] = []
        const prefix = `recovery_snapshot_${noteId}_`

        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i)
                if (key?.startsWith(prefix)) {
                    const data = localStorage.getItem(key)
                    if (data) {
                        snapshots.push(JSON.parse(data))
                    }
                }
            }
        } catch (error) {
            console.warn('Failed to load persisted snapshots:', error)
        }

        return snapshots
    }

    private loadPersistedErrors(): ErrorEvent[] {
        if (typeof localStorage === 'undefined') return []

        const errors: ErrorEvent[] = []
        const prefix = 'recovery_error_'

        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i)
                if (key?.startsWith(prefix)) {
                    const data = localStorage.getItem(key)
                    if (data) {
                        errors.push(JSON.parse(data))
                    }
                }
            }
        } catch (error) {
            console.warn('Failed to load persisted errors:', error)
        }

        return errors
    }

    private loadPersistedData(): void {
        // Load any existing snapshots and errors into memory
        const allErrors = this.loadPersistedErrors()
        this.errorLog.push(...allErrors)
    }

    private loadCrashSnapshots(): RecoverySnapshot[] {
        if (typeof localStorage === 'undefined') return []

        const snapshots: RecoverySnapshot[] = []
        const prefix = 'recovery_snapshot_'

        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i)
                if (key?.startsWith(prefix)) {
                    const data = localStorage.getItem(key)
                    if (data) {
                        const snapshot = JSON.parse(data)
                        // Only get recent snapshots (within last hour)
                        if (Date.now() - snapshot.timestamp < 3600000) {
                            snapshots.push(snapshot)
                        }
                    }
                }
            }
        } catch (error) {
            console.warn('Failed to load crash snapshots:', error)
        }

        return snapshots
    }

    private loadSnapshotById(snapshotId: string): RecoverySnapshot | null {
        if (typeof localStorage === 'undefined') return null

        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i)
                if (key?.includes(`_${snapshotId}`)) {
                    const data = localStorage.getItem(key)
                    if (data) {
                        return JSON.parse(data)
                    }
                }
            }
        } catch (error) {
            console.warn('Failed to load snapshot by ID:', error)
        }

        return null
    }

    private saveRecoverySession(session: RecoverySession): void {
        if (typeof localStorage === 'undefined') return

        try {
            const sessions = this.loadRecoverySessions()
            const existingIndex = sessions.findIndex(s => s.id === session.id)
            
            if (existingIndex >= 0) {
                sessions[existingIndex] = session
            } else {
                sessions.push(session)
            }

            // Limit number of sessions
            if (sessions.length > this.config.maxRecoverySessions) {
                sessions.shift()
            }

            localStorage.setItem('recovery_sessions', JSON.stringify(sessions))
        } catch (error) {
            console.warn('Failed to save recovery session:', error)
        }
    }

    private loadRecoverySessions(): RecoverySession[] {
        if (typeof localStorage === 'undefined') return []

        try {
            const data = localStorage.getItem('recovery_sessions')
            return data ? JSON.parse(data) : []
        } catch (error) {
            console.warn('Failed to load recovery sessions:', error)
            return []
        }
    }

    private removePersistedSnapshots(noteId: string): void {
        if (typeof localStorage === 'undefined') return

        const prefix = `recovery_snapshot_${noteId}_`
        const keysToRemove: string[] = []

        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i)
                if (key?.startsWith(prefix)) {
                    keysToRemove.push(key)
                }
            }

            keysToRemove.forEach(key => localStorage.removeItem(key))
        } catch (error) {
            console.warn('Failed to remove persisted snapshots:', error)
        }
    }

    private persistCurrentState(): void {
        // Persist any pending snapshots before shutdown
        try {
            const stateSnapshot = {
                snapshots: Array.from(this.snapshots.entries()),
                errorLog: this.errorLog,
                timestamp: Date.now()
            }
            localStorage.setItem('recovery_shutdown_state', JSON.stringify(stateSnapshot))
        } catch (error) {
            console.warn('Failed to persist shutdown state:', error)
        }
    }

    private cleanupOldData(): void {
        if (typeof localStorage === 'undefined') return

        const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000) // 7 days
        const keysToRemove: string[] = []

        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i)
                if (key?.startsWith('recovery_')) {
                    const data = localStorage.getItem(key)
                    if (data) {
                        const parsed = JSON.parse(data)
                        if (parsed.timestamp && parsed.timestamp < cutoffTime) {
                            keysToRemove.push(key)
                        }
                    }
                }
            }

            keysToRemove.forEach(key => localStorage.removeItem(key))
        } catch (error) {
            console.warn('Failed to cleanup old recovery data:', error)
        }
    }

    // Utility methods
    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    private generateSnapshotId(): string {
        return `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    private generateEventId(): string {
        return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    private getCurrentSessionId(): string {
        return sessionStorage.getItem('recovery_session_active') || 'unknown'
    }

    /**
     * Update configuration
     */
    updateConfig(updates: Partial<RecoveryConfig>): void {
        this.config = { ...this.config, ...updates }
    }

    /**
     * Get current configuration
     */
    getConfig(): RecoveryConfig {
        return { ...this.config }
    }

    /**
     * Get statistics
     */
    getStatistics(): {
        totalSnapshots: number
        totalErrors: number
        recoverySessions: number
        unresolvedSessions: number
        oldestSnapshot: Date | null
        storageUsed: number
    } {
        const allSnapshots = Array.from(this.snapshots.values()).flat()
        const allErrors = this.getErrorLog()
        const sessions = this.getRecoverySessions()
        
        return {
            totalSnapshots: allSnapshots.length,
            totalErrors: allErrors.length,
            recoverySessions: sessions.length,
            unresolvedSessions: sessions.filter(s => !s.resolved).length,
            oldestSnapshot: allSnapshots.length > 0 
                ? new Date(Math.min(...allSnapshots.map(s => s.timestamp)))
                : null,
            storageUsed: this.calculateStorageUsage()
        }
    }

    private calculateStorageUsage(): number {
        if (typeof localStorage === 'undefined') return 0

        let totalSize = 0
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i)
                if (key?.startsWith('recovery_')) {
                    const data = localStorage.getItem(key)
                    if (data) {
                        totalSize += new Blob([data]).size
                    }
                }
            }
        } catch (error) {
            console.warn('Failed to calculate storage usage:', error)
        }

        return totalSize
    }

    /**
     * Clear all recovery data
     */
    clearAllRecoveryData(): void {
        this.snapshots.clear()
        this.errorLog.length = 0
        this.lastSnapshot.clear()
        this.currentSession = null

        if (typeof localStorage !== 'undefined') {
            const keysToRemove: string[] = []
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i)
                if (key?.startsWith('recovery_')) {
                    keysToRemove.push(key)
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key))
        }
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        this.persistCurrentState()
        this.snapshots.clear()
        this.errorLog.length = 0
        this.lastSnapshot.clear()
        this.currentSession = null

        if (typeof window !== 'undefined' && this.beforeUnloadHandlerRegistered) {
            // Note: We can't remove the specific handler, but it will be cleaned up when the page unloads
        }
    }
}

// Export singleton instance
export const errorRecoveryManager = new ErrorRecoveryManager()

// Export class for custom instances
export { ErrorRecoveryManager }