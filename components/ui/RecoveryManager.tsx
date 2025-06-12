'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
    AlertTriangle, 
    RotateCcw, 
    Clock, 
    FileText, 
    Trash2, 
    Download,
    Eye,
    CheckCircle,
    XCircle,
    RefreshCw,
    Shield,
    AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
    errorRecoveryManager, 
    RecoverySnapshot, 
    ErrorEvent, 
    RecoverySession 
} from '@/utils/error-recovery'
import { formatDistanceToNow } from 'date-fns'

interface RecoveryManagerProps {
    onRestore?: (snapshot: RecoverySnapshot) => void
    onClose?: () => void
    className?: string
}

type ViewMode = 'sessions' | 'snapshots' | 'errors' | 'settings'

const StatusIcon = ({ type }: { type: ErrorEvent['type'] }) => {
    switch (type) {
        case 'save_failure':
            return <AlertTriangle className="h-4 w-4 text-orange-600" />
        case 'network_error':
            return <RefreshCw className="h-4 w-4 text-blue-600" />
        case 'encryption_error':
            return <Shield className="h-4 w-4 text-red-600" />
        case 'storage_error':
            return <AlertCircle className="h-4 w-4 text-red-600" />
        default:
            return <AlertTriangle className="h-4 w-4 text-gray-600" />
    }
}

const SnapshotTypeIcon = ({ type }: { type: RecoverySnapshot['type'] }) => {
    switch (type) {
        case 'manual':
            return <FileText className="h-4 w-4 text-blue-600" />
        case 'auto':
            return <Clock className="h-4 w-4 text-green-600" />
        case 'crash':
            return <AlertTriangle className="h-4 w-4 text-red-600" />
        case 'conflict':
            return <RefreshCw className="h-4 w-4 text-orange-600" />
        default:
            return <FileText className="h-4 w-4 text-gray-600" />
    }
}

