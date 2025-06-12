'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
    Save, 
    CheckCircle, 
    AlertCircle, 
    Wifi, 
    WifiOff, 
    Clock, 
    RefreshCw,
    AlertTriangle,
    Settings
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { autoSaveManager, AutoSaveState, AutoSaveConfig, AutoSaveEvent } from '@/utils/auto-save-manager'
import { formatDistanceToNow } from 'date-fns'

interface AutoSaveIndicatorProps {
    className?: string
    showDetails?: boolean
    onConfigChange?: (config: Partial<AutoSaveConfig>) => void
}

const StatusIcon = ({ status, isOnline }: { status: string, isOnline: boolean }) => {
    const baseClasses = "h-4 w-4"
    
    if (!isOnline) {
        return <WifiOff className={`${baseClasses} text-orange-600`} />
    }

    switch (status) {
        case 'saving':
            return <RefreshCw className={`${baseClasses} text-blue-600 animate-spin`} />
        case 'saved':
            return <CheckCircle className={`${baseClasses} text-green-600`} />
        case 'error':
            return <AlertCircle className={`${baseClasses} text-red-600`} />
        case 'offline':
            return <WifiOff className={`${baseClasses} text-orange-600`} />
        default:
            return <Save className={`${baseClasses} text-gray-400`} />
    }
}

