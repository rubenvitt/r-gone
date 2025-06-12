'use client'

import { useState, useEffect } from 'react'
import { 
    Save, 
    CheckCircle, 
    AlertCircle, 
    Wifi, 
    WifiOff, 
    Clock, 
    Shield,
    Lock,
    Unlock,
    History,
    AlertTriangle,
    Info,
    ChevronUp,
    ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { autoSaveManager, AutoSaveState } from '@/utils/auto-save-manager'
import { errorRecoveryManager } from '@/utils/error-recovery'
import { formatDistanceToNow } from 'date-fns'

interface StatusBarProps {
    currentNoteId?: string
    currentNoteTitle?: string
    isPasswordProtected?: boolean
    isNoteUnlocked?: boolean
    hasVersionHistory?: boolean
    onShowRecovery?: () => void
    onShowVersionHistory?: () => void
    onShowPasswordManager?: () => void
    className?: string
}

export default function StatusBar({
    currentNoteId,
    currentNoteTitle = 'Untitled',
    isPasswordProtected = false,
    isNoteUnlocked = true,
    hasVersionHistory = false,
    onShowRecovery,
    onShowVersionHistory,
    onShowPasswordManager,
    className = ''
}: StatusBarProps) {
    const [autoSaveState, setAutoSaveState] = useState<AutoSaveState>(autoSaveManager.getState())
    const [recoveryStats, setRecoveryStats] = useState(errorRecoveryManager.getStatistics())
    const [isExpanded, setIsExpanded] = useState(false)
    const [lastActivity, setLastActivity] = useState<Date>(new Date())

    // Listen to auto-save state changes
    useEffect(() => {
        const unsubscribe = autoSaveManager.addListener(() => {
            setAutoSaveState(autoSaveManager.getState())
            setLastActivity(new Date())
        })
        return unsubscribe
    }, [])

    // Update recovery stats periodically
    useEffect(() => {
        const updateStats = () => {
            setRecoveryStats(errorRecoveryManager.getStatistics())
        }
        
        updateStats()
        const interval = setInterval(updateStats, 5000) // Update every 5 seconds
        
        return () => clearInterval(interval)
    }, [])

    // Status colors and messages
    const getStatusInfo = () => {
        if (!autoSaveState.isOnline) {
            return {
                color: 'text-orange-600',
                bgColor: 'bg-orange-50',
                borderColor: 'border-orange-200',
                icon: <WifiOff className="h-4 w-4" />,
                message: 'Offline',
                detail: `${autoSaveState.pendingSaves} changes pending`
            }
        }

        switch (autoSaveState.status) {
            case 'saving':
                return {
                    color: 'text-blue-600',
                    bgColor: 'bg-blue-50',
                    borderColor: 'border-blue-200',
                    icon: <Save className="h-4 w-4 animate-pulse" />,
                    message: 'Saving',
                    detail: `${autoSaveState.pendingSaves} changes pending`
                }
            case 'saved':
                return {
                    color: 'text-green-600',
                    bgColor: 'bg-green-50',
                    borderColor: 'border-green-200',
                    icon: <CheckCircle className="h-4 w-4" />,
                    message: 'Saved',
                    detail: autoSaveState.lastSaved 
                        ? formatDistanceToNow(autoSaveState.lastSaved, { addSuffix: true })
                        : 'Just now'
                }
            case 'error':
                return {
                    color: 'text-red-600',
                    bgColor: 'bg-red-50',
                    borderColor: 'border-red-200',
                    icon: <AlertCircle className="h-4 w-4" />,
                    message: 'Error',
                    detail: autoSaveState.lastError || 'Save failed'
                }
            default:
                return {
                    color: 'text-gray-600',
                    bgColor: 'bg-gray-50',
                    borderColor: 'border-gray-200',
                    icon: <Clock className="h-4 w-4" />,
                    message: 'Ready',
                    detail: autoSaveState.totalSaves > 0 
                        ? `${autoSaveState.totalSaves} saves total`
                        : 'Auto-save enabled'
                }
        }
    }

    const statusInfo = getStatusInfo()
    const hasRecoveryData = recoveryStats.unresolvedSessions > 0 || recoveryStats.totalSnapshots > 0

    return (
        <div className={`border-t border-gray-200 bg-white ${className}`}>
            {/* Main Status Bar */}
            <div className={`px-4 py-2 ${statusInfo.bgColor} ${statusInfo.borderColor} border-t`}>
                <div className="flex items-center justify-between">
                    {/* Left Side - Note Info */}
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                        {/* Note Title and Security Status */}
                        <div className="flex items-center space-x-2 min-w-0">
                            <div className="flex items-center space-x-1">
                                {isPasswordProtected && (
                                    isNoteUnlocked ? (
                                        <Unlock className="h-3 w-3 text-green-600" title="Note unlocked" />
                                    ) : (
                                        <Lock className="h-3 w-3 text-red-600" title="Note locked" />
                                    )
                                )}
                                {hasVersionHistory && (
                                    <History className="h-3 w-3 text-blue-600" title="Has version history" />
                                )}
                            </div>
                            <span className="text-sm font-medium text-gray-900 truncate">
                                {currentNoteTitle}
                            </span>
                        </div>

                        {/* Activity Indicator */}
                        <div className="text-xs text-gray-500">
                            Last activity: {formatDistanceToNow(lastActivity, { addSuffix: true })}
                        </div>
                    </div>

                    {/* Center - Save Status */}
                    <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                            <div className={statusInfo.color}>
                                {statusInfo.icon}
                            </div>
                            <span className={`text-sm font-medium ${statusInfo.color}`}>
                                {statusInfo.message}
                            </span>
                        </div>
                        
                        {/* Network Status */}
                        <div className="flex items-center space-x-1">
                            {autoSaveState.isOnline ? (
                                <Wifi className="h-3 w-3 text-green-600" title="Online" />
                            ) : (
                                <WifiOff className="h-3 w-3 text-orange-600" title="Offline" />
                            )}
                        </div>

                        {/* Pending Counter */}
                        {autoSaveState.pendingSaves > 0 && (
                            <div className="flex items-center space-x-1 px-1.5 py-0.5 bg-blue-100 rounded-full">
                                <Clock className="h-3 w-3 text-blue-600" />
                                <span className="text-xs text-blue-600 font-medium">
                                    {autoSaveState.pendingSaves}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Right Side - Action Buttons */}
                    <div className="flex items-center space-x-2">
                        {/* Recovery Alert */}
                        {hasRecoveryData && onShowRecovery && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onShowRecovery}
                                className="h-6 px-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                title={`${recoveryStats.unresolvedSessions} unresolved sessions, ${recoveryStats.totalSnapshots} snapshots`}
                            >
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                <span className="text-xs">Recovery</span>
                            </Button>
                        )}

                        {/* Version History */}
                        {hasVersionHistory && onShowVersionHistory && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onShowVersionHistory}
                                className="h-6 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                title="View version history"
                            >
                                <History className="h-3 w-3 mr-1" />
                                <span className="text-xs">History</span>
                            </Button>
                        )}

                        {/* Password Protection */}
                        {onShowPasswordManager && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onShowPasswordManager}
                                className="h-6 px-2 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                                title={isPasswordProtected ? "Manage password" : "Add password protection"}
                            >
                                <Shield className="h-3 w-3 mr-1" />
                                <span className="text-xs">
                                    {isPasswordProtected ? 'Security' : 'Protect'}
                                </span>
                            </Button>
                        )}

                        {/* Expand/Collapse */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                            title={isExpanded ? "Collapse details" : "Show details"}
                        >
                            {isExpanded ? (
                                <ChevronDown className="h-3 w-3" />
                            ) : (
                                <ChevronUp className="h-3 w-3" />
                            )}
                        </Button>
                    </div>
                </div>

                {/* Status Detail */}
                <div className="mt-1">
                    <span className={`text-xs ${statusInfo.color}`}>
                        {statusInfo.detail}
                    </span>
                </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        {/* Auto-Save Stats */}
                        <div>
                            <div className="font-medium text-gray-700 mb-1">Auto-Save</div>
                            <div className="space-y-1 text-gray-600">
                                <div>Total saves: {autoSaveState.totalSaves}</div>
                                <div>Pending: {autoSaveState.pendingSaves}</div>
                                <div>Conflicts: {autoSaveState.conflictCount}</div>
                            </div>
                        </div>

                        {/* Recovery Stats */}
                        <div>
                            <div className="font-medium text-gray-700 mb-1">Recovery</div>
                            <div className="space-y-1 text-gray-600">
                                <div>Snapshots: {recoveryStats.totalSnapshots}</div>
                                <div>Errors: {recoveryStats.totalErrors}</div>
                                <div>Unresolved: {recoveryStats.unresolvedSessions}</div>
                            </div>
                        </div>

                        {/* Note Stats */}
                        <div>
                            <div className="font-medium text-gray-700 mb-1">Current Note</div>
                            <div className="space-y-1 text-gray-600">
                                <div>ID: {currentNoteId?.slice(0, 8) || 'None'}...</div>
                                <div>Protected: {isPasswordProtected ? 'Yes' : 'No'}</div>
                                <div>Unlocked: {isNoteUnlocked ? 'Yes' : 'No'}</div>
                            </div>
                        </div>

                        {/* System Stats */}
                        <div>
                            <div className="font-medium text-gray-700 mb-1">System</div>
                            <div className="space-y-1 text-gray-600">
                                <div>Network: {autoSaveState.isOnline ? 'Online' : 'Offline'}</div>
                                <div>Storage: {(recoveryStats.storageUsed / 1024).toFixed(1)}KB</div>
                                <div>Session: Active</div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-500">
                                Quick actions for better workflow
                            </div>
                            <div className="flex space-x-2">
                                {hasRecoveryData && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={onShowRecovery}
                                        className="h-6 text-xs"
                                    >
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        Review Recovery Data
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        errorRecoveryManager.clearAllRecoveryData()
                                        setRecoveryStats(errorRecoveryManager.getStatistics())
                                    }}
                                    className="h-6 text-xs text-red-600 hover:text-red-700"
                                >
                                    Clear Recovery Data
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}