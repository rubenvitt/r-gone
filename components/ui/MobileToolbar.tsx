'use client'

import { useState } from 'react'
import { 
    Menu, 
    X, 
    Plus, 
    Save, 
    History, 
    Shield, 
    AlertTriangle,
    Settings,
    FolderOpen,
    Search
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MobileToolbarProps {
    onCreateNote?: () => void
    onSave?: () => void
    onShowHistory?: () => void
    onShowSecurity?: () => void
    onShowRecovery?: () => void
    onShowSettings?: () => void
    onToggleSidebar?: () => void
    hasRecoveryData?: boolean
    isSaving?: boolean
    className?: string
}

export default function MobileToolbar({
    onCreateNote,
    onSave,
    onShowHistory,
    onShowSecurity,
    onShowRecovery,
    onShowSettings,
    onToggleSidebar,
    hasRecoveryData = false,
    isSaving = false,
    className = ''
}: MobileToolbarProps) {
    const [isExpanded, setIsExpanded] = useState(false)

    const toggleExpanded = () => {
        setIsExpanded(!isExpanded)
    }

    return (
        <div className={`md:hidden bg-white border-t border-gray-200 ${className}`}>
            {/* Compact Toolbar */}
            <div className="flex items-center justify-between px-4 py-2">
                {/* Left Actions */}
                <div className="flex items-center space-x-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onToggleSidebar}
                        className="h-8 w-8 p-0"
                        aria-label="Toggle sidebar"
                    >
                        <FolderOpen className="h-4 w-4" />
                    </Button>
                    
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onCreateNote}
                        className="h-8 w-8 p-0"
                        aria-label="New note"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>

                {/* Center - Save Status */}
                <div className="flex items-center space-x-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onSave}
                        disabled={isSaving}
                        className="h-8 px-3"
                        aria-label="Save note"
                    >
                        <Save className={`h-4 w-4 mr-1 ${isSaving ? 'animate-pulse' : ''}`} />
                        <span className="text-xs">
                            {isSaving ? 'Saving...' : 'Save'}
                        </span>
                    </Button>
                </div>

                {/* Right Actions */}
                <div className="flex items-center space-x-2">
                    {hasRecoveryData && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onShowRecovery}
                            className="h-8 w-8 p-0 text-orange-600"
                            aria-label="Recovery available"
                        >
                            <AlertTriangle className="h-4 w-4" />
                        </Button>
                    )}
                    
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleExpanded}
                        className="h-8 w-8 p-0"
                        aria-label={isExpanded ? "Hide tools" : "Show tools"}
                    >
                        {isExpanded ? (
                            <X className="h-4 w-4" />
                        ) : (
                            <Menu className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </div>

            {/* Expanded Toolbar */}
            {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
                    <div className="grid grid-cols-3 gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                onShowHistory?.()
                                setIsExpanded(false)
                            }}
                            className="h-10 flex flex-col items-center justify-center space-y-1"
                        >
                            <History className="h-4 w-4" />
                            <span className="text-xs">History</span>
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                onShowSecurity?.()
                                setIsExpanded(false)
                            }}
                            className="h-10 flex flex-col items-center justify-center space-y-1"
                        >
                            <Shield className="h-4 w-4" />
                            <span className="text-xs">Security</span>
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                onShowSettings?.()
                                setIsExpanded(false)
                            }}
                            className="h-10 flex flex-col items-center justify-center space-y-1"
                        >
                            <Settings className="h-4 w-4" />
                            <span className="text-xs">Settings</span>
                        </Button>

                        {hasRecoveryData && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    onShowRecovery?.()
                                    setIsExpanded(false)
                                }}
                                className="h-10 flex flex-col items-center justify-center space-y-1 col-span-3 text-orange-600 border-orange-200 hover:bg-orange-50"
                            >
                                <AlertTriangle className="h-4 w-4" />
                                <span className="text-xs">Recovery Data Available</span>
                            </Button>
                        )}
                    </div>

                    {/* Quick Info */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="text-xs text-gray-500 text-center">
                            Tap tools to access advanced features
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}