export default function AutoSaveIndicator({ 
    className = '',
    showDetails = false,
    onConfigChange
}: AutoSaveIndicatorProps) {
    const [state, setState] = useState<AutoSaveState>(autoSaveManager.getState())
    const [config, setConfig] = useState<AutoSaveConfig>(autoSaveManager.getConfig())
    const [showConfig, setShowConfig] = useState(false)
    const [lastEvent, setLastEvent] = useState<AutoSaveEvent | null>(null)

    useEffect(() => {
        const unsubscribe = autoSaveManager.addListener((event: AutoSaveEvent) => {
            setState(autoSaveManager.getState())
            setLastEvent(event)
            
            // Auto-hide success events after 2 seconds
            if (event.type === 'save-success') {
                setTimeout(() => {
                    setLastEvent(null)
                }, 2000)
            }
        })

        return unsubscribe
    }, [])

    const statusText = useMemo(() => {
        if (!state.isOnline) {
            return `Offline • ${state.pendingSaves} pending`
        }

        switch (state.status) {
            case 'saving':
                return `Saving • ${state.pendingSaves} pending`
            case 'saved':
                return state.lastSaved 
                    ? `Saved ${formatDistanceToNow(state.lastSaved, { addSuffix: true })}`
                    : 'Saved'
            case 'error':
                return `Error • ${state.lastError || 'Save failed'}`
            case 'offline':
                return `Offline • ${state.pendingSaves} pending`
            default:
                return state.totalSaves > 0 
                    ? `${state.totalSaves} saves`
                    : 'Auto-save ready'
        }
    }, [state])

    const statusColor = useMemo(() => {
        if (!state.isOnline) return 'text-orange-600'
        
        switch (state.status) {
            case 'saving': return 'text-blue-600'
            case 'saved': return 'text-green-600'
            case 'error': return 'text-red-600'
            case 'offline': return 'text-orange-600'
            default: return 'text-gray-500'
        }
    }, [state])

    const handleConfigUpdate = (updates: Partial<AutoSaveConfig>) => {
        const newConfig = { ...config, ...updates }
        setConfig(newConfig)
        autoSaveManager.updateConfig(updates)
        onConfigChange?.(updates)
    }

    const statistics = autoSaveManager.getStatistics()

    return (
        <div className={`flex items-center space-x-2 ${className}`}>
            {/* Main Status Indicator */}
            <div className="flex items-center space-x-2">
                <StatusIcon status={state.status} isOnline={state.isOnline} />
                <span className={`text-sm ${statusColor}`}>
                    {statusText}
                </span>
            </div>

            {/* Network Status */}
            <div className="flex items-center space-x-1">
                {state.isOnline ? (
                    <Wifi className="h-3 w-3 text-green-600" title="Online" />
                ) : (
                    <WifiOff className="h-3 w-3 text-orange-600" title="Offline" />
                )}
            </div>

            {/* Pending Counter */}
            {state.pendingSaves > 0 && (
                <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3 text-blue-600" />
                    <span className="text-xs text-blue-600 font-medium">
                        {state.pendingSaves}
                    </span>
                </div>
            )}

            {/* Conflict Indicator */}
            {state.conflictCount > 0 && (
                <div className="flex items-center space-x-1">
                    <AlertTriangle className="h-3 w-3 text-yellow-600" />
                    <span className="text-xs text-yellow-600 font-medium">
                        {state.conflictCount}
                    </span>
                </div>
            )}

            {/* Config Button */}
            {onConfigChange && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowConfig(!showConfig)}
                    className="p-1 h-6 w-6"
                >
                    <Settings className="h-3 w-3" />
                </Button>
            )}

            {/* Detailed Stats (if enabled) */}
            {showDetails && (
                <div className="text-xs text-gray-500 space-x-2">
                    <span>Total: {statistics.totalSaves}</span>
                    <span>Queue: {statistics.queueSize}</span>
                    {statistics.conflictCount > 0 && (
                        <span className="text-yellow-600">Conflicts: {statistics.conflictCount}</span>
                    )}
                </div>
            )}

            {/* Configuration Panel */}
            {showConfig && onConfigChange && (
                <div className="absolute top-full left-0 mt-2 p-4 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-80">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Auto-Save Settings</h3>
                    
                    <div className="space-y-3">
                        {/* Enable/Disable */}
                        <div className="flex items-center justify-between">
                            <label className="text-sm text-gray-700">Enable Auto-Save</label>
                            <input
                                type="checkbox"
                                checked={config.enabled}
                                onChange={(e) => handleConfigUpdate({ enabled: e.target.checked })}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                        </div>

                        {/* Debounce Delay */}
                        <div>
                            <label className="block text-sm text-gray-700 mb-1">
                                Typing Delay (seconds)
                            </label>
                            <input
                                type="range"
                                min="1"
                                max="10"
                                step="1"
                                value={config.debounceMs / 1000}
                                onChange={(e) => handleConfigUpdate({ debounceMs: parseInt(e.target.value) * 1000 })}
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>1s</span>
                                <span>{config.debounceMs / 1000}s</span>
                                <span>10s</span>
                            </div>
                        </div>

                        {/* Save Interval */}
                        <div>
                            <label className="block text-sm text-gray-700 mb-1">
                                Save Interval (seconds)
                            </label>
                            <input
                                type="range"
                                min="5"
                                max="300"
                                step="5"
                                value={config.intervalMs / 1000}
                                onChange={(e) => handleConfigUpdate({ intervalMs: parseInt(e.target.value) * 1000 })}
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>5s</span>
                                <span>{config.intervalMs / 1000}s</span>
                                <span>5m</span>
                            </div>
                        </div>

                        {/* Offline Mode */}
                        <div className="flex items-center justify-between">
                            <label className="text-sm text-gray-700">Offline Mode</label>
                            <input
                                type="checkbox"
                                checked={config.enableOfflineMode}
                                onChange={(e) => handleConfigUpdate({ enableOfflineMode: e.target.checked })}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                        </div>

                        {/* Version History */}
                        <div className="flex items-center justify-between">
                            <label className="text-sm text-gray-700">Version History</label>
                            <input
                                type="checkbox"
                                checked={config.enableVersionHistory}
                                onChange={(e) => handleConfigUpdate({ enableVersionHistory: e.target.checked })}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                        </div>

                        {/* Conflict Resolution */}
                        <div>
                            <label className="block text-sm text-gray-700 mb-1">
                                Conflict Resolution
                            </label>
                            <select
                                value={config.conflictResolution}
                                onChange={(e) => handleConfigUpdate({ 
                                    conflictResolution: e.target.value as 'auto' | 'manual' | 'latest-wins'
                                })}
                                className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                            >
                                <option value="latest-wins">Latest Wins</option>
                                <option value="auto">Auto Merge</option>
                                <option value="manual">Manual Review</option>
                            </select>
                        </div>

                        {/* Statistics */}
                        <div className="pt-2 border-t border-gray-200">
                            <h4 className="text-xs font-medium text-gray-700 mb-2">Statistics</h4>
                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                                <div>Total Saves: {statistics.totalSaves}</div>
                                <div>Pending: {statistics.pendingSaves}</div>
                                <div>Conflicts: {statistics.conflictCount}</div>
                                <div>Queue Size: {statistics.queueSize}</div>
                            </div>
                            {statistics.lastSaved && (
                                <div className="text-xs text-gray-600 mt-1">
                                    Last saved: {formatDistanceToNow(statistics.lastSaved, { addSuffix: true })}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end mt-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowConfig(false)}
                        >
                            Close
                        </Button>
                    </div>
                </div>
            )}

            {/* Recent Event Toast */}
            {lastEvent && lastEvent.type === 'save-error' && (
                <div className="absolute top-full left-0 mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                    Save failed: {lastEvent.error}
                </div>
            )}

            {lastEvent && lastEvent.type === 'conflict-detected' && (
                <div className="absolute top-full left-0 mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                    Conflict detected for note {lastEvent.noteId}
                </div>
            )}
        </div>
    )
}