export default function RecoveryManager({
    onRestore,
    onClose,
    className = ''
}: RecoveryManagerProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('sessions')
    const [sessions, setSessions] = useState<RecoverySession[]>([])
    const [snapshots, setSnapshots] = useState<RecoverySnapshot[]>([])
    const [errors, setErrors] = useState<ErrorEvent[]>([])
    const [selectedNoteId, setSelectedNoteId] = useState<string>('')
    const [selectedSnapshot, setSelectedSnapshot] = useState<RecoverySnapshot | null>(null)
    const [statistics, setStatistics] = useState<ReturnType<typeof errorRecoveryManager.getStatistics>>()
    const [isLoading, setIsLoading] = useState(false)

    // Load data
    const loadData = useCallback(() => {
        setIsLoading(true)
        try {
            setSessions(errorRecoveryManager.getRecoverySessions())
            setErrors(errorRecoveryManager.getErrorLog())
            setStatistics(errorRecoveryManager.getStatistics())
            
            if (selectedNoteId) {
                setSnapshots(errorRecoveryManager.getRecoverySnapshots(selectedNoteId))
            }
        } catch (error) {
            console.error('Failed to load recovery data:', error)
        } finally {
            setIsLoading(false)
        }
    }, [selectedNoteId])

    useEffect(() => {
        loadData()
    }, [loadData])

    // Handle snapshot restore
    const handleRestore = useCallback(async (snapshot: RecoverySnapshot) => {
        try {
            const result = errorRecoveryManager.restoreFromSnapshot(snapshot.id)
            if (result.success && result.snapshot) {
                onRestore?.(result.snapshot)
                // Mark session as resolved if this was from a recovery session
                const session = sessions.find(s => 
                    s.snapshots.some(snap => snap.id === snapshot.id)
                )
                if (session) {
                    errorRecoveryManager.markSessionResolved(session.id)
                }
                loadData()
            } else {
                alert(result.error || 'Failed to restore snapshot')
            }
        } catch (error) {
            alert('Failed to restore: ' + (error instanceof Error ? error.message : 'Unknown error'))
        }
    }, [onRestore, sessions, loadData])

    // Handle clearing recovery data
    const handleClearRecoveryData = useCallback((noteId: string) => {
        if (confirm('Are you sure you want to clear all recovery data for this note?')) {
            errorRecoveryManager.clearRecoveryData(noteId)
            loadData()
        }
    }, [loadData])

    // Handle marking session as resolved
    const handleMarkSessionResolved = useCallback((sessionId: string) => {
        errorRecoveryManager.markSessionResolved(sessionId)
        loadData()
    }, [loadData])

    // Download snapshot content
    const handleDownloadSnapshot = useCallback((snapshot: RecoverySnapshot) => {
        const blob = new Blob([snapshot.content], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${snapshot.noteTitle}_${new Date(snapshot.timestamp).toISOString()}.txt`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }, [])

    // Preview snapshot content
    const handlePreviewSnapshot = useCallback((snapshot: RecoverySnapshot) => {
        setSelectedSnapshot(snapshot)
    }, [])

    // Get unique note IDs from snapshots and errors
    const noteIds = Array.from(new Set([
        ...sessions.flatMap(s => s.snapshots.map(snap => snap.noteId)),
        ...errors.filter(e => e.noteId).map(e => e.noteId!)
    ]))

    return (
        <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Shield className="h-5 w-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900">
                            Recovery Manager
                        </h3>
                    </div>
                    {onClose && (
                        <Button variant="ghost" size="sm" onClick={onClose}>
                            <XCircle className="h-4 w-4" />
                        </Button>
                    )}
                </div>
                
                {/* Statistics */}
                {statistics && (
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="text-center">
                            <div className="font-medium text-gray-900">{statistics.totalSnapshots}</div>
                            <div className="text-gray-500">Snapshots</div>
                        </div>
                        <div className="text-center">
                            <div className="font-medium text-gray-900">{statistics.totalErrors}</div>
                            <div className="text-gray-500">Errors</div>
                        </div>
                        <div className="text-center">
                            <div className="font-medium text-gray-900">{statistics.unresolvedSessions}</div>
                            <div className="text-gray-500">Unresolved</div>
                        </div>
                        <div className="text-center">
                            <div className="font-medium text-gray-900">
                                {(statistics.storageUsed / 1024).toFixed(1)}KB
                            </div>
                            <div className="text-gray-500">Storage</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div className="p-4 border-b border-gray-200">
                <div className="flex space-x-1">
                    <Button
                        variant={viewMode === 'sessions' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('sessions')}
                    >
                        Recovery Sessions
                    </Button>
                    <Button
                        variant={viewMode === 'snapshots' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('snapshots')}
                    >
                        Snapshots
                    </Button>
                    <Button
                        variant={viewMode === 'errors' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('errors')}
                    >
                        Error Log
                    </Button>
                    <Button
                        variant={viewMode === 'settings' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('settings')}
                    >
                        Settings
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 max-h-96 overflow-y-auto">
                {isLoading ? (
                    <div className="text-center py-8">
                        <RefreshCw className="h-8 w-8 mx-auto text-gray-400 animate-spin" />
                        <p className="text-gray-500 mt-2">Loading recovery data...</p>
                    </div>
                ) : (
                    <>
                        {/* Recovery Sessions View */}
                        {viewMode === 'sessions' && (
                            <div className="space-y-4">
                                {sessions.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-400" />
                                        <p>No recovery sessions found</p>
                                        <p className="text-sm">Your data has been saved successfully</p>
                                    </div>
                                ) : (
                                    sessions.map((session) => (
                                        <div
                                            key={session.id}
                                            className={`border rounded-lg p-4 ${
                                                session.resolved ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <div className="flex items-center space-x-2">
                                                        {session.resolved ? (
                                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                                        ) : (
                                                            <AlertTriangle className="h-4 w-4 text-red-600" />
                                                        )}
                                                        <h4 className="font-medium">
                                                            {session.resolved ? 'Resolved Session' : 'Recovery Session'}
                                                        </h4>
                                                    </div>
                                                    <p className="text-sm text-gray-600 mt-1">
                                                        {formatDistanceToNow(session.timestamp, { addSuffix: true })}
                                                    </p>
                                                    <p className="text-sm text-gray-600">
                                                        {session.snapshots.length} snapshots, {session.errors.length} errors
                                                    </p>
                                                </div>
                                                <div className="flex space-x-2">
                                                    {!session.resolved && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleMarkSessionResolved(session.id)}
                                                        >
                                                            Mark Resolved
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Session snapshots */}
                                            <div className="mt-3 space-y-2">
                                                {session.snapshots.slice(0, 3).map((snapshot) => (
                                                    <div
                                                        key={snapshot.id}
                                                        className="flex items-center justify-between bg-white p-2 rounded border"
                                                    >
                                                        <div className="flex items-center space-x-2">
                                                            <SnapshotTypeIcon type={snapshot.type} />
                                                            <div>
                                                                <div className="text-sm font-medium">{snapshot.noteTitle}</div>
                                                                <div className="text-xs text-gray-500">
                                                                    {formatDistanceToNow(snapshot.timestamp, { addSuffix: true })}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex space-x-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handlePreviewSnapshot(snapshot)}
                                                            >
                                                                <Eye className="h-3 w-3" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleRestore(snapshot)}
                                                            >
                                                                <RotateCcw className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                                {session.snapshots.length > 3 && (
                                                    <p className="text-xs text-gray-500 text-center">
                                                        +{session.snapshots.length - 3} more snapshots
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Snapshots View */}
                        {viewMode === 'snapshots' && (
                            <div>
                                {/* Note ID Filter */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Filter by Note
                                    </label>
                                    <select
                                        value={selectedNoteId}
                                        onChange={(e) => setSelectedNoteId(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    >
                                        <option value="">All Notes</option>
                                        {noteIds.map((noteId) => (
                                            <option key={noteId} value={noteId}>
                                                {noteId}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Snapshots List */}
                                <div className="space-y-2">
                                    {snapshots.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                            <p>No snapshots found</p>
                                            {selectedNoteId && (
                                                <p className="text-sm">Try selecting a different note</p>
                                            )}
                                        </div>
                                    ) : (
                                        snapshots.map((snapshot) => (
                                            <div
                                                key={snapshot.id}
                                                className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-start space-x-3">
                                                        <SnapshotTypeIcon type={snapshot.type} />
                                                        <div>
                                                            <h4 className="text-sm font-medium">{snapshot.noteTitle}</h4>
                                                            <p className="text-xs text-gray-500">
                                                                {formatDistanceToNow(snapshot.timestamp, { addSuffix: true })}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {snapshot.content.length} characters
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex space-x-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handlePreviewSnapshot(snapshot)}
                                                            title="Preview"
                                                        >
                                                            <Eye className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDownloadSnapshot(snapshot)}
                                                            title="Download"
                                                        >
                                                            <Download className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleRestore(snapshot)}
                                                            title="Restore"
                                                        >
                                                            <RotateCcw className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Clear Recovery Data */}
                                {selectedNoteId && snapshots.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleClearRecoveryData(selectedNoteId)}
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Clear Recovery Data for This Note
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Error Log View */}
                        {viewMode === 'errors' && (
                            <div className="space-y-2">
                                {errors.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-400" />
                                        <p>No errors recorded</p>
                                        <p className="text-sm">Your application is running smoothly</p>
                                    </div>
                                ) : (
                                    errors.slice(0, 50).map((error) => (
                                        <div
                                            key={error.id}
                                            className={`border rounded-lg p-3 ${
                                                error.recoverable ? 'border-orange-200 bg-orange-50' : 'border-red-200 bg-red-50'
                                            }`}
                                        >
                                            <div className="flex items-start space-x-3">
                                                <StatusIcon type={error.type} />
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-2">
                                                        <h4 className="text-sm font-medium capitalize">
                                                            {error.type.replace('_', ' ')}
                                                        </h4>
                                                        <span className={`text-xs px-2 py-1 rounded ${
                                                            error.recoverable 
                                                                ? 'bg-green-100 text-green-800' 
                                                                : 'bg-red-100 text-red-800'
                                                        }`}>
                                                            {error.recoverable ? 'Recoverable' : 'Critical'}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-700 mt-1">{error.message}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {formatDistanceToNow(error.timestamp, { addSuffix: true })}
                                                        {error.noteId && ` • Note: ${error.noteId}`}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Settings View */}
                        {viewMode === 'settings' && (
                            <div className="space-y-4">
                                <div className="border border-gray-200 rounded-lg p-4">
                                    <h4 className="font-medium mb-3">Recovery Settings</h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm text-gray-700">Enable Recovery System</label>
                                            <input
                                                type="checkbox"
                                                checked={errorRecoveryManager.getConfig().enabled}
                                                onChange={(e) => errorRecoveryManager.updateConfig({ enabled: e.target.checked })}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm text-gray-700">Crash Detection</label>
                                            <input
                                                type="checkbox"
                                                checked={errorRecoveryManager.getConfig().enableCrashDetection}
                                                onChange={(e) => errorRecoveryManager.updateConfig({ enableCrashDetection: e.target.checked })}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                                    <h4 className="font-medium text-red-900 mb-3">Danger Zone</h4>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => {
                                            if (confirm('Are you sure you want to clear ALL recovery data? This cannot be undone.')) {
                                                errorRecoveryManager.clearAllRecoveryData()
                                                loadData()
                                            }
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Clear All Recovery Data
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Snapshot Preview Modal */}
            {selectedSnapshot && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg max-w-2xl max-h-[80vh] w-full mx-4">
                        <div className="p-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Snapshot Preview</h3>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedSnapshot(null)}
                                >
                                    <XCircle className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="mt-2 text-sm text-gray-600">
                                <p>{selectedSnapshot.noteTitle}</p>
                                <p>{formatDistanceToNow(selectedSnapshot.timestamp, { addSuffix: true })}</p>
                            </div>
                        </div>
                        <div className="p-4 max-h-96 overflow-y-auto">
                            <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded border">
                                {selectedSnapshot.content}
                            </pre>
                        </div>
                        <div className="p-4 border-t border-gray-200 flex justify-end space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadSnapshot(selectedSnapshot)}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => {
                                    handleRestore(selectedSnapshot)
                                    setSelectedSnapshot(null)
                                }}
                            >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Restore
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}